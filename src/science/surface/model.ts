import { createRandomStream } from '../../core/random';
import { SI } from '../cosmology/constants';
import type { CosmologyState } from '../cosmology/model';
import type { PlanetBodyState, PlanetarySystemState } from '../planets/model';
import type { StellarSnapshot } from '../stars/model';

const EARTH_OCEAN_MASS_IN_EARTH_MASSES = 2.35e-4;
const EARTH_RADIUS_KM = 6371;

export type TectonicRegime = 'unformed' | 'magma-ocean' | 'stagnant-lid' | 'episodic' | 'mobile-lid' | 'cold-lid';
export type ClimateState = 'unformed' | 'airless-cold' | 'snowball' | 'temperate' | 'steam-greenhouse' | 'hot-dry';

export interface InteriorState {
  differentiated: boolean;
  differentiationProgress: number;
  coreMassFraction: number;
  coreRadiusFraction: number;
  mantleTemperatureK: number;
  heatFluxEarth: number;
  convectionIndex: number;
  tectonicMobilityIndex: number;
  tectonicRegime: TectonicRegime;
  volcanismIndex: number;
  dynamoIndex: number;
  crustThicknessKm: number;
  impactFluxIndex: number;
}

export interface AtmosphereState {
  retainedFraction: number;
  surfacePressureBar: number;
  co2Fraction: number;
  waterVaporFraction: number;
  greenhouseDeltaK: number;
}

export interface HydrosphereState {
  initialWaterEarthOceans: number;
  retainedWaterEarthOceans: number;
  liquidWaterFraction: number;
  iceFraction: number;
  oceanCoverage: number;
  weatheringIndex: number;
}

export interface SurfaceEvolutionState {
  active: boolean;
  planet: PlanetBodyState | null;
  ageYears: number;
  radiusKm: number;
  gravityEarth: number;
  escapeVelocityKmS: number;
  stellarFluxEarth: number;
  equilibriumTemperatureK: number;
  surfaceTemperatureK: number;
  albedo: number;
  climate: ClimateState;
  interior: InteriorState;
  atmosphere: AtmosphereState;
  hydrosphere: HydrosphereState;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  if (edge1 <= edge0) return value >= edge1 ? 1 : 0;
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function compositionCoreFraction(planet: PlanetBodyState): number {
  if (planet.composition === 'rocky') return 0.32;
  if (planet.composition === 'water-rich') return 0.28;
  if (planet.composition === 'ice-rich') return 0.20;
  if (planet.composition === 'ice-giant') return 0.14;
  return 0.08;
}

function inactiveState(): SurfaceEvolutionState {
  return {
    active: false,
    planet: null,
    ageYears: 0,
    radiusKm: 0,
    gravityEarth: 0,
    escapeVelocityKmS: 0,
    stellarFluxEarth: 0,
    equilibriumTemperatureK: 0,
    surfaceTemperatureK: 0,
    albedo: 0,
    climate: 'unformed',
    interior: {
      differentiated: false,
      differentiationProgress: 0,
      coreMassFraction: 0,
      coreRadiusFraction: 0,
      mantleTemperatureK: 0,
      heatFluxEarth: 0,
      convectionIndex: 0,
      tectonicMobilityIndex: 0,
      tectonicRegime: 'unformed',
      volcanismIndex: 0,
      dynamoIndex: 0,
      crustThicknessKm: 0,
      impactFluxIndex: 0,
    },
    atmosphere: {
      retainedFraction: 0,
      surfacePressureBar: 0,
      co2Fraction: 0,
      waterVaporFraction: 0,
      greenhouseDeltaK: 0,
    },
    hydrosphere: {
      initialWaterEarthOceans: 0,
      retainedWaterEarthOceans: 0,
      liquidWaterFraction: 0,
      iceFraction: 0,
      oceanCoverage: 0,
      weatheringIndex: 0,
    },
  };
}

export class SurfaceEvolutionModel {
  private readonly mantleSeedFactor: number;
  private readonly volatileSeedFactor: number;
  private readonly albedoRock: number;

  constructor(seed: string) {
    const rng = createRandomStream(seed, 'phase6/surface-evolution');
    this.mantleSeedFactor = rng.range(0.88, 1.12);
    this.volatileSeedFactor = rng.range(0.82, 1.18);
    this.albedoRock = rng.range(0.16, 0.27);
  }

  stateAt(
    cosmology: CosmologyState,
    stellar: StellarSnapshot,
    planetary: PlanetarySystemState,
  ): SurfaceEvolutionState {
    const planet = planetary.selectedPlanet;
    if (!planet || planet.status === 'ejected' || planet.massEarth <= 0 || stellar.stage === 'unborn') return inactiveState();

    const cosmicAgeYears = cosmology.ageSeconds / SI.secondsPerJulianYear;
    const ageYears = Math.max(0, planetary.starAgeYears);
    const radiusEarth = Math.max(0.12, planet.radiusEarth);
    const massEarth = Math.max(0.02, planet.massEarth);
    const radiusKm = radiusEarth * EARTH_RADIUS_KM;
    const gravityEarth = massEarth / (radiusEarth * radiusEarth);
    const escapeVelocityKmS = 11.186 * Math.sqrt(massEarth / radiusEarth);

    const coreMassFraction = compositionCoreFraction(planet);
    const differentiationTimescale = 28e6 / Math.sqrt(Math.max(0.15, massEarth));
    const differentiationProgress = smoothstep(2e5, differentiationTimescale, ageYears);
    const coreRadiusFraction = clamp(0.55 * (coreMassFraction / 0.32) ** (1 / 3), 0.26, 0.64) * differentiationProgress;

    const earlyImpactHeat = 1500 * Math.exp(-ageYears / 45e6) * massEarth ** 0.18;
    const secularHeat = 520 * Math.exp(-ageYears / 2.4e9) * massEarth ** 0.22;
    const longLivedRadiogenic = 220 * Math.exp(-ageYears / 7.5e9) * this.mantleSeedFactor;
    const mantleTemperatureK = clamp(1450 + earlyImpactHeat + secularHeat + longLivedRadiogenic, 900, 4300);
    const heatFluxEarth = clamp(
      massEarth ** 0.28 * this.mantleSeedFactor * (0.22 + 1.65 * Math.exp(-ageYears / 2.7e9)),
      0.04,
      3.5,
    );
    const convectionIndex = clamp((heatFluxEarth - 0.12) / 1.45 * massEarth ** 0.08, 0, 1);

    const nominalWaterMassFraction = clamp(
      (0.00018 + 0.015 * planet.iceFraction * planet.iceFraction) * this.volatileSeedFactor,
      2e-5,
      0.08,
    );
    const initialWaterEarthOceans = nominalWaterMassFraction * massEarth / EARTH_OCEAN_MASS_IN_EARTH_MASSES;

    const stellarLuminositySolar = Math.max(0, stellar.luminositySolar);
    const orbitalDistanceAu = Math.max(0.03, planet.semimajorAxisAu);
    const stellarFluxEarth = stellarLuminositySolar / (orbitalDistanceAu * orbitalDistanceAu);
    const thermalEscapeStress = clamp((stellarFluxEarth ** 0.35) * (8.8 / Math.max(2, escapeVelocityKmS)), 0.05, 4);
    const ageEscape = 1 - Math.exp(-ageYears / 8e8);
    const retainedFraction = clamp(Math.exp(-thermalEscapeStress * ageEscape * 0.72), 0, 1);
    const retainedWaterEarthOceans = initialWaterEarthOceans * retainedFraction;

    const waterLubrication = clamp(Math.log10(1 + retainedWaterEarthOceans) / 1.2, 0, 1);
    const tectonicMobilityIndex = clamp(
      convectionIndex * (0.35 + 0.65 * waterLubrication) * clamp(gravityEarth ** 0.12, 0.75, 1.25),
      0,
      1,
    );
    let tectonicRegime: TectonicRegime;
    if (ageYears < Math.max(3e6, differentiationTimescale * 0.35) || mantleTemperatureK > 3000) tectonicRegime = 'magma-ocean';
    else if (heatFluxEarth < 0.18) tectonicRegime = 'cold-lid';
    else if (tectonicMobilityIndex >= 0.67) tectonicRegime = 'mobile-lid';
    else if (tectonicMobilityIndex >= 0.38) tectonicRegime = 'episodic';
    else tectonicRegime = 'stagnant-lid';

    const volcanismIndex = clamp(
      convectionIndex * differentiationProgress * (0.55 + 0.45 * Math.exp(-ageYears / 4e9)),
      0,
      1,
    );
    const coreCoolingWindow = smoothstep(8e6, 300e6, ageYears) * (1 - smoothstep(8e9, 18e9, ageYears));
    const dynamoIndex = clamp(
      differentiationProgress * coreCoolingWindow * (0.25 + 0.75 * convectionIndex) * (coreMassFraction / 0.32),
      0,
      1,
    );
    const crustThicknessKm = clamp(
      18 * radiusEarth * massEarth ** -0.28 * (1.45 - 0.65 * convectionIndex),
      3,
      180,
    );
    const impactFluxIndex = clamp(0.02 + 0.98 * Math.exp(-ageYears / 4.5e8), 0, 1);

    const outgassingPressureBar = (0.12 + 5.5 * massEarth ** 0.55 * (0.25 + planet.iceFraction))
      * differentiationProgress
      * (0.35 + 0.65 * volcanismIndex);
    const surfacePressureBar = clamp(outgassingPressureBar * retainedFraction, 0, 220);
    const dryWeatheringPotential = clamp(retainedWaterEarthOceans / 0.3, 0, 1) * tectonicMobilityIndex;
    const co2Fraction = clamp(
      0.015 + 0.34 * Math.exp(-ageYears / 1.5e9) + 0.22 * volcanismIndex - 0.20 * dryWeatheringPotential,
      0.0002,
      0.85,
    );

    const provisionalAlbedo = clamp(
      this.albedoRock + 0.11 * clamp(retainedWaterEarthOceans, 0, 1) + (stellarFluxEarth < 0.65 ? 0.06 : 0),
      0.08,
      0.72,
    );
    const equilibriumTemperatureK = 278.5
      * Math.max(1e-6, stellarLuminositySolar) ** 0.25
      / Math.sqrt(orbitalDistanceAu)
      * ((1 - provisionalAlbedo) / 0.7) ** 0.25;
    const co2PartialPressure = surfacePressureBar * co2Fraction;
    const greenhouseDeltaK = clamp(
      8 * Math.log1p(surfacePressureBar * 2.5)
      + 18 * Math.sqrt(Math.max(0, co2PartialPressure))
      + 5 * clamp(retainedWaterEarthOceans, 0, 3),
      0,
      190,
    );
    const surfaceTemperatureK = equilibriumTemperatureK + greenhouseDeltaK;

    const liquidWindow = smoothstep(258, 282, surfaceTemperatureK) * (1 - smoothstep(340, 390, surfaceTemperatureK));
    const liquidWaterFraction = clamp(liquidWindow * retainedFraction, 0, 1);
    const iceFraction = clamp(
      retainedWaterEarthOceans <= 0 ? 0 : 1 - smoothstep(245, 285, surfaceTemperatureK),
      0,
      1,
    );
    const oceanCoveragePotential = 1 - Math.exp(-1.25 * Math.max(0, retainedWaterEarthOceans));
    const oceanCoverage = clamp(oceanCoveragePotential * (0.25 + 0.75 * liquidWaterFraction), 0, 1);
    const waterVaporFraction = clamp(
      surfacePressureBar > 0 ? 0.004 + 0.14 * smoothstep(285, 370, surfaceTemperatureK) * liquidWaterFraction : 0,
      0,
      0.65,
    );
    const weatheringIndex = clamp(
      liquidWaterFraction * oceanCoverage * (0.3 + 0.7 * tectonicMobilityIndex),
      0,
      1,
    );
    const albedo = clamp(
      this.albedoRock + 0.16 * iceFraction + 0.08 * oceanCoverage + 0.05 * waterVaporFraction,
      0.06,
      0.78,
    );

    let climate: ClimateState;
    if (surfacePressureBar < 0.02 && surfaceTemperatureK < 260) climate = 'airless-cold';
    else if (surfaceTemperatureK < 265 || iceFraction > 0.75) climate = 'snowball';
    else if (surfaceTemperatureK <= 340 && liquidWaterFraction > 0.2) climate = 'temperate';
    else if (surfaceTemperatureK > 340 && waterVaporFraction > 0.05) climate = 'steam-greenhouse';
    else climate = 'hot-dry';

    void cosmicAgeYears;
    return {
      active: true,
      planet,
      ageYears,
      radiusKm,
      gravityEarth,
      escapeVelocityKmS,
      stellarFluxEarth,
      equilibriumTemperatureK,
      surfaceTemperatureK,
      albedo,
      climate,
      interior: {
        differentiated: differentiationProgress > 0.95,
        differentiationProgress,
        coreMassFraction,
        coreRadiusFraction,
        mantleTemperatureK,
        heatFluxEarth,
        convectionIndex,
        tectonicMobilityIndex,
        tectonicRegime,
        volcanismIndex,
        dynamoIndex,
        crustThicknessKm,
        impactFluxIndex,
      },
      atmosphere: {
        retainedFraction,
        surfacePressureBar,
        co2Fraction,
        waterVaporFraction,
        greenhouseDeltaK,
      },
      hydrosphere: {
        initialWaterEarthOceans,
        retainedWaterEarthOceans,
        liquidWaterFraction,
        iceFraction,
        oceanCoverage,
        weatheringIndex,
      },
    };
  }
}
