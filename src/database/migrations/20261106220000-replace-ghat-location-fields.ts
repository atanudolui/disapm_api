import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReplaceGhatLocationFields20261106220000
  implements MigrationInterface
{
  name = 'ReplaceGhatLocationFields20261106220000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ghats"
        ADD COLUMN "sub_division" character varying(500) NOT NULL DEFAULT '',
        ADD COLUMN "block" character varying(160) NOT NULL DEFAULT ''
    `);
    await queryRunner.query(`
      UPDATE "ghats"
      SET "sub_division" = "location"
    `);
    await queryRunner.query(`
      ALTER TABLE "ghats"
        DROP COLUMN "location",
        DROP COLUMN "is_major"
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ghats"
        ADD COLUMN "location" character varying(500) NOT NULL DEFAULT '',
        ADD COLUMN "is_major" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      UPDATE "ghats"
      SET "location" = "sub_division"
    `);
    await queryRunner.query(`
      ALTER TABLE "ghats"
        DROP COLUMN "sub_division",
        DROP COLUMN "block"
    `);
  }
}
