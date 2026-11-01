import {expect,it} from 'vitest';
import {Vector3} from 'three';
import {TrackedPositionBridge} from './TrackedPositionBridge';
const v=(x:number,y:number,z:number)=>new Vector3(x,y,z);
it('keeps acquisition jump-free, then aligns neutral XY and retains scene depth for subsequent relative movement',()=>{
 const bridge=new TrackedPositionBridge(),scene=v(-1,.7,2);
 expect(bridge.target(v(.4,1,9),scene).toArray()).toEqual(scene.toArray());
 expect(bridge.target(v(.6,1.5,9.2),scene).distanceTo(v(-.8,1.2,2.2))).toBeLessThan(1e-9);
 const current=v(-.8,1.2,2.2);bridge.alignOnNeutral();
 expect(bridge.target(v(.6,1.5,9.2),current).distanceTo(v(.6,1.5,2.2))).toBeLessThan(1e-9);
 expect(bridge.target(v(.7,1.6,9.3),v(.6,1.5,2.2)).distanceTo(v(.7,1.6,2.3))).toBeLessThan(1e-9);
});
it('neutral affects only the selected instrument and can precede its first pose',()=>{
 const forceps=new TrackedPositionBridge(),driver=new TrackedPositionBridge();
 driver.target(v(1,1,1),v(-1,2,3));forceps.alignOnNeutral();
 expect(forceps.target(v(.5,1.5,5),v(0,0,4)).toArray()).toEqual([.5,1.5,4]);
 expect(driver.target(v(1.2,1.3,1.4),v(-1,2,3)).distanceTo(v(-.8,2.3,3.4))).toBeLessThan(1e-9);
});
it('repeated neutral preserves depth and does not mutate tracked or scene inputs',()=>{
 const bridge=new TrackedPositionBridge(),source=v(1,2,8),current=v(3,4,5);
 for(let i=0;i<3;i++){bridge.alignOnNeutral();const target=bridge.target(source,current);expect(target.toArray()).toEqual([1,2,5]);target.set(99,99,99);}
 expect(source.toArray()).toEqual([1,2,8]);expect(current.toArray()).toEqual([3,4,5]);
});
