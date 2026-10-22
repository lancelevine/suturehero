import {expect,it} from 'vitest';
import * as THREE from 'three';
import {createFreeTyingFixture} from './test-support/freeTying';
import {WoundApproximation} from '../tissue/WoundApproximation';
import {tractEntry,tractExit} from '../tissue/sutureTract';
it('settles a seated surgeon throw while the wound closes, at irregular display frame intervals',async()=>{
 const wound=new WoundApproximation();wound.setDermalBites(new THREE.Vector3(.25,.31,0),new THREE.Vector3(-.25,.31,0));
 const {model,tools,throwOne,lowerAndPull,update}=createFreeTyingFixture('auto',(dt,model,tools)=>{
  model.entry.copy(wound.deformPoint(tractEntry()));model.exit.copy(wound.deformPoint(tractExit()));
  model.update(dt,tools);wound.update(model.closureLoad,dt);
 });
 await throwOne(2,1);expect(model.sequence!.throws).toHaveLength(1);
 expect(wound.closure).toBe(0);await lowerAndPull();
 expect(model.knotAtTissue).toBe(true);expect(model.closureLoad).toBeGreaterThan(.75);expect(wound.closure).toBeGreaterThan(.75);
 const firstThrow=model.retainedThrow,firstCoordinate=firstThrow.shortMaterialCoordinate,materialIndices=[firstThrow.first,firstThrow.last];
 await throwOne(1,-1);
 expect(model.sequence!.locked).toBe(true);expect(model.earlierThrows).toContain(firstThrow);
 expect([firstThrow.first,firstThrow.last]).toEqual(materialIndices);expect(firstThrow.shortMaterialCoordinate).toBe(firstCoordinate);
 expect(model.tissueSeat.contact).toBe(true);expect(wound.closure).toBeGreaterThan(.9);
 let largest=0,core=0;const first=model.retainedThrow.first,last=model.retainedThrow.last;
 for(let frame=0;frame<360;frame++){
  if(frame===120)tools.forEach(t=>t.openness=.7);
  if(frame===180){tools[0].root.position.x-=.5;tools[1].root.position.x+=.5;}
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
 const material=model.long.length;
 expect(model.cut(model.long,model.minimumCut(model.long)+8.5)).toBe(true);
 expect(model.fragments).toHaveLength(1);expect(model.long.length+model.fragments[0].length).toBeCloseTo(material,10);
 let trimmedMotion=0;
 for(let frame=0;frame<240;frame++){
  const before=model.long.points.slice(first,last+1).map(p=>p.clone());update(1/60);
  if(frame>=180)trimmedMotion=Math.max(trimmedMotion,...model.long.points.slice(first,last+1).map((p,i)=>p.distanceTo(before[i])));
  if(frame%30===0)await new Promise(resolve=>setTimeout(resolve,0));
 }
 expect(model.retainedThrow.phase).toBe('seated');expect(trimmedMotion).toBeLessThan(.005);

},180000);
