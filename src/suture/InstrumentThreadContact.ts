import * as THREE from 'three';
import type { Instrument } from '../instruments/Instrument';
import { closestSegments } from './StrandContact';
import { THREAD_RADIUS } from './threadMaterial';
interface Capsule {a:THREE.Vector3;b:THREE.Vector3;radius:number;bounds:THREE.Box3}
/** Discrete segment/capsule contact. Instrument bodies remain kinematic. */
export class InstrumentThreadContact {
  private capsules:Capsule[]=[];
  configure(tools:readonly Instrument[]) {
    this.capsules=[];
    for(const tool of tools) {
      tool.root.updateWorldMatrix(true,false);
      const add=(a:THREE.Vector3,b:THREE.Vector3,radius:number)=>{
        a.applyMatrix4(tool.root.matrixWorld);b.applyMatrix4(tool.root.matrixWorld);
        this.capsules.push({a,b,radius:radius+THREAD_RADIUS,bounds:new THREE.Box3().setFromPoints([a,b]).expandByScalar(radius+THREAD_RADIUS)});
      };
      if(tool.kind==='needle-driver')add(new THREE.Vector3(0,0,0.3),new THREE.Vector3(0,0,2.9),0.077);
      for(const side of [-1,1]) {
        if(tool.kind==='forceps') {
          const at=(t:number)=>new THREE.Vector3(side*(tool.openness*0.18*(1-t)+0.085*Math.sin(Math.PI*t)+(0.045+0.05*Math.sin(Math.PI*t))/2),0,t*3.1);
          add(at(0),at(0.15),0.045);continue;
        }
        const pivot=new THREE.Vector3(side*0.035,0,0.35);
        const tip=new THREE.Vector3(0,0,-0.42).applyAxisAngle(new THREE.Vector3(0,1,0),side*tool.openness*0.35).add(pivot);
        add(pivot,tip,0.04);
      }
    }
  }
  resolve=(points:THREE.Vector3[],previous:THREE.Vector3[],pinned:ReadonlySet<number>)=>{
    const bounds=new THREE.Box3();
    for(let i=0;i<points.length-1;i++) {
      bounds.setFromPoints([points[i],points[i+1]]);
      for(const capsule of this.capsules) {
        if(!bounds.intersectsBox(capsule.bounds))continue;
        const closest=closestSegments(points[i],points[i+1],capsule.a,capsule.b);
        const normal=closest.p.clone().sub(closest.q),distance=normal.length();
        if(distance>=capsule.radius)continue;
        if(distance>1e-8)normal.divideScalar(distance);
        else {
          normal.crossVectors(capsule.b.clone().sub(capsule.a),points[i+1].clone().sub(points[i]));
          if(normal.lengthSq()<1e-8)normal.subVectors(capsule.b,capsule.a).cross(new THREE.Vector3(0,1,0));
          if(normal.lengthSq()<1e-8)normal.set(1,0,0);else normal.normalize();
        }
        const weights=[1-closest.s,closest.s];
        const denominator=weights.reduce((sum,w,n)=>sum+(pinned.has(i+n)?0:w*w),0);
        if(denominator<1e-10)continue;
        for(let n=0;n<2;n++)if(!pinned.has(i+n)) {
          const correction=normal.clone().multiplyScalar(Math.min(0.04,(capsule.radius-distance)*weights[n]/denominator));
          points[i+n].add(correction);previous[i+n].add(correction);
        }
      }
    }
  };
}
/** Contact-local winding, not an inferred knot topology or security score. */
export function shaftWinding(points:readonly THREE.Vector3[],driverWorld:THREE.Matrix4) {
  const inverse=driverWorld.clone().invert();let angle=0;
  for(let i=1;i<points.length;i++) {
    const a=points[i-1].clone().applyMatrix4(inverse),b=points[i].clone().applyMatrix4(inverse);
    const near=(p:THREE.Vector3)=>p.z>=0.25 && p.z<=2.9 && Math.hypot(p.x,p.y)>=0.07 && Math.hypot(p.x,p.y)<=0.25;
    if(!near(a)||!near(b))continue;
    const delta=Math.atan2(b.y,b.x)-Math.atan2(a.y,a.x);
    angle+=Math.atan2(Math.sin(delta),Math.cos(delta));
  }
  return angle/(Math.PI*2);
}
