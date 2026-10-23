import {expect,it} from 'vitest';
import {createFreeTyingFixture} from './test-support/freeTying';
it.each([
 {name:'near the working jaws',wraps:1,radius:.4,depth:.3,pullSide:.15,direction:1},
 {name:'from an opposite approach',wraps:1,radius:.35,depth:1.2,pullSide:-.15,direction:-1},
 {name:'with two turns near the jaws',wraps:2,radius:.4,depth:.3,pullSide:.15,direction:1},
])('retains a $wraps-turn throw $name with a diagonal pull',async({direction,wraps,...motion})=>{
 let maximumWinding=0,passageWinding=0,last='';const trace:string[]=[];
 const {model,throwOne}=createFreeTyingFixture('auto',(dt,model,tools)=>{
  const before=model.retainedThrow.phase;model.update(dt,tools);
  const state=[model.retainedThrow.phase,model.retainedThrow.lastFailure,model.passage.lastFailure].join('|');if(state!==last){trace.push(state);last=state;}
  if(before==='idle')maximumWinding=Math.max(maximumWinding,Math.abs(model.winding));
  if(before==='idle'&&model.retainedThrow.phase==='passed')passageWinding=model.winding;
 },motion);
 await throwOne(wraps,direction);
 expect(maximumWinding).toBeGreaterThan(.8);
 expect(model.retainedThrow.active,trace.join(' → ')).toBe(true);expect(model.retainedThrow.wraps).toBe(wraps);
 // Classify the observed material winding, which can differ from tool roll.
 expect(model.retainedThrow.direction).toBe(Math.sign(passageWinding));
},180000);
it.each([
 {name:'rolled jaws',wraps:1,radius:.4,depth:.3,pullSide:.15,direction:-1,rotation:[0,0,Math.PI/2] as [number,number,number]},
 {name:'tilted driver',wraps:1,radius:.4,depth:.3,pullSide:.15,direction:1,rotation:[.2,.25,.3] as [number,number,number]},
])('retains a real off-center pull-through with $name',async({direction,wraps,...motion})=>{
 const {model,throwOne}=createFreeTyingFixture('auto',undefined,motion);
 await throwOne(wraps,direction);
 expect(model.retainedThrow.active).toBe(true);expect(model.retainedThrow.wraps).toBe(wraps);
 expect(model.long.length).toBe(3.5);expect(model.short.length).toBe(1.2);
 expect(model.long.points.every(p=>p.toArray().every(Number.isFinite))).toBe(true);
},180000);
