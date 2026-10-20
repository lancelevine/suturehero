import { KnotSlack } from '../suture/KnotSlack';
import { knotLoop, knotTailContact } from '../suture/knotGeometry';
import { WoundApproximation } from '../tissue/WoundApproximation';
import { GuidedKnot } from '../suture/GuidedKnot';
import { PullThrough } from '../suture/PullThrough';
import * as THREE from 'three';
import { NeedlePlacement } from './NeedlePlacement';
import { NeedlePass } from '../tissue/NeedlePass';
import type { NeedleGrasp } from '../suture/NeedleGrasp';
import type { InputDevice } from '../input/types';
import type { Instrument } from '../instruments/Instrument';
export class PracticeSession {
  readonly placement=new NeedlePlacement();
  readonly pass=new NeedlePass();
  readonly pull=new PullThrough();
  readonly knot=new GuidedKnot();
  readonly knotSlack=new KnotSlack();
  readonly wound=new WoundApproximation();
  gripFraction=0.9;
  get selectedGripPoint() { return this.grasp?.needle.getPointAt(this.gripFraction)??new THREE.Vector3(); }
  constructor(private input: InputDevice, readonly instruments: readonly Instrument[], readonly grasp?: NeedleGrasp) {}
  get canBeginPass() {
    return !this.knot.active && !!this.grasp && (this.pass.phase==='idle' || this.pass.phase==='interrupted');
  }
  beginPass() {
    if(!this.canBeginPass || !this.grasp) return false;
    const driver=this.instruments.find(tool=>tool.kind==='needle-driver');
    if(!driver) return false;
    this.grasp.reset(); this.pull.reset(); this.placement.reset(); this.pass.begin();
    const needle=this.grasp.needle;
    this.pass.pose.decompose(needle.root.position,needle.root.quaternion,needle.root.scale);
    needle.root.updateWorldMatrix(true,false);
    driver.reset(); driver.openness=0.1;
    const grip=needle.points[30].clone().applyMatrix4(needle.root.matrixWorld);
    const offset=new THREE.Vector3(0,0,0.05).applyQuaternion(driver.root.quaternion);
    driver.root.position.copy(grip).sub(offset);
    driver.update({translation:[0,0,0],rotation:[0,0,0],jaw:0},0);
    this.grasp.attach(driver); return true;
  }
  get canPositionForceps() {
    return !!this.grasp && this.pass.phase==='complete' && this.pull.phase==='waiting' && this.grasp.holder?.kind!=='forceps';
  }
  positionForceps() {
    if(!this.canPositionForceps || !this.grasp) return false;
    const forceps=this.instruments.find(tool=>tool.kind==='forceps');
    if(!forceps) return false;
    forceps.reset(); forceps.openness=0.65;
    this.grasp.needle.root.updateWorldMatrix(true,false);
    const selected=this.selectedGripPoint.applyMatrix4(this.grasp.needle.root.matrixWorld);
    forceps.root.position.copy(selected).sub(new THREE.Vector3(0,0,0.05).applyQuaternion(forceps.root.quaternion));
    forceps.update({translation:[0,0,0],rotation:[0,0,0],jaw:0},0);
    this.grasp.update(this.instruments,true); return true;
  }
  get canBeginKnot() {return this.pull.phase==='complete' && !this.knot.active && !!this.grasp;}
  get canKnotAction() {return this.canBeginKnot || this.knot.phase==='between' || (this.knot.phase==='tail' && !this.knot.tailPositioned);}
  knotAction() {
    if(this.canBeginKnot && this.grasp) {
      this.grasp.release(); this.grasp.needle.setThreadVisible(false);
      this.grasp.needle.root.position.set(3.1,0.1,1.2); this.grasp.needle.root.quaternion.identity();
      this.knot.begin(); this.prepareKnotTools(); return true;
    }
    if(this.knot.phase==='between') {this.knot.nextThrow(); this.prepareKnotTools(); return true;}
    if(this.knot.phase==='tail' && !this.knot.tailPositioned) {this.knot.positionTail();this.placeKnotTools();return true;}
    return false;
  }
  private prepareKnotTools() {
    for(const tool of this.instruments) {
      tool.root.quaternion.identity(); tool.openness=tool.id==='left'?0.1:0.65;
      tool.update({translation:[0,0,0],rotation:[0,0,0],jaw:0},0);
    }
    this.placeKnotTools();
  }
  private placeKnotTools() {
    for(const tool of this.instruments) tool.root.position.copy(tool.id==='left'?this.knot.leftPosition:this.knot.rightPosition);
  }
  private applyPassPose(pose=this.pass.pose) {
    const holder=this.grasp?.holder;
    if(!holder || !this.grasp) return;
    const needle=this.grasp.needle.root;
    needle.updateWorldMatrix(true,false); holder.root.updateWorldMatrix(true,false);
    const delta=pose.multiply(needle.matrixWorld.clone().invert());
    const toolWorld=delta.multiply(holder.root.matrixWorld);
    if(holder.root.parent) { holder.root.parent.updateWorldMatrix(true,false); toolWorld.premultiply(holder.root.parent.matrixWorld.clone().invert()); }
    toolWorld.decompose(holder.root.position,holder.root.quaternion,holder.root.scale);
    this.grasp.update(this.instruments,this.pass.phase==='complete');
  }
  update(dt: number) {
    const step=Math.max(0,Math.min(dt,0.05));
    if(this.knot.active) {
      const left=this.instruments.find(t=>t.id==='left')!,right=this.instruments.find(t=>t.id==='right')!;
      const lc=this.input.sample('left'),rc=this.input.sample('right');
      for(const tool of this.instruments) tool.update({...this.input.sample(tool.id),translation:[0,0,0],rotation:[0,0,0]},step);
      this.knot.update(lc,rc,left.openness,right.openness,step);
      const seating=this.knot.phase==='seating'?THREE.MathUtils.smoothstep(this.knot.seating,0.3,1):0;
      const target=this.knot.throws>=2?1:this.knot.throws===1?0.85+0.15*seating:0.85*seating;
      this.wound.update(target,step); this.placeKnotTools();
      left.root.updateWorldMatrix(true,false);right.root.updateWorldMatrix(true,false);
      const leftJaw=left.root.localToWorld(new THREE.Vector3(0,0,0.05)),rightJaw=right.root.localToWorld(new THREE.Vector3(0,0,0.05));
      const loop=knotLoop(this.knot,right.root.matrixWorld);
      const tail=this.knot.phase==='seating' || this.knot.phase==='between' || this.knot.phase==='complete'?rightJaw:this.knot.tail;
      this.knotSlack.update(step,{
        enabled:this.knot.throws===0 || this.knot.phase==='between',
        loopLength:loop.length,
        shortStart:knotTailContact(this.knot,this.wound.deformPoint(this.pass.entry),loop),shortEnd:tail,
        longStart:loop.end,longEnd:leftJaw,
      });return;
    }
    const constrained=this.pass.phase==='passing';
    const waitingForHandoff=this.pass.phase==='complete' && this.pull.phase==='waiting' && this.grasp?.holder?.kind==='needle-driver';
    const extracting=this.pull.phase==='pulling' && this.grasp?.holder?.kind==='forceps';
    let drive=0; let turn=0;
    for(const tool of this.instruments) {
      const command=this.input.sample(tool.id);
      if(waitingForHandoff && tool===this.grasp?.holder) {
        tool.update({...command,translation:[0,0,0],rotation:[0,0,0]},step);
      } else if(extracting && tool===this.grasp?.holder) {
        turn=command.rotation[2];
        tool.update({...command,translation:[0,0,0],rotation:[0,0,0]},step);
      } else if(constrained && tool===this.grasp?.holder) {
        drive=command.rotation[2];
        tool.update({...command,translation:[0,0,0],rotation:[0,0,0]},step);
      } else tool.update(command,step);
    }
    this.grasp?.update(this.instruments,this.pass.phase==='complete');
    if(constrained) {
      this.pass.update(drive,this.grasp?.holder?.kind==='needle-driver',step);
      if(this.pass.phase==='passing' || this.pass.phase==='complete') this.applyPassPose();
      if(this.pass.phase==='interrupted') this.placement.reset();
    }
    if(this.grasp && this.pass.phase==='complete') {
      if(this.pull.phase==='waiting' && this.grasp.holder?.kind==='forceps') {
        this.grasp.needle.root.updateWorldMatrix(true,false);
        this.pull.begin(this.grasp.needle.root.matrixWorld);
      }
      this.pull.update(turn,this.grasp.holder?.kind==='forceps',step);
      if(extracting && this.grasp.holder?.kind==='forceps') this.applyPassPose(this.pull.pose);

    }
    if(this.grasp) {
      const threaded=this.pass.phase==='passing' || this.pass.phase==='complete';
      this.grasp.needle.advanceThread(step,threaded?this.pass.angle+this.pull.angle:null,this.pass.center);
      const pose=this.grasp.needle.getTipPose();
      this.placement.update(pose.position,pose.tangent,this.grasp.holder?.kind==='needle-driver',step);
    }
  }
  reset() { for(const tool of this.instruments) tool.reset(); this.grasp?.reset(); this.placement.reset(); this.pass.reset(); this.pull.reset(); this.knot.reset(); this.wound.reset(); this.knotSlack.reset(); }
}
