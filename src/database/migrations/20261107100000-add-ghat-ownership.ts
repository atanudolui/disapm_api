import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGhatOwnership20261107100000 implements MigrationInterface {
  name = 'AddGhatOwnership20261107100000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ghats"
      ADD COLUMN "created_by" uuid,
      ADD CONSTRAINT "FK_ghats_created_by"
        FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "ghat_inspections"
      ADD COLUMN "created_by" uuid,
      ADD CONSTRAINT "FK_ghat_inspections_created_by"
        FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      UPDATE "ghat_inspections" AS inspection
      SET "created_by" = users."id"
      FROM "users"
      WHERE users."username" = inspection."inspected_by"
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_ghats_created_by" ON "ghats" ("created_by")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_ghat_inspections_created_by"
      ON "ghat_inspections" ("created_by")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "IDX_ghat_inspections_created_by"');
    await queryRunner.query('DROP INDEX "IDX_ghats_created_by"');
    await queryRunner.query(`
      ALTER TABLE "ghat_inspections"
      DROP CONSTRAINT "FK_ghat_inspections_created_by",
      DROP COLUMN "created_by"
    `);
    await queryRunner.query(`
      ALTER TABLE "ghats"
      DROP CONSTRAINT "FK_ghats_created_by",
      DROP COLUMN "created_by"
    `);
  }
}
