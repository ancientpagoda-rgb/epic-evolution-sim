import * as THREE from 'three/webgpu';
import {
  getReferenceFrame,
  type FramePose,
  type ScaleDomain,
  type Vec3Tuple,
} from './referenceFrames';

export interface CameraTransitionSample {
  domain: ScaleDomain;
  target: THREE.Vector3;
  localProgress: number;
}

interface RuntimePose {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

function smoothstep01(value: number): number {
  const t = THREE.MathUtils.clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function tupleToVector(tuple: Vec3Tuple, target = new THREE.Vector3()): THREE.Vector3 {
  return target.set(tuple[0], tuple[1], tuple[2]);
}

function staticPose(pose: FramePose): RuntimePose {
  return {
    position: tupleToVector(pose.position),
    target: tupleToVector(pose.target),
  };
}

function lerpRuntimePose(from: RuntimePose, to: RuntimePose, progress: number): RuntimePose {
  const t = smoothstep01(progress);
  return {
    position: from.position.clone().lerp(to.position, t),
    target: from.target.clone().lerp(to.target, t),
  };
}

export class MultiScaleCamera {
  private domain: ScaleDomain;
  private readonly target = new THREE.Vector3();
  private transitionStart: RuntimePose | null = null;

  constructor(private readonly camera: THREE.PerspectiveCamera, initialDomain: ScaleDomain = 'cosmic') {
    this.domain = initialDomain;
    this.snapTo(initialDomain, 'home');
  }

  getDomain(): ScaleDomain {
    return this.domain;
  }

  getTarget(target = new THREE.Vector3()): THREE.Vector3 {
    return target.copy(this.target);
  }

  snapTo(domain: ScaleDomain, poseName: 'home' | 'entry' | 'exit' = 'home'): void {
    const frame = getReferenceFrame(domain);
    const pose = frame[poseName];
    this.domain = domain;
    this.transitionStart = null;
    this.camera.near = frame.near;
    this.camera.far = frame.far;
    tupleToVector(pose.position, this.camera.position);
    tupleToVector(pose.target, this.target);
    this.camera.lookAt(this.target);
    this.camera.updateProjectionMatrix();
  }

  syncFromFreeCamera(target: THREE.Vector3): void {
    this.target.copy(target);
  }

  beginTransition(from: ScaleDomain): void {
    if (from !== this.domain) this.domain = from;
    this.transitionStart = {
      position: this.camera.position.clone(),
      target: this.target.clone(),
    };
  }

  sampleTransition(from: ScaleDomain, to: ScaleDomain, progress: number): CameraTransitionSample {
    const t = THREE.MathUtils.clamp(progress, 0, 1);
    const fromFrame = getReferenceFrame(from);
    const toFrame = getReferenceFrame(to);
    const start = this.transitionStart ?? staticPose(fromFrame.home);
    const exit = staticPose(fromFrame.exit);
    const entry = staticPose(toFrame.entry);
    const destination = staticPose(toFrame.home);

    let pose: RuntimePose;
    let localProgress: number;
    if (t < 0.4) {
      localProgress = t / 0.4;
      pose = lerpRuntimePose(start, exit, localProgress);
    } else if (t < 0.6) {
      localProgress = (t - 0.4) / 0.2;
      // This bridge is camera choreography only. Physical child coordinates are
      // never transformed into the parent frame; the anchor scenes overlap here.
      pose = lerpRuntimePose(exit, entry, localProgress);
    } else {
      localProgress = (t - 0.6) / 0.4;
      pose = lerpRuntimePose(entry, destination, localProgress);
    }

    const activeDomain = t < 0.5 ? from : to;
    const activeFrame = getReferenceFrame(activeDomain);
    if (this.domain !== activeDomain) {
      this.domain = activeDomain;
      this.camera.near = activeFrame.near;
      this.camera.far = activeFrame.far;
      this.camera.updateProjectionMatrix();
    }

    this.camera.position.copy(pose.position);
    this.target.copy(pose.target);
    this.camera.lookAt(this.target);

    return {
      domain: activeDomain,
      target: this.target.clone(),
      localProgress,
    };
  }
}
