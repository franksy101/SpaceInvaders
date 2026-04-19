# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install
npm run dev      # Vite dev server on :5173 (root is dev/, not the repo root)
npm run build    # tsc --noEmit type-check, then Vite builds into docs/
npm run preview  # serve the built docs/ locally
```

There is no linter and no test runner. `tsc` in `npm run build` is the only static check; `tsconfig.json` is `strict` with `noEmit`.

## Repository layout quirks (read before editing paths)

- `vite.config.ts` sets `root: "dev"`, so Vite's entry HTML is `dev/index.html`, which in turn loads `../src/main.ts`. The top-level `index.html` is **not** the dev entry — it is a static redirect to `./docs/` so the bare GitHub Pages URL works.
- `npm run build` writes into `docs/` with `emptyOutDir: true`. **`docs/` is committed** — GitHub Pages serves it directly. If you change anything under `src/` that should ship, rebuild and commit the regenerated `docs/` alongside your source changes. `base: "./"` keeps the bundle path-agnostic.
- `.github/workflows/deploy.yml` also runs `npm run build` on push to `main` or `claude/space-invaders-game-KiwaG` and uploads `docs/` via `actions/deploy-pages@v4`. Pages can be configured either to serve the committed `docs/` folder or to use this workflow — both paths are supported.

## Architecture

Single-canvas Pixi.js v8 game, no asset pipeline — all graphics are drawn with `Graphics`, all sounds are synthesized in `src/audio.ts` with the Web Audio API.

### Composition root: `src/game.ts`

`Game` owns the Pixi `Application` and a finite state machine:

```
TITLE → PLAYING ⇄ PAUSED → GAME_OVER → HS_ENTRY → HS_BOARD → TITLE
```

Each tick (`Game.tick`) runs the shared update (CRT, starfield, particles, screen shake) and then switches on `state`. `updatePlaying` is the only path that advances entities, fires bullets, resolves collisions, and checks wave/end conditions. `delta-time` is clamped to `1/30` to avoid tunneling after a stall.

### Scene graph / filter pipeline

The render tree has two layers under one `root` container:

- `world` — starfield, shields, invader grid, player, bullets, particles, floaters. A `BloomFilter` is applied here.
- `uiLayer` — HUD + overlay screens, unshaken.
- A custom `CRTFilter` (see `src/crtFilter.ts`) wraps the whole `root`.

Both filter constructions are wrapped in try/catch in `Game.init`. If the GPU refuses a shader, the game continues without that effect. `src/main.ts` also installs top-level `error` and `unhandledrejection` handlers that render a red overlay so init failures are visible instead of a black screen (this was the fix for the original Pages black-screen bug).

Screen shake is implemented by offsetting `world.x/y`; `uiLayer` stays still so the HUD never jitters.

### Performance-critical patterns (do not break these)

- **Object pools, not allocations.** `BulletPool(40)` and `ParticleSystem(800)` are fixed-size pools with an `active` flag. `bullets.spawn` returns `null` when the pool is full; callers must handle that. No `new` in the hot loop.
- **One `Graphics` per system, redrawn each frame.** Invaders, bullets, particles, and starfield are each a single `Graphics`. Do not create one display object per entity — it breaks batching.
- **Shields are a `Uint8Array(cols*rows)` bitmask** per shield, re-rasterized into a `Graphics` only when the `dirty` flag is set by `damageAt`. Collision uses `containsPoint` against the bitmask, not Pixi hit-testing.
- **CRT uniforms update once per frame** in `crt.update(dt)`. Don't push per-entity uniform churn.

`PERFORMANCE.md` lists the specific knobs to dial back if a GPU struggles (`BloomFilter.quality` 4→2, particle pool 800→500, disable CRT aberration).

### Input

`src/input.ts` is keyboard-centric — the whole game reads `Input.pressed(code)` / `Input.anyDown([...])` with `e.code` values (`Space`, `KeyA`, `ArrowLeft`, …). Touch input in `src/touchControls.ts` does **not** introduce a parallel code path: buttons call `setVirtualKey(code, down)` to synthesize keyboard events, and the swipe zone feeds a `-1..1` axis via `setTouchAxis`. `steerAxis()` gives touch priority over keys while a finger is down. `Input.endFrame()` must be called at the end of every tick to clear `pressedThisFrame`.

Global keydown in `Game.init` `preventDefault`s arrow/space and also forwards keys to `HighscoreEntryScreen` when `state === "HS_ENTRY"` (the entry screen does its own key handling rather than going through `Input`).

### Tuning surface: `src/config.ts`

`CONFIG` is the single source of truth for speeds, cooldowns, colors, wave dynamics, scoring windows, shield geometry, and the `localStorage` key for highscores. Prefer adjusting `CONFIG` over hard-coding numbers in gameplay code.

### Highscores

`src/highscores.ts` persists the top 10 entries under `CONFIG.highscores.storageKey` in `localStorage`. `defaults()` seeds a starter ladder on first load. The storage key is **versioned** (`…/v1`) — bump the version if you change the entry shape, don't migrate silently. `qualifies()` is the only gate for opening `HS_ENTRY`.

### Responsive canvas

The Pixi canvas is rendered at a fixed internal resolution (`CONFIG.width` × `CONFIG.height` = 960×720) and CSS-scaled to fit the viewport via `applyResponsiveScale()`. Touch devices get a slightly tighter margin so the on-screen buttons fit. Listeners are wired for `resize`, `orientationchange`, and `fullscreenchange` (the fullscreen handler waits one RAF for viewport metrics to settle).

## Conventions

- TypeScript `strict`. Keep comments in English (the old German CLAUDE.md notes are superseded by this file).
- 60 fps target on a 2020-era integrated GPU — treat frame budget as a real constraint.
- All visuals are generative. Don't add image/audio assets without a strong reason; prefer a `Graphics` or a Web Audio oscillator.
- The dev HTML lives at `dev/index.html`. Don't add a second `index.html` at the repo root for dev — it will collide with the Pages redirect.
