import { expect, it } from 'vitest';
import * as THREE from 'three';
import { PullThrough } from './PullThrough';
import { NeedlePass } from '../tissue/NeedlePass';
import { SutureModel } from './SutureModel';
it('continues the same circle through forceps takeover until the whole needle clears tissue',()=>{
  const pass=new NeedlePass(); pass.begin(); pass.angle=pass.totalAngle;
  const pull=new PullThrough(); pull.begin(pass.pose); const needle=new SutureModel();
  const center=pass.center.clone(); let previous:THREE.Vector3|undefined;
  for(let i=0;i<100 && pull.phase!=='complete';i++) {
    pull.pose.decompose(needle.root.position,needle.root.quaternion,needle.root.scale);
    expect(needle.root.position.distanceTo(center)).toBeLessThan(1e-8);
    needle.root.updateWorldMatrix(true,false);
    for(const point of needle.points)expect(point.clone().applyMatrix4(needle.root.matrixWorld).distanceTo(center)).toBeCloseTo(pass.radius);
    const tip=needle.getTipPose().position;
    if(previous)expect(tip.distanceTo(previous)).toBeLessThan(0.02);
    previous=tip; pull.update(1,true,0.05);
  }
  expect(pull.phase).toBe('complete'); expect(pull.threadProgress).toBe(1);
  pull.pose.decompose(needle.root.position,needle.root.quaternion,needle.root.scale); needle.root.updateWorldMatrix(true,false);
  for(const point of needle.points)expect(point.clone().applyMatrix4(needle.root.matrixWorld).y).toBeGreaterThan(pass.entry.y);
});
it('pauses without forceps, reverses rotation and resets',()=>{
  const pull=new PullThrough(); pull.begin(new THREE.Matrix4().makeTranslation(0,0.43,0));
  pull.update(1,false,0.05); expect(pull.angle).toBe(0);
  pull.update(1,true,0.05); const angle=pull.angle;
  pull.update(-1,true,0.025); expect(pull.angle).toBeLessThan(angle);
  const paused=pull.angle; pull.update(1,false,0.05); expect(pull.angle).toBe(paused);
  pull.reset(); expect(pull.phase).toBe('waiting'); expect(pull.angle).toBe(0);
});
