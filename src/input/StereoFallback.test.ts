import {expect,it} from 'vitest';
import {Quaternion,Vector3} from 'three';
import {StereoFallback,type MonoView} from './StereoFallback';
const pose=(z:number,at:number,x=0)=>({position:new Vector3(x,0,z),quaternion:new Quaternion(),at});
const view=(camera:0|1,z:number,at:number,x=0):MonoView=>({...pose(z,at,x),camera,axis:new Vector3(0,0,1)});
it('continues lateral movement while holding depth, then introduces approximate depth',()=>{
 const f=new StereoFallback();f.update(pose(800,0),[view(0,700,0)],0);
 const a=f.update(undefined,[view(0,750,120,30)],120)!;
 expect(a.position.toArray()).toEqual([30,0,800]);expect(a.source).toBe('camera1');
 let b=a;for(let t=220;t<1600;t+=100)b=f.update(undefined,[view(0,750,t,50)],t)!;
 expect(b.position.x).toBe(50);expect(b.position.z).toBeGreaterThan(848);
});
it('hands off between cameras without transferring their pose bias',()=>{
 const f=new StereoFallback();f.update(pose(800,0),[view(0,700,0),view(1,1100,0)],0);
 const a=f.update(undefined,[view(1,1100,120,20)],120)!;
 expect(a.source).toBe('camera2');expect(a.position.toArray()).toEqual([20,0,800]);
 const b=f.update(undefined,[view(0,720,240,70)],240)!;
 expect(b.position.distanceTo(a.position)).toBeLessThan(1e-8);
 const c=f.update(undefined,[view(0,720,280,90)],280)!;expect(c.position.x).toBe(40);
});
it('blends stereo recovery and never publishes when both cameras are lost',()=>{
 const f=new StereoFallback();f.update(pose(800,0),[view(0,700,0)],0);
 const a=f.update(undefined,[view(0,700,120,40)],120)!;
 const b=f.update(pose(900,140,100),[view(0,700,140,40)],140)!;
 expect(b.position.distanceTo(a.position)).toBeLessThan(20);
 let c=b;for(let t=160;t<1600;t+=20)c=f.update(pose(900,t,100),[view(0,700,t,40)],t)!;
 expect(c.position.distanceTo(new Vector3(100,0,900))).toBeLessThan(.1);
 expect(f.update(undefined,[],2000)).toBeNull();
});
it('holds depth along the remaining camera axis and maintains rotation continuity',()=>{
 const f=new StereoFallback(),v=view(1,1000,0);v.axis.set(1,0,0);v.quaternion.setFromAxisAngle(new Vector3(0,1,0),1);
 f.update(pose(800,0),[v],0);
 const changed={...v,position:new Vector3(30,20,1000),at:120,quaternion:v.quaternion.clone().multiply(new Quaternion().setFromAxisAngle(new Vector3(0,0,1),.2))};
 const a=f.update(undefined,[changed],120)!;expect(a.position.toArray()).toEqual([0,20,800]);expect(a.quaternion.angleTo(new Quaternion())).toBeCloseTo(.2);
});
