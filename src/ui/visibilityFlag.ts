/**
 * Whether an element is currently shown (2026-11-27), tracked by an IntersectionObserver so
 * per-frame code can skip hidden diagnostics without reading layout (reading `offsetParent`
 * forces a synchronous layout). Where IntersectionObserver is missing, always visible.
 */
export function visibilityFlag(element: Element | null): () => boolean {
  if (!element || typeof IntersectionObserver === 'undefined') return () => !!element;
  let visible = false;
  new IntersectionObserver((entries) => {
    for (const entry of entries) visible = entry.isIntersecting;
  }).observe(element);
  return () => visible;
}
