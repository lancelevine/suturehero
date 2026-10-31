import {expect,it} from 'vitest';
import * as THREE from 'three';
import {InstrumentCalibration,trackerTipDistanceMm} from './InstrumentCalibration';
const q=(angle=0)=>new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),angle),v=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
it('maps movement per instrument without applying another instrument’s settings',()=>{
 const c=new InstrumentCalibration();c.update('forceps',{depthLock:false,movementGain:2,translationAxes:[1,0,2],translationInvert:[true,false,false]});
 c.transform('forceps',v(),q(),0);c.transform('needleDriver',v(),q(),0);
 expect(c.transform('forceps',v(1,2,3),q(),1).position.toArray()).toEqual([-4,3.1,6]);
 expect(c.transform('needleDriver',v(1,2,3),q(),1).position.toArray()).toEqual([1,2.55,0]);
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
 expect(c.transform('forceps',v(0,0,2),q(),1,true).position.z).toBe(2);
 c.clearSessions();c.transform('forceps',v(),q(),2);
 expect(c.transform('forceps',v(0,0,2),q(),3).position.z).toBe(0);
});

it('applies measured tracker-to-tip distances along the instrument shaft and rotates them about the ring',()=>{
 expect(trackerTipDistanceMm.needleDriver).toBe(55);
 expect(trackerTipDistanceMm.forceps).toBe(110);
 for(const [name,distance] of [['needleDriver',.55],['forceps',1.1]] as const){
  const c=new InstrumentCalibration();
  const initial=c.transform(name,v(),q(),0);
  expect(initial.position.distanceTo(v(0,distance,0))).toBeLessThan(1e-8);
  const rotated=c.transform(name,v(),q(Math.PI/2),1);
  expect(rotated.position.distanceTo(v(0,distance,0))).toBeLessThan(1e-8);
  expect(rotated.quaternion.angleTo(q(Math.PI/2))).toBeLessThan(1e-8);
 }
});
