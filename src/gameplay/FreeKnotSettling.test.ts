import {expect,it} from 'vitest';
import * as THREE from 'three';
import {createFreeTyingFixture} from './test-support/freeTying';
import {WoundApproximation} from '../tissue/WoundApproximation';
import {tractEntry,tractExit} from '../tissue/sutureTract';
it('settles a seated surgeon throw while the wound closes, at irregular display frame intervals',async()=>{
 const wound=new WoundApproximation();wound.setDermalBites(new THREE.Vector3(.25,.31,0),new THREE.Vector3(-.25,.31,0));
 const {model,tools,throwOne,update}=createFreeTyingFixture('auto',(dt,model,tools)=>{
  model.entry.copy(wound.deformPoint(tractEntry()));model.exit.copy(wound.deformPoint(tractExit()));
  model.update(dt,tools);wound.update(model.sequence!.throws.length?.85:model.retainedThrow.tightness*.85,dt);
 });
 await throwOne(2,1);expect(model.sequence!.throws).toHaveLength(1);
 let largest=0,core=0;const first=model.retainedThrow.first,last=model.retainedThrow.last;
 for(let frame=0;frame<360;frame++){
  if(frame===120)tools.forEach(t=>t.openness=.7);
  const before=model.long.points.map(p=>p.clone()),short=model.short.points.map(p=>p.clone());
  update([1/60,1/30,.05,1/60][frame%4]);
  if(frame>=60&&frame<120||frame>=300){
   largest=Math.max(largest,...model.long.points.map((p,i)=>p.distanceTo(before[i])),...model.short.points.map((p,i)=>p.distanceTo(short[i])));
   core=Math.max(core,...model.long.points.slice(first,last+1).map((p,i)=>p.distanceTo(before[first+i])));
  }
  if(frame%30===0)await new Promise(resolve=>setTimeout(resolve,0));
 }
 expect(model.retainedThrow.phase).toBe('seated');expect(model.retainedThrow.first).toBe(first);expect(model.retainedThrow.last).toBe(last);
 expect(core).toBeLessThan(.005);expect(largest).toBeLessThan(.008);
},180000);
