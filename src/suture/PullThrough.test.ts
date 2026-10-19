import { expect, it } from 'vitest';
import * as THREE from 'three';
import { PullThrough } from './PullThrough';
it('requires forceps, clears the needle before taking up thread, and supports pause and reverse',()=>{
  const pull=new PullThrough(); pull.begin(new THREE.Matrix4().makeTranslation(-0.1,0.43,0));
  pull.update(1,false,0.05); expect(pull.distance).toBe(0);
  for(let i=0;i<10;i++)pull.update(1,true,0.05);
  expect(pull.threadProgress).toBe(0);
  const distance=pull.distance; pull.update(-1,true,0.05); expect(pull.distance).toBeLessThan(distance);
  for(let i=0;i<50;i++)pull.update(1,true,0.05);
  expect(pull.phase).toBe('complete'); expect(pull.threadProgress).toBe(1);
  const point=new THREE.Vector3().setFromMatrixPosition(pull.pose); expect(point.y).toBeCloseTo(1.83);
  pull.reset(); expect(pull.phase).toBe('waiting'); expect(pull.distance).toBe(0);
});
