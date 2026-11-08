import {MathUtils,Quaternion,Vector3} from 'three';

/** Stabilizes calibrated stereo measurements before the render filter. */
export class StereoPoseFilter {
 readonly position=new Vector3();
 readonly quaternion=new Quaternion();
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
  const positionDeadband=.006,rotationDeadband=MathUtils.degToRad(1);
  const acceptedDistance=this.position.distanceTo(target),acceptedAngle=this.quaternion.angleTo(targetQuaternion);
  if(acceptedDistance>positionDeadband)this.position.lerp(target,(1-Math.exp(-dt/.28))*(1-positionDeadband/acceptedDistance));
  if(acceptedAngle>rotationDeadband)this.quaternion.slerp(targetQuaternion,(1-Math.exp(-dt/.24))*(1-rotationDeadband/acceptedAngle)).normalize();
  this.lastAt=at;return true;
 }

 private reset(position:Vector3,quaternion:Quaternion,at:number){
  this.position.copy(position);this.quaternion.copy(quaternion);this.lastAt=at;this.pending=undefined;
 }
}
