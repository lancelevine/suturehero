import { describe, expect, it } from 'vitest';
import { addToGallery, GALLERY_LIMIT, galleryCaption, loadGallery } from './closureGallery';

describe('closure gallery', () => {
  it('keeps the newest entries up to the limit and survives a full storage', () => {
    const map = new Map<string, string>();
    const storage = { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v) };
    for (let i = 0; i < GALLERY_LIMIT + 3; i++) addToGallery(storage, { at: `2026-11-${String(i + 1).padStart(2, '0')}T10:00:00Z`, image: 'data:x', met: i % 4, total: 6 });
    const list = loadGallery(storage);
    expect(list).toHaveLength(GALLERY_LIMIT);
    expect(list[0].at.startsWith('2026-11-15')).toBe(true);
    expect(galleryCaption(list[0])).toBe('2026-11-15 · 2/6 targets');
    let writes = 0;
    const full = { getItem: () => JSON.stringify(list), setItem: () => { if (++writes < 3) throw new Error('quota'); } };
    expect(addToGallery(full, { at: 'x', image: 'y', met: 0, total: 0 }).length).toBe(GALLERY_LIMIT - 2);
  });
});
