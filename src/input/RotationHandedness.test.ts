import {expect,it} from 'vitest';
import * as THREE from 'three';
import {InstrumentCalibration} from './InstrumentCalibration';
import {rotationFrameHandedness} from './rotationFrame';
import {trackedInstrumentRotation} from './trackingFrame';
const x=new THREE.Vector3(1,0,0),y=new THREE.Vector3(0,1,0),origin=new THREE.Vector3();
function response(roll:number,invert:[boolean,boolean,boolean]){
 const c=new InstrumentCalibration();c.update('needleDriver',{rotationAxes:[2,1,0],rotationInvert:invert});
 c.transform('needleDriver',origin,new THREE.Quaternion(),0);
 const q=new THREE.Quaternion().setFromAxisAngle(y,roll);
 const before=c.transform('needleDriver',origin,q,1);
 const after=c.transform('needleDriver',origin,new THREE.Quaternion().setFromAxisAngle(x,.1).multiply(q),2);
 const handle=(rotation:THREE.Quaternion)=>new THREE.Vector3(0,0,1).applyQuaternion(trackedInstrumentRotation(rotation));
 return handle(after.quaternion).sub(handle(before.quaternion)).x;
}
it('keeps forward-tilt response in the same direction after a half turn with X/Z swapped',()=>{
 const neutral=response(0,[false,false,false]),turned=response(Math.PI,[false,false,false]);
 expect(neutral*turned,`neutral ${neutral}, rolled ${turned}`).toBeGreaterThan(0);
});
it('a companion roll inversion preserves the direction after swapping X/Z',()=>{
 const neutral=response(0,[false,true,false]),turned=response(Math.PI,[false,true,false]);
 expect(neutral*turned).toBeGreaterThan(0);
});

it('retains tilt response through all six ring orientations in both directions',()=>{
 for(const roll of [-2*Math.PI,-5*Math.PI/3,-4*Math.PI/3,-Math.PI,-2*Math.PI/3,-Math.PI/3,0,Math.PI/3,2*Math.PI/3,Math.PI,4*Math.PI/3,5*Math.PI/3,2*Math.PI]){
  expect(response(roll,[false,false,false])*response(0,[false,false,false])).toBeGreaterThan(.009);
 }
});
it('repairs a stored reflected frame while preserving both tilt directions and the instrument selection',()=>{
 const stored={needleDriver:{rotationAxes:[2,1,0],rotationInvert:[false,false,false]},forceps:{rotationAxes:[0,1,2],rotationInvert:[false,true,true]}};
 const storage={getItem:()=>JSON.stringify(stored),setItem:()=>{}};
 const c=new InstrumentCalibration(storage);
 expect(c.profile('needleDriver').rotationAxes).toEqual([2,1,0]);expect(c.profile('needleDriver').rotationInvert).toEqual([false,true,false]);
 expect(c.profile('forceps').rotationInvert).toEqual([false,true,true]);
});
it('keeps explicit roll and tilt edits effective by adjusting a different companion axis',()=>{
 const c=new InstrumentCalibration();
 c.update('needleDriver',{rotationInvert:[false,true,false]});
 expect(c.profile('needleDriver').rotationInvert).toEqual([true,true,false]);
 c.update('needleDriver',{rotationInvert:[true,true,true]});
 expect(c.profile('needleDriver').rotationInvert).toEqual([true,false,true]);
 expect(c.profile('forceps').rotationInvert).toEqual([false,false,false]);
});
it('keeps every signed permutation coherent after loading or editing, without altering movement mappings',()=>{
 const permutations=[[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]] as const;
 for(const axes of permutations)for(let bits=0;bits<8;bits++){
  const c=new InstrumentCalibration();c.update('needleDriver',{rotationAxes:[...axes],rotationInvert:[!!(bits&1),!!(bits&2),!!(bits&4)],translationInvert:[true,false,true]});
  const p=c.profile('needleDriver');expect(rotationFrameHandedness(p.rotationAxes,p.rotationInvert)).toBe(1);
  expect(p.translationInvert).toEqual([true,false,true]);
 }
});
