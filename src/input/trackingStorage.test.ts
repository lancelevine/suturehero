import { describe, expect, it } from 'vitest';
import {
  jawStorageKey,
  parseDepthCalibration,
  parseNeedleJawPattern,
  parseTrackerType,
  patternJawStorageKey,
  readStored,
  readStoredJson,
  removeStored,
  writeStored,
} from './trackingStorage';

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
  };
}

const blocked = {
  getItem: (): string | null => { throw new Error('SecurityError'); },
  setItem: () => { throw new Error('SecurityError'); },
  removeItem: () => { throw new Error('SecurityError'); },
};

describe('safe storage access', () => {
  it('reads, writes and removes values', () => {
    const storage = memoryStorage();
    expect(writeStored('k', 'v', storage)).toBe(true);
    expect(readStored('k', storage)).toBe('v');
    removeStored('k', storage);
    expect(readStored('k', storage)).toBeNull();
  });

  it('never throws when the browser blocks storage', () => {
    expect(readStored('k', blocked)).toBeNull();
    expect(writeStored('k', 'v', blocked)).toBe(false);
    expect(() => removeStored('k', blocked)).not.toThrow();
    expect(readStoredJson('k', blocked)).toBeUndefined();
    expect(writeStored('k', 'v', undefined)).toBe(false);
  });

  it('treats missing or corrupt JSON as absent', () => {
    const storage = memoryStorage({ good: '{"a":1}', bad: '{not json' });
    expect(readStoredJson('good', storage)).toEqual({ a: 1 });
    expect(readStoredJson('bad', storage)).toBeUndefined();
    expect(readStoredJson('missing', storage)).toBeUndefined();
  });
});

describe('saved choices', () => {
  it('accepts known tracker types and falls back to the prism', () => {
    expect(parseTrackerType('ring8')).toBe('ring8');
    expect(parseTrackerType('ring6')).toBe('ring6');
    expect(parseTrackerType('prism')).toBe('prism');
    expect(parseTrackerType(null)).toBe('prism');
    expect(parseTrackerType('ring12')).toBe('prism');
  });

  it('accepts known needle-driver ball patterns and falls back to color', () => {
    expect(parseNeedleJawPattern('white10')).toBe('white10');
    expect(parseNeedleJawPattern('striped10')).toBe('striped10');
    expect(parseNeedleJawPattern('color')).toBe('color');
    expect(parseNeedleJawPattern(null)).toBe('color');
    expect(parseNeedleJawPattern('neon')).toBe('color');
  });

  it('keeps the existing jaw storage key names', () => {
    expect(jawStorageKey(0)).toBe('suturehero.jaw-tracking.v1');
    expect(jawStorageKey(1)).toBe('suturehero.jaw-tracking.camera2.v1');
    expect(patternJawStorageKey(0, 'white10')).toBe('suturehero.jaw-tracking.v1.white10');
    expect(patternJawStorageKey(1, 'striped10')).toBe('suturehero.jaw-tracking.camera2.v1.striped10');
  });
});

describe('saved depth calibration', () => {
  it('keeps valid values', () => {
    const size = { near: {} };
    expect(parseDepthCalibration({ near: 150, far: 400, range: 600, size })).toEqual({
      near: 150,
      far: 400,
      range: 600,
      size,
    });
  });

  it('drops an out-of-range working depth', () => {
    expect(parseDepthCalibration({ range: 20 }).range).toBeUndefined();
    expect(parseDepthCalibration({ range: 5000 }).range).toBeUndefined();
    expect(parseDepthCalibration({ range: Number.NaN }).range).toBeUndefined();
  });

  it('requires a positive Near, and Far more than 20 mm beyond it', () => {
    expect(parseDepthCalibration({ near: 0, far: 400 })).toEqual({ size: undefined });
    expect(parseDepthCalibration({ near: 150, far: 165 })).toEqual({ near: 150, size: undefined });
    expect(parseDepthCalibration({ far: 400 }).far).toBeUndefined();
  });

  it('returns nothing for non-object data', () => {
    expect(parseDepthCalibration(null)).toEqual({});
    expect(parseDepthCalibration(5)).toEqual({});
  });
});
