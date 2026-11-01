import {expect,it} from 'vitest';
import {Vector3} from 'three';
import {GuidedCalibration,solveGuidedRotation} from './GuidedCalibration';
const v=(x=0,y=0,z=0)=>new Vector3(x,y,z);
const samples=[v(.6),v(-.5),v(0,.55),v(0,-.6),v(0,0,.6),v(0,0,-.55)];
it('resolves all axis permutations and signs from six opposite checks',()=>{
 for(const axes of [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]])for(let bits=0;bits<8;bits++){
  const measured=samples.map((s,i)=>v().setComponent(axes[Math.floor(i/2)],s.length()*(i%2?-1:1)*(bits&(1<<Math.floor(i/2))?-1:1)));
  expect(solveGuidedRotation(measured)).toEqual({rotationAxes:axes,rotationInvert:[0,1,2].map(i=>!!(bits&(1<<i)))});
 }
});
it('rejects missing, repeated, non-opposite, oblique and too-small motions',()=>{
 expect(solveGuidedRotation(samples.slice(0,2))).toBeNull();
 for(const bad of [v(.5),v(0,-.5),v(-.05),v(-.5,.5)]){
  const copy=samples.map(s=>s.clone());copy[1]=bad;expect(solveGuidedRotation(copy)).toBeNull();
 }
 const repeated=samples.map(s=>s.clone());repeated[4]=v(.6);repeated[5]=v(-.6);expect(solveGuidedRotation(repeated)).toBeNull();
});
const hold=(g:GuidedCalibration,rotation:Vector3,start:number)=>{for(let i=0;i<8;i++)g.observe(rotation,start+i*100,start+i*100);};
it('requires new stable observations, rejects stale or noisy poses, and returns to neutral each time',()=>{
 const g=new GuidedCalibration();for(let i=0;i<10;i++)g.observe(v(),0,i*30);expect(g.capture()).toBe(false);
 hold(g,v(),1000);expect(g.capture()).toBe(true);expect(g.neutral).toBe(false);
 hold(g,v(.6),2000);expect(g.capture()).toBe(true);expect(g.step).toBe(1);expect(g.neutral).toBe(true);
 hold(g,v(.6),3000);expect(g.capture()).toBe(false);
 g.observe(null,0,4000);expect(g.capture()).toBe(false);
 hold(g,v(),5000);g.observe(v(.3),5800,5800);expect(g.capture()).toBe(false);
 hold(g,v(),7000);expect(g.capture()).toBe(true);
 hold(g,v(-.6),8000);g.observe(v(-.6),8700,9200);expect(g.capture()).toBe(false);
});
it('completes all six poses without changing the measured neutral or accepting unfinished results',()=>{
 const g=new GuidedCalibration();let time=0;
 for(const pose of samples){hold(g,v(),time+=2000);expect(g.capture()).toBe(true);hold(g,pose,time+=2000);expect(g.capture()).toBe(true);}
 expect(g.step).toBe(6);expect(g.capture()).toBe(false);expect(solveGuidedRotation(g.samples)).not.toBeNull();
});
