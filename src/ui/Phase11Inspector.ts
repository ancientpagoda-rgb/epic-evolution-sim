import type { BehavioralEvolutionState } from '../science/biology/neurobehavior';

const p = (v: number) => `${Math.round(v * 100)}%`;

export class Phase11Inspector {
  private readonly root = document.createElement('aside');
  private readonly fields = new Map<string, HTMLElement>();

  constructor() {
    this.root.className = 'phase9-runtime-panel';
    this.root.style.top = '1126px';
    this.root.setAttribute('aria-label', 'Phase 11 adaptive behavior state');
    this.root.innerHTML = `<div class="phase9-title"><strong>Phase 11 • adaptive behavior</strong><span>senses → learning → sociality</span></div>
      <div class="phase9-grid">
        <div><span>Stage</span><strong data-k="stage">—</strong></div><div><span>Neural gate</span><strong data-k="gate">—</strong></div>
        <div><span>Sensory integration</span><strong data-k="sense">—</strong></div><div><span>Centralization</span><strong data-k="neural">—</strong></div>
        <div><span>Mobility</span><strong data-k="move">—</strong></div><div><span>Search / avoidance</span><strong data-k="strategy">—</strong></div>
        <div><span>Learning</span><strong data-k="learn">—</strong></div><div><span>Memory</span><strong data-k="memory">—</strong></div>
        <div><span>Social learning</span><strong data-k="social">—</strong></div><div><span>Internal model</span><strong data-k="model">—</strong></div>
      </div><div class="phase9-pills"><span data-k="vision">vision —</span><span data-k="track">tracking —</span><span data-k="comm">communication —</span><span data-k="lines">lineages —</span></div>`;
    document.body.appendChild(this.root);
    for (const element of this.root.querySelectorAll<HTMLElement>('[data-k]')) {
      const key = element.dataset.k;
      if (key) this.fields.set(key, element);
    }
  }

  setState(state: BehavioralEvolutionState): void {
    this.set('stage', state.active ? state.stage.replaceAll('-', ' ') : 'inactive');
    this.set('gate', `${state.nervousSystem.neuralGatePassed ? 'passed' : 'closed'} • ${p(state.nervousSystem.neuralOriginScore)}`);
    this.set('sense', p(state.senses.sensoryIntegration));
    this.set('neural', `${p(state.nervousSystem.centralization)} • cost ${p(state.nervousSystem.energeticCost)}`);
    this.set('move', `${p(state.locomotion.mobility)} • endurance ${p(state.locomotion.endurance)}`);
    this.set('strategy', `${p(state.strategies.foraging)} / ${p(state.strategies.avoidance)}`);
    this.set('learn', `${p(state.learning.learningIndex)} • explore ${p(state.learning.exploration)}`);
    this.set('memory', `${p(state.learning.memoryPersistence)} • flexibility ${p(state.cognition.behavioralFlexibility)}`);
    this.set('social', `${p(state.social.socialLearning)} • cooperation ${p(state.social.cooperation)}`);
    this.set('model', `${p(state.cognition.internalModelIndex)} • prediction ${p(state.cognition.prediction)}`);
    this.set('vision', `vision ${p(state.senses.spatialVision)}`);
    this.set('track', `tracking ${p(state.strategies.pursuit)}`);
    this.set('comm', `communication ${p(state.social.communication)}`);
    this.set('lines', `lineages ${state.lineages.length}`);
    this.root.dataset.active = state.active ? 'true' : 'false';
  }

  private set(key: string, value: string): void {
    const element = this.fields.get(key);
    if (element) element.textContent = value;
  }
}
