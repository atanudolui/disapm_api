import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { INSPECTION_AREAS } from '../ghat-inspection.entity.js';
import { CreateInspectionDto } from './inspection.dto.js';

const validInspection = {
  periodStart: '2026-11-06',
  periodEnd: '2026-11-06',
  occasion: 'Durga Puja',
  latitude: 21.34,
  longitude: 87.76,
  checklist: Object.fromEntries(
    INSPECTION_AREAS.map((area) => [area, { status: 'compliant', notes: '' }]),
  ),
  deficiencies: [],
};

describe('CreateInspectionDto', () => {
  it('requires latitude and longitude', async () => {
    const {
      latitude: _latitude,
      longitude: _longitude,
      ...inspection
    } = validInspection;
    const dto = plainToInstance(CreateInspectionDto, inspection);

    await expect(validate(dto)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: 'latitude' }),
        expect.objectContaining({ property: 'longitude' }),
      ]),
    );
  });

  it('accepts numeric coordinates at valid boundaries', async () => {
    const dto = plainToInstance(CreateInspectionDto, {
      ...validInspection,
      latitude: -90,
      longitude: 180,
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.latitude).toBe(-90);
    expect(dto.longitude).toBe(180);
  });

  it('rejects coordinates sent as strings', async () => {
    const dto = plainToInstance(CreateInspectionDto, {
      ...validInspection,
      latitude: '',
      longitude: '',
    });

    await expect(validate(dto)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: 'latitude' }),
        expect.objectContaining({ property: 'longitude' }),
      ]),
    );
  });

  it('rejects coordinates outside valid ranges', async () => {
    const dto = plainToInstance(CreateInspectionDto, {
      ...validInspection,
      latitude: 91,
      longitude: -181,
    });

    await expect(validate(dto)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: 'latitude' }),
        expect.objectContaining({ property: 'longitude' }),
      ]),
    );
  });
});
