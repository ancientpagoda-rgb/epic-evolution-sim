import { createRandomStream } from '../../core/random';
import type { ChemicalEvolutionState } from '../chemistry/model';
import type { SurfaceEvolutionState } from '../surface/model';
import type { BiologicalEvolutionState } from './model';

export type BiosphereStage =
  | 'no-biosphere'
  | 'anaerobic-microbial'
  | 'metabolic-guilds'
  | 'oxygen-oases'
  | 'oxygenated-microbial'
  | 'eukaryotic-biosphere'
  | 'multicellular-ecosystem';

export interface MicrobialGuildState {
  fermentation: number;
  methanogenesis: number;
  anoxygenicPhototrophy: number;
  sulfurMetabolism: number;
  nitrogenCycling: number;
  oxygenicPhotosynthesis: number;
  aerobicRespiration: number;
}

export interface HorizontalExchangeState {
  transferRate: number;
  networkConnectivity: number;
  ecologicalContact: number;
  innovationIndex: number;
}

export interface PlanetaryBiosphereFeedback {
  primaryProductivity: number;
  oxygenProduction: number;
  oxygenSinkCapacity: number;
  oxygenFraction: number;
  oxygenOasisIndex: number;
  methaneIndex: number;
  co2DrawdownIndex: number;
  ozoneIndex: number;
}

export interface EukaryogenesisState {
  archaealHostComplexity: number;
  syntrophyIndex: number;
  endosymbiosisPotential: number;
  mitochondrialIntegration: number;
  cellularComplexity: number;
  established: boolean;
}

export interface MulticellularityState {
  adhesion: number;
  clonalDevelopment: number;
  differentiation: number;
  clusterSize: number;
  groupSelection: number;
  established: boolean;
}

export interface EcosystemState {
  biomassIndex: number;
  biodiversityIndex: number;
  producerIndex: number;
  consumerIndex: number;
  decomposerIndex: number;
  trophicComplexity: number;
  extinctionPressure: number;
  resilienceIndex: number;
}

export interface BiosphereEvolutionState {
  active: boolean;
  stage: BiosphereStage;
  biosphereAgeYears: number;
  guilds: MicrobialGuildState;
  horizontalExchange: HorizontalExchangeState;
  feedback: PlanetaryBiosphereFeedback;
  eukaryogenesis: EukaryogenesisState;
  multicellularity: MulticellularityState;
  ecosystem: EcosystemState;
}

interface SeedFactors {
  oxygenicInnovation: number;
  hgt: number;
  symbiosis: number;
  multicellularity: number;
  extinction: number;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  if (edge1 <= edge0) return value >= edge1 ? 1 : 0;
  const t = clamp((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function saturating(ageYears: number, timescaleYears: number): number {
  if (ageYears <= 0) return 0;
  return clamp(1 - Math.exp(-ageYears / Math.max(1, timescaleYears)));
}

function inactiveState(): BiosphereEvolutionState {
  return {
    active: false,
    stage: 'no-biosphere',
    biosphereAgeYears: 0,
    guilds: {
      fermentation: 0,
      methanogenesis: 0,
      anoxygenicPhototrophy: 0,
      sulfurMetabolism: 0,
      nitrogenCycling: 0,
      oxygenicPhotosynthesis: 0,
      aerobicRespiration: 0,
    },
    horizontalExchange: {
      transferRate: 0,
      networkConnectivity: 0,
      ecologicalContact: 0,
      innovationIndex: 0,
    },
    feedback: {
      primaryProductivity: 0,
      oxygenProduction: 0,
      oxygenSinkCapacity: 1,
      oxygenFraction: 0,
      oxygenOasisIndex: 0,
      methaneIndex: 0,
      co2DrawdownIndex: 0,
      ozoneIndex: 0,
    },
    eukaryogenesis: {
      archaealHostComplexity: 0,
      syntrophyIndex: 0,
      endosymbiosisPotential: 0,
      mitochondrialIntegration: 0,
      cellularComplexity: 0,
      established: false,
    },
    multicellularity: {
      adhesion: 0,
      clonalDevelopment: 0,
      differentiation: 0,
      clusterSize: 0,
      groupSelection: 0,
      established: false,
    },
    ecosystem: {
      biomassIndex: 0,
      biodiversityIndex: 0,
      producerIndex: 0,
      consumerIndex: 0,
      decomposerIndex: 0,
      trophicComplexity: 0,
      extinctionPressure: 1,
      resilienceIndex: 0,
    },
  };
}

export class BiosphereEvolutionModel {
  private readonly factors: SeedFactors;

  constructor(seed: string) {
    const rng = createRandomStream(seed, 'phase9/biosphere-evolution');
    this.factors = {
      oxygenicInnovation: rng.range(0.72, 1.28),
      hgt: rng.range(0.78, 1.22),
      symbiosis: rng.range(0.66, 1.34),
      multicellularity: rng.range(0.68, 1.32),
      extinction: rng.range(0.78, 1.22),
    };
  }

  stateAt(
    biology: BiologicalEvolutionState,
    chemistry: ChemicalEvolutionState,
    surface: SurfaceEvolutionState,
  ): BiosphereEvolutionState {
    if (!biology.active || biology.stage === 'pre-darwinian' || !surface.active || !surface.planet) {
      return inactiveState();
    }

    const biosphereAgeYears = Math.max(0, biology.biologicalAgeYears);
    const matureMicrobes = saturating(biosphereAgeYears, 2.5e7)
      * biology.population.abundanceIndex
      * (0.4 + 0.6 * biology.heredity.heritabilityIndex);
    const environmentalDiversity = clamp(
      0.32 * biology.ecology.nicheDiversity
      + 0.24 * biology.ecology.spatialStructure
      + 0.18 * chemistry.routeScores.hydrothermalInterface
      + 0.14 * chemistry.routeScores.aqueousMineralPore
      + 0.12 * surface.hydrosphere.oceanCoverage,
    );

    const fermentation = clamp(
      matureMicrobes * (0.45 + 0.45 * chemistry.feedstocks.carbon + 0.10 * chemistry.network.simpleOrganics),
    );
    const methanogenesis = clamp(
      matureMicrobes
      * chemistry.energy.redox
      * (0.42 + 0.38 * chemistry.routeScores.hydrothermalInterface + 0.20 * chemistry.feedstocks.carbon),
    );
    const anoxygenicPhototrophy = clamp(
      matureMicrobes
      * chemistry.energy.uv
      * (0.36 + 0.36 * chemistry.feedstocks.sulfur + 0.28 * chemistry.feedstocks.iron),
    );
    const sulfurMetabolism = clamp(
      matureMicrobes
      * (0.42 * chemistry.feedstocks.sulfur + 0.34 * chemistry.energy.redox + 0.24 * chemistry.routeScores.hydrothermalInterface),
    );
    const nitrogenCycling = clamp(
      matureMicrobes
      * chemistry.feedstocks.nitrogen
      * (0.42 + 0.30 * environmentalDiversity + 0.28 * biology.population.diversityIndex),
    );

    const oxygenicOpportunity = clamp(
      matureMicrobes
      * saturating(biosphereAgeYears, 2.2e8)
      * chemistry.energy.uv
      * chemistry.feedstocks.phosphorus
      * (0.35 + 0.65 * biology.population.diversityIndex)
      * this.factors.oxygenicInnovation * 2.4,
    );
    const oxygenicPhotosynthesis = smoothstep(0.22, 0.52, oxygenicOpportunity);

    const ecologicalContact = clamp(
      0.38 * biology.ecology.spatialStructure
      + 0.32 * biology.population.abundanceIndex
      + 0.30 * environmentalDiversity,
    );
    const transferRate = clamp(
      ecologicalContact
      * biology.population.diversityIndex
      * biology.heredity.copyingFidelity
      * this.factors.hgt,
    );
    const networkConnectivity = clamp(
      transferRate * (0.45 + 0.55 * saturating(biosphereAgeYears, 7e7)),
    );
    const innovationIndex = clamp(
      networkConnectivity
      * biology.population.selectionStrength
      * (0.40 + 0.60 * environmentalDiversity),
    );
    const horizontalExchange: HorizontalExchangeState = {
      transferRate,
      networkConnectivity,
      ecologicalContact,
      innovationIndex,
    };

    const primaryProductivity = clamp(
      0.28 * fermentation
      + 0.22 * anoxygenicPhototrophy
      + 0.16 * methanogenesis
      + 0.34 * oxygenicPhotosynthesis,
    );
    const oxygenProduction = clamp(oxygenicPhotosynthesis * primaryProductivity * 1.35);
    const reducedRockSink = clamp(
      0.42 * surface.interior.volcanismIndex
      + 0.30 * chemistry.feedstocks.iron
      + 0.18 * chemistry.feedstocks.sulfur
      + 0.10 * surface.interior.heatFluxEarth / 3.5,
    );
    const sinkDecay = 1 - 0.68 * saturating(biosphereAgeYears, 7e8);
    const oxygenSinkCapacity = clamp(reducedRockSink * sinkDecay + 0.16 * methanogenesis, 0.02, 1);
    const oxygenExcess = Math.max(0, oxygenProduction - oxygenSinkCapacity * 0.62);
    const oxygenOasisIndex = clamp(
      oxygenProduction * (0.45 + 0.55 * surface.hydrosphere.oceanCoverage)
      * (0.35 + 0.65 * environmentalDiversity),
    );
    const oxygenFraction = clamp(
      smoothstep(0.015, 0.42, oxygenExcess)
      * saturating(biosphereAgeYears, 5.5e8)
      * 0.34,
      0,
      0.35,
    );
    const methaneIndex = clamp(methanogenesis * (1 - oxygenFraction * 2.1));
    const co2DrawdownIndex = clamp(
      primaryProductivity
      * (0.28 + 0.72 * surface.hydrosphere.weatheringIndex)
      * saturating(biosphereAgeYears, 1.5e8),
    );
    const ozoneIndex = clamp(smoothstep(0.002, 0.08, oxygenFraction) * 0.92);
    const aerobicRespiration = clamp(
      smoothstep(0.001, 0.025, oxygenFraction)
      * matureMicrobes
      * (0.38 + 0.62 * innovationIndex),
    );

    const guilds: MicrobialGuildState = {
      fermentation,
      methanogenesis,
      anoxygenicPhototrophy,
      sulfurMetabolism,
      nitrogenCycling,
      oxygenicPhotosynthesis,
      aerobicRespiration,
    };

    const feedback: PlanetaryBiosphereFeedback = {
      primaryProductivity,
      oxygenProduction,
      oxygenSinkCapacity,
      oxygenFraction,
      oxygenOasisIndex,
      methaneIndex,
      co2DrawdownIndex,
      ozoneIndex,
    };

    const archaealHostComplexity = clamp(
      biology.ecology.diversificationIndex
      * networkConnectivity
      * saturating(biosphereAgeYears, 4e8)
      * (0.42 + 0.58 * biology.heredity.genotypePhenotypeCoupling)
      * 2.7,
    );
    const syntrophyIndex = clamp(
      Math.sqrt(Math.max(0, methanogenesis * sulfurMetabolism))
      * (0.45 + 0.55 * environmentalDiversity)
      * (0.45 + 0.55 * networkConnectivity),
    );
    const endosymbiosisPotential = clamp(
      archaealHostComplexity
      * syntrophyIndex
      * (0.35 + 0.65 * biology.population.abundanceIndex)
      * this.factors.symbiosis * 2.2,
    );
    const mitochondrialIntegration = smoothstep(0.18, 0.48, endosymbiosisPotential)
      * saturating(biosphereAgeYears, 8e8);
    const cellularComplexity = clamp(
      0.42 * archaealHostComplexity
      + 0.36 * mitochondrialIntegration
      + 0.22 * innovationIndex,
    );
    const eukaryogenesis: EukaryogenesisState = {
      archaealHostComplexity,
      syntrophyIndex,
      endosymbiosisPotential,
      mitochondrialIntegration,
      cellularComplexity,
      established: mitochondrialIntegration > 0.24 && cellularComplexity > 0.26,
    };

    const adhesion = clamp(
      cellularComplexity
      * biology.ecology.cooperationIndex
      * saturating(biosphereAgeYears, 1.1e9)
      * this.factors.multicellularity * 2.1,
    );
    const clonalDevelopment = clamp(
      adhesion
      * biology.heredity.copyingFidelity
      * (0.45 + 0.55 * biology.heredity.compartmentInheritance),
    );
    const differentiation = clamp(
      clonalDevelopment
      * cellularComplexity
      * (0.35 + 0.65 * innovationIndex)
      * saturating(biosphereAgeYears, 1.5e9),
    );
    const oxygenSupport = clamp(0.30 + oxygenFraction * 3.0 + 0.28 * aerobicRespiration);
    const clusterSize = clamp(
      adhesion
      * (0.48 + 0.52 * clonalDevelopment)
      * (0.40 + 0.60 * oxygenSupport),
    );
    const groupSelection = clamp(
      clusterSize
      * differentiation
      * biology.population.selectionStrength
      * (0.42 + 0.58 * biology.ecology.spatialStructure),
    );
    const multicellularity: MulticellularityState = {
      adhesion,
      clonalDevelopment,
      differentiation,
      clusterSize,
      groupSelection,
      established: eukaryogenesis.established && groupSelection > 0.10 && clusterSize > 0.14,
    };

    const producerIndex = clamp(primaryProductivity * (0.55 + 0.45 * oxygenicPhotosynthesis));
    const decomposerIndex = clamp(
      fermentation * (0.46 + 0.54 * sulfurMetabolism) * (0.45 + 0.55 * biodiversitySeed(biology, innovationIndex)),
    );
    const consumerIndex = clamp(
      (eukaryogenesis.established ? 1 : 0.18)
      * (0.34 + 0.66 * aerobicRespiration)
      * (0.32 + 0.68 * multicellularity.differentiation)
      * biology.population.abundanceIndex,
    );
    const trophicComplexity = clamp(
      Math.sqrt(Math.max(0, producerIndex * (consumerIndex + 0.2 * decomposerIndex)))
      * (0.35 + 0.65 * environmentalDiversity),
    );
    const biodiversityIndex = clamp(
      biodiversitySeed(biology, innovationIndex)
      * (0.42 + 0.58 * trophicComplexity)
      * (0.55 + 0.45 * multicellularity.groupSelection),
    );
    const extinctionPressure = clamp(
      (0.38 * biology.population.extinctionRisk
      + 0.26 * Math.abs(surface.surfaceTemperatureK - 288) / 160
      + 0.20 * surface.interior.impactFluxIndex
      + 0.16 * this.factors.extinction * (1 - environmentalDiversity))
      * (1 - 0.32 * biodiversityIndex),
    );
    const biomassIndex = clamp(
      biology.population.abundanceIndex
      * (0.45 + 0.55 * primaryProductivity)
      * (0.55 + 0.45 * (1 - extinctionPressure)),
    );
    const resilienceIndex = clamp(
      biodiversityIndex
      * (0.34 + 0.66 * environmentalDiversity)
      * (0.48 + 0.52 * horizontalExchange.networkConnectivity)
      * (1 - 0.55 * extinctionPressure),
    );
    const ecosystem: EcosystemState = {
      biomassIndex,
      biodiversityIndex,
      producerIndex,
      consumerIndex,
      decomposerIndex,
      trophicComplexity,
      extinctionPressure,
      resilienceIndex,
    };

    let stage: BiosphereStage = 'anaerobic-microbial';
    if (innovationIndex > 0.025 && environmentalDiversity > 0.08) stage = 'metabolic-guilds';
    if (oxygenOasisIndex > 0.04 && oxygenicPhotosynthesis > 0.04) stage = 'oxygen-oases';
    if (oxygenFraction > 0.01 && aerobicRespiration > 0.04) stage = 'oxygenated-microbial';
    if (eukaryogenesis.established) stage = 'eukaryotic-biosphere';
    if (multicellularity.established && trophicComplexity > 0.08) stage = 'multicellular-ecosystem';

    return {
      active: true,
      stage,
      biosphereAgeYears,
      guilds,
      horizontalExchange,
      feedback,
      eukaryogenesis,
      multicellularity,
      ecosystem,
    };
  }
}

function biodiversitySeed(biology: BiologicalEvolutionState, innovationIndex: number): number {
  return clamp(
    0.46 * biology.population.diversityIndex
    + 0.30 * biology.ecology.diversificationIndex
    + 0.24 * innovationIndex,
  );
}
