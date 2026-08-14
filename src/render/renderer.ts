import * as THREE from 'three/webgpu';
import { pixelRatioForViewport, type QualityTier } from './quality';

export type RendererBackend = 'WebGPU' | 'WebGL2 fallback';

export class UniverseRenderer {
  readonly renderer: THREE.WebGPURenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(55, 1, 0.01, 10_000);
  private quality: QualityTier;
  private host: HTMLElement;
  private backend: RendererBackend = 'WebGL2 fallback';

  constructor(host: HTMLElement, quality: QualityTier = 'ultra') {
    this.host = host;
    this.quality = quality;
    this.renderer = new THREE.WebGPURenderer({ antialias: true, alpha: false });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.AgXToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.scene.background = new THREE.Color(0x02040a);
    this.camera.position.set(0, 0.6, 5.5);
  }

  async init(): Promise<RendererBackend> {
    await this.renderer.init();
    const info = this.renderer as unknown as { backend?: { isWebGPUBackend?: boolean } };
    this.backend = info.backend?.isWebGPUBackend ? 'WebGPU' : 'WebGL2 fallback';
    this.host.replaceChildren(this.renderer.domElement);
    this.resize();
    return this.backend;
  }

  setQuality(quality: QualityTier): void {
    this.quality = quality;
    this.resize();
  }

  resize(): void {
    const width = Math.max(1, this.host.clientWidth);
    const height = Math.max(1, this.host.clientHeight);
    const ratio = pixelRatioForViewport(width, height, this.quality);
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  setAnimationLoop(callback: (timeMs: number) => void): void {
    this.renderer.setAnimationLoop(callback);
  }

  getBackend(): RendererBackend {
    return this.backend;
  }

  getFramebufferSize(): { width: number; height: number } {
    const vector = new THREE.Vector2();
    this.renderer.getDrawingBufferSize(vector);
    return { width: Math.round(vector.x), height: Math.round(vector.y) };
  }
}
