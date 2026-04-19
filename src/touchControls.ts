import { Input } from "./input";

// Build a touch overlay with three big hit zones: Left, Right, Fire.
// The overlay auto-hides on non-touch devices. Buttons synthesize key events
// through Input.setVirtualKey so game logic stays keyboard-centric.
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
      .touch-controls button {
        position: absolute;
        pointer-events: auto;
        bottom: env(safe-area-inset-bottom, 16px);
        width: 22vw;
        height: 22vw;
        max-width: 120px;
        max-height: 120px;
        min-width: 72px;
        min-height: 72px;
        border-radius: 50%;
        border: 2px solid rgba(0, 255, 209, 0.7);
        background: rgba(0, 0, 0, 0.35);
        color: #7effe0;
        font: 700 26px "Courier New", monospace;
        letter-spacing: 2px;
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
      .touch-controls .left  { left: 4vw; }
      .touch-controls .right { left: calc(4vw + 26vw); }
      .touch-controls .fire  {
        right: 4vw;
        border-color: rgba(255, 96, 96, 0.85);
        color: #ff9ea6;
        font-size: 20px;
      }
      .touch-controls .fire.pressed { background: rgba(255, 96, 96, 0.35); color: #fff; }

      .touch-controls .menu,
      .touch-controls .fullscreen {
        position: absolute;
        top: env(safe-area-inset-top, 12px);
        width: 56px;
        height: 44px;
        min-width: 0;
        min-height: 0;
        border-radius: 10px;
        font-size: 18px;
        bottom: auto;
      }
      .touch-controls .menu       { right: 12px; }
      .touch-controls .fullscreen { right: 78px; font-size: 22px; }

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
    <button class="left"       data-code="ArrowLeft"  aria-label="Move left">&#x25C0;</button>
    <button class="right"      data-code="ArrowRight" aria-label="Move right">&#x25B6;</button>
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
