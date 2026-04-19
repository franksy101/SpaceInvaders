# Space Invaders Modern

Modern reimagining of Space Invaders built with **Vite + TypeScript + Pixi.js v8**.
All visuals are generative (no sprite assets), all sounds are procedural Web Audio.

## Features

- Classic 5x11 invader formation with sinus wave overlay
- Custom **CRT shader** (scanlines, RGB-shift, vignette, barrel curvature, grain)
- **Bloom** post-process on the world layer
- **Particle explosions** via object pool (no GC churn)
- **Pixel-perfect destructible shields** (Uint8Array bitmask, blockwise)
- **Parallax starfield** with warp-speed streaks on respawn
- **Screen shake** on impacts
- **Combo multiplier** with GSAP punch animation
- **Animated death-ray beam** for invader bullets
- **Hyperspace respawn** for the player
- **Highscore board** persisted in `localStorage` (Top 10) with initials entry

## Controls

| Key | Action |
| --- | --- |
| Arrow Left / A | Move left |
| Arrow Right / D | Move right |
| Space / K | Fire |
| Enter / Space | Start / continue from menus |
| P / Escape | Pause |
| M | Mute |
| H (on title) | Open full highscore board |

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (typically `http://localhost:5173`).

## Build

```bash
npm run build      # type-check + production bundle into docs/
npm run preview    # preview the production build locally
```

## Layout

- `dev/index.html` is the Vite dev-server entry (referenced via `root: "dev"`).
- `src/` contains the TypeScript sources.
- `docs/` holds the **committed** production build; GitHub Pages serves it.
- The repository-root `index.html` is a redirect to `./docs/` so hitting the
  repo URL without a path still lands on the game.

## Deploy to GitHub Pages

You have two options, pick one:

### A. Serve from the `/docs` folder (zero-config)

**Settings -> Pages -> Source: Deploy from a branch -> Branch: main / `/docs`.**
Pushing a rebuilt `docs/` folder to `main` is all you need; no Action required.

### B. Use the built-in GitHub Actions workflow

`.github/workflows/deploy.yml` runs `npm run build` on every push to `main` (or
the feature branch) and uploads `docs/` via `actions/deploy-pages@v4`.
Enable it once at **Settings -> Pages -> Source: GitHub Actions**.

`vite.config.ts` uses `base: "./"` so the build is path-agnostic and works
under any project sub-path on Pages.
