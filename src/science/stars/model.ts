import { createRandomStream, type RandomStream } from '../../core/random';
import { SI } from '../cosmology/constants';
import type { CosmologyState } from '../cosmology/model';
import type { GalaxyFormationModel, GalaxyState } from '../galaxies/model';

export type StellarStage =
  | 'unborn'
  | 'main-sequence'
  | 'giant-agb'
  | 'massive-supergiant'
  | 'white-dwarf'
  | 'neutron-star'
  | 'black-hole';

export interface RepresentativeStar {
  id: number;
  massSolar: number;
  birthAgeYears: number;
  radialFraction: number;
  armPhase: number;
  verticalScatter: number;
  binaryNeutronCandidate: boolean;
}

export interface StellarSnapshot {
  star: RepresentativeStar;
  ageYears: number;
  stage: StellarStage;
  alive: boolean;
  luminositySolar: number;
  radiusSolar: number;
  temperatureK: number;
}

export interface EnrichmentState {
  agbIndex: number;
  coreCollapseIndex: number;
  typeIaIndex: number;
  rProcessIndex: number;
  totalReturnedMassIndex: number;
}

export interface StellarPopulationState {
  formedCount: number;
  livingCount: number;
  remnantCount: number;
  enrichment: EnrichmentState;
  selectedStar: StellarSnapshot;
}

interface ImfSegment {
  min: number;
  max: number;
  alpha: number;
  amplitude: number;
}

const PRESENT_AGE_YEARS = 13.8e9;
const IMF_SEGMENTS: readonly ImfSegment[] = [
  { min: 0.08, max: 0.5, alpha: 1.3, amplitude: 1 },
  // Continuity at 0.5 Msun for dN/dm proportional to A m^-alpha.
  { min: 0.5, max: 120, alpha: 2.3, amplitude: 0.5 },
] as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function integratePowerLaw(segment: ImfSegment): number {
  const exponent = 1 - segment.alpha;
  return segment.amplitude * (segment.max ** exponent - segment.min ** exponent) / exponent;
}

function samplePowerLaw(rng: RandomStream, segment: ImfSegment): number {
  const exponent = 1 - segment.alpha;
  const lower = segment.min ** exponent;
  const upper = segment.max ** exponent;
  return (lower + rng.next() * (upper - lower)) ** (1 / exponent);
}

export function sampleKroupaLikeMass(rng: RandomStream): number {
  const weights = IMF_SEGMENTS.map(integratePowerLaw);
  const total = weights.reduce((sum, value) => sum + value, 0);
  let pick = rng.next() * total;
  for (let i = 0; i < IMF_SEGMENTS.length; i += 1) {
    const weight = weights[i] ?? 0;
    if (pick <= weight) return samplePowerLaw(rng, IMF_SEGMENTS[i] ?? IMF_SEGMENTS[0]!);
    pick -= weight;
  }
  return samplePowerLaw(rng, IMF_SEGMENTS[IMF_SEGMENTS.length - 1]!);
}

export function mainSequenceLifetimeYears(massSolar: number): number {
  const mass = clamp(massSolar, 0.08, 120);
  if (mass < 0.5) return 8e10 * (mass / 0.5) ** -1.3;
  if (mass <= 10) return 1e10 * mass ** -2.5;
  return 3.2e7 * (mass / 10) ** -0.82;
}

export function mainSequenceLuminositySolar(massSolar: number): number {
  const mass = clamp(massSolar, 0.08, 120);
  if (mass < 0.43) return 0.23 * mass ** 2.3;
  if (mass < 2) return mass ** 4;
  if (mass < 20) return 1.5 * mass ** 3.5;
  return 32_000 * mass;
}

export function mainSequenceRadiusSolar(massSolar: number): number {
  const mass = clamp(massSolar, 0.08, 120);
  return mass < 1 ? mass ** 0.8 : mass ** 0.57;
}

export function effectiveTemperatureK(massSolar: number): number {
  const luminosity = mainSequenceLuminositySolar(massSolar);
  const radius = mainSequenceRadiusSolar(massSolar);
  return clamp(5772 * (luminosity / (radius * radius)) ** 0.25, 2300, 50_000);
}

export class StellarPopulationModel {
  readonly stars: readonly RepresentativeStar[];
  readonly selectedStarId: number;

  constructor(seed: string, private readonly galaxy: GalaxyFormationModel, count = 2600) {
    if (!Number.isInteger(count) || count < 200) throw new Error(`Representative stellar population must contain at least 200 stars, received ${count}`);
    const rng = createRandomStream(seed, 'phase4/stellar-population');
    const stars: RepresentativeStar[] = [];
    const firstStarAge = galaxy.firstStarAgeYears;
    const availableSpan = PRESENT_AGE_YEARS - firstStarAge;

    for (let id = 0; id < count; id += 1) {
      const massSolar = sampleKroupaLikeMass(rng);
      const u = rng.next();
      const earlyWeightedBirth = firstStarAge + availableSpan * u ** 1.45;
      stars.push({
        id,
        massSolar,
        birthAgeYears: earlyWeightedBirth,
        radialFraction: Math.sqrt(rng.next()),
        armPhase: rng.range(0, Math.PI * 2),
        verticalScatter: (rng.next() + rng.next() + rng.next() - 1.5) / 1.5,
        binaryNeutronCandidate: massSolar >= 8 && massSolar <= 25 && rng.next() < 0.025,
      });
    }
    this.stars = stars;

    const selectedRng = createRandomStream(seed, 'phase4/selected-star');
    const targetMass = selectedRng.range(0.82, 1.12);
    const targetBirthAge = selectedRng.range(8.5e9, 10.2e9);
    let selected = stars[0]!;
    let bestScore = Infinity;
    for (const star of stars) {
      const massScore = Math.abs(Math.log(star.massSolar / targetMass)) * 4;
      const timeScore = Math.abs(star.birthAgeYears - targetBirthAge) / 1.5e9;
      const score = massScore + timeScore;
      if (score < bestScore) {
        bestScore = score;
        selected = star;
      }
    }
    this.selectedStarId = selected.id;
  }

  snapshot(star: RepresentativeStar, cosmicAgeYears: number): StellarSnapshot {
    if (cosmicAgeYears < star.birthAgeYears) {
      return {
        star,
        ageYears: 0,
        stage: 'unborn',
        alive: false,
        luminositySolar: 0,
        radiusSolar: 0,
        temperatureK: 0,
      };
    }

    const ageYears = cosmicAgeYears - star.birthAgeYears;
    const lifetime = mainSequenceLifetimeYears(star.massSolar);
    const postMainDuration = lifetime * (star.massSolar < 8 ? 0.12 : 0.055);
    let stage: StellarStage;
    if (ageYears <= lifetime) stage = 'main-sequence';
    else if (ageYears <= lifetime + postMainDuration) {
      stage = star.massSolar < 8 ? 'giant-agb' : 'massive-supergiant';
    } else if (star.massSolar < 8) stage = 'white-dwarf';
    else if (star.massSolar < 22) stage = 'neutron-star';
    else stage = 'black-hole';

    const mainLuminosity = mainSequenceLuminositySolar(star.massSolar);
    const mainRadius = mainSequenceRadiusSolar(star.massSolar);
    const mainTemperature = effectiveTemperatureK(star.massSolar);
    const postMain = stage === 'giant-agb' || stage === 'massive-supergiant';
    const remnant = stage === 'white-dwarf' || stage === 'neutron-star' || stage === 'black-hole';

    return {
      star,
      ageYears,
      stage,
      alive: !remnant,
      luminositySolar: remnant ? 0.001 : postMain ? mainLuminosity * 3.5 : mainLuminosity,
      radiusSolar: remnant ? 0.02 : postMain ? mainRadius * 18 : mainRadius,
      temperatureK: remnant ? (stage === 'white-dwarf' ? 10_000 : 0) : postMain ? mainTemperature * 0.72 : mainTemperature,
    };
  }

  stateAtCosmology(cosmology: CosmologyState, galaxyState: GalaxyState): StellarPopulationState {
    const cosmicAgeYears = cosmology.ageSeconds / SI.secondsPerJulianYear;
    let formedCount = 0;
    let livingCount = 0;
    let remnantCount = 0;
    let formedMass = 0;
    let agbMass = 0;
    let coreCollapseMass = 0;
    let typeIaMass = 0;
    let rProcessMass = 0;

    for (const star of this.stars) {
      const snapshot = this.snapshot(star, cosmicAgeYears);
      if (snapshot.stage === 'unborn') continue;
      formedCount += 1;
      formedMass += star.massSolar;
      if (snapshot.alive) livingCount += 1;
      else remnantCount += 1;

      if (snapshot.stage === 'giant-agb' || (snapshot.stage === 'white-dwarf' && star.massSolar >= 1)) {
        agbMass += star.massSolar;
      }
      if ((snapshot.stage === 'neutron-star' || snapshot.stage === 'black-hole') && star.massSolar >= 8) {
        coreCollapseMass += star.massSolar;
      }
      if (snapshot.stage === 'white-dwarf' && star.massSolar >= 3 && snapshot.ageYears > mainSequenceLifetimeYears(star.massSolar) + 8e8) {
        // Binary demographics are not explicitly evolved; this represents a
        // delayed Type-Ia contribution from a small fraction of eligible WDs.
        typeIaMass += star.massSolar * 0.018;
      }
      if (star.binaryNeutronCandidate && snapshot.stage === 'neutron-star' && snapshot.ageYears > mainSequenceLifetimeYears(star.massSolar) + 5e7) {
        rProcessMass += star.massSolar * 0.02;
      }
    }

    const denominator = Math.max(1e-9, formedMass);
    const enrichment: EnrichmentState = {
      agbIndex: clamp(agbMass / denominator, 0, 1),
      coreCollapseIndex: clamp(coreCollapseMass / denominator, 0, 1),
      typeIaIndex: clamp(typeIaMass / denominator, 0, 1),
      rProcessIndex: clamp(rProcessMass / denominator, 0, 1),
      totalReturnedMassIndex: clamp((0.35 * agbMass + 0.8 * coreCollapseMass + typeIaMass + rProcessMass) / denominator, 0, 1),
    };

    const selected = this.stars[this.selectedStarId] ?? this.stars[0]!;
    const selectedSnapshot = this.snapshot(selected, cosmicAgeYears);
    // Galaxy metallicity is the bulk gas abundance proxy; channel indices
    // describe which populations have had time to contribute to that pool.
    void galaxyState;

    return {
      formedCount,
      livingCount,
      remnantCount,
      enrichment,
      selectedStar: selectedSnapshot,
    };
  }
}
