import { Application, Container, Rectangle } from "pixi.js";
import { BloomFilter } from "pixi-filters";
import gsap from "gsap";
import { CONFIG } from "./config";
import { Input } from "./input";
import { audio } from "./audio";
import { Starfield } from "./starfield";
import { ParticleSystem } from "./particles";
import { Player, InvaderGrid, BulletPool, Shield, createShields, rectsOverlap } from "./entities";
import {
  HUD,
  TitleScreen,
  GameOverScreen,
  HighscoreEntryScreen,
  HighscoreBoardScreen,
  PauseOverlay,
  FloatingTextLayer,
} from "./ui";
import { CRTFilter } from "./crtFilter";
import { HighscoreBoard } from "./highscores";
import { installTouchControls } from "./touchControls";

type State = "TITLE" | "PLAYING" | "PAUSED" | "GAME_OVER" | "HS_ENTRY" | "HS_BOARD";

export class Game {
  app: Application;
  private input = new Input();
  private state: State = "TITLE";

  private root: Container; // wraps world + ui, owns the CRT filter
  private world: Container; // all in-game graphics (shakable)
  private uiLayer: Container; // overlays, HUD - unshaken
  private starfield!: Starfield;
  private particles!: ParticleSystem;
  private floaters!: FloatingTextLayer;
  private player!: Player;
  private invaders!: InvaderGrid;
  private bullets!: BulletPool;
  private shields: Shield[] = [];

  private hud!: HUD;
  private title!: TitleScreen;
  private gameOver!: GameOverScreen;
  private hsEntry!: HighscoreEntryScreen;
  private hsBoard!: HighscoreBoardScreen;
  private pause!: PauseOverlay;

  private crt: CRTFilter | null = null;
  private bloom: BloomFilter | null = null;
  private highscores = new HighscoreBoard();

  // Gameplay state
  private score = 0;
  private lives = 3;
  private wave = 1;
  private combo = 1;
  private comboTimer = 0;
  private extraLifeProgress = 0;
  private stepToneIdx = 0;
  private shakeT = 0;
  private shakeMag = 0;
  private invaderStepCooldown = 0;

  constructor(private container: HTMLElement) {
    this.app = new Application();
    this.root = new Container();
    this.world = new Container();
    this.uiLayer = new Container();
  }

  async init(): Promise<void> {
    await this.app.init({
      width: CONFIG.width,
      height: CONFIG.height,
      background: CONFIG.palette.bg,
      antialias: false,
      preference: "webgl",
      resolution: Math.min(2, window.devicePixelRatio || 1),
      autoDensity: true,
    });

    // Fit the canvas responsively inside its container via CSS transform.
    this.container.appendChild(this.app.canvas);
    this.applyResponsiveScale();
    window.addEventListener("resize", () => this.applyResponsiveScale());
    window.addEventListener("orientationchange", () => this.applyResponsiveScale());
    document.addEventListener("fullscreenchange", () => {
      // Delay one frame so viewport metrics update.
      requestAnimationFrame(() => this.applyResponsiveScale());
    });

    installTouchControls(this.input, document.body);

    this.root.addChild(this.world, this.uiLayer);
    this.app.stage.addChild(this.root);

    // --- Background + world entities ---
    this.starfield = new Starfield(CONFIG.width, CONFIG.height);
    this.particles = new ParticleSystem(800);
    this.floaters = new FloatingTextLayer();
    this.player = new Player();
    this.invaders = new InvaderGrid();
    this.bullets = new BulletPool(40);
    this.shields = createShields();

    this.world.addChild(this.starfield.view);
    for (const s of this.shields) this.world.addChild(s.view);
    this.world.addChild(this.invaders.view);
    this.world.addChild(this.player.view);
    this.world.addChild(this.bullets.view);
    this.world.addChild(this.particles.view);
    this.world.addChild(this.floaters.view);

    // --- UI overlays ---
    this.hud = new HUD();
    this.title = new TitleScreen();
    this.gameOver = new GameOverScreen();
    this.hsEntry = new HighscoreEntryScreen();
    this.hsBoard = new HighscoreBoardScreen();
    this.pause = new PauseOverlay();

    this.uiLayer.addChild(this.hud.view);
    this.uiLayer.addChild(this.title.view);
    this.uiLayer.addChild(this.gameOver.view);
    this.uiLayer.addChild(this.hsBoard.view);
    this.uiLayer.addChild(this.hsEntry.view);
    this.uiLayer.addChild(this.pause.view);

    // --- Filters (CRT on root, bloom on world) ---
    // Wrapped in try/catch so any shader/GPU issue does not break the game.
    const fullArea = new Rectangle(0, 0, CONFIG.width, CONFIG.height);
    try {
      this.bloom = new BloomFilter({ strength: 6, quality: 4 });
      this.world.filterArea = fullArea;
      this.world.filters = [this.bloom];
    } catch (err) {
      console.warn("Bloom filter failed to initialize, continuing without it.", err);
      this.bloom = null;
    }
    try {
      this.crt = new CRTFilter({ scanline: 0.6, aberration: 2.0, curvature: 7.0, vignette: 0.9, noise: 0.03 });
      this.root.filterArea = fullArea;
      this.root.filters = [this.crt];
    } catch (err) {
      console.warn("CRT filter failed to initialize, continuing without it.", err);
      this.crt = null;
    }

    // Seed title with current highscores
    this.title.setHighscores(this.highscores.entries());
    this.hud.setScore(0, this.topScore());

    // Ticker
    this.app.ticker.add(() => this.tick());

    // Keydown delegate for screens that need direct key events.
    window.addEventListener("keydown", (e) => {
      if (this.state === "HS_ENTRY") {
        this.hsEntry.handleKey(e.code);
        if (["Enter", "Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
          e.preventDefault();
        }
      }
    });
  }

  private applyResponsiveScale(): void {
    const c = this.app.canvas;
    const vw = Math.max(1, window.innerWidth);
    const vh = Math.max(1, window.innerHeight);
    const isTouch = matchMedia("(pointer: coarse)").matches;
    const margin = isTouch ? 1.0 : 0.98;
    const scale = Math.max(0.1, Math.min(vw / CONFIG.width, vh / CONFIG.height) * margin);
    c.style.width = `${CONFIG.width * scale}px`;
    c.style.height = `${CONFIG.height * scale}px`;
  }

  private topScore(): number {
    const list = this.highscores.entries();
    return list.length ? list[0].score : 0;
  }

  private resetGame(): void {
    this.score = 0;
    this.lives = 3;
    this.wave = 1;
    this.combo = 1;
    this.comboTimer = 0;
    this.extraLifeProgress = 0;
    this.invaders.reset(this.wave);
    this.shields.forEach((s) => s.view.parent?.removeChild(s.view));
    this.shields = createShields();
    for (const s of this.shields) this.world.addChildAt(s.view, this.world.getChildIndex(this.invaders.view));
    this.player = new Player();
    this.world.addChildAt(this.player.view, this.world.getChildIndex(this.bullets.view));
    this.bullets = new BulletPool(40);
    this.world.addChildAt(this.bullets.view, this.world.getChildIndex(this.particles.view));
    this.hud.setScore(0, this.topScore());
    this.hud.setWave(this.wave);
    this.hud.setLives(this.lives);
    this.hud.setCombo(1);
    this.starfield.warpIn(1.0);
  }

  private startGame(): void {
    audio.unlock();
    audio.uiBlip();
    this.resetGame();
    this.title.hide();
    this.gameOver.hide();
    this.hsBoard.hide();
    this.state = "PLAYING";
  }

  private endGame(): void {
    this.state = "GAME_OVER";
    audio.explosionBig();
    this.addShake(18, 0.6);
    this.gameOver.show(this.score);
  }

  private nextWave(): void {
    this.wave++;
    this.invaders.reset(this.wave);
    this.hud.setWave(this.wave);
    this.starfield.warpIn(0.6);
    this.floaters.spawn(CONFIG.width / 2, 200, `WAVE ${this.wave}`, CONFIG.palette.accent);
  }

  private addScore(points: number, x: number, y: number): void {
    const multiplied = points * this.combo;
    this.score += multiplied;
    this.hud.setScore(this.score, this.topScore());
    this.floaters.spawn(x, y - 16, `+${multiplied}`, CONFIG.palette.accent);
    this.extraLifeProgress += multiplied;
    if (this.extraLifeProgress >= CONFIG.scoring.extraLifeEvery) {
      this.extraLifeProgress -= CONFIG.scoring.extraLifeEvery;
      this.lives++;
      this.hud.setLives(this.lives);
      audio.extraLife();
      this.floaters.spawn(CONFIG.width / 2, 200, "EXTRA LIFE", CONFIG.palette.hud);
    }
  }

  private bumpCombo(): void {
    this.combo = Math.min(CONFIG.scoring.maxCombo, this.combo + 1);
    this.comboTimer = CONFIG.scoring.comboWindow;
    this.hud.setCombo(this.combo);
  }

  private addShake(mag: number, dur: number): void {
    this.shakeMag = Math.max(this.shakeMag, mag);
    this.shakeT = Math.max(this.shakeT, dur);
  }

  private tick(): void {
    const dt = Math.min(1 / 30, this.app.ticker.deltaMS / 1000);
    this.crt?.update(dt);
    this.starfield.update(dt);
    this.particles.update(dt);

    // Screen shake applied to world container
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const s = this.shakeMag * (this.shakeT > 0 ? this.shakeT / 0.6 : 0);
      this.world.x = (Math.random() - 0.5) * s * 2;
      this.world.y = (Math.random() - 0.5) * s * 2;
    } else {
      this.world.x = 0;
      this.world.y = 0;
      this.shakeMag = 0;
    }

    switch (this.state) {
      case "TITLE":
        this.title.update(dt);
        if (this.input.pressed("Enter") || this.input.pressed("Space")) this.startGame();
        if (this.input.pressed("KeyH")) this.openHighscoreBoard();
        break;
      case "PLAYING":
        this.updatePlaying(dt);
        if (this.input.pressed("KeyP") || this.input.pressed("Escape")) {
          this.state = "PAUSED";
          this.pause.show();
          audio.uiBlip();
        }
        break;
      case "PAUSED":
        if (this.input.pressed("KeyP") || this.input.pressed("Escape")) {
          this.state = "PLAYING";
          this.pause.hide();
          audio.uiBlip();
        }
        break;
      case "GAME_OVER":
        if (this.input.pressed("Enter") || this.input.pressed("Space")) {
          this.gameOver.hide();
          if (this.highscores.qualifies(this.score)) {
            this.openHighscoreEntry();
          } else {
            this.returnToTitle();
          }
        }
        break;
      case "HS_ENTRY":
        this.hsEntry.update(dt);
        // key handling happens via window keydown (see init)
        break;
      case "HS_BOARD":
        if (this.input.pressed("Enter") || this.input.pressed("Space") || this.input.pressed("Escape")) {
          this.hsBoard.hide();
          this.title.setHighscores(this.highscores.entries());
          this.title.show();
          this.state = "TITLE";
          audio.uiBlip();
        }
        break;
    }

    if (this.input.pressed("KeyM")) audio.toggleMute();

    // Always update shields for dirty-redraw
    for (const s of this.shields) s.update(dt);

    this.input.endFrame();
  }

  private openHighscoreEntry(): void {
    this.state = "HS_ENTRY";
    this.hsEntry.show((name) => {
      const rank = this.highscores.submit(name, this.score, this.wave);
      this.hsEntry.hide();
      this.openHighscoreBoard(rank);
    });
  }

  private openHighscoreBoard(highlight: number = -1): void {
    this.state = "HS_BOARD";
    this.title.hide();
    this.gameOver.hide();
    this.hsBoard.show(this.highscores.entries(), highlight);
    audio.uiBlip();
  }

  private returnToTitle(): void {
    this.state = "TITLE";
    this.title.setHighscores(this.highscores.entries());
    this.title.show();
  }

  // ------------------------------ PLAYING update ------------------------------
  private updatePlaying(dt: number): void {
    // Combo decay
    if (this.combo > 1) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 1;
        this.hud.setCombo(1);
      }
    }

    const left = this.input.anyDown(["ArrowLeft", "KeyA"]);
    const right = this.input.anyDown(["ArrowRight", "KeyD"]);
    this.player.update(dt, left, right);

    if (this.input.anyDown(["Space", "KeyK"]) && this.player.canShoot()) {
      const spread = CONFIG.player.salvoSpread;
      const count = CONFIG.player.salvoCount;
      let anySpawned = false;
      // Fan out symmetrically around the center muzzle: -1, 0, +1 for count=3.
      const half = (count - 1) / 2;
      for (let i = 0; i < count; i++) {
        const offset = (i - half) * spread;
        const b = this.bullets.spawn(this.player.x + offset, this.player.y - 18, true, 0xfffcf0);
        if (b) anySpawned = true;
      }
      if (anySpawned) {
        this.player.resetShoot();
        audio.shoot();
      }
    }

    // Invader grid step / move
    const stepped = this.invaders.update(dt);
    if (stepped) {
      audio.invaderStep(this.stepToneIdx);
      this.stepToneIdx = (this.stepToneIdx + 1) & 1;
    }

    // Invader firing
    if (Math.random() < CONFIG.invaders.fireChance * (1 + this.wave * 0.15)) {
      const shooter = this.invaders.pickShooter();
      if (shooter) {
        const c = this.invaders.invaderCenter(shooter);
        this.bullets.spawn(c.x, c.y + 12, false);
      }
    }

    this.bullets.update(dt);

    // ---------- Collisions ----------
    this.bullets.forEachActive((b) => {
      const bx = b.x - b.w / 2;
      const by = b.y - b.h / 2;

      // Shields
      for (const s of this.shields) {
        if (b.x >= s.x && b.x <= s.x + s.w && b.y >= s.y && b.y <= s.y + s.h) {
          if (s.containsPoint(b.x, b.y)) {
            s.damageAt(b.x, b.y, b.fromPlayer ? 1 : 2);
            this.particles.burst(b.x, b.y, {
              count: 10,
              color: 0x30ff7d,
              speed: 120,
              life: 0.4,
              size: 1.6,
              drag: 0.9,
            });
            b.active = false;
            audio.explosionSmall();
            return;
          }
        }
      }

      if (b.fromPlayer) {
        const hit = this.invaders.hitTest(bx, by, b.w, b.h);
        if (hit) {
          hit.alive = false;
          b.active = false;
          const pts = CONFIG.invaders.points[hit.type];
          const center = this.invaders.invaderCenter(hit);
          this.addScore(pts, center.x, center.y);
          this.bumpCombo();
          this.particles.burst(center.x, center.y, {
            count: 24,
            colors: [CONFIG.invaders.colors[hit.type], 0xffffff, 0xffe066],
            speed: 240,
            life: 0.6,
            size: 2.4,
            drag: 0.88,
          });
          audio.explosionSmall();
          this.addShake(4, 0.12);
        }
      } else {
        // Hit player?
        if (this.player.alive) {
          const pb = this.player.bounds();
          if (rectsOverlap({ x: bx, y: by, w: b.w, h: b.h }, pb)) {
            b.active = false;
            this.onPlayerHit();
          }
        }
      }
    });

    // Invaders reach the player line?
    const ext = this.invaders.extents();
    if (ext.bottom >= CONFIG.player.spawnY - 8 || this.invaders.invaders.some((i) => i.alive && this.invaders.invaderCenter(i).y > CONFIG.height - 80)) {
      this.onPlayerHit(true);
    }

    // Wave cleared?
    if (this.invaders.aliveCount() === 0) {
      this.nextWave();
    }
  }

  private onPlayerHit(gameEnding = false): void {
    if (!this.player.alive) return;
    audio.playerHit();
    this.addShake(14, 0.5);
    const { x, y } = { x: this.player.x, y: this.player.y };
    this.particles.burst(x, y, {
      count: 60,
      colors: [0x00ffd1, 0xffffff, 0xffe066, 0xff3060],
      speed: 320,
      life: 0.9,
      size: 3.0,
      drag: 0.9,
    });
    this.lives--;
    this.combo = 1;
    this.hud.setLives(this.lives);
    this.hud.setCombo(1);

    if (this.lives <= 0 || gameEnding) {
      this.player.alive = false;
      this.player.view.visible = false;
      // small delay before showing Game Over
      gsap.delayedCall(0.6, () => this.endGame());
    } else {
      this.player.killAndRespawn();
      this.starfield.warpIn(0.8);
    }
  }
}
