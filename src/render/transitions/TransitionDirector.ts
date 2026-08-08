import { adjacentScale, type ScaleDomain } from '../camera/referenceFrames';
import { MultiScaleCamera } from '../camera/MultiScaleCamera';
import { areAdjacentScales, getTransitionAnchor, type TransitionAnchor } from './anchors';

export interface TransitionVisualController {
  focus(domain: ScaleDomain): void;
  blend(from: ScaleDomain, to: ScaleDomain, progress: number): void;
}

export interface TransitionStatus {
  active: boolean;
  from: ScaleDomain;
  to: ScaleDomain;
  progress: number;
  anchor: TransitionAnchor | null;
}

interface ActiveTransition {
  from: ScaleDomain;
  to: ScaleDomain;
  startedAtMs: number;
  durationMs: number;
  anchor: TransitionAnchor;
}

function smootherstep(value: number): number {
  const t = Math.min(1, Math.max(0, value));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

export class TransitionDirector {
  private active: ActiveTransition | null = null;
  private settledDomain: ScaleDomain;

  constructor(
    private readonly camera: MultiScaleCamera,
    private readonly visuals: TransitionVisualController,
    initialDomain: ScaleDomain = 'cosmic',
  ) {
    this.settledDomain = initialDomain;
    this.camera.snapTo(initialDomain);
    this.visuals.focus(initialDomain);
  }

  getDomain(): ScaleDomain {
    return this.active?.to ?? this.settledDomain;
  }

  isActive(): boolean {
    return this.active !== null;
  }

  requestAdjacent(direction: -1 | 1, nowMs: number, durationMs = 3_200): boolean {
    if (this.active) return false;
    const to = adjacentScale(this.settledDomain, direction);
    if (!to) return false;
    return this.begin(to, nowMs, durationMs);
  }

  begin(to: ScaleDomain, nowMs: number, durationMs = 3_200): boolean {
    if (this.active || to === this.settledDomain) return false;
    if (!areAdjacentScales(this.settledDomain, to)) {
      throw new Error(`Transitions must be adjacent: ${this.settledDomain} → ${to}`);
    }
    if (!Number.isFinite(durationMs) || durationMs <= 0) {
      throw new Error(`Transition duration must be positive, received ${durationMs}`);
    }

    this.camera.beginTransition(this.settledDomain);
    this.active = {
      from: this.settledDomain,
      to,
      startedAtMs: nowMs,
      durationMs,
      anchor: getTransitionAnchor(this.settledDomain, to),
    };
    return true;
  }

  jumpTo(domain: ScaleDomain): void {
    this.active = null;
    this.settledDomain = domain;
    this.camera.snapTo(domain);
    this.visuals.focus(domain);
  }

  update(nowMs: number): TransitionStatus {
    if (!this.active) {
      return {
        active: false,
        from: this.settledDomain,
        to: this.settledDomain,
        progress: 1,
        anchor: null,
      };
    }

    const raw = (nowMs - this.active.startedAtMs) / this.active.durationMs;
    const progress = smootherstep(raw);
    this.camera.sampleTransition(this.active.from, this.active.to, progress);
    this.visuals.blend(this.active.from, this.active.to, progress);

    if (raw >= 1) {
      const completed = this.active;
      this.active = null;
      this.settledDomain = completed.to;
      this.camera.snapTo(completed.to);
      this.visuals.focus(completed.to);
      return {
        active: false,
        from: completed.from,
        to: completed.to,
        progress: 1,
        anchor: completed.anchor,
      };
    }

    return {
      active: true,
      from: this.active.from,
      to: this.active.to,
      progress,
      anchor: this.active.anchor,
    };
  }
}
