import {expect,it} from 'vitest';
import * as THREE from 'three';
import {WoundApproximation} from './WoundApproximation';
import {StitchTissueResponse} from './StitchTissueResponse';
it('preserves local eversion under dermal closure, puckers under excess demand, and relaxes without lifting fat',()=>{
 const wound=new WoundApproximation(),response=new StitchTissueResponse();wound.response=response;response.prepare(1,.6);
 wound.setDermalBites(new THREE.Vector3(.27,.31,0),new THREE.Vector3(-.27,.31,0));
 for(let i=0;i<120;i++)wound.update(1,1/60,0);
 const top=new THREE.Vector3(.05,.41,0),fat=new THREE.Vector3(.05,.05,0);
 expect(wound.deformPoint(top).y).toBeGreaterThan(top.y);expect(wound.deformPoint(fat).y).toBe(fat.y);
 expect(response.pucker).toBe(0);const everted=response.eversion;
 for(let i=0;i<120;i++)wound.update(1,1/60,1);expect(response.pucker).toBeGreaterThan(.02);expect(response.eversion).toBeCloseTo(everted,3);
 const folded=new THREE.Vector3(.05,.41,.1);expect(response.liftAt(folded)).toBeGreaterThan(response.liftAt(top));
 for(let i=0;i<120;i++)wound.update(1,1/60,0);expect(response.pucker).toBeLessThan(.001);expect(response.eversion).toBeGreaterThan(.01);
 wound.reset();expect(response.eversion).toBe(0);expect(wound.deformPoint(top).equals(top)).toBe(true);
});
it('does not create closure or eversion without two load-bearing bites',()=>{
 const wound=new WoundApproximation();wound.response=new StitchTissueResponse();
 for(let i=0;i<60;i++)wound.update(1,1/60,1);expect(wound.closure).toBe(0);expect(wound.response.eversion).toBe(0);expect(wound.response.pucker).toBe(0);
});
