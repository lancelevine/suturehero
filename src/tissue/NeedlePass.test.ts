import { expect, it } from 'vitest';
import * as THREE from 'three';
import { NeedlePass } from './NeedlePass';
import { SutureModel } from '../suture/SutureModel';
it('carries the actual needle tip along its own radius from right entry to left exit',()=>{
  const pass=new NeedlePass(); const needle=new SutureModel(); pass.begin();
  expect(pass.entry.x).toBeGreaterThan(0); expect(pass.exit.x).toBeLessThan(0);
  let previousX=pass.entry.x;
  for(let i=0;i<100;i++) {
    const m=pass.pose; m.decompose(needle.root.position,needle.root.quaternion,needle.root.scale);
    const tip=needle.getTipPose();
    if(pass.angle<=Math.PI)expect(tip.position.x).toBeLessThanOrEqual(previousX+1e-8); previousX=tip.position.x;
    expect(tip.position.distanceTo(pass.center)).toBeCloseTo(pass.radius);
    if(pass.angle<=Math.PI)expect(tip.position.y).toBeLessThanOrEqual(pass.entry.y+1e-8);
    else expect(tip.position.y).toBeGreaterThan(pass.entry.y);
    if(i===0) { expect(tip.position.distanceTo(pass.entry)).toBeLessThan(1e-8); expect(tip.tangent.y).toBeCloseTo(-1); }
    pass.update(1,true,0.05);
  }
  pass.pose.decompose(needle.root.position,needle.root.quaternion,needle.root.scale);
  expect(pass.phase).toBe('complete'); expect(needle.getTipPose().position.y).toBeGreaterThan(pass.exit.y);
  const final=pass.angle; pass.angle=Math.PI; pass.pose.decompose(needle.root.position,needle.root.quaternion,needle.root.scale);
  expect(needle.getTipPose().position.distanceTo(pass.exit)).toBeLessThan(1e-8); pass.angle=final;
  expect(needle.getTipPose().tangent.y).toBeCloseTo(1);
});
it('supports reverse motion, stops on release, and resets',()=>{
  const pass=new NeedlePass(); pass.begin(); pass.update(1,true,0.05); const angle=pass.angle;
  pass.update(-1,true,0.025); expect(pass.angle).toBeLessThan(angle);
  pass.update(1,false,0.05); expect(pass.phase).toBe('interrupted'); expect(pass.progress).toBeLessThan(1);
  pass.update(1,true,0.05); expect(pass.phase).toBe('interrupted');
  pass.reset(); expect(pass.phase).toBe('idle'); expect(pass.progress).toBe(0);
});

it('records bilateral dermal purchase only after the needle reaches each side',()=>{
  const pass=new NeedlePass();pass.begin();expect(pass.dermalBites).toEqual([null,null]);
  for(let i=0;i<15;i++)pass.update(1,true,0.05);
  expect(pass.dermalBites[0]?.y).toBeCloseTo(0.31);expect(pass.dermalBites[1]).toBeNull();
  for(let i=0;i<85;i++)pass.update(1,true,0.05);
  expect(pass.dermalBites[1]?.y).toBeCloseTo(0.31);expect(pass.dermalBites[1]!.x).toBeLessThan(0);
  pass.reset();expect(pass.dermalBites).toEqual([null,null]);
});
