# Space Invaders Modern — Projektregeln für Claude Code

## Stack
- Vite + Vanilla TypeScript
- Pixi.js v8 als Renderer (WebGL2 + WebGPU fallback)
- GSAP für UI-Animationen
- pixi-filters (BloomFilter, CRTFilter)
- Web Audio API für prozedurale Sounds (kein Howler nötig)

## Architektur
- Klassen: Game, Scene, Entity, Player, Invader, Bullet, ParticleSystem
- Gameloop via Pixi.Ticker, delta-time normiert
- Assets: alles generativ (kein externes Bildmaterial nötig)
- State Machine: TITLE -> PLAYING -> PAUSED -> GAME_OVER -> HIGHSCORE_ENTRY -> HIGHSCORES

## Effekte
1. Bloom/Glow auf alle Leucht-Objekte
2. Partikelexplosionen via ObjectPool (kein GC-Druck)
3. CRT Shader (custom GLSL): Scanlines, Vignette, RGB-Shift, Curvature
4. Warp-Speed Hintergrund: Sternfeld mit Tiefenparallax
5. Shield-Pixelation: blockweise Degradation mit Shockwave
6. Screen Shake bei Explosion
7. Combo-Multiplikator mit GSAP-Punch
8. Invader-Wellenbewegung (Sinus)
9. Death Ray als animierter Beam
10. Hyperspace-Jump bei Respawn

## Highscore Board
- Top 10, in localStorage persistiert
- Initialen-Eingabe (3 Zeichen) bei neuem High Score
- Animierte Zeile-fuer-Zeile Anzeige

## Code-Qualitaet
- TypeScript strict
- Kommentare auf Englisch
- 60fps target
