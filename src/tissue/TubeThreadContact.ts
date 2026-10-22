import type {StrandObstacle} from '../suture/ThreadStrand';
import {THREAD_RADIUS} from '../suture/threadMaterial';
import type {MicroTargetProfile} from '../environments/MicroTargets';
/** Contact against two hollow tube walls, including their annular cut faces.
 * Projects along the nearest surface normal, never to a height-field top. */
export function tubeThreadContact(shape:MicroTargetProfile,clearance=THREAD_RADIUS+.001):StrandObstacle{
 const outer=shape.outerRadius+clearance,inner=shape.innerRadius-clearance;
 const near=shape.gap/2-clearance,far=shape.gap/2+shape.length+clearance;
 return (points,previous,pinned)=>{
  for(let i=0;i<points.length;i++){
   if(pinned.has(i))continue;
   const p=points[i],old=previous[i],x=Math.abs(p.x);if(x<near||x>far)continue;
   const y=p.y-shape.centerY,z=p.z,r=Math.hypot(y,z),oldRadius=Math.hypot(old.y-shape.centerY,old.z);
   const cameFromWall=Math.abs(old.x)>=near&&Math.abs(old.x)<=far;
   const crossedOuter=cameFromWall&&oldRadius>=outer-1e-6&&r<outer;
   const crossedInner=cameFromWall&&oldRadius<=inner+1e-6&&r>inner;
   if(!crossedOuter&&!crossedInner&&(r>=outer||r<=inner))continue;
   let targetRadius=crossedOuter?outer:crossedInner?inner:r-inner<outer-r?inner:outer;
   const radialDistance=Math.abs(targetRadius-r),endDistance=Math.min(x-near,far-x);
   let dx=0,dy=0,dz=0;
   if(endDistance<radialDistance){dx=Math.sign(p.x)*((x-near<far-x?near:far)-x);}
   else {
    const ny=r>1e-9?y/r:(old.y-shape.centerY)/Math.max(oldRadius,1e-9),nz=r>1e-9?z/r:old.z/Math.max(oldRadius,1e-9);
    dy=ny*(targetRadius-r);dz=nz*(targetRadius-r);
   }
   p.x+=dx;p.y+=dy;p.z+=dz;old.x+=dx;old.y+=dy;old.z+=dz;
   // Remove inward velocity, while allowing motion tangential to the wall.
   const length=Math.hypot(dx,dy,dz);if(length<1e-10)continue;
   const nx=dx/length,ny=dy/length,nz=dz/length,inward=(p.x-old.x)*nx+(p.y-old.y)*ny+(p.z-old.z)*nz;
   if(inward<0){old.x+=nx*inward;old.y+=ny*inward;old.z+=nz*inward;}
  }
 };
}
