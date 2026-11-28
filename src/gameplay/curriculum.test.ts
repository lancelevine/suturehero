import { describe, expect, it } from 'vitest';
import { CURRICULUM, loadDone, nextStep, setDone } from './curriculum';

describe('curriculum', () => {
  it('tracks done steps and the next one', () => {
    const map = new Map<string, string>();
    const storage = { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v) };
    expect(nextStep(loadDone(storage))?.id).toBe('warmup');
    setDone(storage, 'warmup', true);
    expect(nextStep(loadDone(storage))?.id).toBe('landmark');
    setDone(storage, 'warmup', false);
    expect(loadDone(storage).size).toBe(0);
    expect(new Set(CURRICULUM.map((s) => s.id)).size).toBe(CURRICULUM.length);
  });
});
