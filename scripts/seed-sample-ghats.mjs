import { randomBytes, randomUUID } from 'node:crypto';
import { hash } from 'bcryptjs';
import { Client } from 'pg';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('Set DATABASE_URL to the local development database first.');
}
if (process.env.NODE_ENV === 'production') {
  throw new Error('Sample data cannot be seeded when NODE_ENV is production.');
}

const database = new URL(databaseUrl);
if (!['localhost', '127.0.0.1', '::1'].includes(database.hostname)) {
  throw new Error(
    'Sample data can only be seeded into a database hosted on this computer.',
  );
}

const sampleGhats = [
  {
    name: 'Dummy River Ghat 01',
    waterbodyType: 'river',
    subDivision: 'Tamluk',
    block: 'Tamluk',
  },
  {
    name: 'Dummy River Ghat 02',
    waterbodyType: 'river',
    subDivision: 'Haldia',
    block: 'Sutahata',
  },
  {
    name: 'Dummy Pond Ghat 03',
    waterbodyType: 'pond',
    subDivision: 'Contai',
    block: 'Contai-I',
  },
  {
    name: 'Dummy River Ghat 04',
    waterbodyType: 'river',
    subDivision: 'Egra',
    block: 'Egra-I',
  },
  {
    name: 'Dummy Pond Ghat 05',
    waterbodyType: 'pond',
    subDivision: 'Tamluk',
    block: 'Panskura-I',
  },
  {
    name: 'Dummy River Ghat 06',
    waterbodyType: 'river',
    subDivision: 'Contai',
    block: 'Ramnagar-I',
  },
  {
    name: 'Dummy Pond Ghat 07',
    waterbodyType: 'pond',
    subDivision: 'Egra',
    block: 'Patashpur-I',
  },
  {
    name: 'Dummy River Ghat 08',
    waterbodyType: 'river',
    subDivision: 'Haldia',
    block: 'Mahishadal',
  },
  {
    name: 'Dummy Pond Ghat 09',
    waterbodyType: 'pond',
    subDivision: 'Contai',
    block: 'Deshapran',
  },
  {
    name: 'Dummy River Ghat 10',
    waterbodyType: 'river',
    subDivision: 'Tamluk',
    block: 'Nandakumar',
  },
];

const client = new Client({ connectionString: databaseUrl });
const createdCredentials = [];
let createdGhats = 0;

try {
  await client.connect();
  await client.query('BEGIN');

  for (const [index, ghat] of sampleGhats.entries()) {
    const number = String(index + 1).padStart(2, '0');
    const username = `sample-ghat-user-${number}`;
    let userResult = await client.query(
      'SELECT "id", "role" FROM "users" WHERE "username" = $1',
      [username],
    );
    let user = userResult.rows[0];

    if (!user) {
      const password = randomBytes(24).toString('base64url');
      const id = randomUUID();
      const passwordHash = await hash(password, 12);
      userResult = await client.query(
        `INSERT INTO "users" ("id", "username", "name", "password_hash", "role")
         VALUES ($1, $2, $3, $4, 'user')
         RETURNING "id", "role"`,
        [id, username, `Sample User ${number}`, passwordHash],
      );
      user = userResult.rows[0];
      createdCredentials.push({ username, password });
    } else if (user.role !== 'user') {
      throw new Error(`Expected ${username} to have the user role.`);
    }

    const existingGhat = await client.query(
      'SELECT "created_by" FROM "ghats" WHERE "name" = $1',
      [ghat.name],
    );
    if (existingGhat.rows.length > 0) {
      if (existingGhat.rows[0].created_by !== user.id) {
        throw new Error(`A different owner already has ${ghat.name}.`);
      }
      continue;
    }

    await client.query(
      `INSERT INTO "ghats"
        ("id", "name", "waterbody_type", "district", "sub_division", "block",
         "created_by", "nodal_officer_name", "nodal_officer_contact")
       VALUES ($1, $2, $3, 'Purba Medinipur', $4, $5, $6, $7, $8)`,
      [
        randomUUID(),
        ghat.name,
        ghat.waterbodyType,
        ghat.subDivision,
        ghat.block,
        user.id,
        `Sample Officer ${number}`,
        `00000000${number}`,
      ],
    );
    createdGhats += 1;
  }

  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  await client.end();
}

process.stdout.write(`Created ${createdGhats} dummy ghats.\n`);
if (createdCredentials.length > 0) {
  process.stdout.write(
    'Save these one-time passwords for the newly created sample users:\n',
  );
  for (const credential of createdCredentials) {
    process.stdout.write(`${credential.username}: ${credential.password}\n`);
  }
}
