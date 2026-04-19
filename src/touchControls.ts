import { Input } from "./input";

// Build a touch overlay with a fullscreen swipe zone for steering, and small
// Fire/Menu/Fullscreen buttons. Left/right is controlled by dragging the thumb
// anywhere on the swipe zone: press anchors a reference point, moving the
// finger sets a normalized axis (-1..1) that feeds Player via input.setTouchAxis.
// Buttons still synthesize key events so game logic stays keyboard-centric.
export function installTouchControls(input: Input, container: HTMLElement): void {
  const isTouch =
    "ontouchstart" in window ||
    (navigator.maxTouchPoints !== undefined && navigator.maxTouchPoints > 0);

  const root = document.createElement("div");
  root.className = "touch-controls";
  root.innerHTML = `
    <style>
      .touch-controls {
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 1000;
        display: ${isTouch ? "block" : "none"};
        touch-action: none;
        user-select: none;
        -webkit-user-select: none;
        -webkit-tap-highlight-color: transparent;
      }
      /* Swipe zone covers the left/bottom area beneath the HUD. The Fire
         button sits on top with higher z-index so it always wins taps. */
      .touch-controls .swipe {
        position: absolute;
        left: 0;
        right: 0;
        top: 64px;
        bottom: 0;
        pointer-events: auto;
        background: transparent;
      }
      .touch-controls .swipe-hint {
        position: absolute;
        left: 50%;
        bottom: 18px;
        transform: translateX(-50%);
        color: rgba(0, 255, 209, 0.45);
        font: 600 12px "Courier New", monospace;
        letter-spacing: 2px;
        pointer-events: none;
        text-transform: uppercase;
      }
      .touch-controls button {
        position: absolute;
        pointer-events: auto;
        border-radius: 50%;
        border: 2px solid rgba(0, 255, 209, 0.7);
        background: rgba(0, 0, 0, 0.35);
        color: #7effe0;
        font: 700 14px "Courier New", monospace;
        letter-spacing: 1px;
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        transition: transform 0.08s, background 0.08s;
      }
      .touch-controls button:active,
      .touch-controls button.pressed {
        transform: scale(0.92);
        background: rgba(0, 255, 209, 0.25);
        color: #fff;
      }
      .touch-controls .fire {
        right: 4vw;
        bottom: env(safe-area-inset-bottom, 16px);
        width: 16vw;
        height: 16vw;
        min-width: 64px;
        min-height: 64px;
        max-width: 96px;
        max-height: 96px;
        border-color: rgba(255, 96, 96, 0.85);
        color: #ff9ea6;
        font-size: 16px;
        z-index: 2;
      }
      .touch-controls .fire.pressed { background: rgba(255, 96, 96, 0.35); color: #fff; }

      .touch-controls .menu,
      .touch-controls .fullscreen {
        top: env(safe-area-inset-top, 10px);
        width: 44px;
        height: 36px;
        border-radius: 10px;
        font-size: 14px;
        z-index: 2;
      }
      .touch-controls .menu       { right: 10px; }
      .touch-controls .fullscreen { right: 62px; font-size: 18px; }

      /* Fullscreen button is also useful on desktop, keep it visible there. */
      .fullscreen-desktop {
        position: fixed;
        top: 12px;
        right: 12px;
        z-index: 1001;
        width: 44px;
        height: 36px;
        border-radius: 8px;
        border: 1px solid rgba(0, 255, 209, 0.55);
        background: rgba(0, 0, 0, 0.45);
        color: #7effe0;
        font: 700 16px "Courier New", monospace;
        cursor: pointer;
        display: ${isTouch ? "none" : "block"};
      }
      .fullscreen-desktop:hover { background: rgba(0, 255, 209, 0.2); color: #fff; }

      @media (min-width: 901px) and (hover: hover) {
        .touch-controls { display: none !important; }
      }
    </style>
    <div class="swipe" aria-label="Steering swipe area">
      <div class="swipe-hint">DRAG TO STEER</div>
    </div>
    <button class="fire"       data-code="Space"      aria-label="Fire">FIRE</button>
    <button class="fullscreen" data-action="fullscreen" aria-label="Fullscreen">&#x26F6;</button>
    <button class="menu"       data-code="Enter"      aria-label="Start / Menu">&#x23CE;</button>
  `;
  container.appendChild(root);

  // Separate desktop fullscreen button so mouse users get fullscreen too.
  const fsDesk = document.createElement("button");
  fsDesk.className = "fullscreen-desktop";
  fsDesk.title = "Fullscreen (F)";
  fsDesk.textContent = "\u26F6";
  fsDesk.addEventListener("click", () => toggleFullscreen());
  container.appendChild(fsDesk);

  // --- Swipe-to-steer handling ---
  const swipe = root.querySelector<HTMLDivElement>(".swipe");
  if (swipe) {
    let activePointer: number | null = null;
    let anchorX = 0;
    let lastX = 0;
    // Pixels of thumb travel that equals full deflection. Tuned small so a
    // small drag gives firm steering; the axis clamps at +-1.
    const FULL_DEFLECTION_PX = 60;

    const setAxisFromDelta = (dx: number): void => {
      const v = Math.max(-1, Math.min(1, dx / FULL_DEFLECTION_PX));
      input.setTouchAxis(v);
    };

    const onDown = (e: PointerEvent): void => {
      if (activePointer !== null) return;
      activePointer = e.pointerId;
      anchorX = e.clientX;
      lastX = e.clientX;
      swipe.setPointerCapture?.(e.pointerId);
      e.preventDefault();
    };
    const onMove = (e: PointerEvent): void => {
      if (e.pointerId !== activePointer) return;
      lastX = e.clientX;
      setAxisFromDelta(lastX - anchorX);
      e.preventDefault();
    };
    const onUp = (e: PointerEvent): void => {
      if (e.pointerId !== activePointer) return;
      activePointer = null;
      input.setTouchAxis(0);
      try { swipe.releasePointerCapture?.(e.pointerId); } catch { /* ignore */ }
      e.preventDefault();
    };
    swipe.addEventListener("pointerdown", onDown);
    swipe.addEventListener("pointermove", onMove);
    swipe.addEventListener("pointerup", onUp);
    swipe.addEventListener("pointercancel", onUp);
    swipe.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  // --- Buttons ---
  const buttons = root.querySelectorAll<HTMLButtonElement>("button");
  buttons.forEach((btn) => {
    const code = btn.dataset.code;
    const action = btn.dataset.action;
    if (action === "fullscreen") {
      btn.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        toggleFullscreen();
      });
      btn.addEventListener("contextmenu", (e) => e.preventDefault());
      return;
    }
    if (!code) return;
    const press = (e: Event) => {
      e.preventDefault();
      btn.classList.add("pressed");
      input.setVirtualKey(code, true);
    };
    const release = (e: Event) => {
      e.preventDefault();
      btn.classList.remove("pressed");
      input.setVirtualKey(code, false);
    };
    btn.addEventListener("pointerdown", press);
    btn.addEventListener("pointerup", release);
    btn.addEventListener("pointercancel", release);
    btn.addEventListener("pointerleave", release);
    btn.addEventListener("contextmenu", (e) => e.preventDefault());
  });

  // Keyboard shortcut F for fullscreen on desktop.
  window.addEventListener("keydown", (e) => {
    if (e.code === "KeyF" && !e.repeat) toggleFullscreen();
  });
}

async function toggleFullscreen(): Promise<void> {
  const el = document.documentElement;
  try {
    if (!document.fullscreenElement) {
      await el.requestFullscreen?.();
      // Try to lock orientation to landscape on mobile. This only works in
      // fullscreen and may be rejected on desktop; ignore failures silently.
      const orient = (screen as Screen & { orientation?: ScreenOrientation & { lock?: (o: string) => Promise<void> } })
        .orientation;
      if (orient && typeof orient.lock === "function") {
        try {
          await orient.lock("landscape");
        } catch {
          // Orientation lock denied (desktop, iOS Safari, etc.) — ignore.
        }
      }
    } else {
      await document.exitFullscreen?.();
    }
  } catch (err) {
    console.warn("Fullscreen toggle failed:", err);
  }
}
