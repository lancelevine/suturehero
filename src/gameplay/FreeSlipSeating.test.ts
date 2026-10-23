import {expect,it} from 'vitest';
import * as THREE from 'three';
import {createFreeTyingFixture} from './test-support/freeTying';
it('seats a sliding start, regrasps, adds its lock and trims both tails without disturbing the retained stack',async()=>{
 const {model,tools,throwOne,lowerAndPull,update}=createFreeTyingFixture('auto');
 await throwOne(1,1);await throwOne(1,1);
 expect(model.sequence!.technique).toBe('sliding');
 await lowerAndPull();expect(model.knotAtTissue).toBe(true);
 expect(model.lockSeated).toBe(false);expect(model.tissueSeat.load).toBeGreaterThan(.75);
 const first=model.earlierThrows[0],indices=[first.first,first.last],post=first.shortMaterialCoordinate;
 tools.forEach(t=>t.openness=.7);for(let i=0;i<120;i++)update(1/120);
 expect(model.knotAtTissue).toBe(true);
 const starts=tools.map(t=>t.root.position.clone());
 for(let frame=1;frame<=240;frame++){
  tools.forEach((t,i)=>t.root.position.copy(starts[i]).lerp((i?model.short:model.long).points.at(-1)!.clone().sub(new THREE.Vector3(0,0,.05)),frame/240));
  update(1/120);if(frame%120===0)await new Promise(resolve=>setTimeout(resolve,0));
 }
 tools.forEach(t=>t.openness=.1);update(1/120);
 expect(model.gripLabel('left')).toBe('long strand');expect(model.gripLabel('right')).toBe('short tail');
 await throwOne(1,-1);await lowerAndPull();
 expect(model.lockSeated,`${model.instruction} | ${model.handlingHint} | ${model.tissueSeat.load} | ${[...model.earlierThrows,model.retainedThrow].map(k=>[k.phase,k.first,k.last,k.shortMaterialCoordinate]).join(';')}`).toBe(true);expect(model.sequence!.throws).toHaveLength(3);
 expect([first.first,first.last]).toEqual(indices);expect(first.shortMaterialCoordinate).toBe(post);
 const knots=[...model.earlierThrows,model.retainedThrow],coordinates=knots.map(k=>k.shortMaterialCoordinate);
 for(const strand of [model.long,model.short]){
  expect(model.cut(strand,model.minimumCut(strand)-.1)).toBe(false);
  expect(model.cut(strand,model.minimumCut(strand)+6.5)).toBe(true);
 }
 expect(model.trimmedTails.size).toBe(2);
 expect(model.strands.reduce((sum,s)=>sum+s.length,0)).toBeCloseTo(4.7,10);
 tools.forEach(t=>t.openness=.7);
 let lateMotion=0;
 for(let frame=0;frame<240;frame++){
  const before=model.long.points.map(p=>p.clone());update(1/60);
  if(frame>=180)for(const knot of knots)for(let i=knot.first;i<=knot.last;i++)lateMotion=Math.max(lateMotion,before[i].distanceTo(model.long.points[i]));
  if(frame%60===0)await new Promise(resolve=>setTimeout(resolve,0));
 }
 expect(model.lockSeated,`${model.instruction} | ${model.handlingHint} | ${model.tissueSeat.load} | ${[...model.earlierThrows,model.retainedThrow].map(k=>[k.phase,k.first,k.last,k.shortMaterialCoordinate]).join(';')}`).toBe(true);expect(lateMotion).toBeLessThan(.008);
 expect(knots.map(k=>k.shortMaterialCoordinate)).toEqual(coordinates);
},180000);
