/** Skin that relaxes under load (roadmap). Skin is viscoelastic: the tension a tied stitch holds
 * fades over a minute or two toward a floor (creep / stress relaxation). Illustrative constants. */
export const RELAXED_FLOOR = 0.75;
/** Time constant of the relaxation (s). */
export const RELAX_SECONDS = 60;

/** Share of its tied tension a stitch still holds `ageSeconds` after tying. */
export function relaxation(ageSeconds: number) {
  const age = Math.max(0, ageSeconds);
  return RELAXED_FLOOR + (1 - RELAXED_FLOOR) * Math.exp(-age / RELAX_SECONDS);
}

/** Tracks when each stitch (by position along the wound) was tied. */
export class StitchAges {
  private tiedAt = new Map<string, number>();
  private key = (siteZ: number) => siteZ.toFixed(4);
  /** Relaxation factor per site, recording new sites as tied `now`; forgets removed ones. */
  factors(siteZs: readonly number[], now: number) {
    const keep = new Set(siteZs.map(this.key));
    for (const k of [...this.tiedAt.keys()]) if (!keep.has(k)) this.tiedAt.delete(k);
    return siteZs.map((z) => {
      const k = this.key(z);
      if (!this.tiedAt.has(k)) this.tiedAt.set(k, now);
      return relaxation(now - this.tiedAt.get(k)!);
    });
  }
}
