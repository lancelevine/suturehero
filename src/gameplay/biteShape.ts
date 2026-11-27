/**
 * Bite shape (roadmap "Bite shape view", 2026-11-27): a needle pass follows the needle's circular
 * curve. If the bite goes deeper than half its width at the surface, the arc is wider below the
 * skin than at it (flask-shaped), which pushes the edges up and everts them; about equal is a
 * straight-walled bite; shallower is V-shaped, which tends to invert the edges. Approximate,
 * from the pass's depth and surface entry–exit distance.
 */
export type BiteShape = 'flask' | 'straight' | 'V-shaped';

/** Depth / half-width ratios separating the shapes. */
const FLASK_RATIO = 1.1;
const V_RATIO = 0.8;

export function biteShape(depth: number, surfaceWidth: number): BiteShape {
  const ratio = depth / Math.max(1e-6, surfaceWidth / 2);
  return ratio >= FLASK_RATIO ? 'flask' : ratio >= V_RATIO ? 'straight' : 'V-shaped';
}

export function describeBiteShapes(shapes: readonly BiteShape[]) {
  if (!shapes.length) return 'Bite shape: make a pass to see its cross-section shape.';
  const count = (shape: BiteShape) => shapes.filter((s) => s === shape).length;
  const flask = count('flask');
  const tip = flask === shapes.length ? 'flask bites evert the edges' : 'go deeper than half the bite width for a flask shape that everts the edges';
  return `Bite shape: ${flask} flask · ${count('straight')} straight · ${count('V-shaped')} V-shaped · ${tip}`;
}
