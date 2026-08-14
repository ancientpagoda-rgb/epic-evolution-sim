import * as THREE from 'three/webgpu';

export class FloatingOrigin {
  private threshold: number;
  private readonly accumulatedOffset = new THREE.Vector3();

  constructor(threshold: number) {
    this.threshold = threshold;
  }

  setThreshold(threshold: number): void {
    if (!Number.isFinite(threshold) || threshold <= 0) {
      throw new Error(`Floating-origin threshold must be positive, received ${threshold}`);
    }
    this.threshold = threshold;
  }

  rebaseIfNeeded(
    camera: THREE.Camera,
    roots: readonly THREE.Object3D[],
    trackedPoints: readonly THREE.Vector3[] = [],
  ): THREE.Vector3 | null {
    if (camera.position.length() < this.threshold) return null;

    const shift = camera.position.clone();
    for (const root of roots) root.position.sub(shift);
    for (const point of trackedPoints) point.sub(shift);
    camera.position.sub(shift);
    this.accumulatedOffset.add(shift);
    return shift;
  }

  getAccumulatedOffset(target = new THREE.Vector3()): THREE.Vector3 {
    return target.copy(this.accumulatedOffset);
  }

  reset(): void {
    this.accumulatedOffset.set(0, 0, 0);
  }
}
