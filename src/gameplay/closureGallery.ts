/** Closure gallery (roadmap). A small top-down snapshot of each saved Sandbox closure with its date
 * and targets met, kept in this browser (newest first, at most GALLERY_LIMIT) to see progress. */
export const GALLERY_KEY = 'suturehero.closureGallery.v1';
export const GALLERY_LIMIT = 12;

export interface GalleryEntry { at: string; image: string; met: number; total: number }
type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;

export function loadGallery(storage: Storage | null): GalleryEntry[] {
  try {
    const list = JSON.parse(storage?.getItem(GALLERY_KEY) ?? '[]');
    return Array.isArray(list) ? list.filter((e) => e && typeof e.image === 'string' && typeof e.at === 'string') : [];
  } catch { return []; }
}

/** Adds an entry; drops the oldest beyond the limit, and more if the browser's storage is full. */
export function addToGallery(storage: Storage | null, entry: GalleryEntry) {
  let list = [entry, ...loadGallery(storage)].slice(0, GALLERY_LIMIT);
  while (list.length) {
    try { storage?.setItem(GALLERY_KEY, JSON.stringify(list)); return list; } catch { list = list.slice(0, -1); }
  }
  return list;
}

export function galleryCaption(entry: GalleryEntry) {
  return `${entry.at.slice(0, 10)} · ${entry.met}/${entry.total} targets`;
}
