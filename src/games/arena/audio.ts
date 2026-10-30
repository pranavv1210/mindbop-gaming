// Tiny synthesised sound set, so the arena needs no audio files and loads instantly.
export class ArenaAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  volume = 0.6;

  /** Must be called from a user gesture (a click) so browsers allow audio. */
  unlock() {
    if (this.ctx) { void this.ctx.resume(); return; }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.ctx.destination);
  }

  setVolume(v: number) {
    this.volume = v;
    if (this.master) this.master.gain.value = v;
  }

  private tone(freq: number, end: number, ms: number, type: OscillatorType, gain: number, delay = 0) {
    if (!this.ctx || !this.master || this.volume <= 0) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, end), t0 + ms / 1000);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + ms / 1000);
    osc.connect(g); g.connect(this.master);
    osc.start(t0); osc.stop(t0 + ms / 1000 + 0.02);
  }

  private noise(ms: number, gain: number, cutoff: number, delay = 0) {
    if (!this.ctx || !this.master || this.volume <= 0) return;
    const rate = this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, Math.max(1, Math.floor((rate * ms) / 1000)), rate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass"; filter.frequency.value = cutoff;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    src.connect(filter); filter.connect(g); g.connect(this.master);
    src.start(this.ctx.currentTime + delay);
  }

  /** `near` scales loudness for other players' shots (1 = right next to you). */
  shot(weapon: number, near = 1) {
    const v = Math.min(1, Math.max(0.05, near));
    if (weapon === 1) { this.noise(180, 0.55 * v, 2400); this.tone(120, 50, 160, "sawtooth", 0.3 * v); }
    else if (weapon === 2) { this.tone(900, 90, 260, "sawtooth", 0.3 * v); this.noise(240, 0.35 * v, 5200); }
    else if (weapon === 3) { this.tone(520, 220, 70, "square", 0.16 * v); this.noise(60, 0.25 * v, 4200); }
    else { this.tone(380, 120, 90, "square", 0.2 * v); this.noise(70, 0.3 * v, 3600); }
  }
  hit(head: boolean) { this.tone(head ? 1500 : 1000, head ? 1500 : 900, 70, "triangle", 0.25); }
  kill() { this.tone(660, 660, 90, "triangle", 0.28); this.tone(990, 990, 160, "triangle", 0.28, 0.09); }
  hurt() { this.tone(180, 90, 160, "sawtooth", 0.28); }
  jump() { this.tone(260, 420, 90, "sine", 0.1); }
  ability() { this.tone(300, 900, 240, "sawtooth", 0.16); }
  reload() { this.tone(500, 380, 60, "square", 0.1); this.tone(380, 520, 80, "square", 0.1, 0.12); }
  tick() { this.tone(900, 900, 50, "sine", 0.12); }
}
