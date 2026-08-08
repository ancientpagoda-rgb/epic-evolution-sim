import { createRandomStream } from '../../core/random';
import type { SurfaceEvolutionState } from '../surface/model';

export type PrebioticEnvironment =
  | 'hydrothermal-interface'
  | 'wet-dry-mineral'
  | 'aqueous-mineral-pore'
  | 'ice-brine';

export interface EnvironmentRouteScores {
  hydrothermalInterface: number;
  wetDryMineral: number;
  aqueousMineralPore: number;
  iceBrine: number;
}

export interface FeedstockState {
  carbon: number;
  nitrogen: number;
  phosphorus: number;
  sulfur: number;
  iron: number;
  amphiphilePrecursors: number;
}

export interface EnergyState {
  uv: number;
  geothermal: number;
  redox: number;
  wetDryCycling: number;
  impactElectrical: number;
  totalGradient: number;
}

export interface ReactionNetworkState {
  simpleOrganics: number;
  aminoPrecursors: number;
  nucleotidePrecursors: number;
  amphiphiles: number;
  peptideOligomers: number;
  nucleotidePolymers: number;
  compartments: number;
  autocatalyticNetworks: number;
}

export interface ChemicalEvolutionState {
  active: boolean;
  environment: PrebioticEnvironment;
  routeScores: EnvironmentRouteScores;
  temperatureK: number;
  pressureBar: number;
  pHProxy: number;
  ionicStrengthProxy: number;
  mineralCatalysisIndex: number;
  chemistryAgeYears: number;
  suitability: number;
  feedstocks: FeedstockState;
  energy: EnergyState;
  network: ReactionNetworkState;
  polymerizationIndex: number;
  compartmentIndex: number;
  chemicalSelectionPotential: number;
  protocellLikeIndex: number;
  complexityIndex: number;
}

interface RateFactors {
  organic: number;
  amino: number;
  nucleotide: number;
  amphiphile: number;
  peptide: number;
  polymer: number;
  compartment: number;
  autocatalytic: number;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  if (edge1 <= edge0) return value >= edge1 ? 1 : 0;
  const t = clamp((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function bell(value: number, center: number, width: number): number {
  const x = (value - center) / Math.max(1e-9, width);
  return Math.exp(-0.5 * x * x);
}

function routeObject(scores: readonly number[]): EnvironmentRouteScores {
  const total = scores.reduce((sum, value) => sum + value, 0);
  const normalized = total > 1e-9 ? scores.map(value => value / total) : [0.25, 0.25, 0.25, 0.25];
  return {
    hydrothermalInterface: normalized[0] ?? 0,
    wetDryMineral: normalized[1] ?? 0,
    aqueousMineralPore: normalized[2] ?? 0,
    iceBrine: normalized[3] ?? 0,
  };
}

function primaryEnvironment(routes: EnvironmentRouteScores): PrebioticEnvironment {
  const entries: Array<[PrebioticEnvironment, number]> = [
    ['hydrothermal-interface', routes.hydrothermalInterface],
    ['wet-dry-mineral', routes.wetDryMineral],
    ['aqueous-mineral-pore', routes.aqueousMineralPore],
    ['ice-brine', routes.iceBrine],
  ];
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0]?.[0] ?? 'aqueous-mineral-pore';
}

function emptyNetwork(): ReactionNetworkState {
  return {
    simpleOrganics: 0,
    aminoPrecursors: 0,
    nucleotidePrecursors: 0,
    amphiphiles: 0,
    peptideOligomers: 0,
    nucleotidePolymers: 0,
    compartments: 0,
    autocatalyticNetworks: 0,
  };
}

export class ChemicalEvolutionModel {
  private readonly rates: RateFactors;

  constructor(seed: string) {
    const rng = createRandomStream(seed, 'phase7/prebiotic-chemistry');
    this.rates = {
      organic: rng.range(0.82, 1.18),
      amino: rng.range(0.82, 1.18),
      nucleotide: rng.range(0.78, 1.22),
      amphiphile: rng.range(0.82, 1.18),
      peptide: rng.range(0.76, 1.24),
      polymer: rng.range(0.72, 1.28),
      compartment: rng.range(0.8, 1.2),
      autocatalytic: rng.range(0.7, 1.3),
    };
  }

  stateAt(surface: SurfaceEvolutionState): ChemicalEvolutionState {
    if (!surface.active || !surface.planet) {
      return {
        active: false,
        environment: 'aqueous-mineral-pore',
        routeScores: routeObject([0, 0, 0, 0]),
        temperatureK: 0,
        pressureBar: 0,
        pHProxy: 7,
        ionicStrengthProxy: 0,
        mineralCatalysisIndex: 0,
        chemistryAgeYears: 0,
        suitability: 0,
        feedstocks: { carbon: 0, nitrogen: 0, phosphorus: 0, sulfur: 0, iron: 0, amphiphilePrecursors: 0 },
        energy: { uv: 0, geothermal: 0, redox: 0, wetDryCycling: 0, impactElectrical: 0, totalGradient: 0 },
        network: emptyNetwork(),
        polymerizationIndex: 0,
        compartmentIndex: 0,
        chemicalSelectionPotential: 0,
        protocellLikeIndex: 0,
        complexityIndex: 0,
      };
    }

    const liquid = surface.hydrosphere.liquidWaterFraction;
    const ice = surface.hydrosphere.iceFraction;
    const ocean = surface.hydrosphere.oceanCoverage;
    const weathering = surface.hydrosphere.weatheringIndex;
    const volcanism = surface.interior.volcanismIndex;
    const heat = clamp(surface.interior.heatFluxEarth / 2.5);
    const pressure = surface.atmosphere.surfacePressureBar;
    const pressureWindow = clamp(Math.log10(1 + pressure * 4) / 2.2);
    const warmChemistry = bell(surface.surfaceTemperatureK, 315, 80);
    const coolChemistry = bell(surface.surfaceTemperatureK, 258, 42);
    const shorelineFraction = clamp(1 - Math.abs(ocean - 0.55) / 0.55);

    const hydrothermal = liquid * (0.2 + 0.8 * volcanism) * (0.3 + 0.7 * heat) * warmChemistry * (0.25 + 0.75 * pressureWindow);
    const wetDry = liquid * shorelineFraction * weathering * bell(surface.surfaceTemperatureK, 305, 58) * (0.25 + 0.75 * pressureWindow);
    const aqueousPore = liquid * weathering * (0.35 + 0.65 * pressureWindow) * bell(surface.surfaceTemperatureK, 292, 70);
    const iceBrine = ice * (0.25 + 0.75 * pressureWindow) * coolChemistry * (0.35 + 0.65 * weathering);
    const routeScores = routeObject([hydrothermal, wetDry, aqueousPore, iceBrine]);
    const environment = primaryEnvironment(routeScores);

    const co2PartialBar = pressure * surface.atmosphere.co2Fraction;
    const pHProxy = clamp(
      7.2 + 2.1 * routeScores.hydrothermalInterface - 0.72 * Math.log10(1 + co2PartialBar * 8) - 0.35 * volcanism,
      3,
      11.5,
    );
    const ionicStrengthProxy = clamp(0.14 + 0.48 * ocean + 0.28 * weathering + 0.16 * volcanism);
    const mineralCatalysisIndex = clamp(
      0.18 + 0.45 * weathering + 0.28 * volcanism + 0.24 * routeScores.aqueousMineralPore + 0.22 * routeScores.hydrothermalInterface,
    );

    const carbon = clamp(0.18 + 0.42 * Math.log10(1 + co2PartialBar * 10) + 0.18 * volcanism);
    const nitrogen = clamp(0.22 + 0.42 * pressureWindow * (1 - surface.atmosphere.co2Fraction) + 0.08 * surface.interior.impactFluxIndex);
    const phosphorus = clamp(0.08 + 0.58 * weathering + 0.18 * volcanism);
    const sulfur = clamp(0.06 + 0.74 * volcanism + 0.18 * routeScores.hydrothermalInterface);
    const iron = clamp(0.12 + 0.50 * weathering + 0.26 * routeScores.hydrothermalInterface);
    const amphiphilePrecursors = clamp(0.10 + 0.34 * carbon + 0.18 * mineralCatalysisIndex + 0.10 * surface.interior.impactFluxIndex);
    const feedstocks: FeedstockState = { carbon, nitrogen, phosphorus, sulfur, iron, amphiphilePrecursors };

    const atmosphericShield = Math.exp(-0.32 * pressureWindow * 4);
    const uv = clamp(surface.stellarFluxEarth * atmosphericShield / 2.2);
    const geothermal = clamp(volcanism * (0.25 + 0.75 * heat));
    const redox = clamp(routeScores.hydrothermalInterface * liquid * (0.28 + 0.38 * sulfur + 0.34 * iron));
    const wetDryCycling = clamp(routeScores.wetDryMineral * (0.35 + 0.65 * shorelineFraction));
    const impactElectrical = clamp(surface.interior.impactFluxIndex * pressureWindow * 0.72);
    const totalGradient = clamp(0.20 * uv + 0.27 * geothermal + 0.25 * redox + 0.20 * wetDryCycling + 0.08 * impactElectrical);
    const energy: EnergyState = { uv, geothermal, redox, wetDryCycling, impactElectrical, totalGradient };

    const waterAvailability = clamp(liquid + 0.45 * ice);
    const feedstockBalance = (carbon * nitrogen * Math.max(0.08, phosphorus)) ** (1 / 3);
    const temperatureSuitability = clamp(0.72 * warmChemistry + 0.28 * coolChemistry);
    const suitability = clamp(
      waterAvailability * temperatureSuitability * (0.2 + 0.8 * pressureWindow) * (0.25 + 0.75 * feedstockBalance) * (0.25 + 0.75 * totalGradient),
    );

    const stabilizationDelayYears = 8e6 + 38e6 * surface.interior.impactFluxIndex + 12e6 * (1 - surface.interior.differentiationProgress);
    const chemistryAgeYears = Math.max(0, surface.ageYears - stabilizationDelayYears);
    const network = this.integrateNetwork(chemistryAgeYears, suitability, feedstocks, energy, routeScores, mineralCatalysisIndex, waterAvailability);
    const polymerizationIndex = clamp(0.45 * network.peptideOligomers + 0.55 * network.nucleotidePolymers);
    const compartmentIndex = network.compartments;
    const chemicalSelectionPotential = clamp(network.compartments * network.autocatalyticNetworks * (0.25 + 0.75 * totalGradient));
    const protocellLikeIndex = clamp(network.compartments * (0.35 + 0.65 * polymerizationIndex) * (0.25 + 0.75 * network.autocatalyticNetworks));
    const complexityIndex = clamp(
      0.12 * network.simpleOrganics
      + 0.12 * network.aminoPrecursors
      + 0.14 * network.nucleotidePrecursors
      + 0.12 * network.amphiphiles
      + 0.14 * network.peptideOligomers
      + 0.16 * network.nucleotidePolymers
      + 0.10 * network.compartments
      + 0.10 * network.autocatalyticNetworks,
    );

    return {
      active: suitability > 0.01 && chemistryAgeYears > 0,
      environment,
      routeScores,
      temperatureK: surface.surfaceTemperatureK,
      pressureBar: pressure,
      pHProxy,
      ionicStrengthProxy,
      mineralCatalysisIndex,
      chemistryAgeYears,
      suitability,
      feedstocks,
      energy,
      network,
      polymerizationIndex,
      compartmentIndex,
      chemicalSelectionPotential,
      protocellLikeIndex,
      complexityIndex,
    };
  }

  private integrateNetwork(
    chemistryAgeYears: number,
    suitability: number,
    feedstocks: FeedstockState,
    energy: EnergyState,
    routes: EnvironmentRouteScores,
    mineralCatalysis: number,
    waterAvailability: number,
  ): ReactionNetworkState {
    if (chemistryAgeYears <= 0 || suitability <= 0.005) return emptyNetwork();

    const network = emptyNetwork();
    const effectiveTime = clamp(Math.log10(1 + chemistryAgeYears / 1e3) / 5.5, 0, 1) * 9 * suitability;
    const steps = 240;
    const dt = effectiveTime / steps;
    const dehydrationDrive = clamp(routes.wetDryMineral + 0.38 * mineralCatalysis + 0.18 * routes.iceBrine);
    const aqueousDrive = clamp(routes.hydrothermalInterface + routes.aqueousMineralPore + 0.35 * waterAvailability);
    const phosphorusAccess = Math.max(0.03, feedstocks.phosphorus);

    for (let i = 0; i < steps; i += 1) {
      const simpleProduction = this.rates.organic
        * (0.20 * energy.uv + 0.26 * energy.redox + 0.20 * energy.geothermal + 0.14 * energy.impactElectrical + 0.20 * mineralCatalysis)
        * feedstocks.carbon;
      network.simpleOrganics = clamp(network.simpleOrganics + dt * (simpleProduction * (1 - network.simpleOrganics) - 0.035 * network.simpleOrganics));

      const aminoProduction = this.rates.amino * network.simpleOrganics * feedstocks.nitrogen
        * (0.22 + 0.42 * aqueousDrive + 0.36 * energy.totalGradient);
      network.aminoPrecursors = clamp(network.aminoPrecursors + dt * (0.18 * aminoProduction * (1 - network.aminoPrecursors) - 0.028 * network.aminoPrecursors));

      const nucleotideProduction = this.rates.nucleotide * network.simpleOrganics * feedstocks.nitrogen * phosphorusAccess
        * (0.22 + 0.40 * mineralCatalysis + 0.38 * dehydrationDrive);
      network.nucleotidePrecursors = clamp(network.nucleotidePrecursors + dt * (0.16 * nucleotideProduction * (1 - network.nucleotidePrecursors) - 0.035 * network.nucleotidePrecursors));

      const amphiphileProduction = this.rates.amphiphile * network.simpleOrganics * feedstocks.amphiphilePrecursors
        * (0.30 + 0.35 * aqueousDrive + 0.35 * mineralCatalysis);
      network.amphiphiles = clamp(network.amphiphiles + dt * (0.17 * amphiphileProduction * (1 - network.amphiphiles) - 0.025 * network.amphiphiles));

      const peptideProduction = this.rates.peptide * network.aminoPrecursors
        * (0.22 + 0.58 * dehydrationDrive + 0.20 * mineralCatalysis);
      network.peptideOligomers = clamp(network.peptideOligomers + dt * (0.11 * peptideProduction * (1 - network.peptideOligomers) - 0.038 * network.peptideOligomers));

      const polymerCofactor = clamp(0.25 + 0.28 * feedstocks.iron + 0.22 * mineralCatalysis + 0.25 * dehydrationDrive);
      const polymerProduction = this.rates.polymer * network.nucleotidePrecursors * polymerCofactor;
      network.nucleotidePolymers = clamp(network.nucleotidePolymers + dt * (0.085 * polymerProduction * (1 - network.nucleotidePolymers) - 0.045 * network.nucleotidePolymers));

      const compartmentProduction = this.rates.compartment * network.amphiphiles * waterAvailability
        * (0.30 + 0.35 * ionicCompatibility(routes) + 0.35 * aqueousDrive);
      network.compartments = clamp(network.compartments + dt * (0.13 * compartmentProduction * (1 - network.compartments) - 0.03 * network.compartments));

      const networkSubstrate = Math.sqrt(Math.max(0, network.peptideOligomers * network.nucleotidePolymers));
      const autocatalyticProduction = this.rates.autocatalytic * networkSubstrate * network.compartments
        * (0.20 + 0.80 * energy.totalGradient);
      network.autocatalyticNetworks = clamp(network.autocatalyticNetworks + dt * (0.075 * autocatalyticProduction * (1 - network.autocatalyticNetworks) - 0.04 * network.autocatalyticNetworks));
    }

    return network;
  }
}

function ionicCompatibility(routes: EnvironmentRouteScores): number {
  return clamp(0.34 + 0.28 * routes.aqueousMineralPore + 0.20 * routes.hydrothermalInterface + 0.18 * routes.iceBrine);
}
