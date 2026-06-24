// Tiny Web Audio synthesizer — no asset files, everything is generated.
// Silly cartoon SFX: monkey hoots, punches, banana whooshes, splats, cheers,
// plus a goofy looping background jingle.

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.muted = false;
    this.musicTimer = null;
  }

  // Must be created/resumed from a user gesture (browser autoplay policy).
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    this.master.connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.18;
    this.musicGain.connect(this.master);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 1.0;
    this.sfxGain.connect(this.master);
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.9;
  }

  now() { return this.ctx ? this.ctx.currentTime : 0; }

  // --- low level helpers ---
  tone(freq, t0, dur, type = 'sine', gain = 0.3, dest = this.sfxGain) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest);
    o.start(t0); o.stop(t0 + dur + 0.02);
    return o;
  }

  noise(t0, dur, gain = 0.4, filterFreq = 1200, dest = this.sfxGain) {
    if (!this.ctx) return;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    src.connect(f); f.connect(g); g.connect(dest);
    src.start(t0);
  }

  // --- game SFX ---
  hoot(pitch = 1) {
    this.ensure();
    const t = this.now();
    const base = 420 * pitch;
    const o = this.tone(base, t, 0.18, 'sine', 0.35);
    if (o) {
      o.frequency.exponentialRampToValueAtTime(base * 2.1, t + 0.06);
      o.frequency.exponentialRampToValueAtTime(base * 1.4, t + 0.18);
    }
    this.tone(base * 1.5, t + 0.02, 0.12, 'triangle', 0.12);
  }

  punch() {
    this.ensure();
    const t = this.now();
    this.noise(t, 0.12, 0.5, 900);
    const o = this.tone(160, t, 0.12, 'square', 0.4);
    if (o) o.frequency.exponentialRampToValueAtTime(50, t + 0.12);
  }

  whoosh() {
    this.ensure();
    const t = this.now();
    this.noise(t, 0.22, 0.25, 2600);
  }

  splat() {
    this.ensure();
    const t = this.now();
    this.noise(t, 0.18, 0.5, 500);
    const o = this.tone(220, t, 0.15, 'sawtooth', 0.25);
    if (o) o.frequency.exponentialRampToValueAtTime(60, t + 0.15);
  }

  jump() {
    this.ensure();
    const t = this.now();
    const o = this.tone(300, t, 0.18, 'sine', 0.25);
    if (o) o.frequency.exponentialRampToValueAtTime(620, t + 0.16);
  }

  // Long descending wail when a monkey is launched off the arena.
  yeet() {
    this.ensure();
    const t = this.now();
    const o = this.tone(700, t, 0.7, 'sawtooth', 0.3);
    if (o) o.frequency.exponentialRampToValueAtTime(120, t + 0.7);
    this.tone(1050, t, 0.7, 'square', 0.08);
  }

  cheer() {
    this.ensure();
    const t = this.now();
    for (let i = 0; i < 8; i++) {
      this.tone(500 + Math.random() * 900, t + Math.random() * 0.25, 0.25, 'triangle', 0.06);
    }
    this.noise(t, 0.5, 0.12, 4000);
  }

  win() {
    this.ensure();
    const t = this.now();
    const notes = [523, 659, 784, 1046];
    notes.forEach((f, i) => this.tone(f, t + i * 0.12, 0.25, 'triangle', 0.3));
    this.cheer();
  }

  lose() {
    this.ensure();
    const t = this.now();
    const notes = [400, 360, 320, 240];
    notes.forEach((f, i) => this.tone(f, t + i * 0.18, 0.3, 'sawtooth', 0.25));
  }

  // --- goofy looping background music ---
  startMusic() {
    this.ensure();
    if (!this.ctx || this.musicTimer) return;
    // A bouncy 8-note bass riff with a plucky lead, looped on a timer.
    const bass = [110, 110, 146, 110, 130, 130, 98, 110];
    const lead = [440, 0, 523, 440, 587, 523, 0, 392];
    let step = 0;
    const beat = 0.22;
    const schedule = () => {
      if (!this.ctx) return;
      const t = this.now() + 0.05;
      const b = bass[step % bass.length];
      const l = lead[step % lead.length];
      this.tone(b, t, beat * 0.9, 'triangle', 0.5, this.musicGain);
      if (l) this.tone(l, t, beat * 0.6, 'square', 0.18, this.musicGain);
      // a little hat
      this.noise(t, 0.04, 0.06, 6000, this.musicGain);
      step++;
    };
    schedule();
    this.musicTimer = setInterval(schedule, beat * 1000);
  }

  stopMusic() {
    if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; }
  }
}

export const Audio = new AudioEngine();
