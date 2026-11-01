import {expect,it} from 'vitest';
import * as THREE from 'three';
import {faceGeometry,localCorners,solvePrismPose,trackerGeometry} from './prismPose';
const width=1280,height=720,focal=width/(2*Math.tan(70*Math.PI/360/2));
const axisY=new THREE.Vector3(0,1,0);
// Independent hexagonal reference: 19 mm faces, 16 mm marker, 60 degree stations.
function referenceCorners(index:number){
 const angle=index*Math.PI/3,radius=19*Math.sqrt(3)/2;
 return [[-8,-8],[8,-8],[8,8],[-8,8]].map(([x,y])=>new THREE.Vector3(Math.cos(angle)*x+Math.sin(angle)*radius,y,-Math.sin(angle)*x+Math.cos(angle)*radius));
}
function observe(firstId:number,face:number,rotation:THREE.Quaternion,translation=new THREE.Vector3(8,-6,240)){
 return {id:firstId+face,corners:referenceCorners(face).map(p=>{p.applyQuaternion(rotation).add(translation);return {x:width/2+focal*p.x/p.z,y:height/2+focal*p.y/p.z};})};
}
it('uses six 60 degree stations with identical geometry for all instrument ID ranges',()=>{
 for(let face=0;face<6;face++){
  expect(faceGeometry(face,'ring6').rotation.angleTo(new THREE.Quaternion().setFromAxisAngle(axisY,face*Math.PI/3))).toBeLessThan(1e-7);
  for(let corner=0;corner<4;corner++)expect(localCorners(face,'ring6')[corner].distanceTo(referenceCorners(face)[corner])).toBeLessThan(1e-9);
 }
});
it.each([0,10,20])('recovers the same body frame from every hexagonal face for instrument base ID %i',firstId=>{
 for(let face=0;face<6;face++)for(const tilt of [-.3,0,.3]){
  // Present this face to the camera while pitching forward/back about the shaft frame.
  const rotation=new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt,Math.PI-face*Math.PI/3,.12,'YXZ'));
  const pose=solvePrismPose([observe(firstId,face,rotation)],firstId,width,height,undefined,undefined,'ring6');
  expect(pose,`face ${face}, tilt ${tilt}`).not.toBeNull();
  expect(THREE.MathUtils.radToDeg(pose!.quaternion.angleTo(rotation))).toBeLessThan(.5);
 }
});
it.each([0,10,20])('preserves pitch direction across adjacent face handoffs for instrument base ID %i',firstId=>{
 for(let face=0;face<6;face++){
  const next=(face+1)%6;
  const rotation=new THREE.Quaternion().setFromEuler(new THREE.Euler(.2,Math.PI-(face+.5)*Math.PI/3,.1,'YXZ'));
  const a=solvePrismPose([observe(firstId,face,rotation)],firstId,width,height,undefined,undefined,'ring6');
  const b=solvePrismPose([observe(firstId,next,rotation)],firstId,width,height,a??undefined,a??undefined,'ring6');
  expect(a).not.toBeNull();expect(b).not.toBeNull();
  expect(THREE.MathUtils.radToDeg(a!.quaternion.angleTo(b!.quaternion))).toBeLessThan(.5);
  const tilt=rotation.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),.08));
  const moved=solvePrismPose([observe(firstId,next,tilt)],firstId,width,height,b!,b!,'ring6');
  const delta=b!.quaternion.clone().invert().multiply(moved!.quaternion);
  if(delta.w<0)delta.set(-delta.x,-delta.y,-delta.z,-delta.w);
  expect(delta.x).toBeGreaterThan(.025);expect(THREE.MathUtils.radToDeg(moved!.quaternion.angleTo(tilt))).toBeLessThan(.5);
 }
});
it.each([0,10,20])('keeps the hexagonal body frame through noisy single/overlap/next-face observations for base ID %i',firstId=>{
 const noisy=(marker:ReturnType<typeof observe>,phase:number)=>({...marker,corners:marker.corners.map((p,i)=>({x:p.x+.15*Math.sin(i*2.1+phase),y:p.y+.15*Math.cos(i*1.7+phase)}))});
 for(let face=0;face<6;face++){
  const next=(face+1)%6,rotation=new THREE.Quaternion().setFromEuler(new THREE.Euler(.25,Math.PI-(face+.5)*Math.PI/3,.08,'YXZ'));
  let previous=solvePrismPose([noisy(observe(firstId,face,rotation),0)],firstId,width,height,undefined,undefined,'ring6');
  expect(previous).not.toBeNull();
  for(const visible of [[face,next],[next]]){
   const pose=solvePrismPose(visible.map(f=>noisy(observe(firstId,f,rotation),1)),firstId,width,height,previous!,previous!,'ring6');
   expect(pose).not.toBeNull();expect(THREE.MathUtils.radToDeg(pose!.quaternion.angleTo(rotation))).toBeLessThan(4);previous=pose;
  }
 }
});

it('keeps face count, angular spacing and marker size explicit for each model',()=>{
 expect(trackerGeometry('ring6')).toEqual({faceCount:6,sideStepRadians:Math.PI/3,markerSizeMm:16});
 expect(trackerGeometry('prism')).toEqual({faceCount:3,sideStepRadians:2*Math.PI/3,markerSizeMm:12});
 expect(trackerGeometry('ring8')).toEqual({faceCount:8,sideStepRadians:Math.PI/3,markerSizeMm:16});
});
