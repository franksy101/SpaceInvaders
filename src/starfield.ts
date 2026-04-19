import { Container, Graphics } from "pixi.js";
import { CONFIG } from "./config";

// Parallax starfield with warp-capable speed ramp.
interface Star {
  x: number;
  y: number;
  speed: number; // base per-second velocity
  size: number;
  twinkle: number;
  color: number;
}

export class Starfield {
  view: Container;
  private stars: Star[] = [];
  private gfx: Graphics;
  private warp = 0;
  private warpTarget = 0;

  constructor(private width: number, private height: number, count = 160) {
    this.view = new Container();
    this.gfx = new Graphics();
    this.view.addChild(this.gfx);
    for (let i = 0; i < count; i++) {
      const depth = Math.random();
      this.stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        speed: 18 + depth * 140,
        size: 0.5 + depth * 2.2,
        twinkle: Math.random() * Math.PI * 2,
        color: this.pickColor(depth),
      });
    }
  }

  private pickColor(depth: number): number {
    if (depth > 0.85) return 0xffffff;
    if (depth > 0.6) return 0xbfefff;
    if (depth > 0.35) return 0x7ec8e3;
    return 0x3a6dff;
  }

  warpIn(strength = 1): void {
    this.warp = strength;
    this.warpTarget = 0;
  }

  setWarp(v: number): void {
    this.warpTarget = v;
  }

  update(dt: number): void {
    // Ease warp back to its target.
    this.warp += (this.warpTarget - this.warp) * Math.min(1, dt * 3);
    const boost = 1 + this.warp * 8;

    const g = this.gfx;
    g.clear();
    for (const s of this.stars) {
      s.y += s.speed * boost * dt;
      s.twinkle += dt * 3;
      if (s.y > this.height + 4) {
        s.y = -4;
        s.x = Math.random() * this.width;
      }
      const a = 0.5 + 0.5 * Math.sin(s.twinkle) * (1 - this.warp * 0.5);
      if (this.warp > 0.2) {
        // streak during warp
        const len = 6 + s.speed * this.warp * 0.05;
        g.rect(s.x, s.y - len, s.size, len).fill({ color: s.color, alpha: a });
      } else {
        g.rect(s.x, s.y, s.size, s.size).fill({ color: s.color, alpha: a });
      }
    }
    // Dim scanning horizon accent
    const bg = CONFIG.palette.bg;
    g.rect(0, this.height - 2, this.width, 2).fill({ color: bg, alpha: 0.6 });
  }
}
