import type {StrandObstacle} from '../suture/ThreadStrand';
/** Approximate pad contact, including its outer sides. The incision route is
 * handled by pinned material guides; this contact retains the existing top. */
export function skinThreadContact(topAt:(p:import('three').Vector3)=>number=()=>.423):StrandObstacle{
 return (points,previous,pinned)=>{
  for(let i=0;i<points.length;i++){
   if(pinned.has(i))continue;
   const p=points[i],old=previous[i],dx=2.68-Math.abs(p.x),dz=1.685-Math.abs(p.z),dy=topAt(p)-p.y;
   if(dx<0||dz<0||dy<0||p.y<.04)continue;
   if(dy<=dx&&dy<=dz){
    p.y+=dy;old.y=p.y;old.x+=(p.x-old.x)*.18;old.z+=(p.z-old.z)*.18;
   }else if(dx<dz){const correction=Math.sign(p.x)*dx;p.x+=correction;old.x=p.x;}
   else {const correction=Math.sign(p.z)*dz;p.z+=correction;old.z=p.z;}
  }
 };
}
