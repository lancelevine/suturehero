import {MathUtils,Quaternion,Vector3} from 'three';
/** Render/input stabilization only; marker recognition and solver acceptance stay independent.
 * Small residuals get a light low-pass and sub-degree deadband. Deliberate moves
 * use a shorter time constant so filtering does not hide a new tilt or face.
 * The fast branch starts beyond typical small camera wobble; jitter must not
 * accelerate its own filter simply because a noisy sample is several degrees off. */
export class TrackedPoseFilter {
 readonly position=new Vector3();readonly quaternion=new Quaternion();
 private lastAt:number|undefined;
 update(position:Vector3,quaternion:Quaternion,now:number){
  if(this.lastAt===undefined||now-this.lastAt>700){this.position.copy(position);this.quaternion.copy(quaternion);this.lastAt=now;return;}
  const dt=MathUtils.clamp((now-this.lastAt)/1000,0,.1);this.lastAt=now;
  const distance=this.position.distanceTo(position),angle=this.quaternion.angleTo(quaternion);
  const deadAngle=MathUtils.degToRad(.6),deadPosition=.002;
  if(distance>deadPosition){const tau=MathUtils.lerp(.11,.025,MathUtils.smoothstep(distance,.03,.18));this.position.lerp(position,(1-Math.exp(-dt/tau))*(1-deadPosition/distance));}
  if(angle>deadAngle){const tau=MathUtils.lerp(.14,.025,MathUtils.smoothstep(angle,MathUtils.degToRad(6),MathUtils.degToRad(18)));this.quaternion.slerp(quaternion,(1-Math.exp(-dt/tau))*(1-deadAngle/angle)).normalize();}
 }
}
