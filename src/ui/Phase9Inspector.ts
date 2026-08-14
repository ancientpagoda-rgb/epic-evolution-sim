import type { BiosphereEvolutionState } from '../science/biology/biosphere';

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export class Phase9Inspector {
  private readonly root: HTMLElement;
  private readonly fields = new Map<string, HTMLElement>();

  constructor() {
    this.root = document.createElement('aside');
    this.root.className = 'phase9-runtime-panel';
    this.root.setAttribute('aria-label', 'Phase 9 biosphere state');
    this.root.innerHTML = `
      <div class="phase9-title"><strong>Phase 9 • microbes → biosphere</strong><span>planet feedback + major transitions</span></div>
      <div class="phase9-grid">
        <div><span>Stage</span><strong data-p9="stage">—</strong></div>
        <div><span>Leading guilds</span><strong data-p9="guilds">—</strong></div>
        <div><span>Horizontal exchange</span><strong data-p9="exchange">—</strong></div>
        <div><span>Primary productivity</span><strong data-p9="productivity">—</strong></div>
        <div><span>O₂ source / sink</span><strong data-p9="oxygenBalance">—</strong></div>
        <div><span>Atmospheric O₂</span><strong data-p9="oxygen">—</strong></div>
        <div><span>Complex-cell transition</span><strong data-p9="complexCell">—</strong></div>
        <div><span>Multicellularity</span><strong data-p9="multicell">—</strong></div>
        <div><span>Trophic complexity</span><strong data-p9="trophic">—</strong></div>
        <div><span>Resilience</span><strong data-p9="resilience">—</strong></div>
      </div>
      <div class="phase9-pills">
        <span data-p9="oasis">O₂ oasis —</span>
        <span data-p9="methane">methane —</span>
        <span data-p9="drawdown">CO₂ drawdown —</span>
        <span data-p9="symbiosis">symbiosis —</span>
        <span data-p9="diversity">biodiversity —</span>
      </div>`;

    const style = document.createElement('style');
    style.textContent = `
      .phase9-runtime-panel{position:fixed;z-index:10;right:18px;top:726px;width:min(430px,calc(38vw - 26px));padding:11px 12px;border-radius:15px;border:1px solid rgba(130,255,190,.17);background:rgba(3,14,18,.78);backdrop-filter:blur(16px);box-shadow:0 14px 46px rgba(0,0,0,.25);color:#edf4ff;font-family:Inter,ui-sans-serif,system-ui,sans-serif}
      .phase9-title{display:flex;justify-content:space-between;gap:10px;align-items:baseline;margin-bottom:9px}.phase9-title strong{font-size:.78rem;text-transform:uppercase;letter-spacing:.07em;color:#caffdd}.phase9-title span{font-size:.64rem;color:rgba(220,255,235,.55)}
      .phase9-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}.phase9-grid div{display:grid;gap:2px;min-width:0;padding:7px 8px;border-radius:10px;background:rgba(90,210,145,.06);border:1px solid rgba(130,255,190,.08)}.phase9-grid span{font-size:.62rem;color:rgba(218,245,228,.55);text-transform:uppercase;letter-spacing:.05em}.phase9-grid strong{font-size:.76rem;color:#eafff1;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .phase9-pills{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}.phase9-pills span{padding:4px 7px;border-radius:999px;background:rgba(90,210,145,.08);border:1px solid rgba(130,255,190,.1);color:rgba(226,255,237,.72);font-size:.68rem}
      @media(max-width:1100px){.phase9-runtime-panel{top:826px;right:18px;width:min(430px,calc(100vw - 36px))}}@media(max-width:900px){.phase9-runtime-panel{top:1096px;max-height:165px;overflow:auto}}
    `;
    document.head.appendChild(style);
    document.body.appendChild(this.root);
    for (const element of this.root.querySelectorAll<HTMLElement>('[data-p9]')) {
      const key = element.dataset.p9;
      if (key) this.fields.set(key, element);
    }
  }

  setState(state: BiosphereEvolutionState): void {
    const guilds = Object.entries(state.guilds)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, value]) => `${name.replaceAll(/([A-Z])/g, ' $1').trim()} ${pct(value)}`)
      .join(' • ');
    this.set('stage', state.stage.replaceAll('-', ' '));
    this.set('guilds', guilds || '—');
    this.set('exchange', `${pct(state.horizontalExchange.networkConnectivity)} network • ${pct(state.horizontalExchange.innovationIndex)} innovation`);
    this.set('productivity', pct(state.feedback.primaryProductivity));
    this.set('oxygenBalance', `${pct(state.feedback.oxygenProduction)} / ${pct(state.feedback.oxygenSinkCapacity)}`);
    this.set('oxygen', `${(state.feedback.oxygenFraction * 100).toFixed(2)}% • ozone ${pct(state.feedback.ozoneIndex)}`);
    this.set('complexCell', state.eukaryogenesis.established ? `established • ${pct(state.eukaryogenesis.cellularComplexity)}` : `not established • ${pct(state.eukaryogenesis.endosymbiosisPotential)}`);
    this.set('multicell', state.multicellularity.established ? `established • group selection ${pct(state.multicellularity.groupSelection)}` : `not established • ${pct(state.multicellularity.groupSelection)}`);
    this.set('trophic', `${pct(state.ecosystem.trophicComplexity)} • biomass ${pct(state.ecosystem.biomassIndex)}`);
    this.set('resilience', `${pct(state.ecosystem.resilienceIndex)} • pressure ${pct(state.ecosystem.extinctionPressure)}`);
    this.set('oasis', `O₂ oasis ${pct(state.feedback.oxygenOasisIndex)}`);
    this.set('methane', `methane ${pct(state.feedback.methaneIndex)}`);
    this.set('drawdown', `CO₂ drawdown ${pct(state.feedback.co2DrawdownIndex)}`);
    this.set('symbiosis', `symbiosis ${pct(state.eukaryogenesis.endosymbiosisPotential)}`);
    this.set('diversity', `biodiversity ${pct(state.ecosystem.biodiversityIndex)}`);
    this.root.dataset.active = state.active ? 'true' : 'false';
  }

  private set(key: string, value: string): void {
    const element = this.fields.get(key);
    if (element) element.textContent = value;
  }
}
