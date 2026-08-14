import type { ChemicalEvolutionState } from '../chemistry/model';
import type { SurfaceEvolutionState } from '../surface/model';
import type { BiosphereEvolutionState } from './biosphere';

export interface BiogeochemicalCycleState {
  carbonAvailability: number;
  nitrogenAvailability: number;
  phosphorusAvailability: number;
  oxygenStability: number;
  recyclingEfficiency: number;
  detritalRecycling: number;
  nutrientSupport: number;
  limitingNutrient: 'nitrogen' | 'phosphorus' | 'co-limited';
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

export function deriveBiogeochemicalCycles(
  biosphere: BiosphereEvolutionState,
  chemistry: ChemicalEvolutionState,
  surface: SurfaceEvolutionState,
): BiogeochemicalCycleState {
  const carbonAvailability = clamp(
    0.30 * chemistry.feedstocks.carbon
    + 0.30 * biosphere.feedback.primaryProductivity
    + 0.22 * biosphere.ecosystem.decomposerIndex
    + 0.18 * biosphere.feedback.co2DrawdownIndex,
  );
  const nitrogenAvailability = clamp(
    0.38 * biosphere.guilds.nitrogenCycling
    + 0.22 * biosphere.ecosystem.decomposerIndex
    + 0.18 * chemistry.feedstocks.nitrogen
    + 0.12 * surface.hydrosphere.weatheringIndex
    + 0.10 * biosphere.ecosystem.biomassIndex,
  );
  const phosphorusAvailability = clamp(
    chemistry.feedstocks.phosphorus
    * (0.34 + 0.42 * surface.hydrosphere.weatheringIndex + 0.24 * surface.interior.volcanismIndex),
  );
  const redoxMismatch = Math.abs(
    biosphere.feedback.oxygenProduction - biosphere.feedback.oxygenSinkCapacity * 0.62,
  );
  const oxygenStability = clamp(
    (0.34 + 0.66 * biosphere.feedback.oxygenFraction / 0.35)
    * (1 - 0.55 * clamp(redoxMismatch)),
  );
  const detritalRecycling = clamp(
    biosphere.ecosystem.decomposerIndex
    * (0.42 + 0.30 * biosphere.guilds.fermentation + 0.28 * biosphere.guilds.sulfurMetabolism),
  );
  const recyclingEfficiency = clamp(
    0.38 * detritalRecycling
    + 0.24 * biosphere.guilds.nitrogenCycling
    + 0.20 * surface.hydrosphere.weatheringIndex
    + 0.18 * biosphere.horizontalExchange.innovationIndex,
  );
  const nutrientMinimum = Math.min(nitrogenAvailability, phosphorusAvailability);
  const nutrientGeometricMean = Math.sqrt(Math.max(0, nitrogenAvailability * phosphorusAvailability));
  const nutrientSupport = clamp(
    (0.62 * nutrientMinimum + 0.38 * nutrientGeometricMean)
    * (0.54 + 0.46 * recyclingEfficiency),
  );
  const nutrientGap = Math.abs(nitrogenAvailability - phosphorusAvailability);
  const limitingNutrient = nutrientGap < 0.08
    ? 'co-limited'
    : nitrogenAvailability < phosphorusAvailability ? 'nitrogen' : 'phosphorus';

  return {
    carbonAvailability,
    nitrogenAvailability,
    phosphorusAvailability,
    oxygenStability,
    recyclingEfficiency,
    detritalRecycling,
    nutrientSupport,
    limitingNutrient,
  };
}
