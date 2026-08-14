export class FixedStepClock {
  readonly stepSeconds: number;
  readonly maxCatchUpSteps: number;
  private accumulator = 0;
  private lastTimeMs: number | null = null;
  private simulationSeconds = 1e-12;

  constructor(stepSeconds = 1 / 60, maxCatchUpSteps = 5) {
    this.stepSeconds = stepSeconds;
    this.maxCatchUpSteps = maxCatchUpSteps;
  }

  reset(nowMs = performance.now()): void {
    this.accumulator = 0;
    this.lastTimeMs = nowMs;
    this.simulationSeconds = 1e-12;
  }

  advance(nowMs: number, speed = 1): { steps: number; alpha: number; simulationSeconds: number } {
    if (this.lastTimeMs === null) this.lastTimeMs = nowMs;
    const elapsed = Math.min(0.25, Math.max(0, (nowMs - this.lastTimeMs) / 1000));
    this.lastTimeMs = nowMs;
    this.accumulator += elapsed * Math.max(0, speed);

    let steps = 0;
    while (this.accumulator >= this.stepSeconds && steps < this.maxCatchUpSteps) {
      this.simulationSeconds += this.stepSeconds;
      this.accumulator -= this.stepSeconds;
      steps += 1;
    }

    if (steps === this.maxCatchUpSteps) this.accumulator = Math.min(this.accumulator, this.stepSeconds);

    return {
      steps,
      alpha: this.accumulator / this.stepSeconds,
      simulationSeconds: this.simulationSeconds,
    };
  }
}
