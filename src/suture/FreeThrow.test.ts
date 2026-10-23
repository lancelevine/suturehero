import {expect,it} from 'vitest';
import * as THREE from 'three';
import {Instrument} from '../instruments/Instrument';
import {InstrumentThreadContact} from './InstrumentThreadContact';
import {FreeThrow} from './FreeThrow';
import {TailPassage} from './TailPassage';
import {ThreadStrand} from './ThreadStrand';
import {resolveStrandPair} from './StrandPairContact';
const v=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);
function fixture(turns=1){
 const long=new ThreadStrand(2.1,64),short=new ThreadStrand(1.2,40),passage=new TailPassage(),throwModel=new FreeThrow();
 const circle=Array.from({length:48},(_,i)=>{const a=Math.PI+i/47*Math.PI*1.9;return v(0.1*Math.cos(a),0.65+0.1*Math.sin(a),0.45);});
 long.reset([v(-0.3,0.43,0),...circle,v(-0.55,0.65,0.55)]);
 short.reset([v(0.3,0.43,0),v(0,0.65,0.2),v(0,0.65,0.35)]);
 const driver=new THREE.Matrix4().makeTranslation(0,0.65,0);
 for(let i=0;i<64;i++){
  const a=Math.PI+(i-20)/19*Math.PI*(turns*2-.1);
  const target=i>=20&&i<=39?v(.1*Math.cos(a),.65+.1*Math.sin(a),.45):v(-.3-(i/63)*.25,.65,.2);
  long.applyContactCorrection(i,target.sub(long.points[i]));
 }
 passage.update(long.points,short.points.at(-1)!,driver,true);
 short.reset([v(0.3,0.43,0),v(0,0.65,0.35),v(0,0.65,0.9)]);
 passage.update(long.points,short.points.at(-1)!,driver,true);
 const tool=new Instrument('right',0),contact=new InstrumentThreadContact();
 const supportsLoop=(points:readonly THREE.Vector3[],normal:THREE.Vector3)=>{
  driver.decompose(tool.root.position,tool.root.quaternion,tool.root.scale);contact.configure([tool]);
  return contact.supportsOpening(tool.id,points,normal);
 };
 return {long,short,passage,throwModel,driver,supportsLoop};
}
it('requires a real tail passage and clearance from the driver before retaining a throw',()=>{
 const f=fixture();expect(f.passage.passage).toBeDefined();
 f.throwModel.update(1/120,f.passage,f.long,f.short,f.supportsLoop,63,39);expect(f.throwModel.phase).toBe('passed');
 f.driver.makeTranslation(0,0.65,1.2);
 f.throwModel.update(1/120,f.passage,f.long,f.short,f.supportsLoop,63,39);expect(f.throwModel.phase).toBe('retained');
 const empty=new FreeThrow();empty.update(1/120,new TailPassage(),f.long,f.short,f.supportsLoop,63,39);expect(empty.phase).toBe('idle');
});
it('gently preserves a passed material bight on the driver, without attaching or compacting it, and cancels on release',()=>{
 const f=fixture();f.throwModel.update(1/120,f.passage,f.long,f.short,f.supportsLoop,63,39);
 const first=f.throwModel.first,last=f.throwModel.last,gap=f.long.points[first].distanceTo(f.long.points[last]),before=f.long.points.map(p=>p.clone()),short=f.short.points.map(p=>p.clone());
 const lp=new Map([[0,f.long.points[0]]]),sp=new Map([[0,f.short.points[0]]]);
 for(let i=0;i<60;i++){
  f.throwModel.update(1/120,f.passage,f.long,f.short,f.supportsLoop,63,39);
  for(let j=0;j<8;j++)f.throwModel.resolve(f.long,f.short,lp,sp);
 }
 expect(f.throwModel.phase).toBe('passed');expect(f.throwModel.active).toBe(false);
 expect(f.long.points[first].distanceTo(f.long.points[last])).toBeLessThan(gap);
 for(let i=first+1;i<last;i++)expect(f.long.points[i].distanceTo(before[i])).toBe(0);
 f.short.points.forEach((p,i)=>expect(p.distanceTo(short[i])).toBe(0));
 f.throwModel.update(1/120,f.passage,f.long,f.short,f.supportsLoop,63,undefined);
 const released=f.long.points.map(p=>p.clone());f.throwModel.resolve(f.long,f.short,lp,sp);
 expect(f.throwModel.phase).toBe('idle');f.long.points.forEach((p,i)=>expect(p.distanceTo(released[i])).toBe(0));
});
it('captures a passed loop leaving diagonally without waiting for its bounding box to clear the driver',()=>{
 const f=fixture();f.throwModel.update(1/120,f.passage,f.long,f.short,f.supportsLoop,63,39);
 expect(f.throwModel.phase).toBe('passed');
 for(let i=f.throwModel.first;i<=f.throwModel.last;i++){
  const a=Math.PI+(i-20)/19*Math.PI*1.9;
  f.long.applyContactCorrection(i,v(.15+.04*Math.cos(a),.65+.12*Math.sin(a),.45).sub(f.long.points[i]));
 }
 f.short.reset([v(.3,.43,0),v(.15,.65,.35),v(0,.65,.9)]);
 f.throwModel.update(1/120,f.passage,f.long,f.short,f.supportsLoop,63,39);
 expect(f.throwModel.phase).toBe('retained');
});
it('does not attach a departed loop to nearby short material that no longer passes through it',()=>{
 const f=fixture();f.throwModel.update(1/120,f.passage,f.long,f.short,f.supportsLoop,63,39);
 expect(f.throwModel.phase).toBe('passed');
 // A nearby parallel span used to satisfy the center-distance test, despite
 // the entire short strand being on one side of the opening.
 f.short.reset([v(.3,.65,.55),v(0,.65,.55),v(0,.65,.9)]);f.driver.makeTranslation(0,.65,1.2);
 f.throwModel.update(1/120,f.passage,f.long,f.short,f.supportsLoop,63,39);
 expect(f.throwModel.phase).toBe('idle');expect(f.throwModel.lastFailure).toContain('Loop slipped off');
 expect(f.passage.passage).toBeUndefined();
});
it.each([1,2])('follows a rotating %i-turn material loop before the driver slips out',turns=>{
 const f=fixture(turns);f.throwModel.update(1/120,f.passage,f.long,f.short,f.supportsLoop,63,39);
 expect(f.throwModel.phase).toBe('passed');expect(f.throwModel.wraps).toBe(turns);
 const center=v(0,.65,.45),rotate=new THREE.Matrix4().makeTranslation(...center.toArray()).multiply(new THREE.Matrix4().makeRotationY(Math.PI/24)).multiply(new THREE.Matrix4().makeTranslation(...center.clone().negate().toArray()));
 for(let i=0;i<12;i++){
  for(const strand of [f.long,f.short])for(let j=0;j<strand.count;j++)strand.applyContactCorrection(j,strand.points[j].clone().applyMatrix4(rotate).sub(strand.points[j]));
  f.driver.premultiply(rotate);f.throwModel.update(1/120,f.passage,f.long,f.short,f.supportsLoop,63,39);
  expect(f.throwModel.phase).toBe('passed');
 }
 f.driver.setPosition(3,3,3);f.throwModel.update(1/120,f.passage,f.long,f.short,f.supportsLoop,63,39);
 expect(f.throwModel.phase).toBe('retained');
});
it('tightens actual loop material under opposed endpoint motion, conserves length and holds on release',()=>{
 const f=fixture();f.driver.makeTranslation(0,0.65,1.2);
 f.throwModel.update(1/120,f.passage,f.long,f.short,f.supportsLoop,63,39);
 const longEnd=f.long.points.at(-1)!.clone(),shortEnd=f.short.points.at(-1)!.clone();
 const step=(i:number,held=true)=>{
  const t=Math.min(1,i/240),lp=new Map([[0,v(-0.3,0.43,0)]]),sp=new Map([[0,v(0.3,0.43,0)]]);
  if(held){lp.set(63,longEnd.clone().add(v(-t*0.5,0,0)));sp.set(39,shortEnd.clone().add(v(t*0.4,0,0)));}
  f.long.advance(1/120,lp,()=>0.423);f.short.advance(1/120,sp,()=>0.423);
  f.throwModel.update(1/120,f.passage,f.long,f.short,f.supportsLoop,held?63:undefined,held?39:undefined);
  for(let j=0;j<8;j++){f.throwModel.resolve(f.long,f.short,lp,sp);f.long.projectContacts(lp,()=>0.423,undefined,j%2!==0);f.short.projectContacts(sp,()=>0.423,undefined,j%2!==0);resolveStrandPair(f.long,f.short,lp,sp,f.long.points.map(p=>p.clone()),f.short.points.map(p=>p.clone()));}
 };
 for(let i=0;i<480;i++)step(i);
 expect(f.throwModel.phase).toBe('seated');expect(f.throwModel.tightness).toBe(1);
 expect(f.long.length).toBe(2.1);expect(f.short.length).toBe(1.2);
 expect(f.long.measuredLength).toBeCloseTo(2.1,1);expect(f.short.measuredLength).toBeCloseTo(1.2,1);
 const coordinate=f.throwModel.shortMaterialCoordinate;
 for(let i=0;i<360;i++)step(i,false);
 expect(f.throwModel.phase).toBe('seated');expect(f.throwModel.shortMaterialCoordinate).toBe(coordinate);
 expect(f.long.points[f.throwModel.first].distanceTo(f.long.points[f.throwModel.last])).toBeLessThan(0.045);
 expect([...f.long.points,...f.short.points].every(p=>p.toArray().every(Number.isFinite))).toBe(true);
});
it('does not tighten from rigid movement or a single held end, and resets retention',()=>{
 const f=fixture();f.driver.makeTranslation(0,0.65,1.2);f.throwModel.update(1/120,f.passage,f.long,f.short,f.supportsLoop,63,39);
 const original=f.throwModel.last-f.throwModel.first;
 for(let i=0;i<60;i++){
  for(const p of [...f.long.points,...f.short.points])p.x+=0.01;
  f.throwModel.update(1/120,f.passage,f.long,f.short,f.supportsLoop,63,39);
 }
 expect(f.throwModel.last-f.throwModel.first).toBe(original);
 f.long.points[63].x-=1;f.throwModel.update(1/120,f.passage,f.long,f.short,f.supportsLoop,63,undefined);expect(f.throwModel.last-f.throwModel.first).toBe(original);
 f.throwModel.reset();expect(f.throwModel.active).toBe(false);
});
it('explains driver clearance and a released tail, then clears the retry notice',()=>{
 const f=fixture();f.throwModel.update(1/120,f.passage,f.long,f.short,f.supportsLoop,63,39);
 expect(f.throwModel.phase).toBe('passed');expect(f.throwModel.instruction).toContain('driver working tip');
 f.throwModel.update(1/120,f.passage,f.long,f.short,f.supportsLoop,63,undefined);
 expect(f.throwModel.phase).toBe('idle');expect(f.throwModel.instruction).toContain('Short tail released');
 expect(f.passage.passage).toBeUndefined();
 for(let i=0;i<65;i++)f.throwModel.update(.05,f.passage,f.long,f.short,f.supportsLoop,63,undefined);
 expect(f.throwModel.lastFailure).toBe('');
});
it('explains when the held tail moves back out before driver clearance',()=>{
 const f=fixture();f.throwModel.update(1/120,f.passage,f.long,f.short,f.supportsLoop,63,39);
 f.short.points.at(-1)!.z=.2;f.throwModel.update(1/120,f.passage,f.long,f.short,f.supportsLoop,63,39);
 expect(f.throwModel.phase).toBe('idle');expect(f.throwModel.instruction).toContain('Tail moved back out');
 expect(f.throwModel.active).toBe(false);
});
it('rearms capture after an unusable crossing so a corrected wrap works without resetting practice',()=>{
 const f=fixture(),observer=new TailPassage(),model=new FreeThrow();
 for(let i=0;i<f.long.count;i++){
  const a=i/19*Math.PI*1.9,target=i<20?v(.1*Math.cos(a),.65+.1*Math.sin(a),.45):v(-.6-i*.005,.65,.2);
  f.long.applyContactCorrection(i,target.sub(f.long.points[i]));
 }
 observer.update(f.long.points,v(0,.65,.35),f.driver,true,0,0);
 observer.update(f.long.points,v(0,.65,.9),f.driver,true,0,0);
 expect(observer.passage?.first).toBe(0);
 model.update(1/120,observer,f.long,f.short,f.supportsLoop,63,39);
 expect(model.phase).toBe('idle');expect(model.instruction).toContain('Leave free working thread');
 expect(observer.passage).toBeUndefined();
 const corrected=fixture();f.long.points.forEach((p,i)=>p.copy(corrected.long.points[i]));
 observer.update(f.long.points,v(0,.65,.35),f.driver,true,0,0);
 observer.update(f.long.points,v(0,.65,.9),f.driver,true,0,0);
 model.update(1/120,observer,f.long,f.short,f.supportsLoop,63,39);
 expect(model.phase).toBe('passed');expect(model.first).toBeGreaterThan(0);
});
it.each([1/60,1/120])('gently engages provisional contact during the first tenth of a second (dt %f)',dt=>{
 const f=fixture();f.throwModel.update(dt,f.passage,f.long,f.short,f.supportsLoop,63,39);
 for(let i=0;i<Math.round(.1/dt);i++)f.throwModel.update(dt,f.passage,f.long,f.short,f.supportsLoop,63,39);
 expect(f.throwModel.phase).toBe('passed');
 const before=f.long.points.map(p=>p.clone());
 f.throwModel.resolve(f.long,f.short,new Map([[0,f.long.points[0]]]),new Map([[0,f.short.points[0]]]));
 const largest=Math.max(...f.long.points.map((p,i)=>p.distanceTo(before[i])));
 expect(largest).toBeGreaterThan(0);expect(largest).toBeLessThan(f.long.restLength*.03);
});
it('exposes the actual provisional post for cut protection before driver clearance',()=>{
 const f=fixture();f.throwModel.update(1/120,f.passage,f.long,f.short,f.supportsLoop,63,39);
 expect(f.throwModel.phase).toBe('passed');expect(f.throwModel.protectedPostCoordinate).toBeGreaterThan(1);
 expect(f.throwModel.protectedPostCoordinate).toBeLessThan(f.short.count-1);
 f.throwModel.reset();expect(f.throwModel.protectedPostCoordinate).toBe(0);
});
