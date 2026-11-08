import {MathUtils,Quaternion,Vector3} from 'three';
/** Render/input stabilization only; marker recognition and solver acceptance stay independent.
 * Small residuals get a light low-pass and sub-degree deadband. Deliberate moves
 * use a shorter time constant so filtering does not hide a new tilt or face.
 * The fast branch starts beyond typical small camera wobble; jitter must not
 * accelerate its own filter simply because a noisy sample is several degrees off. */
/** Rotation smoothing cutoff when still (Hz) and its increase per °/s of turning. */
const MIN_CUTOFF_HZ=1;
const CUTOFF_PER_DEG_S=.1;
/** Time constant for the angular-velocity estimate (s). */
const VELOCITY_TAU_S=.5;
export class TrackedPoseFilter {
 readonly position=new Vector3();readonly quaternion=new Quaternion();
 private lastAt:number|undefined;
 // Speed-adaptive rotation smoothing (One Euro style): smoothed angular
 // velocity as a vector, so back-and-forth jitter averages out while a real
 // turn accumulates. Faster turns get less smoothing, so slow steady turns no
 // longer trail behind by the 140 ms small-error time constant.
 private readonly rawQuaternion=new Quaternion();
 private readonly angularVelocity=new Vector3();
 update(position:Vector3,quaternion:Quaternion,now:number){
  if(this.lastAt===undefined||now-this.lastAt>700){this.position.copy(position);this.quaternion.copy(quaternion);this.rawQuaternion.copy(quaternion);this.angularVelocity.set(0,0,0);this.lastAt=now;return;}
  const dt=MathUtils.clamp((now-this.lastAt)/1000,0,.1);this.lastAt=now;
  const distance=this.position.distanceTo(position),angle=this.quaternion.angleTo(quaternion);
  const deadAngle=MathUtils.degToRad(.6),deadPosition=.002;
  if(distance>deadPosition){const tau=MathUtils.lerp(.11,.025,MathUtils.smoothstep(distance,.03,.18));this.position.lerp(position,(1-Math.exp(-dt/tau))*(1-deadPosition/distance));}
  if(dt>0){
   const step=this.rawQuaternion.clone().invert().premultiply(quaternion);if(step.w<0){step.x=-step.x;step.y=-step.y;step.z=-step.z;step.w=-step.w;}
   const stepAngle=2*Math.acos(MathUtils.clamp(step.w,-1,1)),sin=Math.sqrt(Math.max(0,1-step.w*step.w));
   const raw=sin>1e-6?new Vector3(step.x/sin,step.y/sin,step.z/sin).multiplyScalar(stepAngle/dt):new Vector3();
   this.angularVelocity.lerp(raw,1-Math.exp(-dt/VELOCITY_TAU_S));
  }
  this.rawQuaternion.copy(quaternion);
  const speedDegPerS=MathUtils.radToDeg(this.angularVelocity.length());
  const speedTau=1/(2*Math.PI*(MIN_CUTOFF_HZ+CUTOFF_PER_DEG_S*speedDegPerS));
  if(angle>deadAngle){const tau=Math.min(speedTau,MathUtils.lerp(.14,.025,MathUtils.smoothstep(angle,MathUtils.degToRad(6),MathUtils.degToRad(18))));this.quaternion.slerp(quaternion,(1-Math.exp(-dt/tau))*(1-deadAngle/angle)).normalize();}
 }
}
