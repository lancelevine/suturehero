import {expect,it} from 'vitest';
import * as THREE from 'three';
import {trackedInstrumentRotation} from './trackingFrame';
import {InstrumentCalibration,trackerTipDistanceMm} from './InstrumentCalibration';
const q=(angle=0)=>new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),angle),v=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
it('maps movement per instrument without applying another instrument’s settings',()=>{
 const c=new InstrumentCalibration();c.update('forceps',{depthLock:false,movementGain:2,translationAxes:[1,0,2],translationInvert:[true,false,false]});
 c.transform('forceps',v(),q(),0);c.transform('needleDriver',v(),q(),0);
 expect(c.transform('forceps',v(1,2,3),q(),1).position.distanceTo(v(-4,.9,6))).toBeLessThan(1e-9);
 expect(c.transform('needleDriver',v(1,2,3),q(),1).position.toArray()).toEqual([1,1.45,0]);
});
it('sets neutral without a translation jump and resets orientation at the current physical pose',()=>{
 const c=new InstrumentCalibration();c.update('forceps',{depthLock:false});c.transform('forceps',v(),q(),0);
 const before=c.transform('forceps',v(1,2,3),q(.7),10);expect(c.captureNeutral('forceps',11)).toBe(true);
 const after=c.transform('forceps',v(1,2,3),q(.7),12);expect(after.position.distanceTo(before.position)).toBeLessThan(1e-10);expect(after.quaternion.angleTo(q())).toBeLessThan(1e-8);
 expect(c.captureNeutral('forceps',1000)).toBe(false);
});
it('reanchors sensitivity edits and preserves continuous turns without return-to-neutral drift',()=>{
 const c=new InstrumentCalibration();c.transform('forceps',v(),q(),0);const before=c.transform('forceps',v(1,0,0),q(),1);
 c.update('forceps',{movementGain:2,rotationGain:.5});expect(c.transform('forceps',v(1,0,0),q(),2).position.equals(before.position)).toBe(true);
 expect(c.transform('forceps',v(1.5,0,0),q(),3).position.x).toBe(2);
 let result=c.transform('forceps',v(),q(),4);
 for(let i=1;i<=160;i++)result=c.transform('forceps',v(),q(i*.05),5+i);
 expect(result.quaternion.angleTo(q(4))).toBeLessThan(1e-7);
 // Reverse the entire motion: neutral must be recovered despite fractional gain.
 for(let i=159;i>=0;i--)result=c.transform('forceps',v(),q(i*.05),166+(160-i));
 expect(result.quaternion.angleTo(q())).toBeLessThan(1e-7);
});
it('applies mounting offsets, marker-frame tip offsets and jaw inversion independently',()=>{
 const c=new InstrumentCalibration();c.update('scissors',{mountingDegrees:[0,0,90],tipOffset:[1,0,0],jawInverted:true});
 const result=c.transform('scissors',v(),q(),0);expect(result.position.distanceTo(v(1,0,0))).toBeLessThan(1e-8);
 expect(c.opening('scissors',.2)).toBe(.8);expect(c.opening('forceps',.2)).toBe(.2);
});
it('saves validated profiles, handles malformed/blocked storage and keeps neutral session data ephemeral',()=>{
 const data=new Map<string,string>(),storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,value:string)=>{data.set(k,value);}};
 const c=new InstrumentCalibration(storage);c.update('forceps',{movementGain:2,rotationGain:.5});c.transform('forceps',v(),q(),0);expect(c.save()).toBe(true);
 const restored=new InstrumentCalibration(storage);expect(restored.profile('forceps').movementGain).toBe(2);expect(restored.hasFreshPose('forceps',0)).toBe(false);
 const invalid=new InstrumentCalibration({getItem:()=>'{broken',setItem:()=>{throw Error();}});expect(invalid.profile('forceps').movementGain).toBe(1);expect(invalid.save()).toBe(false);
 expect(new InstrumentCalibration().save()).toBe(false);
 c.update('forceps',{movementGain:NaN,translationAxes:[0,0,2]});expect(c.profile('forceps').translationAxes).toEqual([0,1,2]);expect(c.profile('forceps').movementGain).toBe(1);
});
it('saves only the selected instrument when another profile still has unsaved edits',()=>{
 const data=new Map<string,string>(),storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,value:string)=>{data.set(k,value);}};
 const c=new InstrumentCalibration(storage);c.update('forceps',{movementGain:2});c.update('needleDriver',{movementGain:3});expect(c.save('forceps')).toBe(true);
 const restored=new InstrumentCalibration(storage);expect(restored.profile('forceps').movementGain).toBe(2);expect(restored.profile('needleDriver').movementGain).toBe(1);
});

it('keeps a calibrated tip in place when resetting neutral or changing model mounting orientation',()=>{
 const c=new InstrumentCalibration();c.update('forceps',{depthLock:false,tipOffset:[1,0,0]});c.transform('forceps',v(),q(),0);
 const before=c.transform('forceps',v(1,2,3),q(.8),10);expect(c.captureNeutral('forceps',11)).toBe(true);
 const after=c.transform('forceps',v(1,2,3),q(.8),12);expect(after.position.distanceTo(before.position)).toBeLessThan(1e-8);
 c.update('forceps',{mountingDegrees:[180,0,0]});expect(c.transform('forceps',v(1,2,3),q(.8),13).position.distanceTo(after.position)).toBeLessThan(1e-8);
});
it('keeps metric stereo depth available while the mono depth lock is enabled',()=>{
 const c=new InstrumentCalibration();c.transform('forceps',v(),q(),0,true);
 expect(c.transform('forceps',v(0,0,2),q(),1,true).position.z).toBe(2);expect(c.preview('forceps',1)!.depthLocked).toBe(false);
 c.clearSessions();c.transform('forceps',v(),q(),2);
 expect(c.transform('forceps',v(0,0,2),q(),3).position.z).toBe(0);expect(c.preview('forceps',3)!.depthLocked).toBe(true);
});

it('applies measured tracker-to-tip distances along the instrument shaft and rotates them about the ring',()=>{
 expect(trackerTipDistanceMm.needleDriver).toBe(55);
 expect(trackerTipDistanceMm.forceps).toBe(110);
 for(const [name,distance] of [['needleDriver',.55],['forceps',1.1]] as const){
  const c=new InstrumentCalibration();
  const initial=c.transform(name,v(),q(),0);
  expect(initial.position.distanceTo(v(0,-distance,0))).toBeLessThan(1e-8);
  const rotated=c.transform(name,v(),q(Math.PI/2),1);
  expect(rotated.position.distanceTo(v(0,-distance,0))).toBeLessThan(1e-8);
  expect(rotated.quaternion.angleTo(q(Math.PI/2))).toBeLessThan(1e-8);
 }
});

it('provides independent, defensive preview snapshots matching the mapped output',()=>{
 const c=new InstrumentCalibration();expect(c.preview('forceps',0)).toBeNull();
 c.update('forceps',{depthLock:false,movementGain:2,rotationGain:.5,translationAxes:[1,0,2],translationInvert:[true,false,false]});
 c.transform('forceps',v(),q(),0);const output=c.transform('forceps',v(1,2,3),q(.4),10),preview=c.preview('forceps',11)!;
 expect(preview.position.distanceTo(output.position)).toBeLessThan(1e-8);expect(preview.quaternion.angleTo(output.quaternion)).toBeLessThan(1e-8);
 expect(preview.rawMovement.toArray()).toEqual([1,2,3]);expect(preview.mappedRotation.y).toBeCloseTo(.2);
 expect(c.preview('needleDriver',11)).toBeNull();preview.position.set(99,99,99);expect(c.preview('forceps',12)!.position.distanceTo(output.position)).toBeLessThan(1e-8);
 expect(c.preview('forceps',1000)).toBeNull();
});
it('recenters preview readings on neutral without changing the tracked tip position',()=>{
 const c=new InstrumentCalibration();c.update('forceps',{depthLock:false});c.transform('forceps',v(),q(),0);const output=c.transform('forceps',v(1,2,3),q(.4),10);
 c.captureNeutral('forceps',11);c.transform('forceps',v(1,2,3),q(.4),12);const preview=c.preview('forceps',13)!;
 expect(preview.rawMovement.length()).toBeLessThan(1e-8);expect(preview.movement.length()).toBeLessThan(1e-8);expect(preview.rawRotation.length()).toBeLessThan(1e-8);expect(preview.position.distanceTo(output.position)).toBeLessThan(1e-8);
 c.clearSessions();expect(c.preview('forceps',14)).toBeNull();
});
it('places the preview marker at the calibrated tracker center through turns, mounting edits and neutral resets',()=>{
 const c=new InstrumentCalibration();c.update('needleDriver',{depthLock:false,tipOffset:[.1,.2,-.05],mountingDegrees:[25,0,90]});
 c.transform('needleDriver',v(),q(),0);
 for(const angle of [.4,.8]){
  c.transform('needleDriver',v(.3,.2,.1),q(angle),10);
  const s=c.preview('needleDriver',10)!;
  expect(s.markerMovement.clone().add(v(.1,-.35,-.05).applyQuaternion(s.markerRotation)).distanceTo(s.movement)).toBeLessThan(1e-9);
  expect(s.observedAt).toBe(10);
 }
 c.captureNeutral('needleDriver',11);c.transform('needleDriver',v(.3,.2,.1),q(.8),12);
 const s=c.preview('needleDriver',12)!;
 expect(s.markerMovement.clone().add(v(.1,-.35,-.05).applyQuaternion(s.markerRotation)).distanceTo(s.movement)).toBeLessThan(1e-9);
});

it('keeps the tracker 55 mm behind the tip toward the handle through pitch and roll',()=>{
 const c=new InstrumentCalibration();c.transform('needleDriver',v(),new THREE.Quaternion(),0);
 for(const axis of [v(1,0,0),v(0,1,0),v(0,0,1)])for(const angle of [0,.4,Math.PI/2,-Math.PI/2]){
  const rotation=new THREE.Quaternion().setFromAxisAngle(axis,angle);
  const output=c.transform('needleDriver',v(),rotation,10);
  const preview=c.preview('needleDriver',10)!;
  const towardHandle=v(0,0,1).applyQuaternion(trackedInstrumentRotation(output.quaternion));
  const tipToMarker=preview.markerMovement.clone().sub(preview.movement);
  expect(tipToMarker.length()).toBeCloseTo(.55,9);
  expect(tipToMarker.clone().normalize().dot(towardHandle)).toBeCloseTo(1,9);
  expect(output.position.clone().add(towardHandle.multiplyScalar(.55)).length()).toBeLessThan(1e-9);
 }
});
