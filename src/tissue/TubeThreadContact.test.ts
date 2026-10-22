import {expect,it} from 'vitest';
import * as THREE from 'three';
import {tubeThreadContact} from './TubeThreadContact';
import {MICRO_TARGETS} from '../environments/MicroTargets';
import {SutureModel} from '../suture/SutureModel';
import {Instrument} from '../instruments/Instrument';
import {NeedleGrasp} from '../suture/NeedleGrasp';
import {PracticeSession} from '../gameplay/PracticeSession';
import {REST_COMMAND} from '../input/InstrumentControls';
it('keeps thread below the vessel center on its underside instead of lifting it to the top',()=>{
 const p=new THREE.Vector3(1,-.2,.2),old=new THREE.Vector3(1,-.31,.3),contact=tubeThreadContact(MICRO_TARGETS.artery);
 contact([p],[old],new Set());expect(p.y).toBeLessThan(0);expect(Math.hypot(p.y-.01,p.z)).toBeCloseTo(.41,5);
 const pin=p.clone();contact([p],[old],new Set([0]));expect(p.equals(pin)).toBe(true);
});
it('allows thread inside the lumen and separates contact at the cut face axially',()=>{
 const inside=new THREE.Vector3(.3,.01,.1),face=new THREE.Vector3(.151,.37,0),old=face.clone();
 tubeThreadContact(MICRO_TARGETS.artery)([inside,face],[inside.clone(),old],new Set());
 expect(inside.z).toBe(.1);expect(face.x).toBeLessThan(.15);expect(face.y).toBe(.37);
});
it('settles the actual initial microsurgery thread without idle hopping',()=>{
 for(const target of ['artery','small-artery','nerve'] as const){
  const needle=new SutureModel(),tools=[new Instrument('left',0),new Instrument('right',0)],session=new PracticeSession({sample:()=>REST_COMMAND,dispose:()=>{}},tools,new NeedleGrasp(needle));
  session.setEnvironment('microsurgery',target);let largest=0;
  for(let i=0;i<960;i++){
   const before=needle.strand.points.map(p=>p.clone());session.update(1/120);
   if(i>=840)largest=Math.max(largest,...needle.strand.points.map((p,j)=>p.distanceTo(before[j])));
  }
  expect(largest).toBeLessThan(.002);
 }
},30000);
it('settles free-tying spans in the microsurgery environments at startup',()=>{
 for(const target of ['artery','small-artery','nerve'] as const){
  const tools=[new Instrument('left',0),new Instrument('right',0)],session=new PracticeSession({sample:()=>REST_COMMAND,dispose:()=>{}},tools);
  session.setEnvironment('microsurgery',target);session.beginFreeTying('auto');const model=session.freeKnot;let largest=0;
  for(let i=0;i<720;i++){
   const before=model.strands.map(s=>s.points.map(p=>p.clone()));session.update(1/120);
   if(i>600)largest=Math.max(largest,...model.strands.flatMap((s,k)=>s.points.map((p,j)=>p.distanceTo(before[k][j]))));
  }
  expect(largest).toBeLessThan(.002);
 }
},30000);
