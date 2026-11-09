import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInspectionLocationAndPhotos20261107110000 implements MigrationInterface {
  name = 'AddInspectionLocationAndPhotos20261107110000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ghat_inspections"
      ADD COLUMN "latitude" double precision,
      ADD COLUMN "longitude" double precision,
      ADD CONSTRAINT "CHK_ghat_inspections_latitude"
        CHECK ("latitude" IS NULL OR "latitude" BETWEEN -90 AND 90),
      ADD CONSTRAINT "CHK_ghat_inspections_longitude"
        CHECK ("longitude" IS NULL OR "longitude" BETWEEN -180 AND 180)
    `);
    await queryRunner.query(`
      CREATE TABLE "ghat_inspection_photos" (
        "id" uuid NOT NULL,
        "inspection_id" uuid NOT NULL,
        "file_name" character varying(255) NOT NULL,
        "mime_type" character varying(50) NOT NULL,
        "size" integer NOT NULL,
        "data" bytea NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ghat_inspection_photos_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_ghat_inspection_photos_size"
          CHECK ("size" BETWEEN 1 AND 2097152),
        CONSTRAINT "CHK_ghat_inspection_photos_mime_type"
          CHECK ("mime_type" IN ('image/jpeg', 'image/png', 'image/webp')),
        CONSTRAINT "FK_ghat_inspection_photos_inspection"
          FOREIGN KEY ("inspection_id")
          REFERENCES "ghat_inspections"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_ghat_inspection_photos_inspection"
      ON "ghat_inspection_photos" ("inspection_id")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX "IDX_ghat_inspection_photos_inspection"',
    );
    await queryRunner.query('DROP TABLE "ghat_inspection_photos"');
    await queryRunner.query(`
      ALTER TABLE "ghat_inspections"
      DROP CONSTRAINT "CHK_ghat_inspections_latitude",
      DROP CONSTRAINT "CHK_ghat_inspections_longitude",
      DROP COLUMN "latitude",
      DROP COLUMN "longitude"
    `);
  }
}
