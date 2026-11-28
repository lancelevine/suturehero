/**
 * Back-wall catch alert (roadmap, 2026-11-27): during an anastomosis, a vessel bite whose needle
 * arc dips through the lumen to the opposite (back) wall would sew the vessel shut. The guided pass
 * is a circle of `radius` about `centreY`; the back wall's inner surface is at
 * vessel centre − inner radius. Scene units; approximate.
 */
/** `lumenHeight`: share of the round lumen height left when slack stays let the walls sag (tissue/stayTension.ts). */
export function catchesBackWall(pass: { centreY: number; radius: number }, vessel: { centerY: number; innerRadius: number }, lumenHeight = 1) {
  return pass.centreY - pass.radius <= vessel.centerY - vessel.innerRadius * lumenHeight;
}

export const BACK_WALL_WARNING = 'Back wall caught: this bite reaches the opposite vessel wall · take a shallower bite through the front wall only';
