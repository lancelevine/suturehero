import {describe,it,expect} from 'vitest';
import {parseCalibration,triangulate,calibrationMatches} from './stereoGeometry';
const c={format:'suturehero-stereo-calibration-v1',imageSize:{width:1000,height:800},
 camera1:{cameraMatrix:[[1000,0,500],[0,1000,400],[0,0,1]],distortionCoefficients:[0,0,0,0,0]},
 camera2:{cameraMatrix:[[1000,0,500],[0,1000,400],[0,0,1]],distortionCoefficients:[0,0,0,0,0]},
 stereo:{rotation:[[1,0,0],[0,1,0],[0,0,1]],translationMm:[-260,0,0],baselineMm:260,rmsPx:1}
};
describe('stereo metric triangulation',()=>{
 it('rejects capture-only files',()=>expect(()=>parseCalibration({format:'suturehero-stereo-captures-v1'})).toThrow());
 it('recovers known 3D point and rectified epipolar alignment',()=>{
  const cal=parseCalibration(c),size={width:1000,height:800};
  const result=triangulate(cal,{x:550,y:420},{x:290,y:420},size,size);
  expect(result).not.toBeNull();
  expect(result!.xyzMm[0]).toBeCloseTo(50,3);
  expect(result!.xyzMm[1]).toBeCloseTo(20,3);
  expect(result!.xyzMm[2]).toBeCloseTo(1000,3);
  expect(result!.epipolarErrorPx).toBeLessThan(.001);
  expect(result!.rayGapMm).toBeLessThan(.001);
 });
 it('rejects mismatched cameras and aspect ratios',()=>{
  const cal=parseCalibration({...c,cameraIds:{first:'a',second:'b'}});
  expect(calibrationMatches(cal,'a','c',1000,800,1000,800)).toMatch(/Camera IDs/);
  expect(calibrationMatches(cal,'a','b',1000,800,1000,500)).toMatch(/aspect ratio/);
 });
});
