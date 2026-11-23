class GameSoundEngine {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private bgmTimer: number | null = null;
  private bgmMode: 'off' | 'stroll' | 'chase' = 'off';
  private stepIndex = 0;

  private ensureContext(): AudioContext | null {
    if (!this.enabled) return null;
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.stopBgm();
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public unlock(): void {
    this.ensureContext();
  }

  public startBgm(mode: 'stroll' | 'chase'): void {
    if (!this.enabled) {
      this.bgmMode = 'off';
      return;
    }
    if (this.bgmMode === mode && this.bgmTimer !== null) return;

    this.stopBgm();
    this.bgmMode = mode;
    this.stepIndex = 0;

    // Stroll: bouncy playful morning xylophone (135 BPM eighth notes ~ 220ms)
    // Chase: frantic comedic gallop (210 BPM eighth notes ~ 130ms)
    const intervalMs = mode === 'stroll' ? 230 : 125;

    const strollMelody = [
      523.25, 659.25, 783.99, 659.25,
      587.33, 698.46, 880.0, 698.46,
      523.25, 783.99, 1046.5, 880.0,
      783.99, 659.25, 587.33, 0,
    ];
    const strollBass = [
      261.63, 0, 196.0, 0,
      293.66, 0, 220.0, 0,
      261.63, 0, 329.63, 0,
      196.0, 0, 261.63, 0,
    ];

    const chaseMelody = [
      659.25, 783.99, 880.0, 783.99,
      987.77, 880.0, 783.99, 659.25,
      587.33, 698.46, 783.99, 987.77,
      1046.5, 987.77, 880.0, 783.99,
    ];
    const chaseBass = [
      196.0, 293.66, 196.0, 293.66,
      220.0, 329.63, 220.0, 329.63,
      174.61, 261.63, 196.0, 293.66,
      261.63, 196.0, 246.94, 196.0,
    ];

    const tick = () => {
      if (!this.enabled || this.bgmMode !== mode) return;
      const ctx = this.ensureContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const idx = this.stepIndex % 16;

      if (mode === 'stroll') {
        const note = strollMelody[idx];
        const bass = strollBass[idx];
        if (note > 0) {
          this.playTone(ctx, note, now, 0.14, 'triangle', 0.055);
        }
        if (bass > 0) {
          this.playTone(ctx, bass, now, 0.18, 'sine', 0.045);
        }
      } else {
        const note = chaseMelody[idx];
        const bass = chaseBass[idx];
        this.playTone(ctx, note, now, 0.09, 'square', 0.032);
        this.playTone(ctx, bass, now, 0.09, 'triangle', 0.055);
        // Quick snare/footstep tick on off-beats
        if (idx % 2 === 1) {
          this.playNoiseBurst(ctx, now, 0.03, 1800, 0.025);
        }
      }

      this.stepIndex++;
    };

    tick();
    this.bgmTimer = window.setInterval(tick, intervalMs);
  }

  public stopBgm(): void {
    if (this.bgmTimer !== null) {
      window.clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
    this.bgmMode = 'off';
  }

  private playTone(
    ctx: AudioContext,
    freq: number,
    startTime: number,
    duration: number,
    type: OscillatorType,
    volume: number
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  private playNoiseBurst(
    ctx: AudioContext,
    startTime: number,
    duration: number,
    filterFreq: number,
    volume: number
  ): void {
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(filterFreq, startTime);
    filter.Q.setValueAtTime(1.5, startTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    source.start(startTime);
    source.stop(startTime + duration + 0.01);
  }

  /** Playful cartoon double bark "Gâu! Gâu!" */
  public playDogBark(doubleBark = true): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const singleBark = (offset: number, basePitch: number) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(basePitch * 0.85, now + offset);
      osc.frequency.exponentialRampToValueAtTime(basePitch * 1.45, now + offset + 0.045);
      osc.frequency.exponentialRampToValueAtTime(basePitch * 0.62, now + offset + 0.14);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(650, now + offset);
      filter.frequency.exponentialRampToValueAtTime(1150, now + offset + 0.05);
      filter.frequency.exponentialRampToValueAtTime(420, now + offset + 0.14);
      filter.Q.setValueAtTime(2.6, now + offset);

      gain.gain.setValueAtTime(0.001, now + offset);
      gain.gain.linearRampToValueAtTime(0.22, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.15);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + offset);
      osc.stop(now + offset + 0.17);
    };

    singleBark(0, 260);
    if (doubleBark) {
      singleBark(0.19, 290);
    }
  }

  /** Cartoon startled jump "Whoa / Boing!" when students spot the dog */
  public playStartle(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(980, now + 0.16);
    osc.frequency.exponentialRampToValueAtTime(620, now + 0.28);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.16, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.32);
  }

  /** Light cartoon pitter-patter footstep */
  public playFootstep(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.playNoiseBurst(ctx, now, 0.028, 900 + Math.random() * 500, 0.032);
  }

  /** Silly cartoon pop when a student drops a sandal */
  public playSandalDrop(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(1240, now + 0.07);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.18);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.21);
  }

  /** Hilarious cartoon boing + slide whistle when a backpack flies off! */
  public playBackpackPop(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(1420, now + 0.14);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.28);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.17, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.32);
  }

  /** Joyful sparkling chime when a student reaches the school gate */
  public playSafeGate(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [659.25, 880.0, 1046.5];
    notes.forEach((n, idx) => {
      this.playTone(ctx, n, now + idx * 0.055, 0.18, 'triangle', 0.09);
    });
  }

  /** Funny cartoon catch sound: playful chomp + comedic wah-wah trombone */
  public playComicCatch(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. Playful boing/chomp pop
    const boing = ctx.createOscillator();
    const boingGain = ctx.createGain();
    boing.type = 'triangle';
    boing.frequency.setValueAtTime(220, now);
    boing.frequency.exponentialRampToValueAtTime(640, now + 0.08);
    boing.frequency.exponentialRampToValueAtTime(180, now + 0.22);
    boingGain.gain.setValueAtTime(0.18, now);
    boingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    boing.connect(boingGain);
    boingGain.connect(ctx.destination);
    boing.start(now);
    boing.stop(now + 0.26);

    // 2. Comedic descending wah-wah-wah-waaah
    const wahNotes = [
      { freq: 392.0, offset: 0.22, dur: 0.18 },
      { freq: 369.99, offset: 0.42, dur: 0.18 },
      { freq: 349.23, offset: 0.62, dur: 0.18 },
      { freq: 329.63, offset: 0.82, dur: 0.48, slideTo: 293.66 },
    ];

    wahNotes.forEach((n) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(n.freq, now + n.offset);
      if (n.slideTo) {
        osc.frequency.linearRampToValueAtTime(n.slideTo, now + n.offset + n.dur);
      }

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1100, now + n.offset);
      filter.frequency.linearRampToValueAtTime(550, now + n.offset + n.dur);

      gain.gain.setValueAtTime(0.001, now + n.offset);
      gain.gain.linearRampToValueAtTime(0.095, now + n.offset + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, now + n.offset + n.dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + n.offset);
      osc.stop(now + n.offset + n.dur + 0.03);
    });
  }

  /** Button click feedback */
  public playClick(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.playTone(ctx, 640, ctx.currentTime, 0.05, 'sine', 0.06);
  }
}

export const soundEngine = new GameSoundEngine();
