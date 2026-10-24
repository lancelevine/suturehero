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
it('compresses the central ridge under excess pull and recovers when tension eases',()=>{
 const wound=new WoundApproximation(),response=new StitchTissueResponse();wound.response=response;response.prepare(1,.6);
 wound.setDermalBites(new THREE.Vector3(.27,.31,0),new THREE.Vector3(-.27,.31,0));
 const top=new THREE.Vector3(.05,.41,0),dermis=new THREE.Vector3(.05,.32,0),fat=new THREE.Vector3(.05,.05,0);
 const settle=(demand:number)=>{for(let i=0;i<120;i++)wound.update(1,1/60,demand);};
 settle(0);const gentle=wound.deformPoint(top).y,gap=wound.gapAt(0);
 settle(1);expect(response.compression).toBeCloseTo(.006,4);
 expect(wound.deformPoint(top).y).toBeLessThan(gentle-.005);
 expect(wound.deformPoint(dermis).y).toBeGreaterThan(dermis.y);
 expect(wound.deformPoint(fat).y).toBe(fat.y);expect(wound.gapAt(0)).toBeCloseTo(gap,5);
 settle(0);expect(response.compression).toBeLessThan(.0001);expect(wound.deformPoint(top).y).toBeCloseTo(gentle,4);
 wound.reset();expect(response.compression).toBe(0);
});
it('preserves even eversion for balanced bites and reduces it alongside unequal edge heights',()=>{
 const make=(exit:number)=>{const w=new WoundApproximation();w.response=new StitchTissueResponse();w.setDermalBites(new THREE.Vector3(.3,.31,0),new THREE.Vector3(exit,.31,0));for(let i=0;i<120;i++)w.update(1,1/60);return w;};
 const balanced=make(-.3),unequal=make(-.15);
 expect(balanced.response!.eversion).toBeGreaterThan(unequal.response!.eversion);
 const left=new THREE.Vector3(-.05,.41,0),right=new THREE.Vector3(.05,.41,0);
 expect(balanced.deformPoint(left).y).toBeCloseTo(balanced.deformPoint(right).y,6);
 expect(Math.abs(unequal.deformPoint(left).y-unequal.deformPoint(right).y)).toBeGreaterThan(.005);
});
