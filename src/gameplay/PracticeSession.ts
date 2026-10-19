import { NeedlePlacement } from './NeedlePlacement';
import type { NeedleGrasp } from '../suture/NeedleGrasp';
import type { InputDevice } from '../input/types';
import type { Instrument } from '../instruments/Instrument';
/** Orchestration boundary; future suture objectives observe simulation events here. */
export class PracticeSession {
  readonly placement=new NeedlePlacement();
  constructor(private input: InputDevice, readonly instruments: readonly Instrument[], readonly grasp?: NeedleGrasp) {}
  update(dt: number) { for(const tool of this.instruments) tool.update(this.input.sample(tool.id),Math.min(dt,0.05)); this.grasp?.update(this.instruments);
    if(this.grasp) {
      const pose=this.grasp.needle.getTipPose();
      this.placement.update(pose.position,pose.tangent,this.grasp.holder?.kind==='needle-driver',dt);
    }
  }
  reset() { for(const tool of this.instruments) tool.reset(); this.grasp?.reset(); this.placement.reset(); }
}
