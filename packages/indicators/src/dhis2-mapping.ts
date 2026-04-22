// DHIS2 data element mapping for syncable indicators.
// Populated during Inception (Week 1) once DHIS2 access is negotiated with MoH.
// Policy: sync only national-reporting indicators (UN Minimum Set, BPfA, SDG).
// LWEP internal output indicators are NOT synced.

export interface Dhis2Mapping {
  indicatorCode: string;
  dhis2DataElementId: string;
  dhis2CategoryOptionComboId: string;
  dhis2OrgUnitId: string | null; // null = national (uses DHIS2 root)
  notes: string;
}

// Placeholder mappings — replace with real DHIS2 UIDs during Inception.
// Format: 11-character alphanumeric DHIS2 UID
export const DHIS2_MAPPINGS: ReadonlyMap<string, Dhis2Mapping> = new Map([
  // Example structure — UIDs are placeholders until confirmed with MoH DHIS2 admin
  // ['BPfA-REP-001', {
  //   indicatorCode: 'BPfA-REP-001',
  //   dhis2DataElementId: 'PLACEHOLDER_01',
  //   dhis2CategoryOptionComboId: 'HllvX50cXC0', // default combo
  //   dhis2OrgUnitId: null,
  //   notes: 'Women in parliament — confirmed with MoH DHIS2 admin 2026-XX-XX',
  // }],
]);

export function getDhis2Mapping(indicatorCode: string): Dhis2Mapping | undefined {
  return DHIS2_MAPPINGS.get(indicatorCode);
}
