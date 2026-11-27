/**
 * `document.querySelector` for per-frame code (2026-11-27): remembers each element and looks it
 * up again only once it has left the page (e.g. its panel was re-rendered), so a render loop
 * does not search the DOM dozens of times a frame.
 */
export function cachedQuery(root: Pick<Document, 'querySelector'> = document) {
  const cache = new Map<string, Element | null>();
  return function query<E extends Element = Element>(selector: string): E | null {
    const cached = cache.get(selector);
    if (cached?.isConnected) return cached as E;
    const found = root.querySelector<E>(selector);
    cache.set(selector, found);
    return found;
  };
}
