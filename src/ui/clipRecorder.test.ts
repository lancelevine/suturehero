import { describe, expect, it } from 'vitest';
import { clipFileName, clipMimeType, wrapLines } from './clipRecorder';

describe('clip recorder', () => {
  it('picks the first supported WebM type and names the file by time', () => {
    expect(clipMimeType((t) => t === 'video/webm;codecs=vp8')).toBe('video/webm;codecs=vp8');
    expect(clipMimeType(() => false)).toBeNull();
    expect(clipFileName(new Date('2026-11-28T10:20:30Z'))).toBe('suturehero-clip-2026-11-28-10-20-30.webm');
  });

  it('wraps overlay text to the width', () => {
    expect(wrapLines('one two three four', 9, (s) => s.length)).toEqual(['one two', 'three', 'four']);
    expect(wrapLines('', 9, (s) => s.length)).toEqual([]);
  });
});
