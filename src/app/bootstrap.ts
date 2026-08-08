import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FixedStepClock } from '../core/clock';
import { FlatLambdaCDMModel, formatCosmicAge, type CosmologyState } from '../science/cosmology/model';
import { FloatingOrigin } from '../render/camera/FloatingOrigin';
import { MultiScaleCamera } from '../render/camera/MultiScaleCamera';
import { getReferenceFrame, type ScaleDomain } from '../render/camera/referenceFrames';
import { UniverseRenderer } from '../render/renderer';
import { ContinuumPrototypeScene } from '../render/scenes/ContinuumPrototypeScene';
import { TransitionDirector } from '../render/transitions/TransitionDirector';

function requiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing required element #${id}`);
  return element as T;
}

function frameStatus(domain: ScaleDomain, accumulated: THREE.Vector3): string {
  const frame = getReferenceFrame(domain);
  const offset = accumulated.length();
  return `${frame.label} • local unit ${frame.unitLabel} • origin shift ${offset.toExponential(2)} local units`;
}

function formatRedshift(redshift: number): string {
  if (redshift >= 1e5) return `z ${redshift.toExponential(2)}`;
  if (redshift >= 100) return `z ${redshift.toFixed(0)}`;
  if (redshift >= 10) return `z ${redshift.toFixed(1)}`;
  return `z ${redshift.toFixed(3)}`;
}

function formatTemperature(kelvin: number): string {
  if (kelvin >= 1e6) return `${kelvin.toExponential(2)} K`;
  if (kelvin >= 1000) return `${kelvin.toFixed(0)} K`;
  return `${kelvin.toFixed(2)} K`;
}

function eraLabel(state: CosmologyState): string {
  return state.era.replaceAll('-', ' ');
}

export async function bootstrap(): Promise<void> {
  const host = requiredElement<HTMLElement>('viewport');
  const status = requiredElement<HTMLElement>('status');
  const backendLabel = requiredElement<HTMLElement>('backend');
  const qualityLabel = requiredElement<HTMLElement>('quality');
  const fpsLabel = requiredElement<HTMLElement>('fps');
  const ageLabel = requiredElement<HTMLElement>('age');
  const scaleLabel = requiredElement<HTMLElement>('scale');
  const frameLabel = requiredElement<HTMLElement>('frame');
  const transitionLabel = requiredElement<HTMLElement>('transition');
  const previousButton = requiredElement<HTMLButtonElement>('scalePrev');
  const nextButton = requiredElement<HTMLButtonElement>('scaleNext');
  const cosmicTimeline = requiredElement<HTMLInputElement>('cosmicTimeline');
  const cosmicPlay = requiredElement<HTMLButtonElement>('cosmicPlay');
  const cosmicEra = requiredElement<HTMLElement>('cosmicEra');
  const redshiftLabel = requiredElement<HTMLElement>('redshift');
  const cmbTempLabel = requiredElement<HTMLElement>('cmbTemp');
  const ionizationLabel = requiredElement<HTMLElement>('ionization');
  const growthLabel = requiredElement<HTMLElement>('growth');

  const universe = new UniverseRenderer(host, 'ultra');
  const backend = await universe.init();
  backendLabel.textContent = `backend: ${backend}`;

  const framebuffer = universe.getFramebufferSize();
  qualityLabel.textContent = `Ultra 4K • ${framebuffer.width}×${framebuffer.height}`;

  const seed = 'chaisson-734221';
  const cosmology = new FlatLambdaCDMModel();
  let timelineNormalized = Number(cosmicTimeline.value) / 10_000;
  let cosmologyState = cosmology.stateAtAge(cosmology.timelineToAgeSeconds(timelineNormalized));
  let cosmicPlaying = false;

  const visuals = new ContinuumPrototypeScene(universe.scene, seed);
  visuals.setCosmologyState(cosmologyState);
  const cameraRig = new MultiScaleCamera(universe.camera, 'cosmic');
  const transitions = new TransitionDirector(cameraRig, visuals, 'cosmic');
  const floatingOrigin = new FloatingOrigin(getReferenceFrame('cosmic').rebaseThreshold);

  const controls = new OrbitControls(universe.camera, universe.renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.055;
  controls.target.copy(cameraRig.getTarget());
  controls.minDistance = 0.25;
  controls.maxDistance = 250;

  const clock = new FixedStepClock(1 / 60, 5);
  clock.reset();

  let frames = 0;
  let fpsWindowStart = performance.now();
  let displayedDomain: ScaleDomain = 'cosmic';
  let transitionWasActive = false;

  function updateCosmology(): void {
    cosmologyState = cosmology.stateAtAge(cosmology.timelineToAgeSeconds(timelineNormalized));
    visuals.setCosmologyState(cosmologyState);
    cosmicTimeline.value = String(Math.round(timelineNormalized * 10_000));
    ageLabel.textContent = formatCosmicAge(cosmologyState.ageSeconds);
    cosmicEra.textContent = `era: ${eraLabel(cosmologyState)}`;
    redshiftLabel.textContent = formatRedshift(cosmologyState.redshift);
    cmbTempLabel.textContent = `CMB ${formatTemperature(cosmologyState.cmbTemperatureK)}`;
    ionizationLabel.textContent = `ionized ${(cosmologyState.ionizationFraction * 100).toFixed(2)}%`;
    growthLabel.textContent = `D(a) ${cosmologyState.growthNormalized < 0.01
      ? cosmologyState.growthNormalized.toExponential(2)
      : cosmologyState.growthNormalized.toFixed(3)}`;
  }

  function requestScale(direction: -1 | 1): void {
    if (!transitions.requestAdjacent(direction, performance.now())) return;
    controls.enabled = false;
  }

  previousButton.addEventListener('click', () => requestScale(-1));
  nextButton.addEventListener('click', () => requestScale(1));
  cosmicPlay.addEventListener('click', () => {
    if (timelineNormalized >= 0.9999) timelineNormalized = 0;
    cosmicPlaying = !cosmicPlaying;
    cosmicPlay.textContent = cosmicPlaying ? 'Ⅱ' : '▶';
    updateCosmology();
  });
  cosmicTimeline.addEventListener('input', () => {
    timelineNormalized = Number(cosmicTimeline.value) / 10_000;
    cosmicPlaying = false;
    cosmicPlay.textContent = '▶';
    updateCosmology();
  });
  window.addEventListener('keydown', event => {
    if (event.key === '[' || event.key === 'ArrowUp') requestScale(-1);
    if (event.key === ']' || event.key === 'ArrowDown') requestScale(1);
  });

  window.addEventListener('resize', () => {
    universe.resize();
    const size = universe.getFramebufferSize();
    qualityLabel.textContent = `Ultra 4K • ${size.width}×${size.height}`;
  });

  status.textContent = 'V3 Phase 3 • ΛCDM clock + recombination + seeded gravitational structure growth';
  updateCosmology();

  universe.setAnimationLoop(timeMs => {
    const tick = clock.advance(timeMs);
    if (cosmicPlaying && tick.steps > 0) {
      timelineNormalized = Math.min(1, timelineNormalized + tick.steps * clock.stepSeconds * 0.018);
      if (timelineNormalized >= 1) {
        cosmicPlaying = false;
        cosmicPlay.textContent = '▶';
      }
      updateCosmology();
    }

    visuals.update(timeMs);

    const transition = transitions.update(timeMs);
    const activeDomain = cameraRig.getDomain();

    if (transition.active) {
      transitionWasActive = true;
      controls.enabled = false;
      controls.target.copy(cameraRig.getTarget());
      const percent = Math.round(transition.progress * 100);
      transitionLabel.textContent = `${transition.anchor?.label ?? 'scale handoff'} • ${percent}%`;
    } else {
      if (transitionWasActive) {
        transitionWasActive = false;
        controls.target.copy(cameraRig.getTarget());
        controls.enabled = true;
      }
      cameraRig.syncFromFreeCamera(controls.target);
      transitionLabel.textContent = 'free inspection • [ / ] or ↑ / ↓ changes scale';
      controls.update();

      const frame = getReferenceFrame(activeDomain);
      floatingOrigin.setThreshold(frame.rebaseThreshold);
      floatingOrigin.rebaseIfNeeded(universe.camera, [visuals.root], [controls.target]);
    }

    if (activeDomain !== displayedDomain) {
      displayedDomain = activeDomain;
      floatingOrigin.reset();
    }

    const frame = getReferenceFrame(activeDomain);
    scaleLabel.textContent = `${frame.label} • ${frame.unitLabel}`;
    frameLabel.textContent = frameStatus(activeDomain, floatingOrigin.getAccumulatedOffset());

    previousButton.disabled = transitions.isActive() || activeDomain === 'cosmic';
    nextButton.disabled = transitions.isActive() || activeDomain === 'microscopic';

    universe.render();

    frames += 1;
    if (timeMs - fpsWindowStart >= 1000) {
      const fps = (frames * 1000) / (timeMs - fpsWindowStart);
      fpsLabel.textContent = `fps: ${fps.toFixed(0)}`;
      frames = 0;
      fpsWindowStart = timeMs;
    }
  });
}
