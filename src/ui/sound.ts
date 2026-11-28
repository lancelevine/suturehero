/**
 * Sound design (roadmap, 2026-11-28): short synthesized cues, no audio files. A click when the
 * needle pops through, a chime for a kept stitch, a low tug when the thread is pulled too hard.
 * On by default; the choice is remembered (suturehero.sound.v1). Browsers allow audio only after
 * the first user gesture, so cues before that are silently skipped.
 */
export const SOUND_STORAGE_KEY = 'suturehero.sound.v1';
/** A cue does not repeat faster than this (s). */
const MIN_GAP_SECONDS = 0.25;

export type Cue = 'pop' | 'chime' | 'tug';

/** Tone recipe per cue: frequencies (Hz), length (s), peak gain, waveform. */
export const CUES: Record<Cue, { frequencies: number[]; seconds: number; gain: number; type: OscillatorType }> = {
  pop: { frequencies: [1800], seconds: 0.05, gain: 0.08, type: 'square' },
  chime: { frequencies: [880, 1320], seconds: 0.45, gain: 0.06, type: 'sine' },
  tug: { frequencies: [140], seconds: 0.18, gain: 0.07, type: 'sawtooth' },
};

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function loadSoundOn(storage: StorageLike | null) {
  try {
    return storage?.getItem(SOUND_STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function saveSoundOn(storage: StorageLike | null, on: boolean) {
  try {
    storage?.setItem(SOUND_STORAGE_KEY, on ? 'on' : 'off');
  } catch {
    // Blocked storage: the choice lasts until reload.
  }
}

export class SoundCues {
  on: boolean;
  private context: AudioContext | null = null;
  private readonly lastPlayed = new Map<Cue, number>();

  constructor(on: boolean) {
    this.on = on;
  }

  play(cue: Cue) {
    if (!this.on || typeof AudioContext === 'undefined') return false;
    this.context ??= new AudioContext();
    const context = this.context;
    if (context.state !== 'running') {
      void context.resume().catch(() => {});
      return false;
    }
    const now = context.currentTime;
    if (now - (this.lastPlayed.get(cue) ?? -Infinity) < MIN_GAP_SECONDS) return false;
    this.lastPlayed.set(cue, now);
    const recipe = CUES[cue];
    recipe.frequencies.forEach((frequency, i) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = recipe.type;
      oscillator.frequency.value = frequency;
      const start = now + i * 0.08;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(recipe.gain, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + recipe.seconds);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + recipe.seconds + 0.02);
    });
    return true;
  }
}
