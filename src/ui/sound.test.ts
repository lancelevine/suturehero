import { expect, it } from 'vitest';
import { CUES, loadSoundOn, saveSoundOn, SoundCues } from './sound';

const memory = () => {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
};

it('remembers the sound choice and stays silent without audio support', () => {
  const storage = memory();
  expect(loadSoundOn(storage)).toBe(true);
  saveSoundOn(storage, false);
  expect(loadSoundOn(storage)).toBe(false);
  expect(new SoundCues(true).play('pop')).toBe(false);
  expect(Object.keys(CUES)).toEqual(['pop', 'chime', 'tug']);
});
