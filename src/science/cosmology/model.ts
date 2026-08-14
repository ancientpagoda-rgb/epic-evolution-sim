import {
  HUBBLE_0_SI,
  NOMINAL_UNIVERSE_AGE_SECONDS,
  PLANCK_LAMBDA_CDM,
  RECOMBINATION_AGE_SECONDS,
  SI,
} from './constants';

export type CosmologyEra =
  | 'primordial-plasma'
  | 'recombination'
  | 'dark-ages'
  | 'structure-growth'
  | 'mature-cosmos';

export interface CosmologyState {
  ageSeconds: number;
  scaleFactor: number;
  redshift: number;
  hubblePerSecond: number;
  cmbTemperatureK: number;
  ionizationFraction: number;
  recombinationProgress: number;
  growthFactor: number;
  growthNormalized: number;
  era: CosmologyEra;
}

interface AgeSample {
  scaleFactor: number;
  ageSeconds: number;
}

const MIN_SCALE_FACTOR = 1e-12;
const MIN_TIMELINE_AGE_SECONDS = 1e-12;
const TIMELINE_RECOMBINATION_POINT = 0.34;
const FIRST_STRUCTURE_AGE_SECONDS = 100e6 * SI.secondsPerJulianYear;
const MATURE_COSMOS_AGE_SECONDS = 1e9 * SI.secondsPerJulianYear;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function smoothLogistic(value: number): number {
  if (value > 40) return 1;
  if (value < -40) return 0;
  return 1 / (1 + Math.exp(-value));
}

export class FlatLambdaCDMModel {
  private readonly ageTable: AgeSample[];
  readonly presentAgeSeconds: number;

  constructor(private readonly tableSize = 4096) {
    if (!Number.isInteger(tableSize) || tableSize < 256) {
      throw new Error(`Cosmology lookup table must contain at least 256 samples, received ${tableSize}`);
    }
    this.ageTable = this.buildAgeTable();
    this.presentAgeSeconds = this.ageTable[this.ageTable.length - 1]?.ageSeconds ?? NOMINAL_UNIVERSE_AGE_SECONDS;
  }

  expansionE(scaleFactor: number): number {
    const a = Math.max(MIN_SCALE_FACTOR, scaleFactor);
    const { omegaRadiation, omegaMatter, omegaLambda } = PLANCK_LAMBDA_CDM;
    return Math.sqrt(
      omegaRadiation / (a ** 4)
      + omegaMatter / (a ** 3)
      + omegaLambda,
    );
  }

  hubblePerSecond(scaleFactor: number): number {
    return HUBBLE_0_SI * this.expansionE(scaleFactor);
  }

  ageAtScaleFactor(scaleFactor: number): number {
    const a = Math.min(1, Math.max(MIN_SCALE_FACTOR, scaleFactor));
    let low = 0;
    let high = this.ageTable.length - 1;
    while (low + 1 < high) {
      const middle = Math.floor((low + high) / 2);
      const sample = this.ageTable[middle];
      if (!sample || sample.scaleFactor > a) high = middle;
      else low = middle;
    }
    const left = this.ageTable[low];
    const right = this.ageTable[high];
    if (!left || !right) return 0;
    const span = right.scaleFactor - left.scaleFactor;
    if (span <= 0) return left.ageSeconds;
    const t = (a - left.scaleFactor) / span;
    return left.ageSeconds + (right.ageSeconds - left.ageSeconds) * t;
  }

  scaleFactorAtAge(ageSeconds: number): number {
    const target = Math.min(this.presentAgeSeconds, Math.max(0, ageSeconds));
    let low = 0;
    let high = this.ageTable.length - 1;
    while (low + 1 < high) {
      const middle = Math.floor((low + high) / 2);
      const sample = this.ageTable[middle];
      if (!sample || sample.ageSeconds > target) high = middle;
      else low = middle;
    }
    const left = this.ageTable[low];
    const right = this.ageTable[high];
    if (!left || !right) return 1;
    const span = right.ageSeconds - left.ageSeconds;
    if (span <= 0) return left.scaleFactor;
    const t = (target - left.ageSeconds) / span;
    return left.scaleFactor + (right.scaleFactor - left.scaleFactor) * t;
  }

  growthFactor(scaleFactor: number): number {
    // Carroll-Press-Turner style approximation for late-time matter growth.
    // Radiation is included in the background clock, but omitted from this
    // reduced growth approximation; Phase 3 therefore treats this as class B.
    const a = Math.min(1, Math.max(1e-5, scaleFactor));
    const numeratorMatter = PLANCK_LAMBDA_CDM.omegaMatter / (a ** 3);
    const denominator = numeratorMatter + PLANCK_LAMBDA_CDM.omegaLambda;
    const omegaM = numeratorMatter / denominator;
    const omegaL = PLANCK_LAMBDA_CDM.omegaLambda / denominator;
    const g = (2.5 * omegaM) / (
      omegaM ** (4 / 7)
      - omegaL
      + (1 + omegaM / 2) * (1 + omegaL / 70)
    );

    const presentM = PLANCK_LAMBDA_CDM.omegaMatter;
    const presentL = PLANCK_LAMBDA_CDM.omegaLambda;
    const presentG = (2.5 * presentM) / (
      presentM ** (4 / 7)
      - presentL
      + (1 + presentM / 2) * (1 + presentL / 70)
    );
    return (a * g) / presentG;
  }

  stateAtAge(ageSeconds: number): CosmologyState {
    const age = Math.min(this.presentAgeSeconds, Math.max(MIN_TIMELINE_AGE_SECONDS, ageSeconds));
    const scaleFactor = this.scaleFactorAtAge(age);
    const redshift = Math.max(0, 1 / scaleFactor - 1);
    const recombinationLogRatio = Math.log(Math.max(Number.EPSILON, age / RECOMBINATION_AGE_SECONDS));
    // A visualization-level transition, not a recombination code such as HyRec/CosmoRec.
    const recombinationProgress = smoothLogistic(recombinationLogRatio / 0.075);
    const residualIonization = 1e-4;
    const ionizationFraction = residualIonization + (1 - residualIonization) * (1 - recombinationProgress);
    const growthFactor = this.growthFactor(scaleFactor);
    const growthNormalized = clamp01(growthFactor / this.growthFactor(1));

    let era: CosmologyEra;
    if (recombinationProgress < 0.2) era = 'primordial-plasma';
    else if (recombinationProgress < 0.8) era = 'recombination';
    else if (age < FIRST_STRUCTURE_AGE_SECONDS) era = 'dark-ages';
    else if (age < MATURE_COSMOS_AGE_SECONDS) era = 'structure-growth';
    else era = 'mature-cosmos';

    return {
      ageSeconds: age,
      scaleFactor,
      redshift,
      hubblePerSecond: this.hubblePerSecond(scaleFactor),
      cmbTemperatureK: PLANCK_LAMBDA_CDM.cmbTemperatureK / scaleFactor,
      ionizationFraction,
      recombinationProgress,
      growthFactor,
      growthNormalized,
      era,
    };
  }

  timelineToAgeSeconds(normalized: number): number {
    const t = clamp01(normalized);
    if (t <= TIMELINE_RECOMBINATION_POINT) {
      const u = t / TIMELINE_RECOMBINATION_POINT;
      const logMin = Math.log(MIN_TIMELINE_AGE_SECONDS);
      const logMax = Math.log(RECOMBINATION_AGE_SECONDS);
      return Math.exp(logMin + (logMax - logMin) * u);
    }

    const u = (t - TIMELINE_RECOMBINATION_POINT) / (1 - TIMELINE_RECOMBINATION_POINT);
    const logMin = Math.log(RECOMBINATION_AGE_SECONDS);
    const logMax = Math.log(this.presentAgeSeconds);
    return Math.exp(logMin + (logMax - logMin) * u);
  }

  ageSecondsToTimeline(ageSeconds: number): number {
    const age = Math.min(this.presentAgeSeconds, Math.max(MIN_TIMELINE_AGE_SECONDS, ageSeconds));
    if (age <= RECOMBINATION_AGE_SECONDS) {
      const u = (Math.log(age) - Math.log(MIN_TIMELINE_AGE_SECONDS))
        / (Math.log(RECOMBINATION_AGE_SECONDS) - Math.log(MIN_TIMELINE_AGE_SECONDS));
      return clamp01(u * TIMELINE_RECOMBINATION_POINT);
    }
    const u = (Math.log(age) - Math.log(RECOMBINATION_AGE_SECONDS))
      / (Math.log(this.presentAgeSeconds) - Math.log(RECOMBINATION_AGE_SECONDS));
    return clamp01(TIMELINE_RECOMBINATION_POINT + u * (1 - TIMELINE_RECOMBINATION_POINT));
  }

  private buildAgeTable(): AgeSample[] {
    const samples: AgeSample[] = [];
    const xMin = Math.log(MIN_SCALE_FACTOR);
    const xMax = 0;
    const dx = (xMax - xMin) / (this.tableSize - 1);
    let previousX = xMin;
    let previousA = Math.exp(previousX);
    let previousIntegrand = 1 / this.hubblePerSecond(previousA);
    let ageSeconds = 0;
    samples.push({ scaleFactor: previousA, ageSeconds });

    for (let i = 1; i < this.tableSize; i += 1) {
      const x = xMin + dx * i;
      const a = Math.exp(x);
      const integrand = 1 / this.hubblePerSecond(a);
      ageSeconds += 0.5 * (previousIntegrand + integrand) * (x - previousX);
      samples.push({ scaleFactor: a, ageSeconds });
      previousX = x;
      previousIntegrand = integrand;
    }
    return samples;
  }
}

export function formatCosmicAge(ageSeconds: number): string {
  const years = ageSeconds / SI.secondsPerJulianYear;
  if (ageSeconds < 1) return `${ageSeconds.toExponential(2)} s`;
  if (years < 1) return `${(ageSeconds / 86_400).toFixed(1)} days`;
  if (years < 1e3) return `${years.toFixed(1)} yr`;
  if (years < 1e6) return `${(years / 1e3).toFixed(1)} kyr`;
  if (years < 1e9) return `${(years / 1e6).toFixed(1)} Myr`;
  return `${(years / 1e9).toFixed(3)} Gyr`;
}
