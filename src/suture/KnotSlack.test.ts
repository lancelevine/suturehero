import { expect,it } from 'vitest';
import * as THREE from 'three';
import { KnotSlack } from './KnotSlack';
const v=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);
it('simulates persistent first-throw free spans with exact grip endpoints and stable lengths',()=>{
  const model=new KnotSlack();const frame={enabled:true,loopLength:0,shortStart:v(0.3,0.43,0),shortEnd:v(0.4,0.95,-0.15),longStart:v(0.14,1.1,0.35),longEnd:v(-0.55,1.1,0.4)};
  for(let i=0;i<120;i++)model.update(1/60,frame);
  expect(model.state).toBe('Free spans slack');
  for(const [strand,a,b] of [[model.short,frame.shortStart,frame.shortEnd],[model.long,frame.longStart,frame.longEnd]] as const) {
    expect(strand.points[0].distanceTo(a)).toBeLessThan(1e-8);expect(strand.points.at(-1)!.distanceTo(b)).toBeLessThan(1e-8);
    expect(strand.measuredLength).toBeCloseTo(strand.length,1);
    expect(strand.points.every(p=>p.toArray().every(Number.isFinite))).toBe(true);
  }
  frame.loopLength=0.377;frame.shortStart.set(0.06,0.47,0);frame.shortEnd.set(1.25,0.72,0);frame.longStart.set(0.06,0.47,0);frame.longEnd.set(-1.25,0.72,0.05);
  for(let i=0;i<120;i++)model.update(1/60,frame);
  expect(model.state).toBe('Free spans nearly taut');
  expect(model.short.measuredLength).toBeCloseTo(model.short.length,1);expect(model.long.measuredLength).toBeCloseTo(model.long.length,1);
});
it('stops simulation outside the first throw and resets its lifecycle',()=>{
  const model=new KnotSlack();const frame={enabled:true,loopLength:0,shortStart:v(0.3,0.43,0),shortEnd:v(0.4,0.95,-0.15),longStart:v(0.14,1.1,0.35),longEnd:v(-0.55,1.1,0.4)};
  model.update(1/60,frame);const before=model.short.points.map(p=>p.clone());
  model.update(0.05,{...frame,enabled:false});expect(model.enabled).toBe(false);
  before.forEach((p,i)=>expect(p.equals(model.short.points[i])).toBe(true));
  model.reset();expect(model.enabled).toBe(false);model.update(1/60,frame);expect(model.enabled).toBe(true);
});
it('feeds material through persistent particle spans instead of reseeding them as the loop changes',()=>{
  const model=new KnotSlack();const frame={enabled:true,loopLength:0,shortStart:v(0.3,0.43,0),shortEnd:v(0.4,0.95,-0.15),longStart:v(-0.14,1.1,0.29),longEnd:v(-0.55,1.1,0.4)};
  model.update(1/60,frame);const particles=[...model.long.points];const initial=model.long.length;
  for(let i=1;i<=120;i++) {frame.loopLength=0.88*i/120;model.update(1/60,frame);}
  expect(model.long.length).toBeCloseTo(initial-0.88);
  expect(model.short.length+model.long.length+frame.loopLength).toBeCloseTo(model.material.total,12);
  expect(model.long.measuredLength).toBeCloseTo(model.long.length,1);
  particles.forEach((p,i)=>expect(model.long.points[i]).toBe(p));
  expect(model.long.points.every(p=>p.toArray().every(Number.isFinite))).toBe(true);
});
