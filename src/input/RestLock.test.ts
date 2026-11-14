import {expect,it} from 'vitest';
import {Quaternion,Vector3} from 'three';
import {RestLock} from './RestLock';
const q=(deg:number)=>new Quaternion().setFromAxisAngle(new Vector3(0,1,0),deg*Math.PI/180);
it('damps rest wobble and follows real motion immediately',()=>{
 const lock=new RestLock();lock.update(new Vector3(0,0,300),q(0));
 let worst=0;
 for(let i=0;i<40;i++){const out=lock.update(new Vector3(i%2?1:-1,0,300),q(i%2?2.5:-2.5));worst=Math.max(worst,out.quaternion.angleTo(q(0))*180/Math.PI);}
 expect(worst).toBeLessThan(.5);
 const moved=lock.update(new Vector3(20,0,300),q(10));
 expect(moved.position.x).toBe(20);expect(moved.quaternion.angleTo(q(10))).toBeLessThan(1e-9);
});

it('follows slow steady movement instead of stair-stepping, and still holds jitter',()=>{
 const lock=new RestLock();let x=0,worstLag=0;
 for(let i=0;i<=90;i++){x=10*i/30;const out=lock.update(new Vector3(x,0,300),q(0));if(i>15)worstLag=Math.max(worstLag,x-out.position.x);}
 // 10 mm/s at 30 updates/s: the old lock trailed up to 2.5 mm, then jumped.
 expect(worstLag).toBeLessThan(1.5);
 const still=new RestLock();still.update(new Vector3(0,0,300),q(0));let worst=0;
 for(let i=0;i<60;i++){const out=still.update(new Vector3(i%2?1:-1,0,300),q(0));worst=Math.max(worst,Math.abs(out.position.x));}
 expect(worst).toBeLessThan(.3);
});
