import { describe, it, expect } from 'vitest';

import { INDICATOR_CATALOG, computeIndicator, FORMULA_REGISTRY } from './index';

describe('INDICATOR_CATALOG', () => {
  it('contains at least 22 indicators (LWEP minimum set)', () => {
    expect(INDICATOR_CATALOG.size).toBeGreaterThanOrEqual(22);
  });

  it('every indicator has required metadata fields', () => {
    for (const [code, meta] of INDICATOR_CATALOG) {
      expect(meta.code, `${code}: code field`).toBe(code);
      expect(meta.name, `${code}: name`).toBeTruthy();
      expect(meta.framework, `${code}: framework`).toBeTruthy();
      expect(meta.unit, `${code}: unit`).toBeTruthy();
      expect(meta.periodicity, `${code}: periodicity`).toBeTruthy();
      expect(meta.custodianAgency, `${code}: custodianAgency`).toBeTruthy();
    }
  });

  it('no two indicators share the same code', () => {
    const codes = Array.from(INDICATOR_CATALOG.keys());
    const unique = new Set(codes);
    expect(unique.size).toBe(codes.length);
  });

  it('indicators marked dhis2Sync have a dhis2DataElementId', () => {
    for (const [code, meta] of INDICATOR_CATALOG) {
      if (meta.dhis2Sync) {
        expect(meta.dhis2DataElementId, `${code}: dhis2DataElementId required when dhis2Sync=true`).not.toBeNull();
      }
    }
  });

  it('all framework values are valid', () => {
    const validFrameworks = ['BPFA', 'SDG', 'CEDAW', 'AU_WPS', 'LWEP', 'NATIONAL', 'MAPUTO'];
    for (const [code, meta] of INDICATOR_CATALOG) {
      expect(validFrameworks, `${code}: unknown framework "${meta.framework}"`).toContain(meta.framework);
    }
  });

  it('formula field references a known formula or is null', () => {
    for (const [code, meta] of INDICATOR_CATALOG) {
      if (meta.formula !== null) {
        expect(
          FORMULA_REGISTRY.has(meta.formula),
          `${code}: formula "${meta.formula}" not found in FORMULA_REGISTRY`,
        ).toBe(true);
      }
    }
  });
});

describe('computeIndicator()', () => {
  describe('computePercentage', () => {
    it('returns numerator/denominator * 100', () => {
      const result = computeIndicator('computePercentage', { numerator: 30, denominator: 100 });
      expect(result).toBe(30);
    });

    it('returns null when denominator is 0', () => {
      expect(computeIndicator('computePercentage', { numerator: 10, denominator: 0 })).toBeNull();
    });

    it('returns null when inputs are missing', () => {
      expect(computeIndicator('computePercentage', {})).toBeNull();
    });
  });

  describe('computeMmrPer100k', () => {
    it('calculates maternal mortality ratio correctly', () => {
      // 50 deaths per 10,000 live births = 500 per 100,000
      const result = computeIndicator('computeMmrPer100k', { maternalDeaths: 50, livebirths: 10000 });
      expect(result).toBe(500);
    });

    it('returns null when livebirths is 0', () => {
      expect(computeIndicator('computeMmrPer100k', { maternalDeaths: 5, livebirths: 0 })).toBeNull();
    });

    it('returns null when inputs are missing', () => {
      expect(computeIndicator('computeMmrPer100k', { maternalDeaths: 5 })).toBeNull();
    });
  });

  describe('computeGenderWageGap', () => {
    it('calculates wage gap correctly', () => {
      // Male earns 100, female earns 80 → gap = (100-80)/100 = 20%
      const result = computeIndicator('computeGenderWageGap', { maleMedianWage: 100, femaleMedianWage: 80 });
      expect(result).toBe(20);
    });

    it('returns 0 when wages are equal', () => {
      expect(computeIndicator('computeGenderWageGap', { maleMedianWage: 100, femaleMedianWage: 100 })).toBe(0);
    });

    it('returns null when male wage is 0', () => {
      expect(computeIndicator('computeGenderWageGap', { maleMedianWage: 0, femaleMedianWage: 50 })).toBeNull();
    });

    it('returns null when inputs are missing', () => {
      expect(computeIndicator('computeGenderWageGap', {})).toBeNull();
    });
  });

  it('returns null for an unknown formula name', () => {
    expect(computeIndicator('nonExistentFormula', { x: 1 })).toBeNull();
  });

  it('DB-dependent formulas return null (implemented in API layer)', () => {
    // These stubs return null and are implemented in apps/api indicators module
    expect(computeIndicator('computeGbvCasesWithService', {})).toBeNull();
    expect(computeIndicator('computeSasaSessionAttendance', {})).toBeNull();
    expect(computeIndicator('computeLivelihoodGrantRecipients', {})).toBeNull();
  });
});
