import type { SurfaceEvolutionState } from '../surface/model';
import type { BiosphereEvolutionState } from './biosphere';
import type { BiogeochemicalCycleState } from './biogeochemistry';
import type { FoodWebState } from './foodweb';

export interface BiosphereClimateCouplingState {
  netPrimaryProductivity: number;
  carbonBurial: number;
  methaneOxidation: number;
  oxygenBuffering: number;
  biologicalWeathering: number;
  climateBuffering: number;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

export function deriveClimateCoupling(
  biosphere: BiosphereEvolutionState,
  cycles: BiogeochemicalCycleState,
  foodWeb: FoodWebState,
  surface: SurfaceEvolutionState,
  pulseIntensity: number,
): BiosphereClimateCouplingState {
  const netPrimaryProductivity = clamp(
    biosphere.feedback.primaryProductivity * cycles.nutrientSupport * (1 - 0.46 * pulseIntensity),
  );
  const carbonBurial = clamp(
    netPrimaryProductivity
    * (0.34 + 0.66 * biosphere.feedback.co2DrawdownIndex)
    * (0.38 + 0.62 * foodWeb.detritalPool),
  );
  const methaneOxidation = clamp(
    biosphere.feedback.methaneIndex
    * biosphere.guilds.aerobicRespiration
    * (0.30 + 0.70 * cycles.oxygenStability),
  );
  const oxygenBuffering = clamp(
    cycles.oxygenStability
    * cycles.recyclingEfficiency
    * (0.45 + 0.55 * biosphere.feedback.oxygenFraction / 0.35),
  );
  const biologicalWeathering = clamp(
    surface.hydrosphere.weatheringIndex
    * (0.42 + 0.58 * foodWeb.producerBiomass)
    * (0.45 + 0.55 * cycles.carbonAvailability),
  );
  const climateBuffering = clamp(
    0.30 * carbonBurial
    + 0.25 * methaneOxidation
    + 0.25 * biologicalWeathering
    + 0.20 * oxygenBuffering,
  );

  return {
    netPrimaryProductivity,
    carbonBurial,
    methaneOxidation,
    oxygenBuffering,
    biologicalWeathering,
    climateBuffering,
  };
}
