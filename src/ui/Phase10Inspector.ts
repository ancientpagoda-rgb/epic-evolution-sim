import type { MatureEcosystemState } from '../science/biology/ecosystem';

const pct = (value: number): string => `${Math.round(value * 100)}%`;

export class Phase10Inspector {
  private readonly root = document.createElement('aside');
  private readonly fields = new Map<string, HTMLElement>();

  constructor() {
    this.root.className = 'phase9-runtime-panel';
    this.root.setAttribute('aria-label', 'Phase 10 mature ecosystem state');
    Object.assign(this.root.style, {
      left: '50%', right: 'auto', top: 'auto', bottom: '194px',
      transform: 'translateX(-50%)', width: 'min(720px, calc(100vw - 36px))',
    });
    this.root.innerHTML = `
      <div class="phase9-title"><strong>Phase 10 • mature ecosystem</strong><span>cycles • trophic flux • recovery</span></div>
      <div class="phase9-grid">
        <div><span>Stage</span><strong data-p10="stage">—</strong></div>
        <div><span>Limiting nutrient</span><strong data-p10="limit">—</strong></div>
        <div><span>C / N / P</span><strong data-p10="cnp">—</strong></div>
        <div><span>Recycling</span><strong data-p10="recycle">—</strong></div>
        <div><span>Food web</span><strong data-p10="web">—</strong></div>
        <div><span>Transfer</span><strong data-p10="transfer">—</strong></div>
        <div><span>Lineages</span><strong data-p10="lineages">—</strong></div>
        <div><span>Turnover / recovery</span><strong data-p10="turnover">—</strong></div>
      </div>
      <div class="phase9-pills"><span data-p10="climate">climate buffer —</span><span data-p10="resilience">resilience —</span><span data-p10="cascade">cascade —</span></div>`;
    document.body.appendChild(this.root);
    for (const element of this.root.querySelectorAll<HTMLElement>('[data-p10]')) {
      if (element.dataset.p10) this.fields.set(element.dataset.p10, element);
    }
  }

  setState(state: MatureEcosystemState): void {
    const clonal = state.lineages.filter(x => x.established && x.pathway === 'clonal').length;
    const aggregative = state.lineages.filter(x => x.established && x.pathway === 'aggregative').length;
    this.set('stage', state.stage.replaceAll('-', ' '));
    this.set('limit', state.cycles.limitingNutrient.replace('-', ' '));
    this.set('cnp', `${pct(state.cycles.carbonAvailability)} / ${pct(state.cycles.nitrogenAvailability)} / ${pct(state.cycles.phosphorusAvailability)}`);
    this.set('recycle', pct(state.cycles.recyclingEfficiency));
    this.set('web', `${state.foodWeb.trophicLevels} levels • connect ${pct(state.foodWeb.connectance)}`);
    this.set('transfer', `${(state.foodWeb.trophicTransferEfficiency * 100).toFixed(1)}%`);
    this.set('lineages', `${state.establishedLineages} • ${clonal} clonal / ${aggregative} aggregative`);
    this.set('turnover', `${pct(state.turnover.pulseIntensity)} • recovery ${pct(state.turnover.recoveryProgress)}`);
    this.set('climate', `climate buffer ${pct(state.climateCoupling.climateBuffering)}`);
    this.set('resilience', `resilience ${pct(state.resilience)}`);
    this.set('cascade', `cascade risk ${pct(state.turnover.trophicCascadeRisk)}`);
    this.root.dataset.active = state.active ? 'true' : 'false';
  }

  private set(key: string, value: string): void {
    const field = this.fields.get(key);
    if (field) field.textContent = value;
  }
}
