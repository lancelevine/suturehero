import {Matrix4,Quaternion,Vector3} from 'three';
/** Fit the tracker body, not a face center, to triangulated marker corners. */
export function fitStereoMarkerPose(local:Vector3[],world:Vector3[]){
 if(local.length!==4||world.length!==4||world.some(v=>!v.toArray().every(Number.isFinite)))return null;
 const basis=(points:Vector3[])=>{
  const x=points[1].clone().sub(points[0]).add(points[2].clone().sub(points[3]));
  const y=points[3].clone().sub(points[0]).add(points[2].clone().sub(points[1]));
  const z=new Vector3().crossVectors(x,y);if(x.length()<1e-6||z.length()<1e-6)return null;
  x.normalize();z.normalize();y.crossVectors(z,x).normalize();
  return new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(x,y,z));
 };
 const a=basis(local),b=basis(world);if(!a||!b)return null;
 const quaternion=b.multiply(a.invert()).normalize(),lc=new Vector3(),wc=new Vector3();
 for(let i=0;i<4;i++){lc.add(local[i]);wc.add(world[i]);}lc.multiplyScalar(.25);wc.multiplyScalar(.25);
 const translation=wc.sub(lc.applyQuaternion(quaternion));
 const errorMm=Math.sqrt(world.reduce((sum,p,i)=>sum+p.distanceToSquared(local[i].clone().applyQuaternion(quaternion).add(translation)),0)/4);
 return errorMm<5?{quaternion,translation,errorMm}:null;
}
/** Keep absolute depth unbounded; workspace limits apply after relative anchoring. */
export const stereoPracticePosition=(mm:Vector3)=>new Vector3(mm.x/200,-mm.y/200,-mm.z/200);
