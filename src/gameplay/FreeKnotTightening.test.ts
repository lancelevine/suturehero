import {expect,it} from 'vitest';
import {createFreeTyingFixture} from './test-support/freeTying';
it('draws a retained free throw down without large self-contact kicks or overstretching the held path',async()=>{
 let maximum=0,samples=0,reachError=0;
 const {model,throwOne}=createFreeTyingFixture('auto',(dt,model,tools)=>{
  const retained=model.retainedThrow.phase==='retained',strands=model.strands,before=strands.map(s=>s.points.map(p=>p.clone()));
  model.update(dt,tools);
  const held=[...model.grips.values()],long=held.find(g=>g.strand===model.long),short=held.find(g=>g.strand===model.short),knot=model.retainedThrow;
  if(knot.active&&long&&short){
   const budget=model.long.materialLengthBetween(knot.last,long.index)+model.short.materialLengthBetween(knot.shortMaterialCoordinate,short.index);
   reachError=Math.max(reachError,model.long.points[long.index].distanceTo(model.short.points[short.index])/budget-1);
  }
  if(retained&&knot.phase==='retained'){
   samples++;
   for(let k=0;k<strands.length;k++)for(let i=1;i<strands[k].count-1;i++){
    const strand=strands[k];
    if(held.some(g=>g.strand===strand&&Math.abs(g.index-i)*strand.restLength<=.36))continue;
    maximum=Math.max(maximum,strand.points[i].distanceTo(before[k][i]));
   }
  }
 });
 await throwOne(2,1);
 expect(samples).toBeGreaterThan(30);expect(model.retainedThrow.phase).toBe('seated');
 // Material feeding advances one particle at a time; it must not kick free
 // thread across several segments or exceed the shared held-tail budget.
 expect(maximum).toBeLessThan(model.long.restLength*1.5);expect(reachError).toBeLessThan(.04);
},180000);
