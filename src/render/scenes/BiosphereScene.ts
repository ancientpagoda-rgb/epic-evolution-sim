import * as THREE from 'three/webgpu';
import { createRandomStream } from '../../core/random';
import type { BiosphereEvolutionState, MicrobialGuildState } from '../../science/biology/biosphere';

type GuildKey = keyof MicrobialGuildState;

const GUILDS: readonly { key: GuildKey; hue: number; radius: number }[] = [
  { key: 'fermentation', hue: 0.08, radius: 3.2 },
  { key: 'methanogenesis', hue: 0.78, radius: 3.7 },
  { key: 'anoxygenicPhototrophy', hue: 0.13, radius: 4.2 },
  { key: 'sulfurMetabolism', hue: 0.16, radius: 4.7 },
  { key: 'nitrogenCycling', hue: 0.52, radius: 5.2 },
  { key: 'oxygenicPhotosynthesis', hue: 0.34, radius: 5.7 },
  { key: 'aerobicRespiration', hue: 0.60, radius: 6.2 },
] as const;

export class BiosphereScene {
  readonly group = new THREE.Group();
  private readonly materials = new Map<GuildKey, THREE.PointsMaterial>();
  private transitionOpacity = 0;
  private state: BiosphereEvolutionState | null = null;

  constructor(seed: string) {
    this.group.name = 'phase9-biosphere-guilds';
    const rng = createRandomStream(seed, 'phase9/guild-renderer');

    for (let guildIndex = 0; guildIndex < GUILDS.length; guildIndex += 1) {
      const guild = GUILDS[guildIndex]!;
      const count = 520;
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count; i += 1) {
        const angle = rng.range(0, Math.PI * 2);
        const radialJitter = rng.range(-0.9, 0.9);
        const radius = Math.max(0.2, guild.radius + radialJitter);
        positions[i * 3] = Math.cos(angle) * radius;
        positions[i * 3 + 1] = rng.range(-2.8, 2.8) + Math.sin(angle * (guildIndex + 1)) * 0.35;
        positions[i * 3 + 2] = Math.sin(angle) * radius;
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const color = new THREE.Color().setHSL(guild.hue, 0.72, 0.58);
      const material = new THREE.PointsMaterial({
        color,
        size: 0.075,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        sizeAttenuation: true,
      });
      const points = new THREE.Points(geometry, material);
      points.name = `phase9-guild-${guild.key}`;
      this.materials.set(guild.key, material);
      this.group.add(points);
    }
  }

  setState(state: BiosphereEvolutionState): void {
    this.state = state;
    this.group.visible = this.transitionOpacity > 0.001 && state.active;
    for (const guild of GUILDS) {
      const material = this.materials.get(guild.key);
      if (!material) continue;
      const strength = state.guilds[guild.key];
      material.opacity = this.transitionOpacity * THREE.MathUtils.clamp(strength * 0.72, 0, 0.72);
      material.size = 0.045 + 0.075 * THREE.MathUtils.clamp(strength, 0, 1);
    }
  }

  setTransitionOpacity(opacity: number): void {
    this.transitionOpacity = THREE.MathUtils.clamp(opacity, 0, 1);
    if (this.state) this.setState(this.state);
    else this.group.visible = false;
  }

  update(timeMs: number): void {
    this.group.rotation.y = timeMs * 0.000006;
    this.group.rotation.x = Math.sin(timeMs * 0.00008) * 0.04;
  }
}
