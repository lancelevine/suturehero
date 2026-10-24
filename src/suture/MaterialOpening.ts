import * as THREE from 'three';
import {closestSegments} from './StrandContact';

/** A projected material bight, including the axial depth of a helical wrap.
 * Its closing edge describes an opening; it is not an extra thread segment. */
export class MaterialOpening {
  private center=new THREE.Vector3();
  private axis:THREE.Vector3;
  private horizontal:THREE.Vector3;
  private vertical:THREE.Vector3;
  private polygon:THREE.Vector3[];
  private low=Infinity;
  private high=-Infinity;
  constructor(points:readonly THREE.Vector3[],normal:THREE.Vector3){
    this.axis=normal.clone().normalize();
    this.horizontal=new THREE.Vector3(Math.abs(this.axis.x)<.8?1:0,Math.abs(this.axis.x)<.8?0:1,0).projectOnPlane(this.axis).normalize();
    this.vertical=this.axis.clone().cross(this.horizontal);
    for(const p of points)this.center.add(p);
    this.center.divideScalar(Math.max(1,points.length));
    this.polygon=points.map(p=>{
      const v=p.clone().sub(this.center),depth=v.dot(this.axis);
      this.low=Math.min(this.low,depth);this.high=Math.max(this.high,depth);
      return new THREE.Vector3(v.dot(this.horizontal),v.dot(this.vertical),0);
    });
  }
  private project(p:THREE.Vector3){
    const v=p.clone().sub(this.center);
    return new THREE.Vector3(v.dot(this.horizontal),v.dot(this.vertical),0);
  }
  private contains(p:THREE.Vector3){
    let winding=0;
    for(let i=0,j=this.polygon.length-1;i<this.polygon.length;j=i++){
      const a=this.polygon[j],b=this.polygon[i];
      if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)winding+=b.y>a.y?1:-1;
    }
    return winding!==0;
  }
  /** Follow the same local post as a supported bight moves along it. */
  nearbyPlaneCrossing(points:readonly THREE.Vector3[],around:number){
    let coordinate:number|undefined,distance=Infinity;
    for(let i=Math.max(0,Math.floor(around)-3);i<Math.min(points.length-1,Math.ceil(around)+3);i++){
      const a=points[i].clone().sub(this.center).dot(this.axis),b=points[i+1].clone().sub(this.center).dot(this.axis);
      if(a*b>0||Math.abs(a-b)<1e-9)continue;
      const q=i+a/(a-b),d=Math.abs(q-around);
      if(d<distance){distance=d;coordinate=q;}
    }
    return coordinate;
  }
  /** Bounded continuation of an already observed post, never new passage evidence. */
  containsPost(point:THREE.Vector3,margin:number){
    const depth=point.clone().sub(this.center).dot(this.axis);
    if(depth<this.low-margin||depth>this.high+margin)return false;
    const p=this.project(point);if(this.contains(p))return true;
    for(let i=0,j=this.polygon.length-1;i<this.polygon.length;j=i++){
      const hit=closestSegments(p,p,this.polygon[j],this.polygon[i]);
      if(hit.p.distanceToSquared(hit.q)<=margin*margin)return true;
    }
    return false;
  }
  /** A provisional rim contact prevents a previously threaded post escaping
   * sideways. It leaves axial pull-through and reversal free. */
  inwardCorrection(point:THREE.Vector3,margin:number){
    const p=this.project(point);
    if(this.contains(p))return new THREE.Vector3();
    let nearest:THREE.Vector3|undefined,distance=Infinity;
    for(let i=0,j=this.polygon.length-1;i<this.polygon.length;j=i++){
      const hit=closestSegments(p,p,this.polygon[j],this.polygon[i]),d=hit.p.distanceToSquared(hit.q);
      if(d<distance){distance=d;nearest=hit.q;}
    }
    if(!nearest||distance<1e-12)return new THREE.Vector3();
    const correction=nearest.sub(p);correction.multiplyScalar(1+margin/Math.sqrt(distance));
    return this.horizontal.clone().multiplyScalar(correction.x).addScaledVector(this.vertical,correction.y);
  }
  /** The held tail must still thread the material opening when metal clears.
   * Prefer the crossing nearest the free tip if a slack strand folds through twice. */
  crossingCoordinate(points:readonly THREE.Vector3[],tolerance=0){
    for(let i=points.length-2;i>=0;i--){
      const a=points[i],b=points[i+1],da=a.clone().sub(this.center).dot(this.axis),db=b.clone().sub(this.center).dot(this.axis);
      if(da*db>0||Math.abs(da-db)<1e-9)continue;
      const fraction=da/(da-db),p=this.project(a.clone().lerp(b,fraction));
      if(this.contains(p))return i+fraction;
      if(tolerance>0)for(let j=0,k=this.polygon.length-1;j<this.polygon.length;k=j++){
        const hit=closestSegments(p,p,this.polygon[k],this.polygon[j]);
        if(hit.p.distanceToSquared(hit.q)<=tolerance*tolerance)return i+fraction;
      }
    }
    return undefined;
  }
  /** Test the actual metal against the opening, rather than its bounding box.
   * Clipping to the material slab also accounts for jaws parallel to the loop. */
  intersectsCapsule(a:THREE.Vector3,b:THREE.Vector3,radius:number){
    if(this.polygon.length<3)return false;
    const da=a.clone().sub(this.center).dot(this.axis),db=b.clone().sub(this.center).dot(this.axis),difference=db-da;
    let from=0,to=1;
    if(Math.abs(difference)<1e-9){if(da<this.low-radius||da>this.high+radius)return false;}
    else{
      const t0=(this.low-radius-da)/difference,t1=(this.high+radius-da)/difference;
      from=Math.max(0,Math.min(t0,t1));to=Math.min(1,Math.max(t0,t1));
      if(from>to)return false;
    }
    const start=this.project(a.clone().lerp(b,from)),end=this.project(a.clone().lerp(b,to));
    if(this.contains(start)||this.contains(end))return true;
    for(let i=0,j=this.polygon.length-1;i<this.polygon.length;j=i++){
      const hit=closestSegments(start,end,this.polygon[j],this.polygon[i]);
      if(hit.p.distanceToSquared(hit.q)<=radius*radius)return true;
    }
    return false;
  }
}
