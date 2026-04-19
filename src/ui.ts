import { Container, Graphics, Text, TextStyle } from "pixi.js";
import gsap from "gsap";
import { CONFIG } from "./config";
import { HighscoreEntry } from "./highscores";

const FONT = '"Courier New", ui-monospace, monospace';

function style(size: number, color = CONFIG.palette.hud, bold = false): TextStyle {
  return new TextStyle({
    fontFamily: FONT,
    fontSize: size,
    fill: color,
    fontWeight: bold ? "bold" : "normal",
    letterSpacing: 1.5,
    align: "center",
    stroke: { color: 0x000000, width: 0 },
  });
}

// ------------------------------ HUD ------------------------------
export class HUD {
  view: Container;
  private scoreText: Text;
  private livesText: Text;
  private waveText: Text;
  private highText: Text;
  private comboText: Text;
  private comboTween: gsap.core.Tween | null = null;

  constructor() {
    this.view = new Container();
    this.scoreText = new Text({ text: "SCORE  0000", style: style(18, CONFIG.palette.hud, true) });
    this.highText = new Text({ text: "HI  0000", style: style(18, CONFIG.palette.accent, true) });
    this.waveText = new Text({ text: "WAVE  01", style: style(18, CONFIG.palette.hud, true) });
    this.livesText = new Text({ text: "LIVES  3", style: style(18, CONFIG.palette.hud, true) });
    this.comboText = new Text({ text: "", style: style(22, CONFIG.palette.accent, true) });

    this.scoreText.x = 24;
    this.scoreText.y = 18;
    this.highText.x = CONFIG.width / 2 - 70;
    this.highText.y = 18;
    this.waveText.x = CONFIG.width - 220;
    this.waveText.y = 18;
    this.livesText.x = CONFIG.width - 110;
    this.livesText.y = 18;

    this.comboText.anchor.set(0.5);
    this.comboText.x = CONFIG.width / 2;
    this.comboText.y = 62;

    this.view.addChild(this.scoreText, this.highText, this.waveText, this.livesText, this.comboText);
  }

  setScore(score: number, high: number): void {
    const s = score.toString().padStart(5, "0");
    const h = Math.max(high, score).toString().padStart(5, "0");
    if (this.scoreText.text !== `SCORE  ${s}`) {
      this.scoreText.text = `SCORE  ${s}`;
      this.punch(this.scoreText);
    }
    this.highText.text = `HI  ${h}`;
  }

  setWave(wave: number): void {
    const w = wave.toString().padStart(2, "0");
    if (this.waveText.text !== `WAVE  ${w}`) {
      this.waveText.text = `WAVE  ${w}`;
      this.punch(this.waveText);
    }
  }

  setLives(lives: number): void {
    const t = `LIVES  ${Math.max(0, lives)}`;
    if (this.livesText.text !== t) {
      this.livesText.text = t;
      this.punch(this.livesText);
    }
  }

  setCombo(combo: number): void {
    if (combo <= 1) {
      this.comboText.text = "";
      this.comboText.alpha = 0;
      return;
    }
    this.comboText.text = `COMBO x${combo}`;
    this.comboText.alpha = 1;
    this.comboTween?.kill();
    gsap.killTweensOf(this.comboText.scale);
    this.comboText.scale.set(1.6);
    gsap.to(this.comboText.scale, { x: 1, y: 1, duration: 0.25, ease: "back.out(3)" });
    this.comboTween = gsap.to(this.comboText, { alpha: 0, duration: 0.6, delay: 1.0 });
  }

  private punch(target: Text): void {
    gsap.killTweensOf(target.scale);
    target.scale.set(1.25);
    gsap.to(target.scale, { x: 1, y: 1, duration: 0.3, ease: "back.out(3)" });
  }
}

// ------------------------------ Title Screen ------------------------------
export class TitleScreen {
  view: Container;
  private titleText: Text;
  private pressText: Text;
  private scoreLines: Text[] = [];
  private time = 0;

  constructor() {
    this.view = new Container();
    const bg = new Graphics();
    bg.rect(0, 0, CONFIG.width, CONFIG.height).fill({ color: 0x000000, alpha: 0.35 });
    this.view.addChild(bg);

    this.titleText = new Text({
      text: "SPACE  INVADERS",
      style: style(56, CONFIG.palette.hud, true),
    });
    this.titleText.anchor.set(0.5);
    this.titleText.x = CONFIG.width / 2;
    this.titleText.y = 170;

    const sub = new Text({
      text: "/// MODERN EDITION ///",
      style: style(18, CONFIG.palette.accent),
    });
    sub.anchor.set(0.5);
    sub.x = CONFIG.width / 2;
    sub.y = 220;

    this.pressText = new Text({
      text: "PRESS  ENTER  TO  START",
      style: style(22, CONFIG.palette.hud, true),
    });
    this.pressText.anchor.set(0.5);
    this.pressText.x = CONFIG.width / 2;
    this.pressText.y = CONFIG.height - 110;

    const hint = new Text({
      text: "ARROWS / A D  MOVE    SPACE  FIRE    P  PAUSE    M  MUTE",
      style: style(14, 0x9fe6c7),
    });
    hint.anchor.set(0.5);
    hint.x = CONFIG.width / 2;
    hint.y = CONFIG.height - 70;

    this.view.addChild(this.titleText, sub, this.pressText, hint);
  }

  setHighscores(list: HighscoreEntry[]): void {
    for (const t of this.scoreLines) this.view.removeChild(t);
    this.scoreLines.length = 0;

    const header = new Text({
      text: "HIGH  SCORES",
      style: style(20, CONFIG.palette.accent, true),
    });
    header.anchor.set(0.5);
    header.x = CONFIG.width / 2;
    header.y = 270;
    this.view.addChild(header);
    this.scoreLines.push(header);

    const startY = 302;
    const lineH = 22;
    const top = list.slice(0, 5);
    for (let i = 0; i < top.length; i++) {
      const e = top[i];
      const rank = (i + 1).toString().padStart(2, "0");
      const name = e.name.padEnd(3, " ");
      const score = e.score.toString().padStart(5, "0");
      const wave = `W${e.wave.toString().padStart(2, "0")}`;
      const text = `${rank}.  ${name}   ${score}   ${wave}`;
      const t = new Text({ text, style: style(18, i === 0 ? CONFIG.palette.accent : CONFIG.palette.hud) });
      t.anchor.set(0.5);
      t.x = CONFIG.width / 2;
      t.y = startY + i * lineH;
      this.view.addChild(t);
      this.scoreLines.push(t);
    }
  }

  update(dt: number): void {
    this.time += dt;
    const pulse = 0.6 + 0.4 * Math.sin(this.time * 3);
    this.pressText.alpha = pulse;
    this.titleText.scale.set(1 + Math.sin(this.time * 1.5) * 0.02);
  }

  show(): void {
    this.view.visible = true;
    this.view.alpha = 0;
    gsap.to(this.view, { alpha: 1, duration: 0.5 });
  }

  hide(): void {
    gsap.to(this.view, { alpha: 0, duration: 0.3, onComplete: () => (this.view.visible = false) });
  }
}

// ------------------------------ Game Over Screen ------------------------------
export class GameOverScreen {
  view: Container;
  private titleText: Text;
  private scoreText: Text;
  private promptText: Text;

  constructor() {
    this.view = new Container();
    const bg = new Graphics();
    bg.rect(0, 0, CONFIG.width, CONFIG.height).fill({ color: 0x000000, alpha: 0.6 });
    this.view.addChild(bg);

    this.titleText = new Text({
      text: "GAME  OVER",
      style: style(64, CONFIG.palette.danger, true),
    });
    this.titleText.anchor.set(0.5);
    this.titleText.x = CONFIG.width / 2;
    this.titleText.y = 220;

    this.scoreText = new Text({
      text: "FINAL  SCORE  0",
      style: style(26, CONFIG.palette.hud, true),
    });
    this.scoreText.anchor.set(0.5);
    this.scoreText.x = CONFIG.width / 2;
    this.scoreText.y = 320;

    this.promptText = new Text({
      text: "PRESS  ENTER  TO  CONTINUE",
      style: style(20, CONFIG.palette.accent, true),
    });
    this.promptText.anchor.set(0.5);
    this.promptText.x = CONFIG.width / 2;
    this.promptText.y = CONFIG.height - 120;

    this.view.addChild(this.titleText, this.scoreText, this.promptText);
    this.view.visible = false;
  }

  show(finalScore: number): void {
    this.view.visible = true;
    this.view.alpha = 0;
    this.scoreText.text = "FINAL  SCORE  0";
    gsap.to(this.view, { alpha: 1, duration: 0.4 });
    // Animated score tally
    const target = finalScore;
    const state = { n: 0 };
    gsap.to(state, {
      n: target,
      duration: Math.min(2.4, 0.5 + target / 2500),
      ease: "power1.out",
      onUpdate: () => {
        this.scoreText.text = `FINAL  SCORE  ${Math.floor(state.n).toString().padStart(5, "0")}`;
      },
    });
    gsap.fromTo(
      this.titleText.scale,
      { x: 2.2, y: 2.2 },
      { x: 1, y: 1, duration: 0.6, ease: "back.out(2)" },
    );
    gsap.fromTo(this.promptText, { alpha: 0 }, { alpha: 1, duration: 0.4, delay: 1.2, yoyo: true, repeat: -1 });
  }

  hide(): void {
    gsap.killTweensOf(this.promptText);
    gsap.killTweensOf(this.titleText.scale);
    gsap.to(this.view, { alpha: 0, duration: 0.25, onComplete: () => (this.view.visible = false) });
  }
}

// ------------------------------ Highscore Entry Screen ------------------------------
export class HighscoreEntryScreen {
  view: Container;
  private initials = ["A", "A", "A"];
  private index = 0;
  private slots: Text[] = [];
  private cursor: Graphics;
  private onSubmit: ((name: string) => void) | null = null;
  private time = 0;

  constructor() {
    this.view = new Container();
    const bg = new Graphics();
    bg.rect(0, 0, CONFIG.width, CONFIG.height).fill({ color: 0x000000, alpha: 0.7 });
    this.view.addChild(bg);

    const title = new Text({
      text: "NEW  HIGH  SCORE",
      style: style(42, CONFIG.palette.accent, true),
    });
    title.anchor.set(0.5);
    title.x = CONFIG.width / 2;
    title.y = 200;
    this.view.addChild(title);

    const sub = new Text({
      text: "ENTER  YOUR  INITIALS",
      style: style(20, CONFIG.palette.hud),
    });
    sub.anchor.set(0.5);
    sub.x = CONFIG.width / 2;
    sub.y = 260;
    this.view.addChild(sub);

    const spacing = 72;
    const startX = CONFIG.width / 2 - spacing;
    for (let i = 0; i < 3; i++) {
      const t = new Text({ text: "A", style: style(72, CONFIG.palette.hud, true) });
      t.anchor.set(0.5);
      t.x = startX + i * spacing;
      t.y = 360;
      this.view.addChild(t);
      this.slots.push(t);
    }

    this.cursor = new Graphics();
    this.cursor.rect(-24, 36, 48, 4).fill({ color: CONFIG.palette.accent });
    this.view.addChild(this.cursor);

    const hint = new Text({
      text: "LEFT / RIGHT  select slot     UP / DOWN  change letter     ENTER  confirm",
      style: style(14, 0x9fe6c7),
    });
    hint.anchor.set(0.5);
    hint.x = CONFIG.width / 2;
    hint.y = 460;
    this.view.addChild(hint);

    this.view.visible = false;
  }

  show(onSubmit: (name: string) => void): void {
    this.initials = ["A", "A", "A"];
    this.index = 0;
    this.render();
    this.onSubmit = onSubmit;
    this.view.visible = true;
    this.view.alpha = 0;
    gsap.to(this.view, { alpha: 1, duration: 0.3 });
  }

  hide(): void {
    gsap.to(this.view, { alpha: 0, duration: 0.25, onComplete: () => (this.view.visible = false) });
  }

  private render(): void {
    for (let i = 0; i < 3; i++) this.slots[i].text = this.initials[i];
    const target = this.slots[this.index];
    this.cursor.x = target.x;
    this.cursor.y = target.y;
  }

  // Returns true if this screen consumed the key (so caller can cancel defaults).
  handleKey(code: string): void {
    switch (code) {
      case "ArrowLeft":
      case "KeyA":
        this.index = (this.index + 2) % 3;
        this.render();
        break;
      case "ArrowRight":
      case "KeyD":
        this.index = (this.index + 1) % 3;
        this.render();
        break;
      case "ArrowUp":
      case "KeyW":
        this.shift(+1);
        break;
      case "ArrowDown":
      case "KeyS":
        this.shift(-1);
        break;
      case "Enter":
      case "Space":
        this.onSubmit?.(this.initials.join(""));
        break;
      case "Backspace":
        this.initials[this.index] = "A";
        this.render();
        break;
      default: {
        // Allow typing A-Z
        if (/^Key[A-Z]$/.test(code)) {
          this.initials[this.index] = code.slice(3);
          this.index = Math.min(2, this.index + 1);
          this.render();
        }
      }
    }
  }

  private shift(delta: number): void {
    const cur = this.initials[this.index].charCodeAt(0);
    let next = cur + delta;
    if (next < 65) next = 90;
    if (next > 90) next = 65;
    this.initials[this.index] = String.fromCharCode(next);
    this.render();
  }

  update(dt: number): void {
    this.time += dt;
    const pulse = 0.4 + 0.6 * Math.abs(Math.sin(this.time * 4));
    this.cursor.alpha = pulse;
  }
}

// ------------------------------ Full Highscore Board ------------------------------
export class HighscoreBoardScreen {
  view: Container;
  private rowTexts: Text[] = [];
  private prompt: Text;

  constructor() {
    this.view = new Container();
    const bg = new Graphics();
    bg.rect(0, 0, CONFIG.width, CONFIG.height).fill({ color: 0x000000, alpha: 0.8 });
    this.view.addChild(bg);

    const title = new Text({
      text: "HIGH  SCORES",
      style: style(46, CONFIG.palette.accent, true),
    });
    title.anchor.set(0.5);
    title.x = CONFIG.width / 2;
    title.y = 110;
    this.view.addChild(title);

    this.prompt = new Text({
      text: "PRESS  ENTER  TO  RETURN",
      style: style(18, CONFIG.palette.hud, true),
    });
    this.prompt.anchor.set(0.5);
    this.prompt.x = CONFIG.width / 2;
    this.prompt.y = CONFIG.height - 80;
    this.view.addChild(this.prompt);

    this.view.visible = false;
  }

  show(list: HighscoreEntry[], highlightRank = -1): void {
    for (const t of this.rowTexts) this.view.removeChild(t);
    this.rowTexts.length = 0;

    const startY = 180;
    const lineH = 34;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      const rank = (i + 1).toString().padStart(2, "0");
      const name = e.name.padEnd(3, " ");
      const score = e.score.toString().padStart(5, "0");
      const wave = `W${e.wave.toString().padStart(2, "0")}`;
      const row = `${rank}.  ${name}     ${score}     ${wave}`;
      const color = i === highlightRank ? CONFIG.palette.accent : i < 3 ? CONFIG.palette.hud : 0x8ed0b8;
      const t = new Text({ text: row, style: style(22, color, i === highlightRank) });
      t.anchor.set(0.5);
      t.x = CONFIG.width / 2;
      t.y = startY + i * lineH;
      t.alpha = 0;
      this.view.addChild(t);
      this.rowTexts.push(t);
    }

    this.view.visible = true;
    this.view.alpha = 1;
    // Animate rows in line by line
    this.rowTexts.forEach((t, i) => {
      gsap.fromTo(
        t,
        { alpha: 0, x: CONFIG.width / 2 - 40 },
        { alpha: 1, x: CONFIG.width / 2, duration: 0.28, delay: i * 0.06, ease: "power2.out" },
      );
    });

    gsap.fromTo(this.prompt, { alpha: 0 }, { alpha: 1, duration: 0.5, delay: list.length * 0.06 + 0.3, yoyo: true, repeat: -1 });
  }

  hide(): void {
    gsap.killTweensOf(this.prompt);
    for (const t of this.rowTexts) gsap.killTweensOf(t);
    this.view.visible = false;
  }
}

// ------------------------------ Pause Overlay ------------------------------
export class PauseOverlay {
  view: Container;

  constructor() {
    this.view = new Container();
    const bg = new Graphics();
    bg.rect(0, 0, CONFIG.width, CONFIG.height).fill({ color: 0x000000, alpha: 0.55 });
    this.view.addChild(bg);
    const t = new Text({
      text: "PAUSED",
      style: style(72, CONFIG.palette.hud, true),
    });
    t.anchor.set(0.5);
    t.x = CONFIG.width / 2;
    t.y = CONFIG.height / 2;
    this.view.addChild(t);
    const hint = new Text({
      text: "PRESS  P  TO  RESUME",
      style: style(20, CONFIG.palette.accent),
    });
    hint.anchor.set(0.5);
    hint.x = CONFIG.width / 2;
    hint.y = CONFIG.height / 2 + 60;
    this.view.addChild(hint);
    this.view.visible = false;
  }

  show(): void {
    this.view.visible = true;
  }

  hide(): void {
    this.view.visible = false;
  }
}

// ------------------------------ Floating score popup ------------------------------
export class FloatingTextLayer {
  view: Container;

  constructor() {
    this.view = new Container();
  }

  spawn(x: number, y: number, message: string, color = CONFIG.palette.accent): void {
    const t = new Text({
      text: message,
      style: style(18, color, true),
    });
    t.anchor.set(0.5);
    t.x = x;
    t.y = y;
    this.view.addChild(t);
    gsap.to(t, { y: y - 38, alpha: 0, duration: 0.9, ease: "power1.out", onComplete: () => this.view.removeChild(t) });
    gsap.fromTo(t.scale, { x: 1.8, y: 1.8 }, { x: 1, y: 1, duration: 0.3, ease: "back.out(2)" });
  }
}
