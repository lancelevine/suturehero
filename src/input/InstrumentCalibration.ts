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
type Session={origin:THREE.Vector3;anchor:THREE.Vector3;last:Pose;base:THREE.Vector3;rotation:THREE.Quaternion;seenAt:number};
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
  s.origin.copy(s.last.position);s.anchor.copy(s.base);s.rotation.identity();this.notify(name,'neutral');return true;
 }
 clearSessions(){for(const n of BALL_INSTRUMENTS){this.sessions.delete(n);this.notify(n,'reset');}}
 transform(name:BallInstrumentName,position:THREE.Vector3,quaternion:THREE.Quaternion,now=performance.now(),metricDepth=false):Pose{
  const p=this.profiles.get(name)!;let s=this.sessions.get(name);
  if(!s){s={origin:position.clone(),anchor:position.clone(),last:{position:position.clone(),quaternion:quaternion.clone()},base:position.clone(),rotation:new THREE.Quaternion(),seenAt:now};this.sessions.set(name,s);}
  const delta=s.last.quaternion.clone().invert().multiply(quaternion).normalize();
  if(delta.w<0)delta.set(-delta.x,-delta.y,-delta.z,-delta.w);
  const v=new THREE.Vector3(delta.x,delta.y,delta.z),length=v.length();
  if(length>1e-10){v.multiplyScalar(2*Math.atan2(length,delta.w)/length);const a=v.toArray();v.set(...p.rotationAxes.map((axis,i)=>a[axis]*(p.rotationInvert[i]?-1:1)*p.rotationGain) as [number,number,number]);const angle=v.length();if(angle>1e-10)s.rotation.multiply(new THREE.Quaternion().setFromAxisAngle(v.multiplyScalar(1/angle),angle)).normalize();}
  const movement=position.clone().sub(s.origin).toArray();
  s.base.copy(s.anchor).add(new THREE.Vector3(...p.translationAxes.map((axis,i)=>movement[axis]*(p.translationInvert[i]?-1:1)*p.movementGain) as [number,number,number]));
  if(p.depthLock&&!metricDepth)s.base.z=s.anchor.z;
  const mount=new THREE.Quaternion().setFromEuler(new THREE.Euler(...p.mountingDegrees.map(THREE.MathUtils.degToRad) as [number,number,number],'XYZ'));
  const rotation=s.rotation.clone().multiply(mount).normalize();
  const output=s.base.clone().add(new THREE.Vector3(...p.tipOffset).applyQuaternion(s.rotation));
  s.last.position.copy(position);s.last.quaternion.copy(quaternion);s.seenAt=now;
  return {position:output,quaternion:rotation};
 }
 opening(name:BallInstrumentName,value:number){return this.profiles.get(name)!.jawInverted?1-value:value;}
}
function browserStorage(){try{return typeof window==='undefined'?undefined:window.localStorage;}catch{return undefined;}}
export const instrumentCalibration=new InstrumentCalibration(browserStorage());
