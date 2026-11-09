import { validate } from 'class-validator';
import { CreateGhatDto, UpdateGhatDto } from './ghat.dto.js';

const validGhat = {
  name: 'River Ghat',
  waterbodyType: 'river' as const,
  district: 'Purba Medinipur',
  subDivision: 'Tamluk',
  block: 'Tamluk',
};

describe('ghat DTO validation', () => {
  it('allows creating a ghat without a nodal officer when unchecked', async () => {
    const dto = Object.assign(new CreateGhatDto(), {
      ...validGhat,
      nodalOfficerName: '',
      nodalOfficerContact: '',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('allows omitted nodal officer fields', async () => {
    const dto = Object.assign(new CreateGhatDto(), validGhat);

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('allows clearing nodal officer fields when updating a ghat', async () => {
    const dto = Object.assign(new UpdateGhatDto(), {
      nodalOfficerName: '',
      nodalOfficerContact: '',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });
});
