// Procedural audio via Web Audio API. No external samples.
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  muted = false;

  private ensure(): AudioContext {
    if (!this.ctx) {
      const Ctor =
        (window as unknown as { AudioContext: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
          .AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  // Must be called from a user gesture to unlock audio on some browsers.
  unlock(): void {
    const c = this.ensure();
    if (c.state === "suspended") c.resume();
  }

  toggleMute(): void {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.35;
  }

  private env(
    ctx: AudioContext,
    node: AudioNode,
    attack: number,
    decay: number,
    peak = 1,
  ): GainNode {
    const g = ctx.createGain();
    const now = ctx.currentTime;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(peak, now + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, now + attack + decay);
    node.connect(g);
    g.connect(this.master!);
    return g;
  }

  shoot(): void {
    const ctx = this.ensure();
    const osc = ctx.createOscillator();
    osc.type = "square";
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.18);
    this.env(ctx, osc, 0.005, 0.18, 0.6);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  invaderStep(tone: number): void {
    const ctx = this.ensure();
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    const freqs = [110, 90, 130, 70];
    osc.frequency.value = freqs[tone % freqs.length];
    this.env(ctx, osc, 0.001, 0.08, 0.35);
    const now = ctx.currentTime;
    osc.start(now);
    osc.stop(now + 0.1);
  }

  explosionBig(): void {
    const ctx = this.ensure();
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / data.length;
      data[i] = (Math.random() * 2 - 1) * (1 - t);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1200;
    noise.connect(filter);
    this.env(ctx, filter, 0.001, 0.55, 0.9);

    const kick = ctx.createOscillator();
    kick.type = "sine";
    const now = ctx.currentTime;
    kick.frequency.setValueAtTime(160, now);
    kick.frequency.exponentialRampToValueAtTime(30, now + 0.3);
    this.env(ctx, kick, 0.002, 0.3, 0.8);
    noise.start(now);
    kick.start(now);
    noise.stop(now + 0.6);
    kick.stop(now + 0.4);
  }

  explosionSmall(): void {
    const ctx = this.ensure();
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.18, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / data.length;
      data[i] = (Math.random() * 2 - 1) * (1 - t) * 0.8;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 900;
    src.connect(filter);
    this.env(ctx, filter, 0.001, 0.16, 0.6);
    const now = ctx.currentTime;
    src.start(now);
    src.stop(now + 0.2);
  }

  playerHit(): void {
    const ctx = this.ensure();
    const now = ctx.currentTime;
    [220, 233, 196].forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = "square";
      osc.frequency.value = f;
      this.env(ctx, osc, 0.002, 0.6, 0.4);
      osc.start(now + i * 0.02);
      osc.stop(now + 0.8);
    });
  }

  extraLife(): void {
    const ctx = this.ensure();
    const now = ctx.currentTime;
    const notes = [523, 659, 784, 1046];
    notes.forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = f;
      const start = now + i * 0.08;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(0.4, start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, start + 0.25);
      osc.connect(g);
      g.connect(this.master!);
      osc.start(start);
      osc.stop(start + 0.3);
    });
  }

  uiBlip(): void {
    const ctx = this.ensure();
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = 660;
    this.env(ctx, osc, 0.001, 0.08, 0.4);
    const now = ctx.currentTime;
    osc.start(now);
    osc.stop(now + 0.1);
  }
}

export const audio = new AudioEngine();
