import { StrandContact } from './StrandContact';
import * as THREE from 'three';
/** Position-based strand with a fixed material length. Discrete self-contact, without force calibration. */
export class ThreadStrand {
  readonly points: THREE.Vector3[];
  private previous: THREE.Vector3[];
  readonly restLength: number;
  private accumulator=0;
  private pinned=new Set<number>();
  private delta=new THREE.Vector3();
  private contact: StrandContact;
  constructor(readonly length=3.8,readonly count=80) {
    if(length<=0 || count<3)throw new Error('A strand needs positive length and at least three particles.');
    this.restLength=length/(count-1);
    this.contact=new StrandContact(this.restLength*1.5);
    this.points=Array.from({length:count},()=>new THREE.Vector3());
    this.previous=this.points.map(p=>p.clone());
  }
  reset(path: readonly THREE.Vector3[]) {
    const curve=new THREE.CatmullRomCurve3(path.map(p=>p.clone()));
    const points=curve.getSpacedPoints(this.count-1);
    this.points.forEach((p,i)=>{p.copy(points[i]);this.previous[i].copy(p);});
    this.accumulator=0;this.pinned.clear();
  }
  advance(dt: number,anchors: ReadonlyMap<number,THREE.Vector3>,surfaceAt:(p:THREE.Vector3)=>number) {
    const step=1/120;
    this.accumulator+=Math.max(0,Math.min(dt,0.05));
    for(const index of this.pinned)if(!anchors.has(index))this.previous[index].copy(this.points[index]);
    this.pinned=new Set(anchors.keys());
    const steps=Math.floor((this.accumulator+1e-10)/step);
    const starts=new Map([...anchors].map(([i])=>[i,this.points[i].clone()]));
    let substep=0;
    while(this.accumulator+1e-10>=step) {
      substep++;
      this.accumulator-=step;
      for(let i=0;i<this.count;i++) {
        const p=this.points[i],prev=this.previous[i],anchor=anchors.get(i);
        if(anchor) {p.copy(starts.get(i)!).lerp(anchor,substep/steps);prev.copy(p);continue;}
        const x=p.x,y=p.y,z=p.z;
        p.addScaledVector(this.delta.subVectors(p,prev),0.986);p.y-=2.5*step*step;
        prev.set(x,y,z);
      }
      for(let iteration=0;iteration<24;iteration++) {
        // Alternate sweep direction to reduce directional solver bias.
        for(let n=0;n<this.count-1;n++) {
          const i=iteration%2===0?n:this.count-2-n;
          const a=this.points[i],b=this.points[i+1];
          this.delta.subVectors(b,a);const distance=this.delta.length();
          const wa=anchors.has(i)?0:1,wb=anchors.has(i+1)?0:1;
          if(distance<1e-9 || wa+wb===0)continue;
          this.delta.multiplyScalar((distance-this.restLength)/(distance*(wa+wb)));
          if(wa)a.add(this.delta);if(wb)b.sub(this.delta);
        }
        if(iteration%6===5)this.contact.resolve(this.points,this.previous,this.pinned);
        for(let i=0;i<this.count;i++)if(!anchors.has(i))this.points[i].y=Math.max(this.points[i].y,surfaceAt(this.points[i]));
      }
      for(let i=0;i<this.count;i++)if(!anchors.has(i) && this.points[i].y<=surfaceAt(this.points[i])+0.0001) {
        // Tangential surface drag, independent of how often the scene renders.
        this.previous[i].x=THREE.MathUtils.lerp(this.previous[i].x,this.points[i].x,0.18);
        this.previous[i].z=THREE.MathUtils.lerp(this.previous[i].z,this.points[i].z,0.18);
        this.previous[i].y=this.points[i].y;
      }
    }
    // Kinematic attachment remains exact even on a substep-free display frame.
    for(const [i,anchor] of anchors)this.points[i].copy(anchor);
  }
  get measuredLength() {let length=0;for(let i=1;i<this.count;i++)length+=this.points[i-1].distanceTo(this.points[i]);return length;}
}
