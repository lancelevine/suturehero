import * as THREE from 'three';
import type { Instrument } from '../instruments/Instrument';
import type { SutureModel } from './SutureModel';
/** Proximity-based grasp constraint. No collision, force, gravity, or tissue solver. */
export class NeedleGrasp {
  holder: Instrument | null = null;
  candidate: Instrument | null = null;
  private relative = new THREE.Matrix4();
  private previous = new Map<Instrument,number>();
  constructor(readonly needle: SutureModel) {}
  private withinJaws(tool: Instrument): boolean {
    tool.root.updateWorldMatrix(true,false);
    this.needle.root.updateWorldMatrix(true,false);
    // Test actual arc segments in the tool's local jaw capture region.
    const toTool=new THREE.Matrix4().copy(tool.root.matrixWorld).invert().multiply(this.needle.root.matrixWorld);
    const target=new THREE.Vector3(0,0,0.05);
    for(let i=1;i<this.needle.points.length;i++) {
      const a=this.needle.points[i-1].clone().applyMatrix4(toTool);
      const b=this.needle.points[i].clone().applyMatrix4(toTool);
      const nearest=new THREE.Line3(a,b).closestPointToPoint(target,true,new THREE.Vector3());
      if(Math.abs(nearest.x)<0.12 && Math.abs(nearest.y)<0.085 && Math.abs(nearest.z-0.05)<0.14) return true;
    }
    return false;
  }
  update(tools: readonly Instrument[]) {
    if(this.holder) {
      const tool=this.holder;
      tool.root.updateWorldMatrix(true,false);
      const world=new THREE.Matrix4().multiplyMatrices(tool.root.matrixWorld,this.relative);
      const parent=this.needle.root.parent;
      if(parent) { parent.updateWorldMatrix(true,false); world.premultiply(parent.matrixWorld.clone().invert()); }
      world.decompose(this.needle.root.position,this.needle.root.quaternion,this.needle.root.scale);
      if(tool.openness>=0.45) this.holder=null;
    }
    this.candidate=null;
    if(!this.holder) {
      for(const tool of tools) {
        if(!this.withinJaws(tool)) continue;
        if(tool.openness>0.2 && !this.candidate) this.candidate=tool;
        const previous=this.previous.get(tool)??tool.openness;
        if(previous>0.2 && tool.openness<=0.2) {
          this.needle.root.updateWorldMatrix(true,false);
          this.relative.copy(tool.root.matrixWorld).invert().multiply(this.needle.root.matrixWorld);
          this.holder=tool; this.candidate=null; break;
        }
      }
    }
    this.needle.highlight(this.candidate!==null);
    for(const tool of tools) this.previous.set(tool,tool.openness);
  }
  reset() { this.holder=null; this.candidate=null; this.previous.clear(); this.needle.reset(); this.needle.highlight(false); }
  get status(): string {
    if(this.holder) return `Needle held · ${this.holder.kind==='forceps'?'left forceps':'right needle driver'} · Open jaws to release`;
    if(this.candidate) return `Needle in reach · Close ${this.candidate.id==='left'?'left jaws (Z)':'right jaws (comma)'} to grasp`;
    return 'Needle free · Bring open jaws to the curved needle';
  }
}
