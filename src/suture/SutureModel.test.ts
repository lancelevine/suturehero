import {expect,it} from 'vitest';
import {SutureModel} from './SutureModel';
it('starts and resets with a vertical, upward-facing needle clear of the pad',()=>{
 const needle=new SutureModel();
 for(let i=0;i<2;i++){
  expect(needle.getTipPose().tangent.y).toBeCloseTo(1);
  for(const p of needle.points)expect(p.clone().applyMatrix4(needle.root.matrixWorld).y).toBeGreaterThan(0.41);
  needle.root.rotation.set(0.2,0.4,0.5);needle.reset();
 }
});
