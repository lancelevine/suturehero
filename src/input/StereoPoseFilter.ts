import {MathUtils,Quaternion,Vector3} from 'three';

/**
 * Smoothing time constants (s). Was a fixed 0.28 s / 0.24 s, which made
 * moving instruments trail by about a third of a second ("slow motion",
 * Lance's 11/14 recording). Now speed-adaptive: more smoothing while
 * nearly still (jitter shows), light while moving (lag shows).
 */
export const STILL_POSITION_TAU_S=.12;
export const STILL_ROTATION_TAU_S=.24;
export const MOVING_TAU_S=.02;
/** Smoothed speed below SLOW uses the still smoothing, above FAST the moving one (practice units/s; 1 unit = 200 mm, so 16–60 mm/s). */
export const SLOW_SPEED=.08,FAST_SPEED=.3;
/** Same for rotation (degrees/s). */
export const SLOW_TURN_DEG_S=20,FAST_TURN_DEG_S=45;
/** Velocity averaging time (s): back-and-forth jitter cancels in the average, real movement does not. */
export const VELOCITY_TAU_S=.15;

/** Stabilizes calibrated stereo measurements before the render filter. */
export class StereoPoseFilter {
 readonly position=new Vector3();
 readonly quaternion=new Quaternion();
 private readonly velocity=new Vector3();
 private readonly angularVelocity=new Vector3();
 private previousTarget:{position:Vector3;quaternion:Quaternion}|undefined;
 private lastAt:number|undefined;
 private pending:{position:Vector3;quaternion:Quaternion;count:number}|undefined;

 update(position:Vector3,quaternion:Quaternion,at:number){
  if(this.lastAt===undefined||at-this.lastAt>700){this.reset(position,quaternion,at);return true;}
  if(at<=this.lastAt)return false;
  const dt=MathUtils.clamp((at-this.lastAt)/1000,0,.2),distance=this.position.distanceTo(position),angle=this.quaternion.angleTo(quaternion);
  const discontinuity=distance>.08+dt*3||angle>MathUtils.degToRad(25);
  if(discontinuity){
   const consistent=this.pending&&this.pending.position.distanceTo(position)<.12&&this.pending.quaternion.angleTo(quaternion)<MathUtils.degToRad(15);
   this.pending=consistent?{position:position.clone(),quaternion:quaternion.clone(),count:this.pending!.count+1}:{position:position.clone(),quaternion:quaternion.clone(),count:1};
   this.lastAt=at;
   if(this.pending.count<3)return false;
  }else this.pending=undefined;
  const target=this.pending?.position??position,targetQuaternion=this.pending?.quaternion??quaternion;
  this.pending=undefined;
  this.updateVelocity(target,targetQuaternion,dt);
  const positionTau=MathUtils.lerp(STILL_POSITION_TAU_S,MOVING_TAU_S,MathUtils.smoothstep(this.velocity.length(),SLOW_SPEED,FAST_SPEED));
  const rotationTau=MathUtils.lerp(STILL_ROTATION_TAU_S,MOVING_TAU_S,MathUtils.smoothstep(MathUtils.radToDeg(this.angularVelocity.length()),SLOW_TURN_DEG_S,FAST_TURN_DEG_S));
  const positionDeadband=.006,rotationDeadband=MathUtils.degToRad(1);
  const acceptedDistance=this.position.distanceTo(target),acceptedAngle=this.quaternion.angleTo(targetQuaternion);
  if(acceptedDistance>positionDeadband)this.position.lerp(target,(1-Math.exp(-dt/positionTau))*(1-positionDeadband/acceptedDistance));
  if(acceptedAngle>rotationDeadband)this.quaternion.slerp(targetQuaternion,(1-Math.exp(-dt/rotationTau))*(1-rotationDeadband/acceptedAngle)).normalize();
  this.lastAt=at;return true;
 }

 /** Averaged linear and angular velocity of the accepted measurements (jitter cancels). */
 private updateVelocity(position:Vector3,quaternion:Quaternion,dt:number){
  const previous=this.previousTarget;
  this.previousTarget={position:position.clone(),quaternion:quaternion.clone()};
  if(!previous||dt<=0)return;
  const blend=1-Math.exp(-dt/VELOCITY_TAU_S);
  this.velocity.lerp(position.clone().sub(previous.position).divideScalar(dt),blend);
  const step=previous.quaternion.clone().invert().multiply(quaternion).normalize();
  if(step.w<0)step.set(-step.x,-step.y,-step.z,-step.w);
  const sinHalf=Math.hypot(step.x,step.y,step.z),angle=2*Math.atan2(sinHalf,step.w);
  const rotationVector=sinHalf>1e-9?new Vector3(step.x,step.y,step.z).multiplyScalar(angle/sinHalf/dt):new Vector3();
  this.angularVelocity.lerp(rotationVector,blend);
 }

 private reset(position:Vector3,quaternion:Quaternion,at:number){
  this.position.copy(position);this.quaternion.copy(quaternion);this.lastAt=at;this.pending=undefined;
  this.velocity.set(0,0,0);this.angularVelocity.set(0,0,0);this.previousTarget={position:position.clone(),quaternion:quaternion.clone()};
 }
}
