import { expect, it } from 'vitest';
import * as THREE from 'three';
import { WoundApproximation } from './WoundApproximation';
it('brings the local opposing edges together without crossing or closing the rest of the incision',()=>{
  const model=new WoundApproximation();
  for(let i=0;i<40;i++)model.update(1,0.05);
  const left=model.deformPoint(new THREE.Vector3(-0.05,0.41,0));
  const right=model.deformPoint(new THREE.Vector3(0.05,0.41,0));
  expect(left.x).toBeLessThan(0);expect(right.x).toBeGreaterThan(0);
  expect(right.x-left.x).toBeCloseTo(model.minimumGap,4);
  expect(right.x-left.x).toBeCloseTo(model.gapAt(0),6);
  expect(model.gapAt(1.6)).toBeGreaterThan(0.099);
  expect(model.deformPoint(new THREE.Vector3(2.6,0.41,0)).x).toBe(2.6);
  expect(right.y).toBe(0.41);
});
it('eases closure and release, caps the visual range and restores the original gap on reset',()=>{
  const model=new WoundApproximation();model.update(1,0.05);
  expect(model.closure).toBeGreaterThan(0);expect(model.closure).toBeLessThan(1);
  const previous=model.closure;model.update(0,0.05);expect(model.closure).toBeLessThan(previous);
  for(let i=0;i<40;i++)model.update(4,0.05);expect(model.closure).toBeLessThanOrEqual(1);
  model.reset();expect(model.gapAt(0)).toBe(model.initialGap);
  const point=new THREE.Vector3(0.3,0.43,0);expect(model.deformPoint(point).equals(point)).toBe(true);
});
