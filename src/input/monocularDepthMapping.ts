/** Working span sets sensitivity, not an absolute near/far movement gate.
 * Clip only the final workspace position, after relative depth is anchored. */
export function mapMonocularDepth(distanceMm:number,nearMm:number,spanMm:number,sensitivity:number){
 return (-2.3+(distanceMm-nearMm)/Math.max(50,spanMm)*4.6)*sensitivity;
}
