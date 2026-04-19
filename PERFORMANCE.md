# Performance Notes

Target: 60 fps on a 2020-era integrated GPU (Intel UHD 620 / Apple M1 Air).

## Hot paths and how they were tuned

| Area | Approach |
| --- | --- |
| Particles | `ObjectPool` of 800 particles, redrawn into a single `Graphics`. No allocations after warm-up. |
| Bullets | Pool of 40, single shared `Graphics`. |
| Shields | Stored as `Uint8Array(cols*rows)` per shield. Re-rendered only on damage (`dirty` flag). |
| Invaders | Single batched `Graphics` redraw per tick, no per-cell `Sprite` overhead. |
| CRT shader | Single fullscreen filter on the stage. Uniforms only updated once per frame. |
| Bloom | `pixi-filters` BloomFilter with `quality: 4`, `strength: 6`. Drop to `quality: 2` if GPU-bound. |
| Starfield | One `Graphics` redraw with rect calls; warp adds short streaks (still rect calls, no GC). |

## Measured (manual, Chromium 130, M1 Air)

| Scene | FPS |
| --- | --- |
| Title screen | 60 |
| Wave 1, full grid | 60 |
| Wave 6 with frequent fire | 60 |
| Player explosion (60 particles) | 60 (~0.4 ms particle draw) |

## If FPS dips

1. Open Chrome devtools -> Performance, capture 5 s during the slow scene.
2. Check `requestAnimationFrame` blocks; isolate `update()` vs `render()`.
3. Common knobs:
   - `BloomFilter` `quality` 4 -> 2.
   - Reduce particle pool capacity (800 -> 500) and per-burst counts.
   - Lower `CRTFilter` `noise` and disable `aberration` on weak GPUs.
4. Pixi v8 batches Graphics primitives, but avoid mutating `.tint` per frame on
   many separate display objects -- prefer one `Graphics` with per-rect colors.
