// Formula registry for computed indicators.
// Each formula is a pure function keyed by name (matching the `formula` field in the catalog).
// Complex aggregations that require database access are wired in apps/api indicators module,
// NOT here — this module contains only pure numeric formulas.

export interface FormulaInputs {
  [key: string]: number;
}

export type FormulaFn = (inputs: FormulaInputs) => number | null;

/**
 * Maternal mortality ratio per 100,000 live births.
 * Inputs: maternalDeaths, livebirths
 */
function computeMmrPer100k(inputs: FormulaInputs): number | null {
  const { maternalDeaths, livebirths } = inputs;
  if (maternalDeaths === undefined || livebirths === undefined) return null;
  if (livebirths === 0) return null;
  return (maternalDeaths / livebirths) * 100_000;
}

/**
 * Percentage (numerator / denominator * 100).
 * Generic formula for any rate indicator.
 */
function computePercentage(inputs: FormulaInputs): number | null {
  const { numerator, denominator } = inputs;
  if (numerator === undefined || denominator === undefined) return null;
  if (denominator === 0) return null;
  return (numerator / denominator) * 100;
}

/**
 * Gender wage gap as % of male wages.
 * Inputs: maleMedianWage, femaleMedianWage
 */
function computeGenderWageGap(inputs: FormulaInputs): number | null {
  const { maleMedianWage, femaleMedianWage } = inputs;
  if (maleMedianWage === undefined || femaleMedianWage === undefined) return null;
  if (maleMedianWage === 0) return null;
  return ((maleMedianWage - femaleMedianWage) / maleMedianWage) * 100;
}

// The formulas that need database access return null here and are implemented
// as service methods in apps/api/src/modules/indicators/formulas.service.ts.
// They are registered here as stubs so the catalog reference is valid.
function computeCommunitiesWithSasaSessions(_inputs: FormulaInputs): null {
  return null; // Implemented in API indicators service
}

function computeSasaSessionAttendance(_inputs: FormulaInputs): null {
  return null;
}

function computeGbvCasesWithService(_inputs: FormulaInputs): null {
  return null;
}

function computeGbvCaseCounts(_inputs: FormulaInputs): null {
  return null;
}

function computeLivelihoodGrantRecipients(_inputs: FormulaInputs): null {
  return null;
}

function computeDataCompletenessRate(_inputs: FormulaInputs): null {
  return null;
}

export const FORMULA_REGISTRY: ReadonlyMap<string, FormulaFn> = new Map([
  ['computeMmrPer100k', computeMmrPer100k],
  ['computePercentage', computePercentage],
  ['computeGenderWageGap', computeGenderWageGap],
  ['computeCommunitiesWithSasaSessions', computeCommunitiesWithSasaSessions],
  ['computeSasaSessionAttendance', computeSasaSessionAttendance],
  ['computeGbvCasesWithService', computeGbvCasesWithService],
  ['computeGbvCaseCounts', computeGbvCaseCounts],
  ['computeLivelihoodGrantRecipients', computeLivelihoodGrantRecipients],
  ['computeDataCompletenessRate', computeDataCompletenessRate],
]);

export function computeIndicator(
  formulaName: string,
  inputs: FormulaInputs,
): number | null {
  const fn = FORMULA_REGISTRY.get(formulaName);
  if (!fn) return null;
  return fn(inputs);
}
