import * as THREE from 'three/webgpu';
import type { BiosphereEvolutionState } from '../../science/biology/biosphere';

export class BiosphereScene {
  readonly group = new THREE.Group();
  private transitionOpacity = 0;
  private state: BiosphereEvolutionState | null = null;

  constructor() {
    this.group.name = 'phase9-biosphere';
  }

  setState(state: BiosphereEvolutionState): void {
    this.state = state;
    this.group.visible = this.transitionOpacity > 0.001 && state.active;
  }

  setTransitionOpacity(opacity: number): void {
    this.transitionOpacity = THREE.MathUtils.clamp(opacity, 0, 1);
    if (this.state) this.setState(this.state);
    else this.group.visible = false;
  }

  update(_timeMs: number): void {}
}
