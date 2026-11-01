import {expect,it} from 'vitest';
import * as THREE from 'three';
import {localCorners,solvePrismPose,type PrismPose} from './prismPose';
const width=960,height=540,focal=width/(2*Math.tan(70*Math.PI/360/2));
const pitch=(q:THREE.Quaternion)=>{const shaft=new THREE.Vector3(0,1,0).applyQuaternion(q);return Math.atan2(shaft.z,shaft.y);};
function image(face:number,q:THREE.Quaternion,noise:()=>number){return {id:face,corners:localCorners(face,'ring6').map(p=>{p.applyQuaternion(q).add(new THREE.Vector3(0,-10,600));return {x:width/2+focal*p.x/p.z+noise(),y:height/2+focal*p.y/p.z+noise()};})};}
it('retains the forward tilt of a small needle-driver hexagonal marker across noisy face handoffs',()=>{
 let min=Infinity,worst=0;
 for(let seed=1;seed<=16;seed++){
  let state=seed;const noise=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return (state/4294967296-.5)*2;};
  let previous:PrismPose|undefined;
  for(let frame=0;frame<=32;frame++){
   const roll=Math.PI-.4-frame*.03;
   const q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),.28).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),roll));
   const face=roll>Math.PI-1?0:1;
   const pose=solvePrismPose([image(face,q,frame?noise:()=>0)],0,width,height,previous,previous,'ring6');
   expect(pose).not.toBeNull();previous=pose!;
   const angle=pitch(pose!.quaternion);if(angle<min){min=angle;worst=seed;}
  }
 }
 expect(min,`minimum pitch ${min*180/Math.PI}°, noise seed ${worst}`).toBeGreaterThan(0);
});
