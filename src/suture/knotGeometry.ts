import * as THREE from 'three';
import { tighteningPose } from './LoopTightening';
import type { GuidedKnot } from './GuidedKnot';
/** Shared assisted loop geometry keeps simulation anchors and rendering aligned. */
export function knotLoop(knot:GuidedKnot,driverWorld:THREE.Matrix4) {
  const seating=knot.phase==='seating'?knot.seating:knot.phase==='between' || knot.phase==='complete'?1:0;
  const pose=tighteningPose(driverWorld,seating);
  const center=pose.center;
  const fraction=knot.phase==='wrapping'?knot.wrap:1;
  const points:THREE.Vector3[]=[];
  if(fraction>0) {
    const steps=Math.max(2,Math.ceil(fraction*48));
    for(let i=0;i<=steps;i++) {
      const a=i/steps*fraction*Math.PI*2*knot.direction,radius=pose.radius;
      points.push(center.clone().add(new THREE.Vector3(Math.cos(a)*radius,Math.sin(a)*radius,(i/steps-0.5)*pose.pitch).applyQuaternion(pose.rotation)));
    }
  }
  return {seating,center,stage:pose.stage,radius:pose.radius,points,end:points.at(-1)?.clone()??center.clone()};
}

/** Assisted short-side routing: feed the tail into the loop as the throw seats. */
export function knotTailContact(knot:GuidedKnot,entry:THREE.Vector3,loop?:ReturnType<typeof knotLoop>) {
  if(knot.throws===0 && knot.phase==='seating' && loop?.points.length) {
    return entry.clone().lerp(loop.points[0],THREE.MathUtils.smoothstep(knot.seating,0,0.3));
  }
  const seating=knot.throws>0?1:knot.phase==='seating'?knot.seating:0;
  return entry.clone().lerp(new THREE.Vector3(0.06,0.47,0),seating);
}
