import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateInspectionFields20261106230000
  implements MigrationInterface
{
  name = 'UpdateInspectionFields20261106230000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const queries = [
      'DROP INDEX "IDX_ghat_inspections_ghat_date"',
      `ALTER TABLE "ghat_inspections"
        ADD COLUMN "period_start" date,
        ADD COLUMN "period_end" date`,
      `UPDATE "ghat_inspections"
      SET "period_start" = "inspection_date",
          "period_end" = "inspection_date"`,
      `ALTER TABLE "ghat_inspections"
        ALTER COLUMN "period_start" SET NOT NULL,
        ALTER COLUMN "period_end" SET NOT NULL`,
      `UPDATE "ghat_inspections"
      SET "checklist" = jsonb_build_object(
        'accessLighting', "checklist"->'accessLighting',
        'crowdSafety', "checklist"->'crowdSafety',
        'policeWomenPolice', "checklist"->'securityRescue',
        'cctvPublicAddress', "checklist"->'securityRescue',
        'rescueTeam', "checklist"->'securityRescue',
        'drinkingWaterSanitation', "checklist"->'publicAmenities',
        'womenFacilitiesSignage', "checklist"->'publicAmenities',
        'emergencyResponse', "checklist"->'publicAmenities',
        'cleanliness', "checklist"->'cleanliness'
      )`,
      `UPDATE "ghat_inspections"
      SET "deficiencies" = COALESCE(
        (
          SELECT jsonb_agg(
            CASE
              WHEN item->>'category' = 'securityRescue'
                THEN jsonb_set(item, '{category}', '"rescueTeam"'::jsonb)
              WHEN item->>'category' = 'publicAmenities'
                THEN jsonb_set(
                  item,
                  '{category}',
                  '"drinkingWaterSanitation"'::jsonb
                )
              ELSE item
            END
          )
          FROM jsonb_array_elements("deficiencies") AS entries(item)
        ),
        '[]'::jsonb
      )`,
      `ALTER TABLE "ghat_inspections"
        DROP COLUMN "inspection_date",
        DROP COLUMN "inspection_team"`,
      `CREATE INDEX "IDX_ghat_inspections_ghat_period_start"
        ON "ghat_inspections" ("ghat_id", "period_start" DESC)`,
    ];
    for (const query of queries) await queryRunner.query(query);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const queries = [
      'DROP INDEX "IDX_ghat_inspections_ghat_period_start"',
      `ALTER TABLE "ghat_inspections"
        ADD COLUMN "inspection_date" date,
        ADD COLUMN "inspection_team" character varying(1000) NOT NULL DEFAULT ''`,
      `UPDATE "ghat_inspections"
      SET "inspection_date" = "period_start",
          "checklist" = jsonb_build_object(
            'accessLighting', "checklist"->'accessLighting',
            'crowdSafety', "checklist"->'crowdSafety',
            'securityRescue', COALESCE(
              "checklist"->'rescueTeam',
              "checklist"->'cctvPublicAddress',
              "checklist"->'policeWomenPolice'
            ),
            'publicAmenities', COALESCE(
              "checklist"->'drinkingWaterSanitation',
              "checklist"->'womenFacilitiesSignage'
            ),
            'cleanliness', "checklist"->'cleanliness'
          ),
          "deficiencies" = COALESCE(
            (
              SELECT jsonb_agg(
                CASE
                  WHEN item->>'category' IN (
                    'policeWomenPolice', 'cctvPublicAddress', 'rescueTeam'
                  )
                    THEN jsonb_set(item, '{category}', '"securityRescue"'::jsonb)
                  WHEN item->>'category' IN (
                    'emergencyResponse', 'publicAmenities'
                  )
                    THEN jsonb_set(item, '{category}', '"publicAmenities"'::jsonb)
                  WHEN item->>'category' = 'drinkingWaterSanitation'
                    THEN jsonb_set(item, '{category}', '"publicAmenities"'::jsonb)
                  WHEN item->>'category' = 'womenFacilitiesSignage'
                    THEN jsonb_set(item, '{category}', '"publicAmenities"'::jsonb)
                  ELSE item
                END
              )
              FROM jsonb_array_elements("ghat_inspections"."deficiencies")
                AS entries(item)
            ),
            '[]'::jsonb
          )`,
      `ALTER TABLE "ghat_inspections"
        ALTER COLUMN "inspection_date" SET NOT NULL,
        ALTER COLUMN "inspection_team" DROP DEFAULT,
        DROP COLUMN "period_start",
        DROP COLUMN "period_end"`,
      `CREATE INDEX "IDX_ghat_inspections_ghat_date"
        ON "ghat_inspections" ("ghat_id", "inspection_date" DESC)`,
    ];
    for (const query of queries) await queryRunner.query(query);
  }
}
