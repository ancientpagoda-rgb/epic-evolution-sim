import { createRandomStream } from '../../core/random';
import { PLANCK_LAMBDA_CDM, SI } from '../cosmology/constants';
import type { CosmologyState } from '../cosmology/model';
import type { ZeldovichField } from '../cosmology/perturbations';

export interface HaloSeed {
  particleIndex: number;
  peakDensitySigma: number;
  lagrangianPosition: readonly [number, number, number];
  spinParameter: number;
  finalMassSolar: number;
  assemblyAlpha: number;
  mergerIndex: number;
}

export interface GalaxyState {
  haloMassSolar: number;
  baryonMassSolar: number;
  coldGasMassSolar: number;
  stellarMassSolar: number;
  gasFraction: number;
  stellarToHaloRatio: number;
  starFormationRateSolarPerYear: number;
  metallicitySolar: number;
  diskFraction: number;
  bulgeFraction: number;
  diskScaleKpc: number;
  molecularGasFraction: number;
  formed: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function selectHaloSeed(field: ZeldovichField, seed: string): HaloSeed {
  let peakIndex = 0;
  for (let i = 1; i < field.densityProxy.length; i += 1) {
    if ((field.densityProxy[i] ?? -Infinity) > (field.densityProxy[peakIndex] ?? -Infinity)) peakIndex = i;
  }
  const base = peakIndex * 3;
  const rng = createRandomStream(seed, `phase4/halo/${peakIndex}`);
  const peakDensitySigma = (field.densityProxy[peakIndex] ?? 0) * 3;
  const spinParameter = clamp(Math.exp(Math.log(0.035) + (rng.next() - 0.5) * 0.9), 0.015, 0.085);
  const finalMassSolar = 10 ** clamp(11.75 + peakDensitySigma * 0.16 + rng.range(-0.16, 0.16), 11.3, 12.8);
  return {
    particleIndex: peakIndex,
    peakDensitySigma,
    lagrangianPosition: [
      field.lagrangian[base] ?? 0,
      field.lagrangian[base + 1] ?? 0,
      field.lagrangian[base + 2] ?? 0,
    ],
    spinParameter,
    finalMassSolar,
    assemblyAlpha: rng.range(0.42, 0.66),
    mergerIndex: rng.range(0.08, 0.72),
  };
}

export class GalaxyFormationModel {
  readonly halo: HaloSeed;
  readonly firstStarAgeYears: number;
  private readonly cosmicBaryonFraction = PLANCK_LAMBDA_CDM.omegaBaryon / PLANCK_LAMBDA_CDM.omegaMatter;

  constructor(seed: string, field: ZeldovichField) {
    this.halo = selectHaloSeed(field, seed);
    const rng = createRandomStream(seed, 'phase4/galaxy-assembly');
    this.firstStarAgeYears = rng.range(120e6, 260e6);
  }

  stateAtCosmology(cosmology: CosmologyState): GalaxyState {
    const ageYears = cosmology.ageSeconds / SI.secondsPerJulianYear;
    const redshift = Math.min(30, cosmology.redshift);
    const haloMassSolar = clamp(
      this.halo.finalMassSolar * Math.exp(-this.halo.assemblyAlpha * redshift),
      1e6,
      this.halo.finalMassSolar,
    );

    const retention = 0.08 + 0.92 / (1 + (8e8 / haloMassSolar) ** 1.7);
    const baryonMassSolar = haloMassSolar * this.cosmicBaryonFraction * retention;
    const logHalo = Math.log10(haloMassSolar);
    // Reduced stellar-to-halo relation: efficiency peaks near 10^12 Msun and
    // falls in lower/higher mass halos. This is an empirical class-C proxy.
    const peakStellarToHalo = 0.032;
    const efficiency = peakStellarToHalo * Math.exp(-0.5 * ((logHalo - 12) / 0.68) ** 2);
    const formationProgress = smoothstep(this.firstStarAgeYears, this.firstStarAgeYears + 650e6, ageYears);
    const stellarMassSolar = Math.min(
      baryonMassSolar * 0.72,
      haloMassSolar * efficiency * formationProgress,
    );

    const availableGas = Math.max(0, baryonMassSolar - stellarMassSolar);
    const highRedshiftGasBoost = clamp(0.42 + 0.04 * redshift, 0.42, 0.9);
    const coldGasMassSolar = availableGas * highRedshiftGasBoost;
    const gasFraction = coldGasMassSolar / Math.max(1, coldGasMassSolar + stellarMassSolar);
    const depletionTimeYears = clamp(1.8e9 / Math.sqrt(1 + redshift), 3.5e8, 1.8e9);
    const starFormationRateSolarPerYear = ageYears < this.firstStarAgeYears
      ? 0
      : (coldGasMassSolar / depletionTimeYears) * clamp(0.28 + haloMassSolar / 4e12, 0.28, 0.8);

    const closedBoxMetallicity = gasFraction > 0 && gasFraction < 0.999999
      ? 0.0075 * Math.log(1 / Math.max(0.04, gasFraction))
      : 0;
    const metallicitySolar = clamp(closedBoxMetallicity / 0.0142, 1e-4, 2.2);

    const diskFraction = clamp(
      0.52 + this.halo.spinParameter * 4.8 - this.halo.mergerIndex * 0.38,
      0.18,
      0.9,
    );
    const bulgeFraction = 1 - diskFraction;
    const diskScaleKpc = clamp(
      2.6 * (haloMassSolar / 1e12) ** (1 / 3) * (this.halo.spinParameter / 0.035),
      0.35,
      8.5,
    );
    const molecularGasFraction = clamp(
      0.08 + 0.42 * gasFraction + 0.12 * Math.log10(Math.max(1, metallicitySolar * 10)),
      0.03,
      0.65,
    );

    return {
      haloMassSolar,
      baryonMassSolar,
      coldGasMassSolar,
      stellarMassSolar,
      gasFraction,
      stellarToHaloRatio: stellarMassSolar / haloMassSolar,
      starFormationRateSolarPerYear,
      metallicitySolar,
      diskFraction,
      bulgeFraction,
      diskScaleKpc,
      molecularGasFraction,
      formed: ageYears >= this.firstStarAgeYears,
    };
  }
}
