import {expect,it} from 'vitest';
import {Quaternion,Vector3} from 'three';
import {fitStereoMarkerPose,stereoPracticePosition} from './stereoTrackingPose';
import {localCorners} from './prismPose';
import {stereoBoard} from './stereoBoard';
it('uses the reprinted 16 mm board with 48 inner corners',()=>{
 expect(stereoBoard.squareSizeMm).toBe(16);expect(stereoBoard.innerCornersX*stereoBoard.innerCornersY).toBe(48);
});
it('recovers the same metric tracker center through all ring face handoffs',()=>{
 const q=new Quaternion().setFromAxisAngle(new Vector3(1,1,0).normalize(),.5),t=new Vector3(40,-20,900);
 for(let face=0;face<6;face++){
  const local=localCorners(face,'ring6'),world=local.map(p=>p.clone().applyQuaternion(q).add(t)),fit=fitStereoMarkerPose(local,world)!;
  expect(fit.translation.distanceTo(t)).toBeLessThan(1e-8);expect(fit.quaternion.angleTo(q)).toBeLessThan(1e-6);
 }
});
it('preserves real depth motion beyond 400 mm instead of clipping both poses to -2',()=>{
 const a=stereoPracticePosition(new Vector3(0,0,600)),b=stereoPracticePosition(new Vector3(0,0,800));
 expect(a.z).toBe(-3);expect(b.z).toBe(-4);expect(b.z-a.z).toBe(-1);
});
it('rejects degenerate or badly reconstructed marker corners',()=>{
 const local=localCorners(0,'ring6');expect(fitStereoMarkerPose(local,local.map(()=>new Vector3()))).toBeNull();
 expect(fitStereoMarkerPose(local,local.map(p=>p.clone().multiplyScalar(5)))).toBeNull();
});
