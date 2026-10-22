import {expect,it} from 'vitest';
import {createFreeTyingFixture} from './test-support/freeTying';
it.each([{name:'near the working jaws',radius:.4,depth:.3,pullSide:.15,direction:1},{name:'from an opposite approach',radius:.35,depth:1.2,pullSide:-.15,direction:-1}])('retains a single throw $name with a diagonal pull',async({direction,...motion})=>{
 let maximumWinding=0,passageWinding=0;
 const {model,throwOne}=createFreeTyingFixture('auto',(dt,model,tools)=>{
  const before=model.retainedThrow.phase;model.update(dt,tools);
  if(before==='idle')maximumWinding=Math.max(maximumWinding,Math.abs(model.winding));
  if(before==='idle'&&model.retainedThrow.phase==='passed')passageWinding=model.winding;
 },motion);
 await throwOne(1,direction);
 expect(maximumWinding).toBeGreaterThan(.8);
 expect(model.retainedThrow.active).toBe(true);expect(model.retainedThrow.wraps).toBe(1);
 // Classify the observed material winding, which can differ from tool roll.
 expect(model.retainedThrow.direction).toBe(Math.sign(passageWinding));
},180000);
