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

      .touch-controls .menu {
        position: absolute;
        top: env(safe-area-inset-top, 12px);
        right: 12px;
        width: 56px;
        height: 40px;
        min-width: 0;
        min-height: 0;
        border-radius: 10px;
        font-size: 18px;
        bottom: auto;
      }

      @media (min-width: 901px) and (hover: hover) {
        .touch-controls { display: none !important; }
      }
    </style>
    <button class="left"  data-code="ArrowLeft"  aria-label="Move left">&#x25C0;</button>
    <button class="right" data-code="ArrowRight" aria-label="Move right">&#x25B6;</button>
    <button class="fire"  data-code="Space"      aria-label="Fire">FIRE</button>
    <button class="menu"  data-code="Enter"      aria-label="Start / Menu">&#x23CE;</button>
  `;
  container.appendChild(root);

  const buttons = root.querySelectorAll<HTMLButtonElement>("button[data-code]");
  buttons.forEach((btn) => {
    const code = btn.dataset.code!;
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
}
