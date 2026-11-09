import { MigrationInterface, QueryRunner } from 'typeorm';

export class SplitInspectionAreas20261107000000 implements MigrationInterface {
  name = 'SplitInspectionAreas20261107000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "ghat_inspections"
      SET "checklist" = jsonb_build_object(
        'approachRoadsPathways', "checklist"->'accessLighting',
        'ghatLighting', "checklist"->'accessLighting',
        'crowdManagement', "checklist"->'crowdSafety',
        'safety', "checklist"->'crowdSafety',
        'policeWomenPolice', "checklist"->'policeWomenPolice',
        'cctvPublicAddress', "checklist"->'cctvPublicAddress',
        'rescueTeam', "checklist"->'rescueTeam',
        'drinkingWaterSanitation', "checklist"->'drinkingWaterSanitation',
        'womenFacilitiesSignage', "checklist"->'womenFacilitiesSignage',
        'emergencyResponse', "checklist"->'emergencyResponse',
        'cleanliness', "checklist"->'cleanliness'
      ),
      "deficiencies" = COALESCE(
        (
          SELECT jsonb_agg(expanded.item)
          FROM jsonb_array_elements("ghat_inspections"."deficiencies") AS entry(item)
          CROSS JOIN LATERAL jsonb_array_elements(
            CASE entry.item->>'category'
              WHEN 'accessLighting' THEN jsonb_build_array(
                jsonb_set(entry.item, '{category}', '"approachRoadsPathways"'::jsonb),
                jsonb_set(entry.item, '{category}', '"ghatLighting"'::jsonb)
              )
              WHEN 'crowdSafety' THEN jsonb_build_array(
                jsonb_set(entry.item, '{category}', '"crowdManagement"'::jsonb),
                jsonb_set(entry.item, '{category}', '"safety"'::jsonb)
              )
              ELSE jsonb_build_array(entry.item)
            END
          ) AS expanded(item)
        ),
        '[]'::jsonb
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "ghat_inspections"
      SET "checklist" = jsonb_build_object(
        'accessLighting', "checklist"->'approachRoadsPathways',
        'crowdSafety', "checklist"->'crowdManagement',
        'policeWomenPolice', "checklist"->'policeWomenPolice',
        'cctvPublicAddress', "checklist"->'cctvPublicAddress',
        'rescueTeam', "checklist"->'rescueTeam',
        'drinkingWaterSanitation', "checklist"->'drinkingWaterSanitation',
        'womenFacilitiesSignage', "checklist"->'womenFacilitiesSignage',
        'emergencyResponse', "checklist"->'emergencyResponse',
        'cleanliness', "checklist"->'cleanliness'
      ),
      "deficiencies" = COALESCE(
        (
          SELECT jsonb_agg(
            CASE
              WHEN entry.item->>'category' IN (
                'approachRoadsPathways', 'ghatLighting'
              )
                THEN jsonb_set(entry.item, '{category}', '"accessLighting"'::jsonb)
              WHEN entry.item->>'category' IN ('crowdManagement', 'safety')
                THEN jsonb_set(entry.item, '{category}', '"crowdSafety"'::jsonb)
              ELSE entry.item
            END
          )
          FROM jsonb_array_elements("ghat_inspections"."deficiencies") AS entry(item)
        ),
        '[]'::jsonb
      )
    `);
  }
}
