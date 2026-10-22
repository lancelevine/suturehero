import * as THREE from 'three';
import { tighteningPose } from './LoopTightening';
import type { GuidedKnot } from './GuidedKnot';
export const SEATED_LOOP_LENGTH=96*0.06*Math.sin(Math.PI/48);
/** Shared assisted loop geometry keeps simulation anchors and rendering aligned. */
export function knotLoop(knot:GuidedKnot,driverWorld:THREE.Matrix4) {
  const seating=knot.phase==='seating'?knot.seating:knot.phase==='between' || knot.phase==='complete'?1:0;
  const pose=tighteningPose(driverWorld,seating);
  const center=pose.center;
  const fraction=knot.phase==='wrapping'?knot.wrap:1;
  // The forceps orbit begins at -X and advances clockwise for the first throw.
  // Grow a helix behind that moving grip; even zero wrap retains its contact point.
  const points:THREE.Vector3[]=[];
  const steps=Math.max(1,Math.ceil(fraction*48*knot.wraps));
  const startAngle=Math.PI*(1-THREE.MathUtils.smoothstep(seating,0.3,1));
  for(let i=0;i<=(fraction>0?steps:0);i++) {
    const turn=fraction*i/steps;
    const a=startAngle-turn*Math.PI*2*knot.direction*knot.wraps;
    points.push(center.clone().add(new THREE.Vector3(Math.cos(a)*pose.radius,Math.sin(a)*pose.radius,(turn-0.5)*pose.pitch).applyQuaternion(pose.rotation)));
  }
  let length=0;
  for(let i=1;i<points.length;i++)length+=points[i-1].distanceTo(points[i]);
  return {seating,center,stage:pose.stage,radius:pose.radius,length,points,end:points.at(-1)?.clone()??center.clone()};
}

/** Assisted short-side routing: feed the tail into the loop as the throw seats. */
export function knotTailContact(knot:GuidedKnot,entry:THREE.Vector3,loop?:ReturnType<typeof knotLoop>) {
  if(knot.phase==='seating' && loop?.points.length) {
    const base=knot.throws>0?new THREE.Vector3(0.06,0.47,0):entry.clone();
    return base.lerp(loop.points[0],THREE.MathUtils.smoothstep(knot.seating,0,0.3));
  }
  const seating=knot.throws>0?1:knot.phase==='seating'?knot.seating:0;
  return entry.clone().lerp(new THREE.Vector3(0.06,0.47,0),seating);
}
