import type { Prisma } from '../src/generated';

// Seed org unit hierarchy for the six LWEP counties.
// Uses LISGIS-aligned codes where known; placeholders marked with TODO.
// The full national hierarchy is populated during Inception from LISGIS data.

export const ORG_UNIT_SEEDS: Prisma.OrgUnitCreateManyInput[] = [
  // National
  {
    id: '00000000-0000-0000-0000-000000000001',
    parentId: null,
    level: 'NATIONAL',
    code: 'LBR',
    name: 'Republic of Liberia',
    shortName: 'Liberia',
    dhis2Id: null,
    lwepCovered: false,
  },

  // LWEP Counties (level: COUNTY)
  {
    id: '00000000-0000-0000-0000-000000000010',
    parentId: '00000000-0000-0000-0000-000000000001',
    level: 'COUNTY',
    code: 'LBR-BOM',
    name: 'Bomi County',
    shortName: 'Bomi',
    dhis2Id: null,
    lwepCovered: true,
  },
  {
    id: '00000000-0000-0000-0000-000000000011',
    parentId: '00000000-0000-0000-0000-000000000001',
    level: 'COUNTY',
    code: 'LBR-MON',
    name: 'Montserrado County',
    shortName: 'Montserrado',
    dhis2Id: null,
    lwepCovered: true,
  },
  {
    id: '00000000-0000-0000-0000-000000000012',
    parentId: '00000000-0000-0000-0000-000000000001',
    level: 'COUNTY',
    code: 'LBR-GBP',
    name: 'Gbarpolu County',
    shortName: 'Gbarpolu',
    dhis2Id: null,
    lwepCovered: true,
  },
  {
    id: '00000000-0000-0000-0000-000000000013',
    parentId: '00000000-0000-0000-0000-000000000001',
    level: 'COUNTY',
    code: 'LBR-RCS',
    name: 'River Cess County',
    shortName: 'River Cess',
    dhis2Id: null,
    lwepCovered: true,
  },
  {
    id: '00000000-0000-0000-0000-000000000014',
    parentId: '00000000-0000-0000-0000-000000000001',
    level: 'COUNTY',
    code: 'LBR-GCM',
    name: 'Grand Cape Mount County',
    shortName: 'Grand Cape Mount',
    dhis2Id: null,
    lwepCovered: true,
  },
  {
    id: '00000000-0000-0000-0000-000000000015',
    parentId: '00000000-0000-0000-0000-000000000001',
    level: 'COUNTY',
    code: 'LBR-GGH',
    name: 'Grand Gedeh County',
    shortName: 'Grand Gedeh',
    dhis2Id: null,
    lwepCovered: true,
  },

  // MOGCSP HQ (facility at national level for admin users)
  {
    id: '00000000-0000-0000-0000-000000000020',
    parentId: '00000000-0000-0000-0000-000000000001',
    level: 'FACILITY',
    code: 'LBR-MOGCSP-HQ',
    name: 'MOGCSP Headquarters',
    shortName: 'MOGCSP HQ',
    dhis2Id: null,
    lwepCovered: false,
  },
];

export const LWEP_ORG_UNIT_GROUP_ID = '00000000-0000-0000-0000-000000000099';

export const ORG_UNIT_GROUP_SEED: Prisma.OrgUnitGroupCreateInput = {
  id: LWEP_ORG_UNIT_GROUP_ID,
  name: 'LWEP Counties',
  members: {
    create: [
      '00000000-0000-0000-0000-000000000010',
      '00000000-0000-0000-0000-000000000011',
      '00000000-0000-0000-0000-000000000012',
      '00000000-0000-0000-0000-000000000013',
      '00000000-0000-0000-0000-000000000014',
      '00000000-0000-0000-0000-000000000015',
    ].map((orgUnitId) => ({ orgUnit: { connect: { id: orgUnitId } } })),
  },
};
