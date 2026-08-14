import { createRandomStream } from '../../core/random';
import type { SurfaceEvolutionState } from '../surface/model';
import type { BiosphereEvolutionState } from './biosphere';
import type { BiogeochemicalCycleState } from './biogeochemistry';
import type { FoodWebState } from './foodweb';

export type MulticellularityPathway = 'clonal' | 'aggregative';
export type TrophicRole = 'producer' | 'grazer' | 'predator' | 'decomposer';

export interface MulticellularLineageState {
  id: number;
  pathway: MulticellularityPathway;
  trophicRole: TrophicRole;
  originScore: number;
  specialization: number;
  developmentalBottleneck: number;
  groupIntegrity: number;
  established: boolean;
}

export interface EcologicalTurnoverState {
  pulseIntensity: number;
  chronicStress: number;
  biodiversityReduction: number;
  trophicCascadeRisk: number;
  majorTurnover: boolean;
  recoveryProgress: number;
  successionIndex: number;
  timeSinceMajorPulseYears: number;
}

interface LineageTemplate {
  id: number;
  pathway: MulticellularityPathway;
  trophicRole: TrophicRole;
  accessibility: number;
  threshold: number;
  delayYears: number;
}

interface TurnoverPulse {
  centerYears: number;
  widthYears: number;
  severity: number;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function saturating(ageYears: number, timescaleYears: number): number {
  if (ageYears <= 0) return 0;
  return clamp(1 - Math.exp(-ageYears / Math.max(1, timescaleYears)));
}

function pulseAt(ageYears: number, centerYears: number, widthYears: number): number {
  const x = (ageYears - centerYears) / Math.max(1, widthYears);
  return Math.exp(-0.5 * x * x);
}

export class MacroevolutionModel {
  private readonly lineages: readonly LineageTemplate[];
  private readonly pulses: readonly TurnoverPulse[];

  constructor(seed: string) {
    const rng = createRandomStream(seed, 'phase10/macroevolution');
    const roles: readonly TrophicRole[] = ['producer', 'grazer', 'decomposer', 'producer', 'predator', 'grazer'];
    this.lineages = Array.from({ length: 6 }, (_, id): LineageTemplate => ({
      id,
      pathway: id % 3 === 2 ? 'aggregative' : 'clonal',
      trophicRole: roles[id] ?? 'producer',
      accessibility: rng.range(0.72, 1.28),
      threshold: rng.range(0.24, 0.62),
      delayYears: rng.range(4e7, 7e8),
    }));
    this.pulses = Array.from({ length: 5 }, (_, index): TurnoverPulse => ({
      centerYears: (index + 1) * rng.range(4.0e8, 7.2e8),
      widthYears: rng.range(5e6, 5e7),
      severity: rng.range(0.35, 1),
    })).sort((a, b) => a.centerYears - b.centerYears);
  }

  deriveLineages(
    biosphere: BiosphereEvolutionState,
    cycles: BiogeochemicalCycleState,
    foodWeb: FoodWebState,
  ): MulticellularLineageState[] {
    const ageYears = biosphere.biosphereAgeYears;
    const lineageBase = clamp(
      0.28 * biosphere.multicellularity.groupSelection
      + 0.22 * biosphere.multicellularity.clonalDevelopment
      + 0.18 * biosphere.eukaryogenesis.cellularComplexity
      + 0.14 * cycles.nutrientSupport
      + 0.10 * cycles.oxygenStability
      + 0.08 * biosphere.ecosystem.biodiversityIndex,
    );

    return this.lineages.map(template => {
      const ageFactor = saturating(ageYears - template.delayYears, 3.5e8);
      const pathwaySupport = template.pathway === 'clonal'
        ? biosphere.multicellularity.clonalDevelopment
        : biosphere.ecosystem.biodiversityIndex * biosphere.multicellularity.adhesion;
      const originScore = clamp(
        lineageBase
        * (0.48 + 0.52 * pathwaySupport)
        * ageFactor
        * template.accessibility * 2.05,
      );
      const developmentalBottleneck = clamp(
        template.pathway === 'clonal'
          ? 0.52 * biosphere.multicellularity.clonalDevelopment + 0.48 * biosphere.eukaryogenesis.cellularComplexity
          : 0.34 * biosphere.multicellularity.adhesion + 0.34 * foodWeb.connectance + 0.32 * biosphere.ecosystem.biodiversityIndex,
      );
      const groupIntegrity = clamp(
        developmentalBottleneck
        * (0.38 + 0.62 * biosphere.multicellularity.groupSelection)
        * (1 - 0.38 * biosphere.ecosystem.extinctionPressure),
      );
      const specialization = clamp(
        originScore
        * groupIntegrity
        * (0.38 + 0.62 * biosphere.multicellularity.differentiation)
        * (0.48 + 0.52 * foodWeb.connectance),
      );
      return {
        id: template.id,
        pathway: template.pathway,
        trophicRole: template.trophicRole,
        originScore,
        specialization,
        developmentalBottleneck,
        groupIntegrity,
        established: originScore > template.threshold && groupIntegrity > 0.12,
      };
    });
  }

  deriveTurnover(
    biosphere: BiosphereEvolutionState,
    cycles: BiogeochemicalCycleState,
    foodWeb: FoodWebState,
    surface: SurfaceEvolutionState,
  ): EcologicalTurnoverState {
    const ageYears = biosphere.biosphereAgeYears;
    const climateStress = clamp(Math.abs(surface.surfaceTemperatureK - 288) / 95);
    const chronicStress = clamp(
      0.30 * climateStress
      + 0.24 * surface.interior.impactFluxIndex
      + 0.20 * surface.interior.volcanismIndex
      + 0.14 * (1 - cycles.oxygenStability)
      + 0.12 * (1 - cycles.nutrientSupport),
    );

    let strongestPulse = 0;
    let latestPast: TurnoverPulse | null = null;
    for (const pulse of this.pulses) {
      strongestPulse = Math.max(strongestPulse, pulse.severity * pulseAt(ageYears, pulse.centerYears, pulse.widthYears));
      if (pulse.centerYears <= ageYears) latestPast = pulse;
    }

    const pulseIntensity = clamp(Math.max(strongestPulse, chronicStress * 0.52));
    const biodiversityReduction = clamp(
      pulseIntensity * (0.34 + 0.66 * foodWeb.connectance) * (0.45 + 0.55 * foodWeb.predationPressure),
    );
    const trophicCascadeRisk = clamp(
      pulseIntensity * foodWeb.connectance * (0.50 + 0.50 * foodWeb.secondaryConsumerBiomass) * 1.45,
    );
    const timeSinceMajorPulseYears = latestPast ? Math.max(0, ageYears - latestPast.centerYears) : ageYears;
    const recoveryTimescale = latestPast ? 1.2e7 + latestPast.severity * 8e7 : 1.2e7;
    const recoveryProgress = clamp(
      saturating(timeSinceMajorPulseYears, recoveryTimescale)
      * (0.42 + 0.58 * cycles.recyclingEfficiency)
      * (1 - 0.42 * chronicStress),
    );
    const successionIndex = clamp(
      recoveryProgress
      * (0.30 + 0.70 * cycles.nutrientSupport)
      * (0.40 + 0.60 * foodWeb.decomposerBiomass),
    );

    return {
      pulseIntensity,
      chronicStress,
      biodiversityReduction,
      trophicCascadeRisk,
      majorTurnover: pulseIntensity > 0.68 && biodiversityReduction > 0.32,
      recoveryProgress,
      successionIndex,
      timeSinceMajorPulseYears,
    };
  }
}
