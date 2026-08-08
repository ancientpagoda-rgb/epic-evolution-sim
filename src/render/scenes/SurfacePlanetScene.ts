import * as THREE from 'three/webgpu';
import { createRandomStream } from '../../core/random';
import type { SurfaceEvolutionState } from '../../science/surface/model';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export class SurfacePlanetScene {
  readonly group = new THREE.Group();
  private readonly planetRoot = new THREE.Group();
  private readonly terrainGeometry: THREE.SphereGeometry;
  private readonly terrainMaterial: THREE.MeshStandardMaterial;
  private readonly elevations: Float32Array;
  private readonly atmosphereMaterial: THREE.MeshBasicMaterial;
  private readonly atmosphere: THREE.Mesh;
  private readonly cloudMaterial: THREE.PointsMaterial;
  private readonly cloudLayer: THREE.Points;
  private readonly volcanoMaterial: THREE.PointsMaterial;
  private readonly volcanoLayer: THREE.Points;
  private transitionOpacity = 0;
  private state: SurfaceEvolutionState | null = null;

  constructor(seed: string) {
    this.group.name = 'phase6-surface-world';
    this.planetRoot.name = 'phase6-physical-planet-km';
    this.group.add(this.planetRoot);

    const builtTerrain = this.createTerrain(seed);
    this.terrainGeometry = builtTerrain.geometry;
    this.elevations = builtTerrain.elevations;
    this.terrainMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.92,
      metalness: 0,
      transparent: true,
      opacity: 0,
    });
    const terrain = new THREE.Mesh(this.terrainGeometry, this.terrainMaterial);
    terrain.name = 'phase6-terrain';
    this.planetRoot.add(terrain);

    this.atmosphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x79aee8,
      transparent: true,
      opacity: 0,
      side: THREE.BackSide,
      depthWrite: false,
    });
    this.atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(1, 96, 48),
      this.atmosphereMaterial,
    );
    this.atmosphere.name = 'phase6-atmosphere';
    this.planetRoot.add(this.atmosphere);

    this.cloudLayer = this.createSurfacePoints(seed, 'clouds', 1800, 1.008);
    this.cloudMaterial = this.cloudLayer.material as THREE.PointsMaterial;
    this.cloudMaterial.color.set(0xeaf5ff);
    this.cloudMaterial.size = 0.0024;
    this.cloudMaterial.sizeAttenuation = true;
    this.cloudMaterial.transparent = true;
    this.cloudMaterial.opacity = 0;
    this.cloudMaterial.depthWrite = false;
    this.planetRoot.add(this.cloudLayer);

    this.volcanoLayer = this.createSurfacePoints(seed, 'volcanoes', 72, 1.003);
    this.volcanoMaterial = this.volcanoLayer.material as THREE.PointsMaterial;
    this.volcanoMaterial.color.set(0xff6b32);
    this.volcanoMaterial.size = 0.0055;
    this.volcanoMaterial.sizeAttenuation = true;
    this.volcanoMaterial.transparent = true;
    this.volcanoMaterial.opacity = 0;
    this.volcanoMaterial.depthWrite = false;
    this.planetRoot.add(this.volcanoLayer);
  }

  setState(state: SurfaceEvolutionState): void {
    this.state = state;
    if (!state.active || !state.planet) {
      this.group.visible = false;
      return;
    }

    this.group.visible = this.transitionOpacity > 0.001;
    this.planetRoot.scale.setScalar(state.radiusKm);
    const atmosphereRelativeHeight = 1 + clamp(85 / Math.max(500, state.radiusKm), 0.004, 0.08);
    this.atmosphere.scale.setScalar(atmosphereRelativeHeight);
    this.updateTerrainColors(state);

    this.terrainMaterial.opacity = this.transitionOpacity;
    const pressureVisibility = clamp(Math.log10(1 + state.atmosphere.surfacePressureBar * 4) / 2.2, 0, 1);
    this.atmosphereMaterial.opacity = this.transitionOpacity * pressureVisibility * 0.18;
    this.atmosphereMaterial.color.setHSL(
      clamp(0.56 - state.atmosphere.co2Fraction * 0.12, 0.05, 0.62),
      clamp(0.35 + pressureVisibility * 0.25, 0.25, 0.7),
      clamp(0.48 + state.atmosphere.waterVaporFraction * 0.24, 0.42, 0.72),
    );
    this.cloudMaterial.opacity = this.transitionOpacity
      * clamp(state.atmosphere.waterVaporFraction * 2.5 + state.hydrosphere.liquidWaterFraction * 0.16, 0, 0.48);
    this.volcanoMaterial.opacity = this.transitionOpacity * state.interior.volcanismIndex * 0.85;
  }

  setTransitionOpacity(opacity: number): void {
    this.transitionOpacity = clamp(opacity, 0, 1);
    if (this.state) this.setState(this.state);
    else this.group.visible = this.transitionOpacity > 0.001;
  }

  update(timeMs: number): void {
    this.planetRoot.rotation.y = timeMs * 0.000012;
    this.cloudLayer.rotation.y = -timeMs * 0.000008;
  }

  private updateTerrainColors(state: SurfaceEvolutionState): void {
    const colorAttribute = this.terrainGeometry.getAttribute('color') as THREE.BufferAttribute;
    const colors = colorAttribute.array as Float32Array;
    const sorted = Array.from(this.elevations).sort((a, b) => a - b);
    const oceanCoverage = clamp(state.hydrosphere.oceanCoverage, 0, 0.97);
    const seaIndex = Math.floor(oceanCoverage * Math.max(0, sorted.length - 1));
    const seaLevel = sorted[seaIndex] ?? -1;
    const frozen = state.hydrosphere.iceFraction;
    const hot = clamp((state.surfaceTemperatureK - 330) / 220, 0, 1);

    const landLow = new THREE.Color().setRGB(0.29, 0.24, 0.17);
    const landHigh = new THREE.Color().setRGB(0.48, 0.43, 0.34);
    const ocean = new THREE.Color().setRGB(0.06, 0.22, 0.36);
    const ice = new THREE.Color().setRGB(0.78, 0.88, 0.94);
    const hotRock = new THREE.Color().setRGB(0.42, 0.16, 0.07);
    const target = new THREE.Color();

    for (let i = 0; i < this.elevations.length; i += 1) {
      const elevation = this.elevations[i] ?? 0;
      const base = i * 3;
      if (elevation <= seaLevel && oceanCoverage > 0.01) {
        target.copy(ocean).lerp(ice, frozen * 0.82);
      } else {
        const height = clamp((elevation - seaLevel) / 0.0035, 0, 1);
        target.copy(landLow).lerp(landHigh, height).lerp(hotRock, hot * 0.72);
        if (frozen > 0.55 && height > 0.55) target.lerp(ice, clamp(frozen * height, 0, 0.9));
      }
      colors[base] = target.r;
      colors[base + 1] = target.g;
      colors[base + 2] = target.b;
    }
    colorAttribute.needsUpdate = true;
  }

  private createTerrain(seed: string): { geometry: THREE.SphereGeometry; elevations: Float32Array } {
    const rng = createRandomStream(seed, 'phase6/terrain');
    const geometry = new THREE.SphereGeometry(1, 160, 80);
    const position = geometry.getAttribute('position') as THREE.BufferAttribute;
    const elevations = new Float32Array(position.count);
    const colors = new Float32Array(position.count * 3);
    const harmonics = Array.from({ length: 9 }, (_, index) => ({
      nx: rng.range(0.7, 4.8) * (index % 2 === 0 ? 1 : -1),
      ny: rng.range(0.7, 5.2),
      nz: rng.range(0.7, 5.4),
      phase: rng.range(0, Math.PI * 2),
      amplitude: rng.range(0.00018, 0.00078) / (1 + index * 0.22),
    }));

    const direction = new THREE.Vector3();
    for (let i = 0; i < position.count; i += 1) {
      direction.fromBufferAttribute(position, i).normalize();
      let elevation = 0;
      for (const harmonic of harmonics) {
        elevation += harmonic.amplitude * Math.sin(
          direction.x * harmonic.nx * Math.PI
          + direction.y * harmonic.ny * Math.PI
          + direction.z * harmonic.nz * Math.PI
          + harmonic.phase,
        );
      }
      elevations[i] = elevation;
      direction.multiplyScalar(1 + elevation);
      position.setXYZ(i, direction.x, direction.y, direction.z);
      colors[i * 3] = 0.3;
      colors[i * 3 + 1] = 0.3;
      colors[i * 3 + 2] = 0.3;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    position.needsUpdate = true;
    geometry.computeVertexNormals();
    return { geometry, elevations };
  }

  private createSurfacePoints(seed: string, stream: string, count: number, radius: number): THREE.Points {
    const rng = createRandomStream(seed, `phase6/${stream}`);
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const z = rng.range(-1, 1);
      const theta = rng.range(0, Math.PI * 2);
      const rxy = Math.sqrt(Math.max(0, 1 - z * z));
      positions[i * 3] = Math.cos(theta) * rxy * radius;
      positions[i * 3 + 1] = z * radius;
      positions[i * 3 + 2] = Math.sin(theta) * rxy * radius;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return new THREE.Points(geometry, new THREE.PointsMaterial());
  }
}
