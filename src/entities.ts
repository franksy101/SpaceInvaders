import { Container, Graphics } from "pixi.js";
import { CONFIG } from "./config";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// ------------------------------ Player ------------------------------
export class Player {
  view: Container;
  x: number;
  y: number;
  w = CONFIG.player.width;
  h = CONFIG.player.height;
  cooldown = 0;
  alive = true;
  respawnTimer = 0;
  warpIn = 0; // 1 -> 0 when warping in

  constructor() {
    this.view = new Container();
    this.x = CONFIG.width / 2;
    this.y = CONFIG.player.spawnY;
    this.draw();
  }

  bounds(): Rect {
    return { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h };
  }

  private draw(): void {
    const g = new Graphics();
    const c = CONFIG.player.color;
    // hull
    g.poly([-22, 8, -18, -2, -8, -6, -3, -10, 3, -10, 8, -6, 18, -2, 22, 8]).fill({ color: c });
    // glow core
    g.poly([-10, 6, -4, 0, 4, 0, 10, 6]).fill({ color: 0xffffff, alpha: 0.85 });
    // cannon
    g.rect(-1.5, -14, 3, 6).fill({ color: 0xffffff });
    // wing lights
    g.rect(-20, 4, 2, 2).fill({ color: 0xffe066 });
    g.rect(18, 4, 2, 2).fill({ color: 0xffe066 });
    this.view.addChild(g);
  }

  update(dt: number, leftDown: boolean, rightDown: boolean): void {
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.respawnTimer > 0) {
      this.respawnTimer -= dt;
      this.warpIn = Math.max(0, this.respawnTimer / 0.8);
      if (this.respawnTimer <= 0) {
        this.alive = true;
        this.warpIn = 0;
      }
    }

    if (this.alive) {
      const dir = (rightDown ? 1 : 0) - (leftDown ? 1 : 0);
      this.x += dir * CONFIG.player.speed * dt;
      const margin = 24;
      if (this.x < margin) this.x = margin;
      if (this.x > CONFIG.width - margin) this.x = CONFIG.width - margin;
    }

    this.view.x = this.x;
    this.view.y = this.y;
    const warp = this.warpIn;
    this.view.scale.set(1 + warp * 1.4, Math.max(0.05, 1 - warp * 0.9));
    this.view.alpha = 1 - warp * 0.25;
  }

  canShoot(): boolean {
    return this.alive && this.cooldown <= 0;
  }

  resetShoot(): void {
    this.cooldown = CONFIG.player.fireCooldown;
  }

  killAndRespawn(): void {
    this.alive = false;
    this.respawnTimer = 0.8;
    this.warpIn = 1;
    this.x = CONFIG.width / 2;
  }
}

// ------------------------------ Invaders ------------------------------
export interface Invader {
  x: number;
  y: number;
  row: number;
  col: number;
  type: number; // 0..4 (row)
  alive: boolean;
  animFrame: number;
  phase: number;
}

export class InvaderGrid {
  view: Container;
  private gfx: Graphics;
  invaders: Invader[] = [];
  dir = 1;
  speed = CONFIG.invaders.baseSpeed;
  stepTimer = 0;
  baseX = 80;
  baseY = CONFIG.invaders.offsetY;
  animFrame = 0;
  private time = 0;

  constructor() {
    this.view = new Container();
    this.gfx = new Graphics();
    this.view.addChild(this.gfx);
    this.reset(1);
  }

  reset(wave: number): void {
    this.invaders.length = 0;
    const { rows, cols, cellW, cellH } = CONFIG.invaders;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        this.invaders.push({
          x: c * cellW,
          y: r * cellH,
          row: r,
          col: c,
          type: r,
          alive: true,
          animFrame: 0,
          phase: (r + c) * 0.5,
        });
      }
    }
    this.baseX = 80;
    this.baseY = CONFIG.invaders.offsetY + Math.min(120, (wave - 1) * 12);
    this.dir = 1;
    this.speed = CONFIG.invaders.baseSpeed + (wave - 1) * 6;
    this.stepTimer = 0;
  }

  aliveCount(): number {
    let n = 0;
    for (const i of this.invaders) if (i.alive) n++;
    return n;
  }

  extents(): { left: number; right: number; bottom: number } {
    let left = Infinity,
      right = -Infinity,
      bottom = -Infinity;
    for (const inv of this.invaders) {
      if (!inv.alive) continue;
      const x = this.baseX + inv.x;
      const y = this.baseY + inv.y;
      if (x < left) left = x;
      if (x + 30 > right) right = x + 30;
      if (y + 22 > bottom) bottom = y + 22;
    }
    if (!isFinite(left)) return { left: 0, right: 0, bottom: 0 };
    return { left, right, bottom };
  }

  // Returns true whenever the grid performs a "step" (for step sound trigger).
  update(dt: number): boolean {
    this.time += dt;
    const alive = this.aliveCount();
    const totalCells = CONFIG.invaders.rows * CONFIG.invaders.cols;
    const speedScale = 1 + (1 - alive / totalCells) * 3.5;
    const effectiveSpeed = this.speed * speedScale;
    const stepInterval = Math.max(0.08, 0.9 - (1 - alive / totalCells) * 0.85);

    this.baseX += this.dir * effectiveSpeed * dt;
    const ext = this.extents();
    const margin = 30;
    let stepped = false;
    if (this.dir > 0 && ext.right > CONFIG.width - margin) {
      this.dir = -1;
      this.baseY += CONFIG.invaders.descendStep;
      stepped = true;
    } else if (this.dir < 0 && ext.left < margin) {
      this.dir = 1;
      this.baseY += CONFIG.invaders.descendStep;
      stepped = true;
    }

    this.stepTimer += dt;
    if (this.stepTimer >= stepInterval) {
      this.stepTimer = 0;
      this.animFrame = 1 - this.animFrame;
      stepped = true;
    }

    this.draw();
    return stepped;
  }

  private draw(): void {
    const g = this.gfx;
    g.clear();
    const colors = CONFIG.invaders.colors;
    const amp = CONFIG.invaders.waveAmplitude;
    const freq = CONFIG.invaders.waveFrequency;
    for (const inv of this.invaders) {
      if (!inv.alive) continue;
      const wave = Math.sin(this.time * freq + inv.phase) * amp;
      const x = this.baseX + inv.x;
      const y = this.baseY + inv.y + wave;
      drawInvader(g, x, y, inv.type, this.animFrame, colors[inv.type]);
    }
  }

  hitTest(bx: number, by: number, bw: number, bh: number): Invader | null {
    for (const inv of this.invaders) {
      if (!inv.alive) continue;
      const x = this.baseX + inv.x;
      const y = this.baseY + inv.y;
      if (bx < x + 30 && bx + bw > x && by < y + 20 && by + bh > y) {
        return inv;
      }
    }
    return null;
  }

  invaderCenter(inv: Invader): { x: number; y: number } {
    return { x: this.baseX + inv.x + 15, y: this.baseY + inv.y + 10 };
  }

  // Returns a random bottom-row live invader in a column, or null.
  pickShooter(): Invader | null {
    const byCol: Map<number, Invader> = new Map();
    for (const inv of this.invaders) {
      if (!inv.alive) continue;
      const prev = byCol.get(inv.col);
      if (!prev || inv.row > prev.row) byCol.set(inv.col, inv);
    }
    const list = Array.from(byCol.values());
    if (list.length === 0) return null;
    return list[(Math.random() * list.length) | 0];
  }
}

function drawInvader(g: Graphics, x: number, y: number, type: number, frame: number, color: number): void {
  // Each type has a unique silhouette; two animation frames toggle "legs".
  const px = (cx: number, cy: number, w = 1, h = 1, c = color) =>
    g.rect(x + cx * 3, y + cy * 3, w * 3, h * 3).fill({ color: c });

  if (type === 0) {
    // "crab" - wide with claws
    const shape0 = [
      [0, 1],
      [1, 0],
      [2, 1],
      [3, 1],
      [4, 0],
      [5, 1],
      [6, 1],
      [7, 0],
      [8, 1],
      [1, 2],
      [2, 2],
      [3, 2],
      [4, 2],
      [5, 2],
      [6, 2],
      [7, 2],
      [0, 3],
      [1, 3],
      [3, 3],
      [5, 3],
      [7, 3],
      [8, 3],
      [2, 4],
      [6, 4],
    ];
    for (const [a, b] of shape0) px(a, b + frame);
  } else if (type === 1) {
    // "octopus"
    const s = [
      [2, 0],
      [3, 0],
      [4, 0],
      [5, 0],
      [1, 1],
      [2, 1],
      [3, 1],
      [4, 1],
      [5, 1],
      [6, 1],
      [0, 2],
      [1, 2],
      [3, 2],
      [4, 2],
      [6, 2],
      [7, 2],
      [0, 3],
      [2, 3],
      [3, 3],
      [4, 3],
      [5, 3],
      [7, 3],
      [1, 4],
      [3, 4],
      [4, 4],
      [6, 4],
    ];
    for (const [a, b] of s) px(a + (frame ? 0 : 0), b);
    // eyes
    px(2, 2, 1, 1, 0x0b0d18);
    px(5, 2, 1, 1, 0x0b0d18);
  } else if (type === 2) {
    // squid
    const s = [
      [3, 0],
      [4, 0],
      [2, 1],
      [3, 1],
      [4, 1],
      [5, 1],
      [1, 2],
      [2, 2],
      [3, 2],
      [4, 2],
      [5, 2],
      [6, 2],
      [0, 3],
      [1, 3],
      [3, 3],
      [4, 3],
      [6, 3],
      [7, 3],
      [1, 4],
      [2, 4],
      [5, 4],
      [6, 4],
    ];
    for (const [a, b] of s) px(a, b);
    px(2, 3, 1, 1, 0x0b0d18);
    px(5, 3, 1, 1, 0x0b0d18);
  } else if (type === 3) {
    // drone (compact)
    const s = [
      [3, 0],
      [4, 0],
      [2, 1],
      [3, 1],
      [4, 1],
      [5, 1],
      [1, 2],
      [2, 2],
      [5, 2],
      [6, 2],
      [1, 3],
      [2, 3],
      [3, 3],
      [4, 3],
      [5, 3],
      [6, 3],
      [3, 4],
      [4, 4],
    ];
    for (const [a, b] of s) px(a, b);
  } else {
    // "UFO" style for top row
    const s = [
      [2, 1],
      [3, 1],
      [4, 1],
      [5, 1],
      [1, 2],
      [2, 2],
      [3, 2],
      [4, 2],
      [5, 2],
      [6, 2],
      [0, 3],
      [1, 3],
      [2, 3],
      [3, 3],
      [4, 3],
      [5, 3],
      [6, 3],
      [7, 3],
      [0, 4],
      [2, 4],
      [5, 4],
      [7, 4],
    ];
    for (const [a, b] of s) px(a, b);
  }

  // subtle under-glow
  g.rect(x, y + 15, 30, 1).fill({ color, alpha: 0.25 });
}

// ------------------------------ Bullets (pooled) ------------------------------
export interface Bullet {
  active: boolean;
  x: number;
  y: number;
  vy: number;
  w: number;
  h: number;
  fromPlayer: boolean;
  color: number;
  life: number;
}

export class BulletPool {
  view: Container;
  private gfx: Graphics;
  pool: Bullet[] = [];

  constructor(capacity = 32) {
    this.view = new Container();
    this.gfx = new Graphics();
    this.view.addChild(this.gfx);
    for (let i = 0; i < capacity; i++) {
      this.pool.push({
        active: false,
        x: 0,
        y: 0,
        vy: 0,
        w: 0,
        h: 0,
        fromPlayer: true,
        color: 0xffffff,
        life: 0,
      });
    }
  }

  spawn(
    x: number,
    y: number,
    fromPlayer: boolean,
    color = fromPlayer ? 0xfffcf0 : CONFIG.palette.danger,
  ): Bullet | null {
    for (const b of this.pool) {
      if (!b.active) {
        b.active = true;
        b.x = x;
        b.y = y;
        b.vy = fromPlayer ? -CONFIG.bullets.playerSpeed : CONFIG.bullets.invaderSpeed;
        b.w = fromPlayer ? 3 : 4;
        b.h = fromPlayer ? 14 : 12;
        b.fromPlayer = fromPlayer;
        b.color = color;
        b.life = 4;
        return b;
      }
    }
    return null;
  }

  update(dt: number): void {
    const g = this.gfx;
    g.clear();
    for (const b of this.pool) {
      if (!b.active) continue;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.y < -20 || b.y > CONFIG.height + 20 || b.life <= 0) {
        b.active = false;
        continue;
      }
      if (b.fromPlayer) {
        g.rect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h).fill({ color: 0xffffff });
        g.rect(b.x - (b.w + 2) / 2, b.y - b.h / 2 + 2, b.w + 2, b.h - 4).fill({ color: b.color, alpha: 0.6 });
      } else {
        // Animated "death ray" beam
        const t = performance.now() * 0.02;
        const wobble = Math.sin(t + b.y * 0.1) * 1.2;
        g.rect(b.x - 1 + wobble, b.y - 10, 2, 20).fill({ color: 0xffffff });
        g.rect(b.x - 2.5, b.y - 10, 5, 20).fill({ color: b.color, alpha: 0.55 });
        g.circle(b.x, b.y + 4, 3).fill({ color: 0xffffff, alpha: 0.8 });
      }
    }
  }

  forEachActive(fn: (b: Bullet) => void): void {
    for (const b of this.pool) if (b.active) fn(b);
  }
}

// ------------------------------ Shields ------------------------------
// Pixel-perfect destructible shield using a bitmap Uint8Array (1 byte per block).
export class Shield {
  view: Container;
  private gfx: Graphics;
  mask: Uint8Array;
  readonly cols = CONFIG.shields.cols;
  readonly rows = CONFIG.shields.rows;
  readonly blockSize = CONFIG.shields.blockSize;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  private dirty = true;
  private color: number;

  constructor(x: number, y: number, color = 0x30ff7d) {
    this.x = x;
    this.y = y;
    this.w = this.cols * this.blockSize;
    this.h = this.rows * this.blockSize;
    this.mask = new Uint8Array(this.cols * this.rows);
    this.color = color;
    // Carve default shield silhouette: arch with cutout at bottom center.
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        let on = 1;
        if (r === 0 && (c === 0 || c === this.cols - 1)) on = 0;
        if (r >= this.rows - 3 && c >= 4 && c <= 6) on = 0;
        this.mask[r * this.cols + c] = on;
      }
    }
    this.view = new Container();
    this.gfx = new Graphics();
    this.view.addChild(this.gfx);
  }

  // Damage cluster around the given world point. Returns true if any block was destroyed.
  damageAt(px: number, py: number, radius = 1): boolean {
    const lx = px - this.x;
    const ly = py - this.y;
    const cc = Math.floor(lx / this.blockSize);
    const cr = Math.floor(ly / this.blockSize);
    let hit = false;
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        const r = cr + dr;
        const c = cc + dc;
        if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) continue;
        const dist = dr * dr + dc * dc;
        if (dist > radius * radius) continue;
        const idx = r * this.cols + c;
        if (this.mask[idx]) {
          this.mask[idx] = 0;
          hit = true;
        }
      }
    }
    if (hit) this.dirty = true;
    return hit;
  }

  containsPoint(px: number, py: number): boolean {
    const lx = px - this.x;
    const ly = py - this.y;
    if (lx < 0 || ly < 0 || lx >= this.w || ly >= this.h) return false;
    const c = Math.floor(lx / this.blockSize);
    const r = Math.floor(ly / this.blockSize);
    return this.mask[r * this.cols + c] === 1;
  }

  update(_dt: number): void {
    if (!this.dirty) return;
    this.dirty = false;
    const g = this.gfx;
    g.clear();
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (!this.mask[r * this.cols + c]) continue;
        const x = this.x + c * this.blockSize;
        const y = this.y + r * this.blockSize;
        g.rect(x, y, this.blockSize, this.blockSize).fill({ color: this.color });
        // inner highlight for retro bevel
        g.rect(x, y, this.blockSize, 1).fill({ color: 0xffffff, alpha: 0.2 });
      }
    }
  }
}

export function createShields(): Shield[] {
  const shields: Shield[] = [];
  const spacing = CONFIG.width / (CONFIG.shields.count + 1);
  const shieldW = CONFIG.shields.cols * CONFIG.shields.blockSize;
  for (let i = 0; i < CONFIG.shields.count; i++) {
    const cx = spacing * (i + 1);
    shields.push(new Shield(cx - shieldW / 2, CONFIG.shields.y));
  }
  return shields;
}
