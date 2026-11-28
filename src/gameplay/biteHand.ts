/**
 * Forehand and backhand bites (roadmap, 2026-11-28). For a right-handed needle driver, a bite
 * crossing the wound right to left (entry on the right, +x) is forehand; left to right is backhand
 * (Lance, 2026-11-28). Passes that do not cross the wound are not counted.
 */
export type BiteHand = 'forehand' | 'backhand';

export function biteHand(entryX: number, exitX: number): BiteHand | null {
  if (Math.sign(entryX) === Math.sign(exitX) || entryX === 0 || exitX === 0) return null;
  return entryX > 0 ? 'forehand' : 'backhand';
}

/** `leftHanded`: the view is mirrored for a left-handed surgeon, so forehand reads left to right on screen. */
export function describeBiteHands(passes: ReadonlyArray<{ entry: { x: number }; exit: { x: number } | null }>, leftHanded = false) {
  const hands = passes.filter((p) => p.exit).map((p) => biteHand(p.entry.x, p.exit!.x)).filter((h): h is BiteHand => h !== null);
  if (!hands.length) return '';
  const forehand = hands.filter((h) => h === 'forehand').length;
  const [fore, back] = leftHanded ? ['left to right', 'right to left'] : ['right to left', 'left to right'];
  return `Bites: ${forehand} forehand (${fore}) · ${hands.length - forehand} backhand (${back})`;
}
