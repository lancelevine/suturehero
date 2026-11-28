import { describe, expect, it } from 'vitest';
import { ghostDuration, GhostRecorder, loadGhost, sampleGhost, saveGhost } from './ghostTrack';

const pose = (x: number, open: number) => ({ position: { x, y: 1, z: 0 }, quaternion: { x: 0, y: 0, z: 0, w: 1 }, openness: open });

describe('ghost track', () => {
  it('records at the sample rate and interpolates playback', () => {
    const rec = new GhostRecorder();
    for (let t = 0; t <= 1.001; t += 0.01) rec.add(10 + t, [pose(t, 0.5), pose(-t, 0.1)]);
    expect(rec.samples.length).toBeGreaterThanOrEqual(10);
    expect(rec.samples.length).toBeLessThanOrEqual(12);
    expect(ghostDuration(rec.samples)).toBeCloseTo(1, 1);
    const mid = sampleGhost(rec.samples, 0.5)!;
    expect(mid[0][0]).toBeCloseTo(0.5, 1);
    expect(mid[1][0]).toBeCloseTo(-0.5, 1);
    expect(sampleGhost(rec.samples, 99)![0][0]).toBeCloseTo(1, 1);
    expect(sampleGhost([], 0)).toBeNull();
    const map = new Map<string, string>();
    const storage = { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v) };
    saveGhost(storage, rec.samples);
    expect(loadGhost(storage)).toEqual(rec.samples);
  });
});
