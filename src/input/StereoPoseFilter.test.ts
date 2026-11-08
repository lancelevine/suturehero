import {expect,it} from 'vitest';
import {MathUtils,Quaternion,Vector3} from 'three';
import {StereoPoseFilter} from './StereoPoseFilter';

const rotation=(degrees:number)=>new Quaternion().setFromAxisAngle(new Vector3(0,1,0),MathUtils.degToRad(degrees));

it('rejects isolated alternate-pose solutions and suppresses stationary jitter',()=>{
 const filter=new StereoPoseFilter();filter.update(new Vector3(),rotation(0),0);
 for(let frame=1;frame<=120;frame++){
  const outlier=frame%12===0,sign=frame%2?1:-1;
  filter.update(new Vector3(outlier?2:sign*.025,0,0),rotation(outlier?80:sign*3),frame*1000/15);
 }
 expect(Math.abs(filter.position.x)).toBeLessThan(.01);
 expect(MathUtils.radToDeg(filter.quaternion.angleTo(rotation(0)))).toBeLessThan(1);
});

it('follows continuous movement and reacquires a sustained discontinuity',()=>{
 const filter=new StereoPoseFilter();filter.update(new Vector3(),rotation(0),0);
 for(let frame=1;frame<=15;frame++)filter.update(new Vector3(frame/30,0,0),rotation(frame*2),frame*1000/15);
 expect(filter.position.x).toBeGreaterThan(.35);
 expect(MathUtils.radToDeg(filter.quaternion.angleTo(rotation(30)))).toBeLessThan(8);
 const before=filter.position.clone();
 expect(filter.update(new Vector3(2,0,0),rotation(80),1100)).toBe(false);
 expect(filter.position.toArray()).toEqual(before.toArray());
 filter.update(new Vector3(2.01,0,0),rotation(81),1167);
 expect(filter.update(new Vector3(2.02,0,0),rotation(82),1234)).toBe(true);
 expect(filter.position.x).toBeGreaterThan(before.x);
});
