/** Stay tension that shapes the lumen (roadmap). Stay suture pull changes the vessel's cross-section:
 * slack stays let the front and back walls sag towards each other (a flatter lumen, back-wall catch
 * risk); taut stays hold it round, a clear opening (the default). Illustrative shape factors. */
export const SLACK_HEIGHT = 0.8;
/** No widening: a taut stay keeps the vessel's normal round section (the default before this setting existed). */
export const TAUT_WIDTH = 1;
/** Below this the stays count as slack. */
export const SLACK_BELOW = 0.35;

/** Cross-section scale (height, width) for a stay tension in [0, 1]. */
export function stayShape(tension: number) {
  const t = Math.min(1, Math.max(0, tension));
  return { height: SLACK_HEIGHT + (1 - SLACK_HEIGHT) * t, width: 1 + (TAUT_WIDTH - 1) * t };
}

export function describeStayTension(tension: number) {
  if (tension < SLACK_BELOW) return 'Stays slack · the walls sag together · easy to catch the back wall';
  return '';
}
