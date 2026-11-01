import {expect,it} from 'vitest';
import {MathUtils,Quaternion,Vector3} from 'three';
import {TrackedPoseFilter} from './TrackedPoseFilter';
const q=(degrees:number)=>new Quaternion().setFromAxisAngle(new Vector3(0,1,0),MathUtils.degToRad(degrees));
it('suppresses stationary camera jitter before it reaches the rotating tip offset',()=>{
 const filter=new TrackedPoseFilter();filter.update(new Vector3(),q(0),0);
 const errors:number[]=[];
 for(let frame=1;frame<=360;frame++){
  const sample=Math.floor(frame/3),noise=sample%2?2:-2;
  filter.update(new Vector3(noise*.004,0,0),q(noise),frame*1000/60);
  if(frame>120)errors.push(MathUtils.radToDeg(filter.quaternion.angleTo(q(0))));
 }
 expect(Math.max(...errors)).toBeLessThan(.65);
 expect(Math.abs(filter.position.x)).toBeLessThan(.003);
});
it('follows deliberate tilts quickly and preserves small continuous movement',()=>{
 const filter=new TrackedPoseFilter();filter.update(new Vector3(),q(0),0);
 for(let frame=1;frame<=12;frame++)filter.update(new Vector3(.3,0,0),q(35),frame*1000/60);
 expect(MathUtils.radToDeg(filter.quaternion.angleTo(q(35)))).toBeLessThan(1.5);
 expect(filter.position.x).toBeGreaterThan(.29);
 for(let frame=13;frame<=132;frame++)filter.update(new Vector3(.3,0,0),q(35+(frame-12)*.1),frame*1000/60);
 expect(MathUtils.radToDeg(filter.quaternion.angleTo(q(47)))).toBeLessThan(1.7);
});
it('uses independent state, shortest quaternion arcs, and fresh initialization after tracking loss',()=>{
 const a=new TrackedPoseFilter(),b=new TrackedPoseFilter();a.update(new Vector3(),q(179),0);b.update(new Vector3(),q(0),0);
 for(let i=1;i<=20;i++)a.update(new Vector3(),q(-179),i*16);
 expect(MathUtils.radToDeg(a.quaternion.angleTo(q(-179)))).toBeLessThan(1);
 expect(b.quaternion.angleTo(q(0))).toBe(0);
 a.update(new Vector3(1,2,3),q(90),1500);expect(a.position.toArray()).toEqual([1,2,3]);expect(a.quaternion.angleTo(q(90))).toBeLessThan(1e-7);
});
it('gives similar settling across monitor refresh rates',()=>{
 const output=[30,60,120].map(fps=>{const filter=new TrackedPoseFilter();filter.update(new Vector3(),q(0),0);for(let i=1;i<=fps;i++)filter.update(new Vector3(.1,0,0),q(10),i*1000/fps);return filter;});
 for(const filter of output){expect(MathUtils.radToDeg(filter.quaternion.angleTo(output[0].quaternion))).toBeLessThan(.15);expect(filter.position.distanceTo(output[0].position)).toBeLessThan(.0005);}
});
