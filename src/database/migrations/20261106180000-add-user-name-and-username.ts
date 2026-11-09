import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserNameAndUsername20261106180000 implements MigrationInterface {
  name = 'AddUserNameAndUsername20261106180000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "username" character varying(64),
      ADD COLUMN "name" character varying(120)
    `);
    await queryRunner.query(`
      UPDATE "users"
      SET
        "username" = left(lower(split_part("email", '@', 1)), 52)
          || '-' || left(replace("id"::text, '-', ''), 8),
        "name" = left(split_part("email", '@', 1), 120)
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "username" SET NOT NULL,
      ALTER COLUMN "name" SET NOT NULL,
      ADD CONSTRAINT "UQ_users_username" UNIQUE ("username")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP CONSTRAINT "UQ_users_username",
      DROP COLUMN "username",
      DROP COLUMN "name"
    `);
  }
}
