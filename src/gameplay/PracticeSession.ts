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
  constructor(private input: InputDevice, readonly instruments: readonly Instrument[], readonly grasp?: NeedleGrasp) {}
  get canBeginPass() {
    return this.pass.phase!=='passing' && this.pass.phase!=='complete' && this.placement.complete && this.placement.distance<=0.12 && this.placement.angle<=20 && this.grasp?.holder?.kind==='needle-driver';
  }
  beginPass() {
    if(!this.canBeginPass) return false;
    this.pass.begin(); this.applyPassPose(); return true;
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
    const constrained=this.pass.phase==='passing';
    const extracting=this.pull.phase==='pulling' && this.grasp?.holder?.kind==='forceps';
    let drive=0; let lift=0;
    for(const tool of this.instruments) {
      const command=this.input.sample(tool.id);
      if(extracting && tool===this.grasp?.holder) {
        lift=command.translation[1];
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
      this.pull.update(lift,this.grasp.holder?.kind==='forceps',step);
      if(extracting && this.grasp.holder?.kind==='forceps') this.applyPassPose(this.pull.pose);
      this.grasp.needle.updateThread(this.pass.entry,this.pass.exit,this.pull.threadProgress);
    }
    if(this.grasp) {
      const pose=this.grasp.needle.getTipPose();
      this.placement.update(pose.position,pose.tangent,this.grasp.holder?.kind==='needle-driver',step);
    }
  }
  reset() { for(const tool of this.instruments) tool.reset(); this.grasp?.reset(); this.placement.reset(); this.pass.reset(); this.pull.reset(); }
}
