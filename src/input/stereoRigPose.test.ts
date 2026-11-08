import {measuredRing12} from './fixtures/measuredRing12';
import {expect,it} from 'vitest';
import {Euler,Matrix3,Quaternion,Vector3} from 'three';
import {chooseFallbackPose,solveStereoRigPose} from './stereoRigPose';
import {localCorners,type TrackerType} from './prismPose';
import type {StereoCalibration} from './stereoGeometry';
const cal:StereoCalibration={format:'suturehero-stereo-calibration-v1',imageSize:{width:1920,height:1080},
 camera1:{cameraMatrix:[[1314,0,930],[0,1310,540],[0,0,1]],distortionCoefficients:[-.31,.02,-.001,.0005,0]},
 camera2:{cameraMatrix:[[1317,0,955],[0,1311,550],[0,0,1]],distortionCoefficients:[-.30,.02,-.001,.0005,0]},
 stereo:{rotation:[[0,0,1],[0,1,0],[-1,0,0]],translationMm:[-600,0,500]}};
const sizes=[{width:960,height:540},{width:1280,height:720}] as const;
const rotation=new Matrix3().set(...cal.stereo.rotation.flat() as [number,number,number,number,number,number,number,number,number]);
function observation(camera:0|1,first:number,face:number,q:Quaternion,t:Vector3,type:TrackerType='ring6',noise=0,calibration=cal){
 const c=camera?calibration.camera2:calibration.camera1,k=c.cameraMatrix,d=c.distortionCoefficients;
 return {id:first+face,corners:localCorners(face,type).map((p,i)=>{
  p.applyQuaternion(q).add(t);if(camera)p.applyMatrix3(new Matrix3().set(...calibration.stereo.rotation.flat() as [number,number,number,number,number,number,number,number,number])).add(new Vector3(...calibration.stereo.translationMm as [number,number,number]));
  const x=p.x/p.z,y=p.y/p.z,r=x*x+y*y,f=1+d[0]*r+d[1]*r*r;
  const xd=x*f+2*d[2]*x*y+d[3]*(r+2*x*x),yd=y*f+d[2]*(r+2*y*y)+2*d[3]*x*y;
  return {x:(k[0][0]*xd+k[0][2])*sizes[camera].width/1920+noise*Math.sin(i*2.1+face),y:(k[1][1]*yd+k[1][2])*sizes[camera].height/1080+noise*Math.cos(i*1.7+face)};
 })};
}
it.each([0,10,20])('recovers a shared body pose from different IDs in cameras 90 degrees apart, base %i',first=>{
 const q=new Quaternion().setFromEuler(new Euler(.15,Math.PI+.1,.08,'YXZ')),t=new Vector3(10,-15,620);
 const result=solveStereoRigPose(cal,[observation(0,first,0,q,t)],[observation(1,first,4,q,t)],...sizes,first,'ring6')!;
 expect(result).not.toBeNull();expect(result.translation.distanceTo(t)).toBeLessThan(.01);expect(result.quaternion.angleTo(q)).toBeLessThan(.001);expect(result.firstIds).toEqual([first]);expect(result.secondIds).toEqual([first+4]);
});
it('preserves the center and axes through noisy face handoffs and forward/back motion',()=>{
 let previous:ReturnType<typeof solveStereoRigPose>|undefined;
 for(let i=0;i<18;i++){
  const q=new Quaternion().setFromEuler(new Euler(.1+i*.004,Math.PI+i*.01,.05,'YXZ')),t=new Vector3(i*2,-15,600+30*Math.sin(i/3));
  const first=i<6?0:5,second=i<12?4:5;
  const pose=solveStereoRigPose(cal,[observation(0,0,first,q,t,'ring6',.1)],[observation(1,0,second,q,t,'ring6',.1)],...sizes,0,'ring6',previous??undefined)!;
  expect(pose,`frame ${i}`).not.toBeNull();expect(pose.translation.distanceTo(t)).toBeLessThan(2);expect(pose.quaternion.angleTo(q)).toBeLessThan(.04);previous=pose;
 }
});
it('uses the measured angled geometry with an unrelated side face in the second camera',()=>{
 const q=new Quaternion().setFromEuler(new Euler(.2,Math.PI,.02,'YXZ')),t=new Vector3(0,-10,600);
 const pose=solveStereoRigPose(cal,[observation(0,0,6,q,t,'ring8')],[observation(1,0,4,q,t,'ring8')],...sizes,0,'ring8')!;
 expect(pose).not.toBeNull();expect(pose.translation.distanceTo(t)).toBeLessThan(.02);expect(pose.quaternion.angleTo(q)).toBeLessThan(.001);
});
it('rejects missing views, other instruments, and a corrupted sole face',()=>{
 const q=new Quaternion().setFromAxisAngle(new Vector3(0,1,0),Math.PI),t=new Vector3(0,0,600),a=observation(0,0,0,q,t),b=observation(1,0,4,q,t);
 expect(solveStereoRigPose(cal,[a],[],...sizes,0,'ring6')).toBeNull();expect(solveStereoRigPose(cal,[a],[{...b,id:14}],...sizes,0,'ring6')).toBeNull();
 b.corners[0].y+=60;expect(solveStereoRigPose(cal,[a],[b],...sizes,0,'ring6')).toBeNull();
});
it('can exclude a bad extra face while retaining a genuine constraint in each camera',()=>{
 const q=new Quaternion().setFromAxisAngle(new Vector3(0,1,0),Math.PI),t=new Vector3(0,0,600),bad=observation(0,0,5,q,t);bad.corners.forEach(p=>p.x+=90);
 const pose=solveStereoRigPose(cal,[observation(0,0,0,q,t),bad],[observation(1,0,4,q,t)],...sizes,0,'ring6')!;
 expect(pose).not.toBeNull();expect(pose.translation.distanceTo(t)).toBeLessThan(.02);expect(pose.firstIds).toEqual([0]);
});

it('supports general calibrated camera roll/pitch/yaw rather than only rectified cameras',()=>{
 const calibration={...cal,stereo:{rotation:[[.31882812485741474,-.39588001220194774,.8611780551888736],[.5249281151118488,.830275048017322,.18733344230263732],[-.7891762165480068,.39232940315354853,.4725235852908868]],translationMm:[-376.9846742607226,-105.05789240387992,241.5683913076526]}};
 const q=new Quaternion().setFromEuler(new Euler(.1,Math.PI,.05,'YXZ')),t=new Vector3(0,-10,600);
 const pose=solveStereoRigPose(calibration,[observation(0,0,0,q,t,'ring6',0,calibration)],[observation(1,0,4,q,t,'ring6',0,calibration)],...sizes,0,'ring6')!;
 expect(pose).not.toBeNull();expect(pose.translation.distanceTo(t)).toBeLessThan(.02);expect(pose.quaternion.angleTo(q)).toBeLessThan(.001);
});
it('reports why a stereo fit was rejected',()=>{
 const q=new Quaternion().setFromAxisAngle(new Vector3(0,1,0),Math.PI),t=new Vector3(0,0,600),a=observation(0,0,0,q,t),b=observation(1,0,4,q,t);
 const diagnostics:{reason?:string}={};
 expect(solveStereoRigPose(cal,[a],[],...sizes,0,'ring6',undefined,diagnostics)).toBeNull();
 expect(diagnostics.reason).toBe('camera 2 sees no marker of this instrument');
 expect(solveStereoRigPose(cal,[a],[{...b,id:14}],...sizes,0,'ring6',undefined,diagnostics)).toBeNull();
 expect(diagnostics.reason).toBe('camera 2 sees no marker of this instrument');
 const tiny={id:4,corners:[{x:100,y:100},{x:102,y:100},{x:102,y:102},{x:100,y:102}]};
 expect(solveStereoRigPose(cal,[a],[tiny],...sizes,0,'ring6',undefined,diagnostics)).toBeNull();
 expect(diagnostics.reason).toBe('camera 2 markers 4 too small or malformed');
 const bad={...b,corners:b.corners.map((p,i)=>i?p:{x:p.x,y:p.y+60})};
 expect(solveStereoRigPose(cal,[a],[bad],...sizes,0,'ring6',undefined,diagnostics)).toBeNull();
 expect(diagnostics.reason).toMatch(/fit error [\d.]+ px \(limit 3\).*per marker px: cam1 0:[\d.]+ · cam2 4:[\d.]+/);
 expect(solveStereoRigPose(cal,[a],[b],...sizes,0,'ring6',undefined,diagnostics)).not.toBeNull();
 expect(diagnostics.reason).toBeUndefined();
});

it('accepts measured 12 mm ring markers in recorded camera observations',()=>{
 const f=measuredRing12;
 const pose=solveStereoRigPose(f.calibration,f.first,f.second,f.size,f.size,0,'ring8');
 expect(pose).not.toBeNull();
 expect(pose!.errorPx).toBeLessThan(3);
});
it('recovers a genuine two-camera constraint despite conflicting extra instrument IDs',()=>{
 const f=measuredRing12,diagnostics={reason:'old failure'};
 const pose=solveStereoRigPose(f.calibration,f.allFirst,f.allSecond,f.size,f.size,0,'ring8',undefined,diagnostics);
 expect(pose).not.toBeNull();
 expect(pose!.firstIds).toEqual([6]);
 expect(pose!.secondIds).toEqual([6]);
 expect(pose!.errorPx).toBeLessThan(3);
 expect(diagnostics.reason).toBeUndefined();
 const corrupt=f.second.map(m=>({...m,corners:m.corners.map(p=>({x:p.x,y:p.y+80}))}));
 expect(solveStereoRigPose(f.calibration,f.allFirst,corrupt,f.size,f.size,0,'ring8')).toBeNull();
 expect(solveStereoRigPose(f.calibration,f.allFirst,[],f.size,f.size,0,'ring8')).toBeNull();
});
it('keeps a single-marker fallback continuous instead of flipping between disagreeing faces',()=>{
 const pose=(degrees:number,errorPx:number)=>({quaternion:new Quaternion().setFromAxisAngle(new Vector3(0,1,0),degrees*Math.PI/180),errorPx});
 const a=pose(0,1.2),b=pose(60,.4);
 expect(chooseFallbackPose([a,b])).toBe(b); // no history: lowest error
 expect(chooseFallbackPose([a,b],pose(5,0))).toBe(a); // stays near the previous pose
 expect(chooseFallbackPose([a,b],pose(55,0))).toBe(b);
 expect(chooseFallbackPose([a,b],pose(-40,0))).toBeNull(); // every option would jump >25°
});
