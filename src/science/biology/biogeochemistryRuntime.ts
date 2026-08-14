import type { SurfaceEvolutionState } from '../surface/model';
import type { BiosphereEvolutionState } from './biosphere';
import type { BiogeochemicalCycleState } from './biogeochemistry';

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

export function deriveRuntimeCycles(
  biosphere: BiosphereEvolutionState,
  surface: SurfaceEvolutionState,
): BiogeochemicalCycleState {
  const carbonAvailability = clamp(
    0.38 * biosphere.feedback.primaryProductivity
    + 0.30 * biosphere.ecosystem.decomposerIndex
    + 0.20 * biosphere.feedback.co2DrawdownIndex
    + 0.12 * biosphere.ecosystem.biomassIndex,
  );
  const nitrogenAvailability = clamp(
    0.48 * biosphere.guilds.nitrogenCycling
    + 0.24 * biosphere.ecosystem.decomposerIndex
    + 0.16 * surface.hydrosphere.weatheringIndex
    + 0.12 * biosphere.ecosystem.biomassIndex,
  );
  const phosphorusAvailability = clamp(
    0.42 * surface.hydrosphere.weatheringIndex
    + 0.22 * surface.interior.volcanismIndex
    + 0.20 * biosphere.ecosystem.decomposerIndex
    + 0.16 * biosphere.feedback.primaryProductivity,
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
  const minimum = Math.min(nitrogenAvailability, phosphorusAvailability);
  const mean = Math.sqrt(Math.max(0, nitrogenAvailability * phosphorusAvailability));
  const nutrientSupport = clamp((0.62 * minimum + 0.38 * mean) * (0.54 + 0.46 * recyclingEfficiency));
  const gap = Math.abs(nitrogenAvailability - phosphorusAvailability);
  const limitingNutrient = gap < 0.08
    ? 'co-limited'
    : nitrogenAvailability < phosphorusAvailability ? 'nitrogen' : 'phosphorus';

  return { carbonAvailability, nitrogenAvailability, phosphorusAvailability, oxygenStability, recyclingEfficiency, detritalRecycling, nutrientSupport, limitingNutrient };
}
