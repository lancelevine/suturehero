import type { InputDevice } from '../input/types';
import type { Instrument } from '../instruments/Instrument';
/** Orchestration boundary; future suture objectives observe simulation events here. */
export class PracticeSession {
  constructor(private input: InputDevice, readonly instruments: readonly Instrument[]) {}
  update(dt: number) { for(const tool of this.instruments) tool.update(this.input.sample(tool.id),Math.min(dt,0.05)); }
  reset() { for(const tool of this.instruments) tool.reset(); }
}
