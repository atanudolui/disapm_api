import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveUserEmail20261106190000 implements MigrationInterface {
  name = 'RemoveUserEmail20261106190000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP CONSTRAINT "UQ_users_email",
      DROP COLUMN "email"
    `);
  }

  async down(_queryRunner: QueryRunner): Promise<void> {
    throw new Error('Removed email addresses cannot be restored.');
  }
}
