import {expect,it} from 'vitest';
import * as THREE from 'three';
import {FreeThrow} from './FreeThrow';
import {TailPassage} from './TailPassage';
import {ThreadStrand} from './ThreadStrand';
import {resolveStrandPair} from './StrandPairContact';
const v=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);
function fixture(){
 const long=new ThreadStrand(2.1,64),short=new ThreadStrand(1.2,40),passage=new TailPassage(),throwModel=new FreeThrow();
 const circle=Array.from({length:48},(_,i)=>{const a=Math.PI+i/47*Math.PI*1.9;return v(0.1*Math.cos(a),0.65+0.1*Math.sin(a),0.45);});
 long.reset([v(-0.3,0.43,0),...circle,v(-0.55,0.65,0.55)]);
 short.reset([v(0.3,0.43,0),v(0,0.65,0.2),v(0,0.65,0.35)]);
 const driver=new THREE.Matrix4().makeTranslation(0,0.65,0);
 for(let i=0;i<64;i++){
  const a=Math.PI+(i-20)/19*Math.PI*1.9;
  const target=i>=20&&i<=39?v(.1*Math.cos(a),.65+.1*Math.sin(a),.45):v(-.3-(i/63)*.25,.65,.2);
  long.applyContactCorrection(i,target.sub(long.points[i]));
 }
 passage.update(long.points,short.points.at(-1)!,driver,true);
 short.reset([v(0.3,0.43,0),v(0,0.65,0.35),v(0,0.65,0.9)]);
 passage.update(long.points,short.points.at(-1)!,driver,true);
 return {long,short,passage,throwModel,driver};
}
it('requires a real tail passage and clearance from the driver before retaining a throw',()=>{
 const f=fixture();expect(f.passage.passage).toBeDefined();
 f.throwModel.update(1/120,f.passage,f.long,f.short,f.driver,63,39);expect(f.throwModel.phase).toBe('passed');
 f.driver.makeTranslation(0,0.65,1.2);
 f.throwModel.update(1/120,f.passage,f.long,f.short,f.driver,63,39);expect(f.throwModel.phase).toBe('retained');
 const empty=new FreeThrow();empty.update(1/120,new TailPassage(),f.long,f.short,f.driver,63,39);expect(empty.phase).toBe('idle');
});
it('tightens actual loop material under opposed endpoint motion, conserves length and holds on release',()=>{
 const f=fixture();f.driver.makeTranslation(0,0.65,1.2);
 f.throwModel.update(1/120,f.passage,f.long,f.short,f.driver,63,39);
 const longEnd=f.long.points.at(-1)!.clone(),shortEnd=f.short.points.at(-1)!.clone();
 const step=(i:number,held=true)=>{
  const t=Math.min(1,i/240),lp=new Map([[0,v(-0.3,0.43,0)]]),sp=new Map([[0,v(0.3,0.43,0)]]);
  if(held){lp.set(63,longEnd.clone().add(v(-t*0.5,0,0)));sp.set(39,shortEnd.clone().add(v(t*0.4,0,0)));}
  f.long.advance(1/120,lp,()=>0.423);f.short.advance(1/120,sp,()=>0.423);
  f.throwModel.update(1/120,f.passage,f.long,f.short,f.driver,held?63:undefined,held?39:undefined);
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
 const f=fixture();f.driver.makeTranslation(0,0.65,1.2);f.throwModel.update(1/120,f.passage,f.long,f.short,f.driver,63,39);
 const original=f.throwModel.last-f.throwModel.first;
 for(let i=0;i<60;i++){
  for(const p of [...f.long.points,...f.short.points])p.x+=0.01;
  f.throwModel.update(1/120,f.passage,f.long,f.short,f.driver,63,39);
 }
 expect(f.throwModel.last-f.throwModel.first).toBe(original);
 f.long.points[63].x-=1;f.throwModel.update(1/120,f.passage,f.long,f.short,f.driver,63,undefined);expect(f.throwModel.last-f.throwModel.first).toBe(original);
 f.throwModel.reset();expect(f.throwModel.active).toBe(false);
});
