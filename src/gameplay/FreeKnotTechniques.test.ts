import {expect,it} from 'vitest';
import * as THREE from 'three';
import {Instrument} from '../instruments/Instrument';
import {FreeKnotPractice} from './FreeKnotPractice';
import type {KnotTechnique} from '../suture/KnotTechnique';
function setup(technique:KnotTechnique){
 const tools=[new Instrument('left',0),new Instrument('right',0)],model=new FreeKnotPractice();model.begin(tools,technique);
 const [left,right]=tools;
 for(let i=0;i<240;i++)model.update(1/120,tools);
 right.root.position.copy(model.short.points.at(-1)!);right.root.position.z-=.05;model.update(1/120,tools);right.openness=.1;model.update(1/120,tools);
 expect(model.gripLabel('right')).toBe('short tail');
 const moveToWork=()=>{
  const lp=left.root.position.clone(),rp=right.root.position.clone();
  for(let i=1;i<=240;i++){const t=i/240;right.root.position.copy(rp).lerp(new THREE.Vector3(0,1,-.65),t);left.root.position.copy(lp).lerp(new THREE.Vector3(-.5,1,.55),t);model.update(1/120,tools);}
 };
 const yieldWorker=()=>new Promise<void>(resolve=>setTimeout(resolve,0));
 const throwOne=async(wraps:number,direction:number)=>{
  moveToWork();
  for(let i=0;i<=480*(wraps+(model.sequence!.throws.length ? .35 : 0));i++){const a=direction*i/480*Math.PI*2;left.root.position.set(-.5*Math.cos(a),1+.5*Math.sin(a),.55);model.update(1/120,tools);if(i%120===0)await yieldWorker();}
  const start=right.root.position.clone();for(let i=1;i<=480;i++){right.root.position.copy(start);right.root.position.z+=i/480*1.6;model.update(1/120,tools);if(i%120===0)await yieldWorker();}
  const lp=left.root.position.clone(),rp=right.root.position.clone();
  for(let i=1;i<=600;i++){const t=Math.min(1,i/300);left.root.position.copy(lp);left.root.position.x-=2.3*t;right.root.position.copy(rp);right.root.position.x+=.65*t;model.update(1/120,tools);if(i%120===0)await yieldWorker();}
 };
 return {model,tools,throwOne};
}
it('retains a double surgeon first throw while an opposing single throw locks it',async()=>{
 const {model,tools,throwOne}=setup('surgeon');await throwOne(2,1);
 expect(model.sequence!.throws).toHaveLength(1);expect(model.retainedThrow.wraps).toBe(2);
 const first=model.retainedThrow;await throwOne(1,-1);
 expect(model.sequence!.locked).toBe(true);expect(model.earlierThrows).toContain(first);expect(first.phase).toBe('seated');
 tools.forEach(t=>t.openness=.7);for(let i=0;i<180;i++)model.update(1/120,tools);
 expect(model.earlierThrows[0].active).toBe(true);expect(model.long.length).toBe(3.5);
 // The finite-iteration contact solver permits small geometric strain while
 // keeping the exact material budget; the user-facing reach limit is 4%.
 expect(Math.abs(model.long.measuredLength/model.long.length-1)).toBeLessThan(.03);
 expect(model.earlierThrows[0].last-model.earlierThrows[0].first).toBeGreaterThanOrEqual(12);
},180000);
it('requires a taut short post for two same-direction throws before an opposing lock',async()=>{
 const {model,throwOne}=setup('sliding');await throwOne(1,1);
 expect(model.sequence!.throws).toHaveLength(1);expect(model.sequence!.throws[0].postHeld).toBe(true);
 await throwOne(1,1);expect(model.sequence!.throws).toHaveLength(2);expect(model.sequence!.sliding).toBe(true);
 await throwOne(1,-1);expect(model.sequence!.locked).toBe(true);expect(model.earlierThrows.every(t=>!t.sliding)).toBe(true);
},180000);
