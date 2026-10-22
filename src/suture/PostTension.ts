import type {ThreadStrand} from './ThreadStrand';
/** Tautness of the held post beyond the collar, excluding proximal slack. */
export function postIsTaut(strand:ThreadStrand,grip:number|undefined,collar=0){
 return grip!==undefined&&grip>collar&&strand.pointAt(collar).distanceTo(strand.points[grip])>=strand.materialLengthBetween(collar,grip)*.92;
}
