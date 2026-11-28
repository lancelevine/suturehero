/** Langer's lines (roadmap: "Body sites with different skin"). Skin tension lines run in a typical
 * direction at each site; a wound along them heals finer, one across them gapes and scars wider.
 * Angle (degrees) between the lines and this practice wound, which runs along z. Illustrative values
 * chosen to give each preset a different case, not anatomical measurements. */
export const LANGER_ANGLE_DEG: Record<string, number> = { forearm: 10, face: 30, scalp: 0, hand: 60, fragile: 15, back: 80 };
/** Wounds more than this far off the lines count as running across them. */
export const ACROSS_DEG = 45;

export function langerAngle(siteId: string | undefined) {
  return siteId === undefined ? null : LANGER_ANGLE_DEG[siteId] ?? null;
}

export function describeLanger(angleDeg: number | null) {
  if (angleDeg === null) return '';
  return angleDeg > ACROSS_DEG ? `Wound runs across Langer's lines (${angleDeg}°): it gapes more and may scar wider` : `Wound runs along Langer's lines (${angleDeg}° off)`;
}
