import * as THREE from 'three';
import {NEEDLE_RADIUS} from '../suture/needleGeometry';
import {TISSUE_LAYERS} from './anatomy';
/** A shallow circular bite preserves the needle's radius, with its lowest
 * point inside the bottom of the dermis rather than in subcutaneous fat. */
export const TRACT_SURFACE=0.43;
export const TRACT_BOTTOM=TISSUE_LAYERS.dermis.bottom+0.01;
export const TRACT_CENTER_Y=TRACT_BOTTOM+NEEDLE_RADIUS;
export const TRACT_START=Math.asin((TRACT_CENTER_Y-TRACT_SURFACE)/NEEDLE_RADIUS);
export const TRACT_SWEEP=Math.PI-2*TRACT_START;
export const TRACT_HALF_WIDTH=NEEDLE_RADIUS*Math.cos(TRACT_START);
export const tractEntry=()=>new THREE.Vector3(TRACT_HALF_WIDTH,TRACT_SURFACE,0);
export const tractExit=()=>new THREE.Vector3(-TRACT_HALF_WIDTH,TRACT_SURFACE,0);
export function tissueTractPoints(entry:THREE.Vector3,exit:THREE.Vector3,count=33){
 return Array.from({length:count},(_,i)=>{
  const angle=TRACT_START+i/(count-1)*TRACT_SWEEP;
  const t=(Math.cos(TRACT_START)-Math.cos(angle))/(2*Math.cos(TRACT_START));
  const point=entry.clone().lerp(exit,t);
  point.y+=TRACT_CENTER_Y-NEEDLE_RADIUS*Math.sin(angle)-TRACT_SURFACE;
  return point;
 });
}
