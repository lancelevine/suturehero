import {expect,it} from 'vitest';
import {Quaternion,Vector3} from 'three';
import {RingPoseTracker} from './RingPoseTracker';
import {faceGeometry,localCorners,solvePrismPose} from './prismPose';
const width=1280,height=720,focal=width/(2*Math.tan(70*Math.PI/360/2));
const translation=new Vector3(10,-5,450);
function observe(first:number,face:number,q:Quaternion,printedTurn=0){
 const g=faceGeometry(face,'ring8');
 const points=printedTurn?localCorners(face,'ring8').map(p=>p.sub(g.center).applyQuaternion(g.rotation.clone().invert()).applyQuaternion(new Quaternion().setFromAxisAngle(new Vector3(0,0,1),printedTurn)).applyQuaternion(g.rotation).add(g.center)):localCorners(face,'ring8');
 return {id:first+face,corners:points.map(p=>{p.applyQuaternion(q).add(translation);return {x:width/2+focal*p.x/p.z,y:height/2+focal*p.y/p.z};})};
}
it.each([0,10,20])('keeps side axes authoritative and learns angled alignment for base %i',first=>{
 for(const [side,angle] of [[0,6],[3,7]]){
  const tracker=new RingPoseTracker();
  const base=new Quaternion().setFromAxisAngle(new Vector3(0,1,0),Math.PI-side*Math.PI/3).multiply(new Quaternion().setFromAxisAngle(new Vector3(1,0,0),.2));
  let pose=solvePrismPose([observe(first,side,base)],first,width,height,undefined,undefined,'ring8')!;
  for(let i=0;i<6;i++){
   const q=base.clone().multiply(new Quaternion().setFromAxisAngle(new Vector3(0,0,1),i*.01));
   const markers=[observe(first,side,q),observe(first,angle,q,Math.PI/2)];
   pose=tracker.solve(markers,first,width,height,i*40,pose,pose)!;
   expect(pose.quaternion.angleTo(q)).toBeLessThan(.002);expect(pose.faces).toBe(1);
  }
  expect(tracker.status).toContain('aligned');
  for(const axis of [new Vector3(1,0,0),new Vector3(0,1,0),new Vector3(0,0,1)]){
   const q=base.clone().multiply(new Quaternion().setFromAxisAngle(axis,.12));
   const next=tracker.solve([observe(first,angle,q,Math.PI/2)],first,width,height,400,pose,pose)!;
   expect(next).not.toBeNull();expect(next.quaternion.angleTo(q)).toBeLessThan(.002);expect(next.translation.distanceTo(translation)).toBeLessThan(.02);
  }
 }
});
it('requires distinct agreeing overlap images before an angled-only handoff',()=>{
 const tracker=new RingPoseTracker(),q=new Quaternion().setFromAxisAngle(new Vector3(0,1,0),Math.PI);
 const side=observe(0,0,q),angle=observe(0,6,q);
 expect(tracker.solve([angle],0,width,height,0)).toBeNull();
 for(let i=0;i<8;i++)tracker.solve([side,angle],0,width,height,10);
 expect(tracker.solve([angle],0,width,height,20)).toBeNull();
 for(let i=1;i<=4;i++)tracker.solve([side,angle],0,width,height,40*i);
 expect(tracker.solve([angle],0,width,height,200)).not.toBeNull();
});
it('cannot silently initialize from an unvalidated angled face after restart',()=>{
 const q=new Quaternion().setFromAxisAngle(new Vector3(0,1,0),Math.PI);
 const tracker=new RingPoseTracker();expect(tracker.solve([observe(0,6,q)],0,width,height,0)).toBeNull();expect(tracker.status).toContain('together');
});
