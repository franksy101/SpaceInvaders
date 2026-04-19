import { Container, Graphics } from "pixi.js";

interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: number;
  drag: number;
  gravity: number;
}

// ObjectPool-based particle system -> no per-frame allocations after warmup.
export class ParticleSystem {
  view: Container;
  private gfx: Graphics;
  private pool: Particle[] = [];
  private cursor = 0;

  constructor(capacity = 600) {
    this.view = new Container();
    this.gfx = new Graphics();
    this.view.addChild(this.gfx);
    for (let i = 0; i < capacity; i++) {
      this.pool.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        max: 1,
        size: 1,
        color: 0xffffff,
        drag: 1,
        gravity: 0,
      });
    }
  }

  private next(): Particle {
    for (let i = 0; i < this.pool.length; i++) {
      const idx = (this.cursor + i) % this.pool.length;
      const p = this.pool[idx];
      if (!p.active) {
        this.cursor = (idx + 1) % this.pool.length;
        return p;
      }
    }
    // all active -> overwrite oldest (cursor)
    const p = this.pool[this.cursor];
    this.cursor = (this.cursor + 1) % this.pool.length;
    return p;
  }

  burst(
    x: number,
    y: number,
    opts: {
      count?: number;
      color?: number;
      colors?: number[];
      speed?: number;
      size?: number;
      life?: number;
      gravity?: number;
      drag?: number;
      spread?: number; // radians, 2*PI = full circle
      direction?: number; // base direction in radians
    } = {},
  ): void {
    const count = opts.count ?? 22;
    const speed = opts.speed ?? 180;
    const size = opts.size ?? 2.2;
    const life = opts.life ?? 0.7;
    const gravity = opts.gravity ?? 0;
    const drag = opts.drag ?? 0.92;
    const spread = opts.spread ?? Math.PI * 2;
    const dir = opts.direction ?? 0;
    const colors = opts.colors ?? (opts.color !== undefined ? [opts.color] : [0xffffff, 0xffd166, 0xff6b6b]);

    for (let i = 0; i < count; i++) {
      const p = this.next();
      const angle = dir + (Math.random() - 0.5) * spread;
      const v = speed * (0.5 + Math.random() * 0.9);
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * v;
      p.vy = Math.sin(angle) * v;
      p.size = size * (0.6 + Math.random() * 0.8);
      p.life = life * (0.7 + Math.random() * 0.6);
      p.max = p.life;
      p.color = colors[(Math.random() * colors.length) | 0];
      p.drag = drag;
      p.gravity = gravity;
    }
  }

  update(dt: number): void {
    const g = this.gfx;
    g.clear();
    for (const p of this.pool) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.vx *= Math.pow(p.drag, dt * 60);
      p.vy *= Math.pow(p.drag, dt * 60);
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const a = Math.max(0, p.life / p.max);
      const s = p.size * (0.4 + a * 0.6);
      g.rect(p.x - s * 0.5, p.y - s * 0.5, s, s).fill({ color: p.color, alpha: a });
    }
  }

  activeCount(): number {
    let n = 0;
    for (const p of this.pool) if (p.active) n++;
    return n;
  }
}
