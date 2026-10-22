import type {FreeThrow} from '../suture/FreeThrow';
import {expect,it} from 'vitest';
import {createFreeTyingFixture as setup} from './test-support/freeTying';
it('retains a double surgeon first throw while an opposing single throw locks it',async()=>{
 const {model,tools,throwOne}=setup('auto');await throwOne(2,1);
 expect(model.sequence!.throws).toHaveLength(1);expect(model.retainedThrow.wraps).toBe(2);expect(model.sequence!.technique).toBe('surgeon');
 const first=model.retainedThrow;await throwOne(1,-1);
 expect(model.sequence!.locked).toBe(true);expect(model.earlierThrows).toContain(first);expect(first.phase).toBe('seated');
 tools.forEach(t=>t.openness=.7);for(let i=0;i<180;i++)model.update(1/120,tools);
 expect(model.earlierThrows[0].active).toBe(true);expect(model.long.length).toBe(3.5);
 // The finite-iteration contact solver permits small geometric strain while
 // keeping the exact material budget; the user-facing reach limit is 4%.
 expect(Math.abs(model.long.measuredLength/model.long.length-1)).toBeLessThan(.03);
 expect(model.earlierThrows[0].last-model.earlierThrows[0].first).toBeGreaterThanOrEqual(12);
},180000);
it('detects two same-direction single throws as a sliding start, then an opposing lock',async()=>{
 let tracked:FreeThrow|undefined,minimum=Infinity,maximum=-Infinity,sawSliding=false;
 const {model,throwOne}=setup('auto',(dt,model,tools)=>{
  model.update(dt,tools);if(tracked?.sliding){sawSliding=true;minimum=Math.min(minimum,tracked.shortMaterialCoordinate);maximum=Math.max(maximum,tracked.shortMaterialCoordinate);}
 });await throwOne(1,1);tracked=model.retainedThrow;
 expect(model.sequence!.throws).toHaveLength(1);expect(model.sequence!.throws[0].wraps).toBe(1);expect(model.sequence!.technique).toBe('single');
 await throwOne(1,1);expect(model.sequence!.throws).toHaveLength(2);expect(model.sequence!.sliding).toBe(true);expect(model.sequence!.technique).toBe('sliding');
 expect(sawSliding).toBe(true);expect(maximum-minimum).toBeGreaterThan(.1);
 await throwOne(1,-1);expect(model.sequence!.locked).toBe(true);expect(model.earlierThrows.every(t=>!t.sliding)).toBe(true);
},180000);
