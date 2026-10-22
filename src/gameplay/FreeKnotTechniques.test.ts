import type {FreeThrow} from '../suture/FreeThrow';
import {expect,it} from 'vitest';
import * as THREE from 'three';
import {createFreeTyingFixture as setup} from './test-support/freeTying';
it('retains a double surgeon first throw while an opposing single throw locks it',async()=>{
 let tracked:FreeThrow|undefined,maximum=0,lastState='';const trace:string[]=[];
 const {model,tools,throwOne,update}=setup('auto',(dt,model,tools)=>{
  const first=tracked?.first,before=tracked&&model.long.points.slice(tracked.first,tracked.last+1).map(p=>p.clone());
  model.update(dt,tools);const state=[model.retainedThrow.phase,model.retainedThrow.lastFailure,model.retainedThrow.direction,model.sequence!.throws.length].join('|');if(state!==lastState){trace.push(state);lastState=state;}
  if(tracked&&before&&first===tracked.first)for(let i=0;i<before.length;i++)maximum=Math.max(maximum,model.long.points[tracked.first+i].distanceTo(before[i]));
 });await throwOne(2,1);
 expect(model.sequence!.throws).toHaveLength(1);expect(model.retainedThrow.wraps).toBe(2);expect(model.sequence!.technique).toBe('surgeon');
 const first=model.retainedThrow;tracked=first;
 const coordinate=first.shortMaterialCoordinate,indices=[first.first,first.last];
 tools.forEach(t=>t.openness=.7);for(let i=0;i<120;i++)update(1/120);
 // Regrasp the real free ends before moving back to prepare the next wrap.
 const pickupStarts=tools.map(t=>t.root.position.clone());
 for(let frame=1;frame<=240;frame++){
  tools.forEach((t,i)=>t.root.position.copy(pickupStarts[i]).lerp((i?model.short:model.long).points.at(-1)!.clone().sub(new THREE.Vector3(0,0,.05)),frame/240));
  update(1/120);
 }
 tools.forEach(t=>t.openness=.1);update(1/120);
 expect(model.gripLabel('left')).toBe('long strand');expect(model.gripLabel('right')).toBe('short tail');
 await throwOne(1,-1);
 expect(model.sequence!.locked,`${model.instruction} | ${model.handlingHint} | ${JSON.stringify(model.sequence!.throws)} | ${trace.join(" => ")}`).toBe(true);expect(model.earlierThrows).toContain(first);expect(first.phase).toBe('seated');
 expect([first.first,first.last]).toEqual(indices);expect(first.shortMaterialCoordinate).toBe(coordinate);
 expect(maximum).toBeLessThan(model.long.restLength);
 tools.forEach(t=>t.openness=.7);for(let i=0;i<180;i++)model.update(1/120,tools);
 expect(model.earlierThrows[0].active).toBe(true);expect(model.long.length).toBe(3.5);
 // The finite-iteration contact solver permits small geometric strain while
 // keeping the exact material budget; the user-facing reach limit is 4%.
 expect(Math.abs(model.long.measuredLength/model.long.length-1)).toBeLessThan(.03);
 expect(model.earlierThrows[0].last-model.earlierThrows[0].first).toBeGreaterThanOrEqual(12);
},180000);
it('detects two same-direction single throws as a sliding start, then an opposing lock',async()=>{
 let tracked:FreeThrow|undefined,minimum=Infinity,maximum=-Infinity,sawSliding=false;
 const {model,tools,throwOne}=setup('auto',(dt,model,tools)=>{
  model.update(dt,tools);if(tracked?.sliding){sawSliding=true;minimum=Math.min(minimum,tracked.shortMaterialCoordinate);maximum=Math.max(maximum,tracked.shortMaterialCoordinate);}
 });await throwOne(1,1);tracked=model.retainedThrow;
 expect(model.sequence!.throws).toHaveLength(1);expect(model.sequence!.throws[0].wraps).toBe(1);expect(model.sequence!.technique).toBe('single');
 await throwOne(1,1);expect(model.sequence!.throws).toHaveLength(2);expect(model.sequence!.sliding).toBe(true);expect(model.sequence!.technique).toBe('sliding');
 expect(sawSliding).toBe(true);expect(maximum-minimum).toBeGreaterThan(.1);
 await throwOne(1,-1);expect(model.sequence!.locked).toBe(true);expect(model.earlierThrows.every(t=>!t.sliding)).toBe(true);
 const knots=[...model.earlierThrows,model.retainedThrow],coordinates=knots.map(t=>t.shortMaterialCoordinate),indices=knots.map(t=>[t.first,t.last]);
 const starts=tools.map(t=>t.root.position.clone());
 for(let i=0;i<180;i++){
  tools.forEach((t,j)=>t.root.position.copy(starts[j]).add(new THREE.Vector3((j?1:-1)*.03*Math.sin(i/30),.02*Math.sin(i/45),0)));
  model.update(1/120,tools);
 }
 expect(knots.map(t=>t.shortMaterialCoordinate)).toEqual(coordinates);expect(knots.map(t=>[t.first,t.last])).toEqual(indices);
 expect(knots.every(t=>t.phase==='seated'&&!t.sliding)).toBe(true);
},180000);
