export const County = {
  BOMI: 'BOMI',
  MONTSERRADO: 'MONTSERRADO',
  GBARPOLU: 'GBARPOLU',
  RIVER_CESS: 'RIVER_CESS',
  GRAND_CAPE_MOUNT: 'GRAND_CAPE_MOUNT',
  GRAND_GEDEH: 'GRAND_GEDEH',
} as const;

export type County = (typeof County)[keyof typeof County];

export const LWEP_COUNTIES: ReadonlyArray<County> = [
  County.BOMI,
  County.MONTSERRADO,
  County.GBARPOLU,
  County.RIVER_CESS,
  County.GRAND_CAPE_MOUNT,
  County.GRAND_GEDEH,
];

export const OrgUnitLevel = {
  NATIONAL: 'NATIONAL',
  COUNTY: 'COUNTY',
  DISTRICT: 'DISTRICT',
  COMMUNITY: 'COMMUNITY',
  FACILITY: 'FACILITY',
} as const;

export type OrgUnitLevel = (typeof OrgUnitLevel)[keyof typeof OrgUnitLevel];
