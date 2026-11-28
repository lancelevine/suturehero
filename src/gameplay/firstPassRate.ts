/** First-pass rate (roadmap). Share of bites placed without being backed out, cancelled or undone
 * and re-bitten. Counts from the Sandbox free passes. */
export function firstPassRate(kept: number, backOuts: number, undone: number): number | null {
  const attempts = kept + backOuts + undone;
  return attempts ? kept / attempts : null;
}

export function describeFirstPass(kept: number, backOuts: number, undone: number) {
  const rate = firstPassRate(kept, backOuts, undone);
  if (rate === null) return '';
  const redo = backOuts + undone;
  return `First-pass rate ${Math.round(rate * 100)}%${redo ? ` · ${redo} bite${redo === 1 ? '' : 's'} backed out or redone` : ''}`;
}
