import * as THREE from 'three';
import type { Instrument } from '../instruments/Instrument';
import type { SutureModel } from './SutureModel';
/** Assisted body grasps retain their local attachment point throughout motion. */
export class NeedleGrasp {
  holder: Instrument | null=null;
  candidate: Instrument | null=null;
  receiver: Instrument | null=null;
  heldPoint: THREE.Vector3 | null=null;
  candidatePoint: THREE.Vector3 | null=null;
  receiverPoint: THREE.Vector3 | null=null;
  private relative=new THREE.Matrix4();
  private previous=new Map<Instrument,number>();
  constructor(readonly needle: SutureModel) {}
  findGrip(tool: Instrument, exposedOnly=false): THREE.Vector3 | null {
    tool.root.updateWorldMatrix(true,false); this.needle.root.updateWorldMatrix(true,false);
    const jaw=tool.root.localToWorld(new THREE.Vector3(0,0,0.05));
    const inverse=this.needle.root.matrixWorld.clone().invert();
    const toTool=tool.root.matrixWorld.clone().invert();
    let closest: THREE.Vector3 | null=null, distance=Infinity;
    for(let i=1;i<this.needle.points.length;i++) {
      const a=this.needle.points[i-1].clone().applyMatrix4(this.needle.root.matrixWorld);
      const b=this.needle.points[i].clone().applyMatrix4(this.needle.root.matrixWorld);
      // Clip each segment at the skin surface; buried body cannot be grasped.
      if(exposedOnly) {
        if(a.y<0.425 && b.y<0.425) continue;
        if(a.y<0.425) a.lerp(b,(0.425-a.y)/(b.y-a.y));
        if(b.y<0.425) b.lerp(a,(0.425-b.y)/(a.y-b.y));
      }
      const nearest=new THREE.Line3(a,b).closestPointToPoint(jaw,true,new THREE.Vector3());
      const local=nearest.clone().applyMatrix4(toTool);
      const eligible=exposedOnly?nearest.distanceTo(jaw)<=0.24:Math.abs(local.x)<0.12 && Math.abs(local.y)<0.085 && Math.abs(local.z-0.05)<0.14;
      const d=nearest.distanceToSquared(jaw);
      if(eligible && d<distance) { closest=nearest.clone().applyMatrix4(inverse); distance=d; }
    }
    return closest;
  }
  private alignJaws(tool: Instrument, point: THREE.Vector3) {
    this.needle.root.updateWorldMatrix(true,false); tool.root.updateWorldMatrix(true,false);
    const destination=point.clone().applyMatrix4(this.needle.root.matrixWorld);
    const jaw=tool.root.localToWorld(new THREE.Vector3(0,0,0.05));
    const rootWorld=tool.root.getWorldPosition(new THREE.Vector3()).add(destination.sub(jaw));
    if(tool.root.parent) tool.root.parent.worldToLocal(rootWorld);
    tool.root.position.copy(rootWorld);
  }
  attach(tool: Instrument, point=this.findGrip(tool)) {
    tool.root.updateWorldMatrix(true,false); this.needle.root.updateWorldMatrix(true,false);
    this.relative.copy(tool.root.matrixWorld).invert().multiply(this.needle.root.matrixWorld);
    this.holder=tool; this.heldPoint=point?.clone()??null;
  }
  update(tools: readonly Instrument[], allowHandoff=false) {
    this.candidate=null; this.candidatePoint=null;
    if(this.holder) {
      const tool=this.holder; tool.root.updateWorldMatrix(true,false);
      const world=new THREE.Matrix4().multiplyMatrices(tool.root.matrixWorld,this.relative);
      if(this.needle.root.parent) { this.needle.root.parent.updateWorldMatrix(true,false); world.premultiply(this.needle.root.parent.matrixWorld.clone().invert()); }
      world.decompose(this.needle.root.position,this.needle.root.quaternion,this.needle.root.scale);
    }
    if(!allowHandoff || (this.receiver && (this.receiver.openness>0.2 || !this.findGrip(this.receiver,true)))) { this.receiver=null; this.receiverPoint=null; }
    if(allowHandoff && this.holder?.kind==='needle-driver') {
      for(const tool of tools) {
        if(tool.kind!=='forceps') continue;
        const point=this.findGrip(tool,true); if(!point) continue;
        if(tool.openness>0.2) { this.candidate=tool; this.candidatePoint=point; }
        if(tool.openness<=0.2 && !this.receiver) {
          this.alignJaws(tool,point); this.receiver=tool; this.receiverPoint=point.clone();
        }
      }
    }
    if(this.holder && this.holder.openness>=0.45) {
      this.holder=null; this.heldPoint=null;
      if(this.receiver && this.receiverPoint && this.findGrip(this.receiver,true)) this.attach(this.receiver,this.receiverPoint);
      this.receiver=null; this.receiverPoint=null;
    }
    if(!this.holder) {
      for(const tool of tools) {
        const point=this.findGrip(tool,allowHandoff && tool.kind==='forceps'); if(!point) continue;
        if(tool.openness>0.2 && !this.candidate) { this.candidate=tool; this.candidatePoint=point; }
        const previous=this.previous.get(tool)??tool.openness;
        if(tool.openness<=0.2 && (previous>0.2 || (allowHandoff && tool.kind==='forceps'))) {
          this.alignJaws(tool,point); this.attach(tool,point); this.candidate=null; this.candidatePoint=null; break;
        }
      }
    }
    this.needle.highlight(!!this.candidate || !!this.receiver);
    for(const tool of tools) this.previous.set(tool,tool.openness);
  }
  reset() {
    this.holder=null; this.candidate=null; this.receiver=null;
    this.heldPoint=null; this.candidatePoint=null; this.receiverPoint=null;
    this.previous.clear(); this.needle.reset(); this.needle.highlight(false);
  }
  get status(): string {
    if(this.receiver) return 'Forceps grip ready · Open right driver (period) to transfer';
    if(this.candidate && this.holder) return 'Exposed needle body in reach · Close left forceps (Z), then open driver (period)';
    if(this.holder) return `Needle held · ${this.holder.kind==='forceps'?'left forceps':'right needle driver'} · Gold dot marks the grip`;
    if(this.candidate) return `Needle body in reach · Close ${this.candidate.id==='left'?'left jaws (Z)':'right jaws (comma)'}`;
    return 'Needle free · Bring open jaws to the needle body';
  }
}
