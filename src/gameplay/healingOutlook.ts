/** Healing outlook (roadmap: "Healing time-lapse", first step). An illustrative description of the
 * likely scar from what the closure review already measures: edges meeting, eversion, level edges,
 * overlap or gaps, and even spacing. Teaching feedback only; not a clinical prediction. */
export interface OutlookInput { reviews: ReadonlyArray<readonly string[]>; spacingMm: readonly number[] }

const has = (review: readonly string[], text: string) => review.some((line) => line.includes(text));

export function healingOutlook({ reviews, spacingMm }: OutlookInput) {
  if (!reviews.length) return null;
  const issues: string[] = [];
  const count = (text: string) => reviews.filter((r) => has(r, text)).length;
  if (count('gap open') || count('Small gap')) issues.push('gaps may heal wider');
  if (count('inverted')) issues.push('inverted edges leave a sunken line');
  if (count('edge higher')) issues.push('uneven edges may leave a step');
  if (count('overlap')) issues.push('overlapping edges may heal ridged');
  const spread = spacingMm.length > 1 ? Math.max(...spacingMm) - Math.min(...spacingMm) : 0;
  if (spread > 2) issues.push('uneven spacing may pucker');
  const everted = count('Edges everted');
  const outlook = !issues.length ? (everted === reviews.length ? 'a fine, flat line' : 'a fine line') : issues.length === 1 ? 'mostly fine' : 'a more visible scar';
  return { outlook, issues };
}

export function describeHealingOutlook(input: OutlookInput) {
  const result = healingOutlook(input);
  if (!result) return '';
  return `Healing outlook (illustrative, not clinical): ${result.outlook}${result.issues.length ? ' · ' + result.issues.join(', ') : ''}`;
}
