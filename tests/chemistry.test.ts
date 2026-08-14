import { describe, expect, it } from 'vitest';
import { ChemicalEvolutionModel } from '../src/science/chemistry/model';
import type { SurfaceEvolutionState } from '../src/science/surface/model';
import { metersPerLocalUnit } from '../src/render/camera/referenceFrames';

function surfaceFixture(ageYears = 8e8): SurfaceEvolutionState {
  return {
    active: true,
    planet: {
      id: 7,
      massEarth: 1.05,
      coreMassEarth: 0.72,
      radiusEarth: 1.01,
      semimajorAxisAu: 0.98,
      eccentricity: 0.03,
      inclinationDeg: 1.1,
      meanLongitudeRadians: 0.5,
      composition: 'water-rich',
      gasEnvelopeFraction: 0.002,
      iceFraction: 0.24,
      formationProgress: 1,
      status: 'planet',
    },
    ageYears,
    radiusKm: 6435,
    gravityEarth: 1.03,
    escapeVelocityKmS: 11.4,
    stellarFluxEarth: 1.02,
    equilibriumTemperatureK: 258,
    surfaceTemperatureK: 296,
    albedo: 0.31,
    climate: 'temperate',
    interior: {
      differentiated: true,
      differentiationProgress: 1,
      coreMassFraction: 0.28,
      coreRadiusFraction: 0.53,
      mantleTemperatureK: 1820,
      heatFluxEarth: 1.05,
      convectionIndex: 0.64,
      tectonicMobilityIndex: 0.57,
      tectonicRegime: 'episodic',
      volcanismIndex: 0.46,
      dynamoIndex: 0.63,
      crustThicknessKm: 24,
      impactFluxIndex: 0.12,
    },
    atmosphere: {
      retainedFraction: 0.82,
      surfacePressureBar: 1.3,
      co2Fraction: 0.035,
      waterVaporFraction: 0.025,
      greenhouseDeltaK: 38,
    },
    hydrosphere: {
      initialWaterEarthOceans: 1.8,
      retainedWaterEarthOceans: 1.45,
      liquidWaterFraction: 0.88,
      iceFraction: 0.08,
      oceanCoverage: 0.61,
      weatheringIndex: 0.68,
    },
  };
}

describe('Phase 7 inherited chemistry', () => {
  it('does not create chemistry without a parent surface world', () => {
    const surface = surfaceFixture();
    surface.active = false;
    surface.planet = null;
    const state = new ChemicalEvolutionModel('chem-inactive').stateAt(surface);
    expect(state.active).toBe(false);
    expect(state.complexityIndex).toBe(0);
    expect(state.network.simpleOrganics).toBe(0);
  });

  it('inherits local pressure and temperature exactly from Phase 6', () => {
    const surface = surfaceFixture();
    const state = new ChemicalEvolutionModel('chem-inherit').stateAt(surface);
    expect(state.temperatureK).toBe(surface.surfaceTemperatureK);
    expect(state.pressureBar).toBe(surface.atmosphere.surfacePressureBar);
  });

  it('keeps environment routes normalized and allows mixed pathways', () => {
    const state = new ChemicalEvolutionModel('chem-routes').stateAt(surfaceFixture());
    const routes = Object.values(state.routeScores);
    expect(routes.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 10);
    expect(routes.filter(value => value > 0.05).length).toBeGreaterThan(1);
  });

  it('is deterministic for the same continuum seed and environment', () => {
    const surface = surfaceFixture();
    const a = new ChemicalEvolutionModel('chem-determinism').stateAt(surface);
    const b = new ChemicalEvolutionModel('chem-determinism').stateAt(surface);
    expect(a.environment).toBe(b.environment);
    expect(a.network).toEqual(b.network);
    expect(a.protocellLikeIndex).toBe(b.protocellLikeIndex);
  });

  it('keeps every normalized network state bounded', () => {
    const state = new ChemicalEvolutionModel('chem-bounds').stateAt(surfaceFixture(2e9));
    for (const value of Object.values(state.network)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
    expect(state.suitability).toBeGreaterThanOrEqual(0);
    expect(state.suitability).toBeLessThanOrEqual(1);
    expect(state.chemicalSelectionPotential).toBeLessThanOrEqual(1);
  });

  it('accumulates greater chemical complexity with more time under identical favorable conditions', () => {
    const model = new ChemicalEvolutionModel('chem-time');
    const early = model.stateAt(surfaceFixture(8e7));
    const late = model.stateAt(surfaceFixture(1.5e9));
    expect(late.chemistryAgeYears).toBeGreaterThan(early.chemistryAgeYears);
    expect(late.complexityIndex).toBeGreaterThanOrEqual(early.complexityIndex);
    expect(late.network.simpleOrganics).toBeGreaterThanOrEqual(early.network.simpleOrganics);
  });

  it('uses micrometers as the physical Phase-7 local unit', () => {
    expect(metersPerLocalUnit('microscopic')).toBe(1e-6);
  });
});
