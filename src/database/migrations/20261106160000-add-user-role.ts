import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserRole20261106160000 implements MigrationInterface {
  name = 'AddUserRole20261106160000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "role" character varying(20) NOT NULL DEFAULT 'user',
      ADD CONSTRAINT "CHK_users_role" CHECK ("role" IN ('user', 'admin'))
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP CONSTRAINT "CHK_users_role",
      DROP COLUMN "role"
    `);
  }
}
