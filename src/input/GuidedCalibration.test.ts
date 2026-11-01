import {expect,it} from 'vitest';
import {Vector3,Matrix3} from 'three';
import {GuidedCalibration,solveGuidedRotation} from './GuidedCalibration';
const v=(x=0,y=0,z=0)=>new Vector3(x,y,z);
const samples=[v(.6),v(-.5),v(0,.55),v(0,-.6),v(0,0,.6),v(0,0,-.55)];
it('accepts consistent frames and rejects reflected frames across all axis permutations and signs',()=>{
 for(const axes of [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]])for(let bits=0;bits<8;bits++){
  const desired=[v(0,0,-.6),v(0,0,.5),v(.55),v(-.6),v(0,-.6),v(0,.55)];
  const measured=desired.map(target=>{const raw=v();for(let output=0;output<3;output++)raw.setComponent(axes[output],target.getComponent(output)*(bits&(1<<output)?-1:1));return raw;});
  const rows=axes.flatMap((axis,i)=>[0,1,2].map(j=>axis===j?(bits&(1<<i)?-1:1):0));
  const determinant=new Matrix3().set(...rows as [number,number,number,number,number,number,number,number,number]).determinant();
  if(determinant>0)expect(solveGuidedRotation(measured)).toEqual({rotationAxes:axes,rotationInvert:[0,1,2].map(i=>!!(bits&(1<<i)))});
  else expect(solveGuidedRotation(measured)).toBeNull();
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
it('accepts modest alternating hand jitter by averaging rather than rejecting every noisy frame',()=>{
 const g=new GuidedCalibration();
 for(let i=0;i<8;i++)g.observe(v(i%2?.055:-.055),i*100,i*100);
 expect(g.readiness()).toBe('Ready');expect(g.capture()).toBe(true);
 for(let i=0;i<8;i++)g.observe(v(.6+(i%2?.055:-.055)),1000+i*100,1000+i*100);
 expect(g.capture()).toBe(true);expect(g.samples[0].x).toBeCloseTo(.6,6);
});
it('still rejects continuing motion and isolated large spikes',()=>{
 const g=new GuidedCalibration();hold(g,v(),0);expect(g.capture()).toBe(true);
 for(let i=0;i<8;i++)g.observe(v(.4+i*.025),1000+i*100,1000+i*100);
 expect(g.capture()).toBe(false);
 hold(g,v(.6),2500);g.observe(v(.9),3300,3300);expect(g.capture()).toBe(false);
});

it('maps the actual upright instrument tilt and roll axes without swapping left/right tilt into pitch',()=>{
 const result=solveGuidedRotation([v(0,0,-.6),v(0,0,.6),v(.6),v(-.6),v(0,-.6),v(0,.6)]);
 expect(result).toEqual({rotationAxes:[0,1,2],rotationInvert:[false,false,false]});
});

it('rejects a reversed roll check instead of accepting three individually distinct but inconsistent directions',()=>{
 expect(solveGuidedRotation([v(0,0,-.6),v(0,0,.6),v(.6),v(-.6),v(0,.6),v(0,-.6)])).toBeNull();
});
