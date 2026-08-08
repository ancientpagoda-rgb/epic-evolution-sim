export const SCIENCE_CONSTANTS = {
  universeAgeYears: 13.8e9,
  recombinationYearsAfterBigBang: 380_000,
  cmbTemperatureKelvinToday: 2.7255,
} as const;

export type EvidenceClass = 'A-established' | 'B-reduced-model' | 'C-phenomenological' | 'D-speculative';
