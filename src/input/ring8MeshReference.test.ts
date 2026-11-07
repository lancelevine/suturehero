import {expect,it} from 'vitest';
import {Quaternion,Vector3} from 'three';
import {bodyPoseFromMarker,faceGeometry,localCorners,solvePrismPose} from './prismPose';
import {estimateMarkerPose} from './markerPose';
import {fitStereoMarkerPose} from './stereoTrackingPose';
// Independent outer pad vertices measured from the user's ASCII STL, in mm.
// Not generated using the software's tracker geometry.
const pads=[
 [[-16.7991,10.0969,9.6],[-12.0491,1.86965,26.0545],[-.344615,19.5969,9.6],[4.40539,11.3696,26.0545]],
 [[-4.40539,-11.3696,26.0545],[.344615,-19.5969,9.6],[12.0491,-1.86965,26.0545],[16.7991,-10.0969,9.6]]
];
const toBody=(v:number[])=>new Vector3(-Math.sqrt(3)/2*v[0]-.5*v[1],v[2],-.5*v[0]+Math.sqrt(3)/2*v[1]);
function reference(face:number){
 const pts=pads[face-6].map(toBody),center=pts.reduce((v,p)=>v.add(p),new Vector3()).multiplyScalar(.25);
 // Pad corners ordered as marker top-left/top-right/bottom-right/bottom-left,
 // maintaining the same axial printed orientation as side markers.
 const order=face===6?[2,0,1,3]:[1,3,2,0];
 return order.map(i=>pts[i].clone().sub(center).multiplyScalar(16/19).add(center));
}
const width=1280,height=720,focal=width/(2*Math.tan(70*Math.PI/360/2));
const project=(points:Vector3[],id:number,q:Quaternion,t:Vector3)=>({id,corners:points.map(v=>{const p=v.clone().applyQuaternion(q).add(t);return {x:width/2+focal*p.x/p.z,y:height/2+focal*p.y/p.z};})});
it('matches both angled marker planes and centers from the STL',()=>{
 for(const face of [6,7])for(let i=0;i<4;i++)expect(localCorners(face,'ring8')[i].distanceTo(reference(face)[i])).toBeLessThan(.0001);
 for(let face=0;face<6;face++){
  expect(faceGeometry(face,'ring8').center.distanceTo(faceGeometry(face,'ring6').center)).toBe(0);
  expect(faceGeometry(face,'ring8').rotation.angleTo(faceGeometry(face,'ring6').rotation)).toBeLessThan(1e-7);
 }
});
it.each([0,10,20])('preserves pose through side/angled/overlap handoffs for instrument base %i',first=>{
 for(const [side,angled] of [[0,6],[3,7]]){
  const q=new Quaternion().setFromAxisAngle(new Vector3(0,1,0),Math.PI-side*Math.PI/3).multiply(new Quaternion().setFromAxisAngle(new Vector3(1,0,0),.22)),t=new Vector3(8,-6,350);
  const a=project(localCorners(side,'ring6'),first+side,q,t),b=project(reference(angled),first+angled,q,t);
  let previous=solvePrismPose([a],first,width,height,undefined,undefined,'ring8')!;
  for(const markers of [[a,b],[b],[a]]){
   const pose=solvePrismPose(markers,first,width,height,previous,previous,'ring8')!;
   expect(pose).not.toBeNull();expect(pose.quaternion.angleTo(q)).toBeLessThan(.003);expect(pose.translation.distanceTo(t)).toBeLessThan(.1);previous=pose;
  }
  for(const axis of [new Vector3(1,0,0),new Vector3(0,1,0),new Vector3(0,0,1)]){
   const moved=q.clone().multiply(new Quaternion().setFromAxisAngle(axis,.08));
   const next=solvePrismPose([project(reference(angled),first+angled,moved,t)],first,width,height,previous,previous,'ring8')!;
   expect(next).not.toBeNull();expect(next.quaternion.angleTo(moved)).toBeLessThan(.003);
   const delta=q.clone().invert().multiply(next.quaternion);if(delta.w<0)delta.set(-delta.x,-delta.y,-delta.z,-delta.w);
   expect(new Vector3(delta.x,delta.y,delta.z).dot(axis)).toBeGreaterThan(.035);
  }
  const mono=estimateMarkerPose(b,width,height,16)!;
  expect(bodyPoseFromMarker(mono,angled,'ring8').translation.distanceTo(t)).toBeLessThan(.01);
  const stereo=fitStereoMarkerPose(localCorners(angled,'ring8'),reference(angled).map(p=>p.clone().applyQuaternion(q).add(t)))!;
  expect(stereo.translation.distanceTo(t)).toBeLessThan(.001);expect(stereo.quaternion.angleTo(q)).toBeLessThan(.0001);
 }
});
