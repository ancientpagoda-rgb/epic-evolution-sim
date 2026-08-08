import * as THREE from 'three/webgpu';
import { createRandomStream } from '../../core/random';
import type { PlanetBodyState, PlanetarySystemState, PlanetFormationModel } from '../../science/planets/model';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function compositionColor(composition: PlanetBodyState['composition']): number {
  if (composition === 'gas-giant') return 0xd9b98f;
  if (composition === 'ice-giant') return 0x75b9d8;
  if (composition === 'ice-rich') return 0xbdddf0;
  if (composition === 'water-rich') return 0x6ba5c8;
  return 0xb68b68;
}

export class PlanetarySystemScene {
  readonly group = new THREE.Group();
  private readonly diskMaterial: THREE.PointsMaterial;
  private readonly diskGeometry: THREE.BufferGeometry;
  private readonly snowLineMaterial: THREE.MeshBasicMaterial;
  private readonly snowLine: THREE.Mesh;
  private readonly starMaterial: THREE.MeshBasicMaterial;
  private readonly starGlowMaterial: THREE.PointsMaterial;
  private readonly bodyMeshes = new Map<number, THREE.Mesh>();
  private readonly orbitMeshes = new Map<number, THREE.Mesh>();
  private readonly selectedMarkerMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    wireframe: true,
    depthWrite: false,
  });
  private readonly selectedMarker = new THREE.Mesh(
    new THREE.TorusGeometry(1, 0.04, 10, 96),
    this.selectedMarkerMaterial,
  );
  private transitionOpacity = 0;
  private systemState: PlanetarySystemState | null = null;

  constructor(seed: string, private readonly model: PlanetFormationModel) {
    this.group.name = 'phase5-planetary-system';

    this.starMaterial = new THREE.MeshBasicMaterial({
      color: 0xffdfb0,
      transparent: true,
      opacity: 0,
    });
    const starRadiusLocal = 0.00465047 * 10 * Math.max(0.55, model.star.massSolar ** 0.8);
    const star = new THREE.Mesh(
      new THREE.SphereGeometry(starRadiusLocal, 48, 24),
      this.starMaterial,
    );
    star.name = 'phase5-star-physical-radius';
    this.group.add(star);

    const glowGeometry = new THREE.BufferGeometry();
    glowGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));
    this.starGlowMaterial = new THREE.PointsMaterial({
      color: 0xffdfb0,
      size: 2.6,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.group.add(new THREE.Points(glowGeometry, this.starGlowMaterial));

    this.diskGeometry = this.createDiskGeometry(seed);
    this.diskMaterial = new THREE.PointsMaterial({
      color: 0xc7b39a,
      size: 0.24,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const disk = new THREE.Points(this.diskGeometry, this.diskMaterial);
    disk.name = 'phase5-dust-gas-disk';
    this.group.add(disk);

    this.snowLineMaterial = new THREE.MeshBasicMaterial({
      color: 0x8cc8ff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.snowLine = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.055, 10, 160),
      this.snowLineMaterial,
    );
    this.snowLine.rotation.x = Math.PI / 2;
    this.snowLine.name = 'water-snow-line';
    this.group.add(this.snowLine);
    this.group.add(this.selectedMarker);
  }

  setState(state: PlanetarySystemState): void {
    this.systemState = state;
    this.ensureBodies(state.bodies);

    const diskOpacity = state.disk.active
      ? clamp(0.12 + state.disk.gasFractionRemaining * 0.58, 0.12, 0.7)
      : clamp(state.disk.dustMassEarth / Math.max(1, state.disk.initialDustMassEarth) * 0.12, 0.015, 0.12);
    this.diskMaterial.opacity = this.transitionOpacity * diskOpacity;
    this.snowLineMaterial.opacity = this.transitionOpacity * (state.disk.active ? 0.62 : 0.18);
    const snowRadius = this.model.localUnitsFromAu(state.disk.snowLineAu);
    this.snowLine.scale.setScalar(Math.max(0.01, snowRadius));

    for (const body of state.bodies) {
      const mesh = this.bodyMeshes.get(body.id);
      const orbit = this.orbitMeshes.get(body.id);
      if (!mesh || !orbit) continue;
      const visible = body.massEarth > 0.005 && body.status !== 'ejected';
      mesh.visible = visible;
      orbit.visible = visible;
      if (!visible) continue;

      const aLocal = this.model.localUnitsFromAu(body.semimajorAxisAu);
      const eccentricity = clamp(body.eccentricity, 0, 0.85);
      const orbitalRadius = aLocal * (1 - eccentricity * eccentricity)
        / Math.max(0.2, 1 + eccentricity * Math.cos(body.meanLongitudeRadians));
      const inclination = THREE.MathUtils.degToRad(body.inclinationDeg);
      const x = Math.cos(body.meanLongitudeRadians) * orbitalRadius;
      const zFlat = Math.sin(body.meanLongitudeRadians) * orbitalRadius;
      const y = Math.sin(inclination) * zFlat;
      const z = Math.cos(inclination) * zFlat;
      mesh.position.set(x, y, z);

      const markerRadius = clamp(0.18 + Math.log10(1 + Math.max(0.01, body.radiusEarth)) * 0.7, 0.18, 1.6);
      mesh.scale.setScalar(markerRadius);
      const material = mesh.material as THREE.MeshStandardMaterial;
      material.color.setHex(compositionColor(body.composition));
      material.opacity = this.transitionOpacity * clamp(0.18 + body.formationProgress * 0.82, 0.18, 1);
      material.transparent = true;

      orbit.scale.set(aLocal, aLocal * Math.sqrt(Math.max(0.04, 1 - eccentricity * eccentricity)), aLocal);
      const orbitMaterial = orbit.material as THREE.MeshBasicMaterial;
      orbitMaterial.opacity = this.transitionOpacity * clamp(0.08 + body.formationProgress * 0.16, 0.08, 0.24);
    }

    const selected = state.selectedPlanet;
    if (selected && selected.status !== 'ejected') {
      const selectedMesh = this.bodyMeshes.get(selected.id);
      if (selectedMesh) {
        this.selectedMarker.position.copy(selectedMesh.position);
        const size = clamp(0.45 + Math.log10(1 + selected.radiusEarth) * 0.8, 0.45, 1.8);
        this.selectedMarker.scale.setScalar(size);
        this.selectedMarkerMaterial.opacity = this.transitionOpacity * 0.78;
        this.selectedMarker.visible = true;
      }
    } else {
      this.selectedMarker.visible = false;
    }

    this.starMaterial.opacity = this.transitionOpacity * (state.starAgeYears > 0 ? 1 : 0);
    this.starGlowMaterial.opacity = this.transitionOpacity * (state.starAgeYears > 0 ? 0.82 : 0);
    this.group.visible = this.transitionOpacity > 0.001;
  }

  setTransitionOpacity(opacity: number): void {
    this.transitionOpacity = clamp(opacity, 0, 1);
    if (this.systemState) this.setState(this.systemState);
    else this.group.visible = this.transitionOpacity > 0.001;
  }

  update(timeMs: number): void {
    const disk = this.group.getObjectByName('phase5-dust-gas-disk');
    if (disk && this.systemState?.disk.active) disk.rotation.y = timeMs * 0.000004;
  }

  private ensureBodies(bodies: readonly PlanetBodyState[]): void {
    for (const body of bodies) {
      if (!this.bodyMeshes.has(body.id)) {
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(1, 28, 18),
          new THREE.MeshStandardMaterial({
            color: compositionColor(body.composition),
            roughness: body.composition === 'gas-giant' ? 0.72 : 0.9,
            metalness: 0,
            transparent: true,
            opacity: 0,
          }),
        );
        mesh.name = `phase5-body-${body.id}`;
        this.bodyMeshes.set(body.id, mesh);
        this.group.add(mesh);
      }
      if (!this.orbitMeshes.has(body.id)) {
        const orbit = new THREE.Mesh(
          new THREE.TorusGeometry(1, 0.008, 6, 128),
          new THREE.MeshBasicMaterial({
            color: 0x6d86a8,
            transparent: true,
            opacity: 0,
            depthWrite: false,
          }),
        );
        orbit.rotation.x = Math.PI / 2;
        orbit.name = `phase5-orbit-${body.id}`;
        this.orbitMeshes.set(body.id, orbit);
        this.group.add(orbit);
      }
    }
  }

  private createDiskGeometry(seed: string): THREE.BufferGeometry {
    const rng = createRandomStream(seed, 'phase5/render-disk');
    const count = 7200;
    const positions = new Float32Array(count * 3);
    const displayOuterAu = Math.min(this.model.outerRadiusAu, 55);
    const characteristic = Math.min(this.model.characteristicRadiusAu, displayOuterAu);
    for (let i = 0; i < count; i += 1) {
      let radiusAu = 0;
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const candidate = 0.08 + rng.next() * displayOuterAu;
        const acceptance = Math.exp(-candidate / Math.max(1, characteristic));
        if (rng.next() <= acceptance) {
          radiusAu = candidate;
          break;
        }
      }
      if (radiusAu <= 0) radiusAu = 0.08 + rng.next() * displayOuterAu;
      const radius = this.model.localUnitsFromAu(radiusAu);
      const angle = rng.range(0, Math.PI * 2);
      const thickness = (rng.next() + rng.next() + rng.next() - 1.5)
        * (0.035 + radiusAu * 0.006) * 10;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = thickness;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geometry;
  }
}
