import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { GhatInspection, INSPECTION_AREAS } from './ghat-inspection.entity.js';
import { GhatInspectionPhoto } from './ghat-inspection-photo.entity.js';
import { Ghat } from './ghat.entity.js';
import { User } from '../auth/user.entity.js';
import { CreateInspectionDto } from './dto/inspection.dto.js';
import { GhatsService } from './ghats.service.js';

describe('GhatsService', () => {
  const ghats = {
    find: vi.fn(),
    findOne: vi.fn(),
    findOneBy: vi.fn(),
    create: vi.fn((ghat) => ghat),
    save: vi.fn(),
    delete: vi.fn(),
  };
  const inspections = {
    manager: {
      transaction: vi.fn(
        async (callback: (manager: typeof transactionManager) => unknown) =>
          callback(transactionManager),
      ),
    },
    find: vi.fn(),
    findOneBy: vi.fn(),
    create: vi.fn((inspection) => inspection),
    save: vi.fn(),
  };
  const transactionManager = {
    save: vi.fn(async (_entity: unknown, value: unknown) => value),
    delete: vi.fn(),
  };
  const photos = {
    countBy: vi.fn(),
    findBy: vi.fn(),
    createQueryBuilder: vi.fn(),
  };
  const users = { find: vi.fn() };
  const adminScope = { userId: 'admin-id', role: 'admin' as const };
  let service: GhatsService;

  beforeEach(async () => {
    vi.clearAllMocks();
    users.find.mockResolvedValue([]);
    const moduleRef = await Test.createTestingModule({
      providers: [
        GhatsService,
        { provide: getRepositoryToken(Ghat), useValue: ghats },
        {
          provide: getRepositoryToken(GhatInspection),
          useValue: inspections,
        },
        { provide: getRepositoryToken(GhatInspectionPhoto), useValue: photos },
        { provide: getRepositoryToken(User), useValue: users },
      ],
    }).compile();
    service = moduleRef.get(GhatsService);
  });

  it('creates a normalized ghat with its Nodal Officer details', async () => {
    ghats.save.mockImplementation(async (ghat) => ghat);

    await service.createGhat({
      name: '  River Ghat ',
      waterbodyType: 'river',
      district: ' District A ',
      subDivision: ' Subdivision A ',
      block: ' Block 1 ',
      nodalOfficerName: ' Officer One ',
      nodalOfficerContact: ' 1234567890 ',
    });

    expect(ghats.save).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'River Ghat',
        district: 'District A',
        subDivision: 'Subdivision A',
        block: 'Block 1',
        nodalOfficerName: 'Officer One',
        nodalOfficerContact: '1234567890',
      }),
    );
  });

  it('requires a tracked deficiency for each checklist finding', async () => {
    ghats.findOneBy.mockResolvedValue({ id: 'ghat-id' });
    ghats.findOne.mockResolvedValue({ id: 'ghat-id', inspections: [] });

    await expect(
      service.createInspection(
        'ghat-id',
        {
          periodStart: '2026-11-06',
          periodEnd: '2026-11-06',
          occasion: 'Durga Puja',
          latitude: 21.34,
          longitude: 87.76,
          checklist: {
            approachRoadsPathways: {
              status: 'deficiency',
              notes: 'Approach pathway is blocked',
            },
            ghatLighting: { status: 'compliant', notes: '' },
            crowdManagement: { status: 'compliant', notes: '' },
            safety: { status: 'compliant', notes: '' },
            policeWomenPolice: { status: 'compliant', notes: '' },
            cctvPublicAddress: { status: 'compliant', notes: '' },
            rescueTeam: { status: 'compliant', notes: '' },
            drinkingWaterSanitation: { status: 'compliant', notes: '' },
            womenFacilitiesSignage: { status: 'compliant', notes: '' },
            emergencyResponse: { status: 'compliant', notes: '' },
            cleanliness: { status: 'compliant', notes: '' },
          },
          deficiencies: [],
        },
        'admin@example.com',
        adminScope.userId,
        adminScope,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(inspections.save).not.toHaveBeenCalled();
  });

  it('creates an inspection with the festival period and split checklist', async () => {
    ghats.findOneBy.mockResolvedValue({ id: 'ghat-id' });
    ghats.findOne.mockResolvedValue({ id: 'ghat-id', inspections: [] });
    inspections.save.mockImplementation(async (inspection) => inspection);

    await service.createInspection(
      'ghat-id',
      {
        periodStart: '2026-11-06',
        periodEnd: '2026-11-08',
        occasion: 'Kali Puja',
        latitude: 21.34,
        longitude: 87.76,
        checklist: {
          approachRoadsPathways: { status: 'compliant', notes: '' },
          ghatLighting: { status: 'compliant', notes: '' },
          crowdManagement: { status: 'compliant', notes: '' },
          safety: { status: 'compliant', notes: '' },
          policeWomenPolice: { status: 'compliant', notes: '' },
          cctvPublicAddress: { status: 'compliant', notes: '' },
          rescueTeam: { status: 'compliant', notes: '' },
          drinkingWaterSanitation: { status: 'compliant', notes: '' },
          womenFacilitiesSignage: { status: 'compliant', notes: '' },
          emergencyResponse: { status: 'compliant', notes: '' },
          cleanliness: { status: 'compliant', notes: '' },
        },
        deficiencies: [],
      },
      'admin@example.com',
      adminScope.userId,
      adminScope,
    );

    expect(inspections.create).toHaveBeenCalledWith(
      expect.objectContaining({
        periodStart: '2026-11-06',
        periodEnd: '2026-11-08',
        occasion: 'Kali Puja',
        latitude: 21.34,
        longitude: 87.76,
        checklist: expect.objectContaining({
          drinkingWaterSanitation: { status: 'compliant', notes: '' },
          womenFacilitiesSignage: { status: 'compliant', notes: '' },
          emergencyResponse: { status: 'compliant', notes: '' },
        }),
      }),
    );
  });

  it('stores uploaded inspection photos in the database transaction', async () => {
    ghats.findOne.mockResolvedValue({ id: 'ghat-id', inspections: [] });
    const inspection = plainToInstance(CreateInspectionDto, {
      periodStart: '2026-11-06',
      periodEnd: '2026-11-08',
      occasion: 'Kali Puja',
      latitude: 21.34,
      longitude: 87.76,
      checklist: Object.fromEntries(
        INSPECTION_AREAS.map((area) => [
          area,
          { status: 'compliant', notes: '' },
        ]),
      ),
      deficiencies: [],
    });

    const image = Buffer.from([0xff, 0xd8, 0xff]);

    await expect(
      service.createInspection(
        'ghat-id',
        inspection,
        'admin',
        adminScope.userId,
        adminScope,
        [
          {
            originalname: 'spoofed.jpg',
            mimetype: 'image/jpeg',
            size: 3,
            buffer: Buffer.from('not an image'),
          },
        ],
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transactionManager.save).not.toHaveBeenCalled();

    await service.createInspection(
      'ghat-id',
      inspection,
      'admin',
      adminScope.userId,
      adminScope,
      [
        {
          originalname: 'river.jpg',
          mimetype: 'image/jpeg',
          size: image.length,
          buffer: image,
        },
      ],
    );

    expect(transactionManager.save).toHaveBeenNthCalledWith(
      2,
      GhatInspectionPhoto,
      [
        expect.objectContaining({
          inspectionId: expect.any(String),
          fileName: 'river.jpg',
          mimeType: 'image/jpeg',
          size: image.length,
          data: image,
        }),
      ],
    );
  });

  it('removes selected inspection photos in the update transaction', async () => {
    const inspection = {
      id: 'inspection-id',
      createdBy: adminScope.userId,
      periodStart: '2026-11-06',
      periodEnd: '2026-11-08',
      occasion: 'Kali Puja',
      checklist: Object.fromEntries(
        INSPECTION_AREAS.map((area) => [
          area,
          { status: 'compliant', notes: '' },
        ]),
      ),
      deficiencies: [],
    };
    inspections.findOneBy.mockResolvedValue(inspection);
    photos.findBy.mockResolvedValue([{ id: 'photo-id' }]);
    photos.countBy.mockResolvedValue(1);

    await service.updateInspection(
      'inspection-id',
      { removePhotoIds: ['photo-id'] },
      adminScope,
    );

    expect(transactionManager.delete).toHaveBeenCalledWith(
      GhatInspectionPhoto,
      expect.objectContaining({ inspectionId: 'inspection-id' }),
    );
    expect(transactionManager.save).toHaveBeenCalledWith(
      GhatInspection,
      expect.objectContaining({ id: 'inspection-id' }),
    );
  });

  it('rejects a festival period that ends before it starts', async () => {
    ghats.findOneBy.mockResolvedValue({ id: 'ghat-id' });
    ghats.findOne.mockResolvedValue({ id: 'ghat-id', inspections: [] });

    await expect(
      service.createInspection(
        'ghat-id',
        {
          periodStart: '2026-11-07',
          periodEnd: '2026-11-06',
          occasion: 'Durga Puja',
          latitude: 21.34,
          longitude: 87.76,
          checklist: {
            approachRoadsPathways: { status: 'compliant', notes: '' },
            ghatLighting: { status: 'compliant', notes: '' },
            crowdManagement: { status: 'compliant', notes: '' },
            safety: { status: 'compliant', notes: '' },
            policeWomenPolice: { status: 'compliant', notes: '' },
            cctvPublicAddress: { status: 'compliant', notes: '' },
            rescueTeam: { status: 'compliant', notes: '' },
            drinkingWaterSanitation: { status: 'compliant', notes: '' },
            womenFacilitiesSignage: { status: 'compliant', notes: '' },
            emergencyResponse: { status: 'compliant', notes: '' },
            cleanliness: { status: 'compliant', notes: '' },
          },
          deficiencies: [],
        },
        'admin@example.com',
        adminScope.userId,
        adminScope,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(inspections.save).not.toHaveBeenCalled();
  });

  it('summarizes latest inspection data and includes every inspection', async () => {
    ghats.find.mockResolvedValue([
      {
        id: 'ghat-id',
        name: 'River Ghat',
        waterbodyType: 'river',
        district: 'District A',
        subDivision: 'Subdivision A',
        block: 'Block 1',
        nodalOfficerName: 'Officer One',
        nodalOfficerContact: '1234567890',
      },
    ]);
    inspections.find.mockResolvedValue([
      {
        id: 'inspection-id',
        ghatId: 'ghat-id',
        periodStart: '2026-11-06',
        periodEnd: '2026-11-08',
        occasion: 'Durga Puja',
        inspectedBy: 'admin@example.com',
        checklist: {},
        deficiencies: [
          {
            category: 'approachRoadsPathways',
            description: 'No backup lights',
            status: 'pending',
            actionTaken: '',
          },
        ],
        photos: [{ id: 'photo-id', fileName: 'inspection.jpg' }],
        createdAt: new Date('2026-11-06T10:00:00.000Z'),
        updatedAt: new Date('2026-11-06T10:00:00.000Z'),
      },
    ]);

    const report = await service.getActionTakenReport(adminScope);

    expect(report).toMatchObject({
      totalGhats: 1,
      inspectedGhats: 1,
      pendingDeficiencies: 1,
      ghats: [
        {
          ghat: {
            waterbodyType: 'river',
            subDivision: 'Subdivision A',
            block: 'Block 1',
          },
          inspections: [
            {
              id: 'inspection-id',
              occasion: 'Durga Puja',
              periodStart: '2026-11-06',
              photos: [{ id: 'photo-id', fileName: 'inspection.jpg' }],
              deficiencies: [
                {
                  category: 'approachRoadsPathways',
                  status: 'pending',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  it('limits non-admin users to their ghats and inspections', async () => {
    ghats.find.mockResolvedValue([
      {
        id: 'mine',
        createdBy: 'user-id',
        inspections: [
          { id: 'mine-inspection', createdBy: 'user-id' },
          { id: 'other-inspection', createdBy: 'other-user' },
        ],
      },
      {
        id: 'other',
        createdBy: 'other-user',
        inspections: [{ id: 'mine-inspection-2', createdBy: 'user-id' }],
      },
      {
        id: 'hidden',
        createdBy: 'other-user',
        inspections: [{ id: 'other-inspection-2', createdBy: 'other-user' }],
      },
    ]);

    await expect(
      service.listGhats({ userId: 'user-id', role: 'user' }),
    ).resolves.toEqual([
      expect.objectContaining({
        id: 'mine',
        inspections: [{ id: 'mine-inspection', createdBy: 'user-id' }],
      }),
      expect.objectContaining({
        id: 'other',
        inspections: [{ id: 'mine-inspection-2', createdBy: 'user-id' }],
      }),
    ]);
  });
});
