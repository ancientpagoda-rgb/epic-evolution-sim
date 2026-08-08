export type EvidenceClass = 'A' | 'B' | 'C' | 'D';

export interface ScientificReference {
  id: string;
  authority: string;
  title: string;
  url: string;
  evidence: EvidenceClass;
}

export const COSMOLOGY_REFERENCES: readonly ScientificReference[] = [
  {
    id: 'PLANCK_2018_VI',
    authority: 'Planck Collaboration / A&A',
    title: 'Planck 2018 results. VI. Cosmological parameters',
    url: 'https://www.aanda.org/articles/aa/abs/2020/09/aa33910-18/aa33910-18.html',
    evidence: 'B',
  },
  {
    id: 'NASA_UNIVERSE_OVERVIEW_2026',
    authority: 'NASA Science',
    title: 'Universe Overview',
    url: 'https://science.nasa.gov/universe/overview/',
    evidence: 'A',
  },
  {
    id: 'NASA_COSMIC_WEB',
    authority: 'NASA / ESA / Hubble',
    title: 'Mapping the Cosmic Web',
    url: 'https://science.nasa.gov/mission/hubble/science/science-highlights/mapping-the-cosmic-web/',
    evidence: 'A',
  },
] as const;

export const SI = {
  secondsPerJulianYear: 31_557_600,
  metersPerMegaparsec: 3.085_677_581_491_367e22,
} as const;

/**
 * Phase 3 uses the Planck 2018 base-flat-LCDM solution as a reproducible
 * baseline, not as a claim that the late-Universe Hubble tension is settled.
 */
export const PLANCK_LAMBDA_CDM = {
  hubbleKmSPerMpc: 67.4,
  omegaMatter: 0.315,
  omegaBaryon: 0.0493,
  omegaRadiation: 9.2e-5,
  omegaLambda: 1 - 0.315 - 9.2e-5,
  scalarSpectralIndex: 0.965,
  sigma8: 0.811,
  cmbTemperatureK: 2.7255,
  recombinationAgeYears: 380_000,
  nominalUniverseAgeYears: 13.8e9,
} as const;

export const HUBBLE_0_SI =
  (PLANCK_LAMBDA_CDM.hubbleKmSPerMpc * 1000) / SI.metersPerMegaparsec;

export const RECOMBINATION_AGE_SECONDS =
  PLANCK_LAMBDA_CDM.recombinationAgeYears * SI.secondsPerJulianYear;

export const NOMINAL_UNIVERSE_AGE_SECONDS =
  PLANCK_LAMBDA_CDM.nominalUniverseAgeYears * SI.secondsPerJulianYear;
