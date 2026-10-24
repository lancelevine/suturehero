import {NeedlePass} from '../tissue/NeedlePass';
import {DEFAULT_BITE_WIDTH} from '../tissue/BitePlan';
import {expect,it} from 'vitest';
import * as THREE from 'three';
import {createFreeTyingFixture} from './test-support/freeTying';
import {WoundApproximation} from '../tissue/WoundApproximation';
import {StitchTissueResponse} from '../tissue/StitchTissueResponse';
import {threadSurfaceAt} from '../suture/TissueThreadGuide';
import {tractEntry,tractExit} from '../tissue/sutureTract';
it.each([false,true])('seats and releases a real throw against responding skin (planned unequal bites: %s)',async planned=>{
 const wound=new WoundApproximation();wound.response=new StitchTissueResponse();wound.response.prepare(1,.6);
 const pass=new NeedlePass();if(planned)pass.setBites(DEFAULT_BITE_WIDTH*1.2,DEFAULT_BITE_WIDTH*.8);
 if(planned)wound.setDermalBites(...pass.purchaseSites);else wound.setDermalBites(new THREE.Vector3(.27,.31,0),new THREE.Vector3(-.27,.31,0));
 const {model,tools,throwOne,lowerAndPull,update}=createFreeTyingFixture('auto',(dt,m,t)=>{
  m.surfaceAt=p=>threadSurfaceAt(p)+(Math.abs(p.x)<=2.68&&Math.abs(p.z)<=1.68?wound.surfaceLiftAt(p):0);
  m.entry.copy(wound.deformPoint(planned?pass.entry:tractEntry()));m.exit.copy(wound.deformPoint(planned?pass.exit:tractExit()));
  m.update(dt,t);wound.update(m.closureLoad,dt,m.pullDemand);
 });
 await throwOne(1,1);await lowerAndPull();
 expect(model.retainedThrow.active).toBe(true);expect(wound.closure).toBeGreaterThan(.6);expect(wound.response.eversion).toBeGreaterThan(.004);
 expect(wound.response.pucker).toBeGreaterThan(.005);
 await throwOne(1,-1);await lowerAndPull();expect(model.lockSeated,`${model.instruction} | ${model.handlingHint} | ${model.tissueSeat.load} | ${[...model.earlierThrows,model.retainedThrow].map(k=>[k.phase,k.first,k.last,k.shortMaterialCoordinate]).join(';')}`).toBe(true);
 tools.forEach(t=>t.openness=.7);let motion=0;
 for(let i=0;i<240;i++){
  const before=model.long.points.map(p=>p.clone());update(1/60);
  if(i>=180)for(let j=model.retainedThrow.first;j<=model.retainedThrow.last;j++)motion=Math.max(motion,before[j].distanceTo(model.long.points[j]));
  if(i%60===0)await new Promise(resolve=>setTimeout(resolve,0));
 }
 expect(motion).toBeLessThan(.008);expect(model.long.length+model.short.length).toBe(4.7);
 expect(model.long.points.every(p=>p.toArray().every(Number.isFinite))).toBe(true);
},180000);
