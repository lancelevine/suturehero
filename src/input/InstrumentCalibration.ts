import * as THREE from 'three';
import {BALL_INSTRUMENTS,type BallInstrumentName} from './ballTrackingSlots';
export type Axis=0|1|2;
export interface CalibrationProfile {
 movementGain:number;rotationGain:number;translationAxes:[Axis,Axis,Axis];rotationAxes:[Axis,Axis,Axis];
 translationInvert:[boolean,boolean,boolean];rotationInvert:[boolean,boolean,boolean];
 mountingDegrees:[number,number,number];tipOffset:[number,number,number];depthLock:boolean;jawInverted:boolean;
}
export const defaultCalibration=():CalibrationProfile=>({movementGain:1,rotationGain:1,translationAxes:[0,1,2],rotationAxes:[0,1,2],translationInvert:[false,false,false],rotationInvert:[false,false,false],mountingDegrees:[0,0,0],tipOffset:[0,0,0],depthLock:true,jawInverted:false});
const KEY='suturehero.instrument-calibration.v1';
type StorageLike=Pick<Storage,'getItem'|'setItem'>;
type Pose={position:THREE.Vector3;quaternion:THREE.Quaternion};
type Session={origin:THREE.Vector3;anchor:THREE.Vector3;last:Pose;base:THREE.Vector3;rotation:THREE.Quaternion;unwrappedRotation:THREE.Vector3;neutralQuaternion:THREE.Quaternion;seenAt:number};
function validProfile(value:unknown):CalibrationProfile{
 const d=defaultCalibration(),v=value as Partial<CalibrationProfile>|null;if(!v||typeof v!=='object')return d;
 for(const key of ['movementGain','rotationGain'] as const)if(typeof v[key]==='number'&&Number.isFinite(v[key]))d[key]=THREE.MathUtils.clamp(v[key]!,key==='movementGain'?.1:.1,key==='movementGain'?4:3);
 for(const key of ['translationAxes','rotationAxes'] as const){const a=v[key];if(Array.isArray(a)&&a.length===3&&new Set(a).size===3&&a.every(n=>[0,1,2].includes(n)))d[key]=[...a] as [Axis,Axis,Axis];}
 for(const key of ['translationInvert','rotationInvert'] as const){const a=v[key];if(Array.isArray(a)&&a.length===3&&a.every(n=>typeof n==='boolean'))d[key]=[...a];}
 for(const key of ['mountingDegrees','tipOffset'] as const){const a=v[key];if(Array.isArray(a)&&a.length===3&&a.every(Number.isFinite))d[key]=a.map(n=>THREE.MathUtils.clamp(n,key==='tipOffset'?-2:-180,key==='tipOffset'?2:180)) as [number,number,number];}
 for(const key of ['depthLock','jawInverted'] as const)if(typeof v[key]==='boolean')d[key]=v[key]!;
 return d;
}
export class InstrumentCalibration {
 private profiles=new Map<BallInstrumentName,CalibrationProfile>(BALL_INSTRUMENTS.map(n=>[n,defaultCalibration()]));
 private sessions=new Map<BallInstrumentName,Session>();
 private listeners=new Set<(name:BallInstrumentName,reason:'profile'|'neutral'|'reset')=>void>();
 constructor(private storage?:StorageLike){try{const data=JSON.parse(storage?.getItem(KEY)??'{}');for(const n of BALL_INSTRUMENTS)this.profiles.set(n,validProfile(data?.[n]));}catch{/* Invalid/blocked storage keeps safe defaults. */}}
 profile(name:BallInstrumentName){return structuredClone(this.profiles.get(name)!);}
 subscribe(listener:(name:BallInstrumentName,reason:'profile'|'neutral'|'reset')=>void){this.listeners.add(listener);return ()=>this.listeners.delete(listener);}
 private notify(name:BallInstrumentName,reason:'profile'|'neutral'|'reset'){for(const listener of this.listeners)listener(name,reason);}
 update(name:BallInstrumentName,change:Partial<CalibrationProfile>){
  const s=this.sessions.get(name);if(s){s.origin.copy(s.last.position);s.anchor.copy(s.base);}
  this.profiles.set(name,validProfile({...this.profiles.get(name),...change}));this.notify(name,'profile');
 }
 save(name?:BallInstrumentName){if(!this.storage)return false;try{let saved:Record<string,unknown>={};try{const raw=JSON.parse(this.storage.getItem(KEY)??'{}');if(raw&&typeof raw==='object'&&!Array.isArray(raw))saved=raw;}catch{}this.storage.setItem(KEY,JSON.stringify(name?{...saved,[name]:this.profile(name)}:Object.fromEntries(this.profiles)));return true;}catch{return false;}}
 reset(name:BallInstrumentName){this.update(name,defaultCalibration());this.captureNeutral(name);}
 hasFreshPose(name:BallInstrumentName,now=performance.now()){const s=this.sessions.get(name);return !!s&&now-s.seenAt<700;}
 captureNeutral(name:BallInstrumentName,now=performance.now()){
  const s=this.sessions.get(name);if(!s||now-s.seenAt>=700)return false;
  const tip=new THREE.Vector3(...this.profiles.get(name)!.tipOffset);
  s.base.add(tip.clone().applyQuaternion(s.rotation).sub(tip));
  s.origin.copy(s.last.position);s.anchor.copy(s.base);s.neutralQuaternion.copy(s.last.quaternion);s.unwrappedRotation.set(0,0,0);s.rotation.identity();this.notify(name,'neutral');return true;
 }
 clearSessions(){for(const n of BALL_INSTRUMENTS){this.sessions.delete(n);this.notify(n,'reset');}}
 transform(name:BallInstrumentName,position:THREE.Vector3,quaternion:THREE.Quaternion,now=performance.now(),metricDepth=false):Pose{
  const p=this.profiles.get(name)!;let s=this.sessions.get(name);
  if(!s){s={origin:position.clone(),anchor:position.clone(),last:{position:position.clone(),quaternion:quaternion.clone()},base:position.clone(),rotation:new THREE.Quaternion(),unwrappedRotation:new THREE.Vector3(),neutralQuaternion:quaternion.clone(),seenAt:now};this.sessions.set(name,s);}
  // Derive rotation from the neutral pose rather than integrating frame errors.
  // Select the equivalent axis-angle branch nearest the previous unwrapped
  // measurement, preserving continuous turns at fractional rotation gains.
  const relative=s.neutralQuaternion.clone().invert().multiply(quaternion).normalize();
  if(relative.w<0)relative.set(-relative.x,-relative.y,-relative.z,-relative.w);
  const axis=new THREE.Vector3(relative.x,relative.y,relative.z);
  const sinHalf=axis.length(),previous=s.unwrappedRotation;
  const unwrapped=new THREE.Vector3();
  if(sinHalf>1e-8){
   axis.multiplyScalar(1/sinHalf);
   const angle=2*Math.atan2(sinHalf,relative.w);
   const turns=Math.round((previous.dot(axis)-angle)/(2*Math.PI));
   let best=Infinity;
   for(let k=turns-1;k<=turns+1;k++){
    const candidate=axis.clone().multiplyScalar(angle+2*Math.PI*k);
    const distance=candidate.distanceToSquared(previous);
    if(distance<best){best=distance;unwrapped.copy(candidate);}
   }
  }else if(previous.lengthSq()>1e-12){
   // At precisely one full turn the quaternion has no measurable axis;
   // retain the nearest continuous winding rather than snapping to zero.
   unwrapped.copy(previous).normalize().multiplyScalar(2*Math.PI*Math.round(previous.length()/(2*Math.PI)));
  }
  previous.copy(unwrapped);
  const a=unwrapped.toArray();
  unwrapped.set(...p.rotationAxes.map((axis,i)=>a[axis]*(p.rotationInvert[i]?-1:1)*p.rotationGain) as [number,number,number]);
  const angle=unwrapped.length();
  s.rotation.identity();
  if(angle>1e-10)s.rotation.setFromAxisAngle(unwrapped.multiplyScalar(1/angle),angle);
  const movement=position.clone().sub(s.origin).toArray();
  s.base.copy(s.anchor).add(new THREE.Vector3(...p.translationAxes.map((axis,i)=>movement[axis]*(p.translationInvert[i]?-1:1)*p.movementGain) as [number,number,number]));
  if(p.depthLock&&!metricDepth)s.base.z=s.anchor.z;
  const mount=new THREE.Quaternion().setFromEuler(new THREE.Euler(...p.mountingDegrees.map(THREE.MathUtils.degToRad) as [number,number,number],'XYZ'));
  const rotation=s.rotation.clone().multiply(mount).normalize();
  const output=s.base.clone().add(new THREE.Vector3(...p.tipOffset).applyQuaternion(s.rotation));
  s.last.position.copy(position);s.last.quaternion.copy(quaternion);s.seenAt=now;
  return {position:output,quaternion:rotation};
 }
 /** Rotation observed from neutral before axis remapping. */
 rawNeutralRotation(name:BallInstrumentName,now=performance.now()):THREE.Vector3|null{
  const s=this.sessions.get(name);if(!s||now-s.seenAt>=700)return null;
  const q=s.neutralQuaternion.clone().invert().multiply(s.last.quaternion).normalize();
  if(q.w<0)q.set(-q.x,-q.y,-q.z,-q.w);
  const v=new THREE.Vector3(q.x,q.y,q.z),length=v.length();
  if(length<1e-8)return new THREE.Vector3();
  return v.multiplyScalar(2*Math.atan2(length,q.w)/length);
 }
 opening(name:BallInstrumentName,value:number){return this.profiles.get(name)!.jawInverted?1-value:value;}
}
function browserStorage(){try{return typeof window==='undefined'?undefined:window.localStorage;}catch{return undefined;}}
export const instrumentCalibration=new InstrumentCalibration(browserStorage());
