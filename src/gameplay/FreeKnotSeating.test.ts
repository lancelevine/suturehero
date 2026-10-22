import {expect,it} from 'vitest';
import * as THREE from 'three';
import {createFreeTyingFixture} from './test-support/freeTying';
import {WoundApproximation} from '../tissue/WoundApproximation';
import {tractEntry,tractExit} from '../tissue/sutureTract';
import {stitchSupport} from '../suture/KnotTissueSeat';
it('advances a real single sliding throw onto tissue, holds closure, and protects the core during driver approach and tail pickup',async()=>{
 const wound=new WoundApproximation();wound.setDermalBites(new THREE.Vector3(.25,.31,0),new THREE.Vector3(-.25,.31,0));
 let seating=false,maximum=0;
 const {model,tools,throwOne,lowerAndPull,update}=createFreeTyingFixture('auto',(dt,model,tools)=>{
  model.entry.copy(wound.deformPoint(tractEntry()));model.exit.copy(wound.deformPoint(tractExit()));
  const before=model.long.points.map(p=>p.clone());model.update(dt,tools);wound.update(model.closureLoad,dt);
  if(seating){const k=model.retainedThrow;for(let i=k.first;i<=k.last;i++)maximum=Math.max(maximum,model.long.points[i].distanceTo(before[i]));}
 });
 await throwOne(1,1);
 expect(model.retainedThrow.phase).toBe('seated');expect(wound.closure).toBe(0);expect(model.knotAtTissue).toBe(false);
 const original=model.retainedThrow.first;seating=true;await lowerAndPull();seating=false;
 expect(model.retainedThrow.first).toBeLessThan(original);expect(model.knotAtTissue).toBe(true);
 expect(model.closureLoad).toBeGreaterThan(.75);expect(wound.closure).toBeGreaterThan(.75);
 expect(maximum).toBeLessThan(model.long.restLength*1.1);
 const knot=model.retainedThrow,indices=[knot.first,knot.last],coordinate=knot.shortMaterialCoordinate;
 tools.forEach(t=>t.openness=.7);for(let i=0;i<120;i++)update(1/120);
 const driver=tools[1],start=driver.root.position.clone(),center=model.long.pointAt((knot.first+knot.last)/2);
 for(let frame=1;frame<=180;frame++){
  driver.root.position.copy(start).lerp(center.clone().sub(new THREE.Vector3(0,0,.05)),Math.min(1,frame/120));update(1/120);
  for(let i=knot.first;i<=knot.last;i++)expect(model.long.points[i].y).toBeGreaterThanOrEqual(stitchSupport(model.long.points[i],model.entry,model.exit,model.surfaceAt)-.001);
  if(frame%60===0)await new Promise(resolve=>setTimeout(resolve,0));
 }
 expect([knot.first,knot.last]).toEqual(indices);expect(knot.shortMaterialCoordinate).toBe(coordinate);
 expect(model.closureLoad).toBeGreaterThan(.75);
 const pickup=driver.root.position.clone();
 for(let frame=1;frame<=180;frame++){
  driver.root.position.copy(pickup).lerp(model.short.points.at(-1)!.clone().sub(new THREE.Vector3(0,0,.05)),frame/180);update(1/120);
  if(frame%60===0)await new Promise(resolve=>setTimeout(resolve,0));
 }
 driver.openness=.1;update(1/120);expect(model.gripLabel('right')).toBe('short tail');
 expect(model.long.length).toBe(3.5);expect(model.short.length).toBe(1.2);
 expect(Math.abs(model.long.measuredLength/model.long.length-1)).toBeLessThan(.04);
},180000);
