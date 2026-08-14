import { createRandomStream, type RandomStream } from '../../core/random';
import { PLANCK_LAMBDA_CDM } from './constants';

interface FourierMode {
  kx: number;
  ky: number;
  kz: number;
  densityAmplitude: number;
  phase: number;
}

export interface ZeldovichFieldOptions {
  gridSize?: number;
  boxSize?: number;
  modeCount?: number;
}

function gaussian(rng: RandomStream): number {
  const u1 = Math.max(Number.EPSILON, rng.next());
  const u2 = rng.next();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(Math.PI * 2 * u2);
}

function createModes(rng: RandomStream, modeCount: number): FourierMode[] {
  const modes: FourierMode[] = [];
  const ns = PLANCK_LAMBDA_CDM.scalarSpectralIndex;
  for (let i = 0; i < modeCount; i += 1) {
    let kx = 0;
    let ky = 0;
    let kz = 0;
    while (kx === 0 && ky === 0 && kz === 0) {
      kx = rng.int(-7, 7);
      ky = rng.int(-7, 7);
      kz = rng.int(-7, 7);
    }
    const k = Math.sqrt(kx * kx + ky * ky + kz * kz);
    // Reduced transfer function: preserves a near-scale-invariant primordial
    // spectrum at low k while suppressing unresolved small-scale power.
    const transfer = 1 / (1 + (k / 4.2) ** 2);
    const power = (k ** ns) * transfer * transfer;
    modes.push({
      kx,
      ky,
      kz,
      densityAmplitude: gaussian(rng) * Math.sqrt(power),
      phase: rng.range(0, Math.PI * 2),
    });
  }
  return modes;
}

export class ZeldovichField {
  readonly particleCount: number;
  readonly boxSize: number;
  readonly lagrangian: Float32Array;
  readonly displacement: Float32Array;
  readonly densityProxy: Float32Array;

  constructor(seed: string, options: ZeldovichFieldOptions = {}) {
    const gridSize = options.gridSize ?? 18;
    this.boxSize = options.boxSize ?? 32;
    const modeCount = options.modeCount ?? 96;
    if (!Number.isInteger(gridSize) || gridSize < 6 || gridSize > 48) {
      throw new Error(`gridSize must be an integer between 6 and 48, received ${gridSize}`);
    }
    if (!Number.isInteger(modeCount) || modeCount < 8) {
      throw new Error(`modeCount must be an integer >= 8, received ${modeCount}`);
    }

    this.particleCount = gridSize ** 3;
    this.lagrangian = new Float32Array(this.particleCount * 3);
    this.displacement = new Float32Array(this.particleCount * 3);
    this.densityProxy = new Float32Array(this.particleCount);

    const rng = createRandomStream(seed, 'phase3/primordial-fourier-field');
    const modes = createModes(rng, modeCount);
    const spacing = this.boxSize / gridSize;
    let index = 0;

    for (let iz = 0; iz < gridSize; iz += 1) {
      for (let iy = 0; iy < gridSize; iy += 1) {
        for (let ix = 0; ix < gridSize; ix += 1) {
          const x = (ix + 0.5) * spacing - this.boxSize / 2;
          const y = (iy + 0.5) * spacing - this.boxSize / 2;
          const z = (iz + 0.5) * spacing - this.boxSize / 2;
          const base = index * 3;
          this.lagrangian[base] = x;
          this.lagrangian[base + 1] = y;
          this.lagrangian[base + 2] = z;

          const nx = (x / this.boxSize) * Math.PI * 2;
          const ny = (y / this.boxSize) * Math.PI * 2;
          const nz = (z / this.boxSize) * Math.PI * 2;
          let dx = 0;
          let dy = 0;
          let dz = 0;
          let density = 0;

          for (const mode of modes) {
            const k2 = mode.kx ** 2 + mode.ky ** 2 + mode.kz ** 2;
            const angle = mode.kx * nx + mode.ky * ny + mode.kz * nz + mode.phase;
            const cosine = Math.cos(angle);
            const sine = Math.sin(angle);
            density += mode.densityAmplitude * cosine;
            // Zel'dovich displacement is proportional to grad^-1(delta):
            // psi_k ~ i k delta_k / |k|^2.
            const coefficient = mode.densityAmplitude * sine / k2;
            dx += mode.kx * coefficient;
            dy += mode.ky * coefficient;
            dz += mode.kz * coefficient;
          }

          this.displacement[base] = dx;
          this.displacement[base + 1] = dy;
          this.displacement[base + 2] = dz;
          this.densityProxy[index] = density;
          index += 1;
        }
      }
    }

    this.normalizeDisplacements(spacing * 0.92);
    this.normalizeDensity();
  }

  writePositions(growthNormalized: number, target: Float32Array, baryonLag = 1): void {
    if (target.length !== this.lagrangian.length) {
      throw new Error(`Position target length ${target.length} does not match field length ${this.lagrangian.length}`);
    }
    const growth = Math.min(1, Math.max(0, growthNormalized)) * Math.min(1, Math.max(0, baryonLag));
    for (let i = 0; i < target.length; i += 1) {
      target[i] = (this.lagrangian[i] ?? 0) + (this.displacement[i] ?? 0) * growth;
    }
  }

  private normalizeDisplacements(targetRms: number): void {
    let sumSquares = 0;
    for (let i = 0; i < this.displacement.length; i += 3) {
      const dx = this.displacement[i] ?? 0;
      const dy = this.displacement[i + 1] ?? 0;
      const dz = this.displacement[i + 2] ?? 0;
      sumSquares += dx * dx + dy * dy + dz * dz;
    }
    const rms = Math.sqrt(sumSquares / this.particleCount);
    const scale = rms > 0 ? targetRms / rms : 1;
    for (let i = 0; i < this.displacement.length; i += 1) {
      this.displacement[i] = (this.displacement[i] ?? 0) * scale;
    }
  }

  private normalizeDensity(): void {
    let mean = 0;
    for (const value of this.densityProxy) mean += value;
    mean /= this.densityProxy.length;
    let variance = 0;
    for (const value of this.densityProxy) variance += (value - mean) ** 2;
    const sigma = Math.sqrt(variance / this.densityProxy.length) || 1;
    for (let i = 0; i < this.densityProxy.length; i += 1) {
      const z = ((this.densityProxy[i] ?? 0) - mean) / sigma;
      this.densityProxy[i] = Math.max(-3, Math.min(3, z)) / 3;
    }
  }
}
