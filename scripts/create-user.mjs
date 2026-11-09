import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { hash } from 'bcryptjs';

const usernameArgument = process.argv[2];
const nameArgument = process.argv[3];
const databaseUrl = process.env.DATABASE_URL;

if (!process.stdin.isTTY || !process.stdout.isTTY) {
  throw new Error('Run this command in an interactive terminal.');
}
if (!databaseUrl?.startsWith('postgres://') &&
    !databaseUrl?.startsWith('postgresql://')) {
  throw new Error('Set DATABASE_URL to a PostgreSQL connection string first.');
}
if (
  !usernameArgument?.trim() ||
  usernameArgument.trim().length > 64 ||
  !nameArgument?.trim() ||
  nameArgument.trim().length > 120
) {
  throw new Error('Usage: npm run user:create -- <username> "<name>"');
}

function promptPassword() {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    let password = '';
    process.stdout.write('Password (minimum 8 characters): ');
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on('data', function onData(data) {
      const character = data.toString();
      if (character === '\u0003') {
        stdin.setRawMode(false);
        process.stdout.write('\n');
        process.exit(130);
      }
      if (character === '\r' || character === '\n') {
        stdin.removeListener('data', onData);
        stdin.setRawMode(false);
        process.stdout.write('\n');
        resolve(password);
      } else if (character === '\u007f' || character === '\b') {
        password = password.slice(0, -1);
      } else {
        password += character;
      }
    });
  });
}

const username = usernameArgument.trim().toLowerCase();
const name = nameArgument.trim();
const password = await promptPassword();
if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
  throw new Error('Password must be at least 8 characters and at most 72 bytes.');
}

const client = new Client({ connectionString: databaseUrl });
try {
  await client.connect();
  await client.query(
    `INSERT INTO "users" ("id", "username", "name", "password_hash", "role")
     VALUES ($1, $2, $3, $4, 'admin')`,
    [randomUUID(), username, name, await hash(password, 12)],
  );
  process.stdout.write(`Created administrator @${username}.\n`);
} catch (error) {
  if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
    throw new Error(`Username ${username} is already in use.`);
  }
  throw error;
} finally {
  await client.end();
}
