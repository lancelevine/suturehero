import {Quaternion,Vector3} from 'three';

/** Rotation changes smaller than this from the held pose are treated as rest noise (radians). */
export const REST_TURN_RADIANS=3*Math.PI/180;
/** Position changes smaller than this from the held pose are treated as rest noise (mm). */
export const REST_MOVE_MM=2.5;
/** While at rest, the held pose moves this fraction of the way to each new pose (averages noise over ~20 updates). */
export const REST_BLEND=.05;

/**
 * Holds a still instrument steady. Stereo poses on small 12 mm markers wobble
 * 0.5–3° per frame at rest (11/8 recording); within that band the output only
 * drifts slowly toward the average. Any larger change releases the lock at once.
 */
export class RestLock {
 private held:{position:Vector3;quaternion:Quaternion}|null=null;
 reset(){this.held=null;}
 update(position:Vector3,quaternion:Quaternion){
  const held=this.held;
  if(held&&held.quaternion.angleTo(quaternion)<REST_TURN_RADIANS&&held.position.distanceTo(position)<REST_MOVE_MM){
   held.position.lerp(position,REST_BLEND);
   held.quaternion.slerp(quaternion,REST_BLEND);
  } else this.held={position:position.clone(),quaternion:quaternion.clone()};
  return {position:this.held!.position.clone(),quaternion:this.held!.quaternion.clone()};
 }
}
