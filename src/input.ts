// Keyboard input manager with per-frame pressed/released detection.
export class Input {
  private down = new Set<string>();
  private pressedThisFrame = new Set<string>();
  private releasedThisFrame = new Set<string>();
  private touchAxis = 0; // -1..1, set by swipe steering

  constructor() {
    window.addEventListener("keydown", (e) => {
      const k = this.normalize(e.code);
      if (!this.down.has(k)) this.pressedThisFrame.add(k);
      this.down.add(k);
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener("keyup", (e) => {
      const k = this.normalize(e.code);
      this.down.delete(k);
      this.releasedThisFrame.add(k);
    });
    window.addEventListener("blur", () => this.down.clear());
  }

  private normalize(code: string): string {
    return code;
  }

  isDown(code: string): boolean {
    return this.down.has(code);
  }

  pressed(code: string): boolean {
    return this.pressedThisFrame.has(code);
  }

  released(code: string): boolean {
    return this.releasedThisFrame.has(code);
  }

  anyPressed(codes: string[]): boolean {
    return codes.some((c) => this.pressedThisFrame.has(c));
  }

  anyDown(codes: string[]): boolean {
    return codes.some((c) => this.down.has(c));
  }

  endFrame(): void {
    this.pressedThisFrame.clear();
    this.releasedThisFrame.clear();
  }

  // Synthesize a key event from an external source (e.g. on-screen touch buttons).
  setVirtualKey(code: string, down: boolean): void {
    if (down) {
      if (!this.down.has(code)) this.pressedThisFrame.add(code);
      this.down.add(code);
    } else {
      if (this.down.has(code)) this.releasedThisFrame.add(code);
      this.down.delete(code);
    }
  }

  setTouchAxis(v: number): void {
    this.touchAxis = Math.max(-1, Math.min(1, v));
  }

  // Combined steering axis from keyboard + touch drag. Touch overrides keys
  // while a finger is down so the stick-style input feels responsive.
  steerAxis(): number {
    if (this.touchAxis !== 0) return this.touchAxis;
    const left = this.down.has("ArrowLeft") || this.down.has("KeyA");
    const right = this.down.has("ArrowRight") || this.down.has("KeyD");
    return (right ? 1 : 0) - (left ? 1 : 0);
  }
}
