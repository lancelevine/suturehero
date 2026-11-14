/**
 * Layout for two live camera views in one panel: stacked or side by side,
 * whichever shows the images larger (Lance, 2026-11-14: "take up as much
 * space as possible, but both still visible at once"). Each view keeps its
 * camera's proportions.
 */

/** Space between the two views (px), matching the CSS gap. */
export const FEED_GAP_PX = 3;

export interface DualFeedLayout {
  arrangement: 'stacked' | 'side-by-side';
  /** Width of each view (px). */
  feedWidth: number;
}

/**
 * Best layout for two views with aspect ratios (width / height) `first` and
 * `second` in an area `width` × `height` px.
 */
export function dualFeedLayout(width: number, height: number, first: number, second: number): DualFeedLayout {
  const available = (value: number) => Math.max(0, value);
  // Stacked: one width, the two heights (width / ratio) share the height.
  const stackedWidth = Math.min(available(width), available(height - FEED_GAP_PX) / (1 / first + 1 / second));
  // Side by side: each gets half the width, and the taller (narrower) image must fit the height.
  const sideWidth = Math.min(available(width - FEED_GAP_PX) / 2, available(height) * Math.min(first, second));
  return sideWidth > stackedWidth ? { arrangement: 'side-by-side', feedWidth: sideWidth } : { arrangement: 'stacked', feedWidth: stackedWidth };
}
