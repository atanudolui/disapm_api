import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGhatReadiness20261106170000
  implements MigrationInterface
{
  name = 'CreateGhatReadiness20261106170000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "ghats" (
        "id" uuid NOT NULL,
        "name" character varying(160) NOT NULL,
        "waterbody_type" character varying(20) NOT NULL,
        "district" character varying(120) NOT NULL,
        "location" character varying(500) NOT NULL,
        "nodal_officer_name" character varying(160) NOT NULL,
        "nodal_officer_contact" character varying(80) NOT NULL,
        "is_major" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ghats_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_ghats_waterbody_type" CHECK ("waterbody_type" IN ('river', 'pond'))
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "ghat_inspections" (
        "id" uuid NOT NULL,
        "ghat_id" uuid NOT NULL,
        "inspection_date" date NOT NULL,
        "occasion" character varying(160) NOT NULL,
        "inspection_team" character varying(1000) NOT NULL,
        "checklist" jsonb NOT NULL,
        "deficiencies" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "inspected_by" character varying(254) NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ghat_inspections_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ghat_inspections_ghat"
          FOREIGN KEY ("ghat_id") REFERENCES "ghats"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_ghat_inspections_ghat_date"
      ON "ghat_inspections" ("ghat_id", "inspection_date" DESC)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "IDX_ghat_inspections_ghat_date"');
    await queryRunner.query('DROP TABLE "ghat_inspections"');
    await queryRunner.query('DROP TABLE "ghats"');
  }
}
