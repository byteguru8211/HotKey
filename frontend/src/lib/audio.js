/** Небольшой синтезатор на Web Audio: звуки клавиш, ошибок и наград без файлов. */
class SoundEngine {
  constructor() {
    this.context = null;
    this.enabled = true;
    this.volume = 0.06;
  }

  ensure() {
    if (typeof window === 'undefined') return null;
    if (!this.context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      this.context = new AudioContext();
    }
    if (this.context.state === 'suspended') this.context.resume().catch(() => {});
    return this.context;
  }

  setEnabled(value) {
    this.enabled = Boolean(value);
    if (this.enabled) this.ensure();
  }

  tone(frequency, duration = 0.06, { type = 'sine', gain = 1, delay = 0, glide = 0 } = {}) {
    if (!this.enabled) return;
    const context = this.ensure();
    if (!context) return;
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const volume = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (glide) oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, glide), start + duration);
    volume.gain.setValueAtTime(0.0001, start);
    volume.gain.exponentialRampToValueAtTime(this.volume * gain, start + 0.008);
    volume.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(volume);
    volume.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  click() {
    this.tone(1250, 0.025, { type: 'triangle', gain: 0.35 });
  }

  error() {
    this.tone(150, 0.16, { type: 'sawtooth', gain: 0.8, glide: 90 });
    this.tone(110, 0.2, { type: 'square', gain: 0.18, delay: 0.02 });
  }

  combo(level = 1) {
    const base = 720 + level * 60;
    this.tone(base, 0.05, { type: 'sine', gain: 0.5 });
    this.tone(base * 1.5, 0.06, { type: 'sine', gain: 0.3, delay: 0.04 });
  }

  bonus() {
    [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
      this.tone(frequency, 0.12, { type: 'triangle', gain: 0.55, delay: index * 0.06 });
    });
  }

  finish() {
    [392, 523.25, 659.25].forEach((frequency, index) => {
      this.tone(frequency, 0.5, { type: 'sine', gain: 0.45, delay: index * 0.05 });
    });
  }

  levelUp() {
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((frequency, index) => {
      this.tone(frequency, 0.2, { type: 'triangle', gain: 0.5, delay: index * 0.08 });
    });
  }
}

export const sound = new SoundEngine();
