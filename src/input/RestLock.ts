import {Quaternion,Vector3} from 'three';

/** Rotation changes smaller than this from the held pose are treated as rest noise (radians). */
export const REST_TURN_RADIANS=3*Math.PI/180;
/** Position changes smaller than this from the held pose are treated as rest noise (mm). */
export const REST_MOVE_MM=2.5;
/** While at rest, the held pose moves this fraction of the way to each new pose (averages noise over ~20 updates). */
export const REST_BLEND=.05;
/**
 * Slow intentional movement (2026-11-14): a running average of the incoming
 * positions (this fraction per update, about 0.15 s at 30 updates/s) cancels
 * back-and-forth jitter but follows a steady drift. When the average is more
 * than REST_DRIFT_MM from the held pose the instrument is moving, so the lock
 * lets go. Before, slow needle-driving moved in 2.5 mm stair steps.
 */
export const DRIFT_AVERAGE_BLEND=.2;
export const REST_DRIFT_MM=.8;

/**
 * Holds a still instrument steady. Stereo poses on small 12 mm markers wobble
 * 0.5–3° per frame at rest (11/8 recording); within that band the output only
 * drifts slowly toward the average. Any larger change releases the lock at once.
 */
export class RestLock {
 private held:{position:Vector3;quaternion:Quaternion}|null=null;
 private average:Vector3|null=null;
 reset(){this.held=null;this.average=null;}
 update(position:Vector3,quaternion:Quaternion){
  const held=this.held;
  if(!this.average)this.average=position.clone();else this.average.lerp(position,DRIFT_AVERAGE_BLEND);
  const drifting=!!held&&this.average.distanceTo(held.position)>REST_DRIFT_MM;
  if(held&&!drifting&&held.quaternion.angleTo(quaternion)<REST_TURN_RADIANS&&held.position.distanceTo(position)<REST_MOVE_MM){
   held.position.lerp(position,REST_BLEND);
   held.quaternion.slerp(quaternion,REST_BLEND);
  } else this.held={position:position.clone(),quaternion:quaternion.clone()};
  return {position:this.held!.position.clone(),quaternion:this.held!.quaternion.clone()};
 }
}
