/** Working span sets sensitivity, not an absolute near/far movement gate.
 * Clip only the final workspace position, after relative depth is anchored. */
export function mapMonocularDepth(distanceMm:number,nearMm:number,spanMm:number,sensitivity:number){
 return (-2.3+(distanceMm-nearMm)/Math.max(50,spanMm)*4.6)*sensitivity;
}

/** Virtual depth range: the near end sits at −DEPTH_HALF_SPAN, the far end at +DEPTH_HALF_SPAN (scene units). */
const DEPTH_HALF_SPAN=2.3;

/** Virtual Z where each instrument rests while its depth is locked (scene units). */
export const LOCKED_DEPTH_Z={needleDriver:-.65,forceps:.15,scissors:1.05} as const;

/**
 * Target virtual Z for a single-camera distance: from the Near/Far size
 * calibration when it applies (`calibratedFraction`, 0 = near … 1 = far),
 * else from the working span.
 */
export function desiredDepthZ(distanceMm:number,nearMm:number,spanMm:number,sensitivity:number,calibratedFraction:number|null){
 if(calibratedFraction===null)return mapMonocularDepth(distanceMm,nearMm,spanMm,sensitivity);
 return (-DEPTH_HALF_SPAN+calibratedFraction*2*DEPTH_HALF_SPAN)*sensitivity;
}

/** Changes larger than this (scene units) follow quickly when the stable-depth filter is off. */
const LARGE_DEPTH_STEP=.12;
/**
 * Simple depth smoothing used when the stable-depth filter is off: large
 * changes follow at 65% per update, small ones at 25%.
 */
export function smoothDepthZ(previousZ:number|undefined,desiredZ:number){
 if(previousZ===undefined)return desiredZ;
 const delta=desiredZ-previousZ;
 return previousZ+delta*(Math.abs(delta)>LARGE_DEPTH_STEP?.65:.25);
}

/**
 * Virtual X/Y from where the marker sits in the image, perspective-corrected
 * by its distance and scaled to the working depth (camera right → scene X,
 * camera up → scene Y). Clamped to the virtual workspace.
 */
export function cameraPlaneXY(center:{x:number;y:number},width:number,height:number,distanceMm:number,focalPx:number,nearMm:number,spanMm:number){
 const reference=Math.max(nearMm+spanMm*.5,1);
 const x=Math.min(2.6,Math.max(-2.6,-((center.x-width/2)*distanceMm/focalPx)/reference*7));
 const y=Math.min(2.8,Math.max(.15,-((center.y-height/2)*distanceMm/focalPx)/reference*4+.55));
 return {x,y};
}
