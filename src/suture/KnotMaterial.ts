import { KnotFriction } from './KnotFriction';
/** Conserves material within the loop + its two free spans, excluding guided tissue routes. */
export class KnotMaterial {
  readonly total=3.5;
  readonly friction=new KnotFriction();
  short=1.35;
  retained=0;
  long=this.total-this.short;
  loop=0;
  overreach=false;
  private previousShort=1.35;
  reset() {this.short=this.previousShort=1.35;this.long=this.total-this.short;this.loop=this.retained=0;this.overreach=false;this.friction.reset();}
  update(loopLength:number,shortReach:number,longReach:number,contact?:{dt:number;seating:number;seatedThrows:number;retainedLength:number}) {
    this.retained=contact?.retainedLength??0;
    this.loop=Math.max(0,Math.min(loopLength,this.total-this.retained-0.02));
    const available=this.total-this.loop-this.retained;
    this.overreach=shortReach+longReach>available;
    if(this.overreach) {
      // Keep the material ledger valid even when kinematic grips exceed reach.
      this.short=available*shortReach/Math.max(1e-8,shortReach+longReach);
    } else {
      const target=available*shortReach/Math.max(1e-8,shortReach+longReach);
      this.short=Math.max(shortReach,Math.min(target,available-longReach));
    }
    if(contact)this.short=this.friction.advance(this.previousShort,this.short,contact.dt,contact.seating,contact.seatedThrows);
    // Kinematic grips cannot be resisted by input forces yet: allow only the slip
    // required to keep reachable endpoint constraints from stretching the strand.
    if(!this.overreach) {
      const feasible=Math.max(shortReach,Math.min(this.short,available-longReach));
      if(Math.abs(feasible-this.short)>1e-8)this.friction.state='sliding';
      this.short=feasible;
    }
    this.short=Math.max(0.01,Math.min(available-0.01,this.short));
    this.long=available-this.short;
    this.overreach ||= shortReach>this.short+0.02 || longReach>this.long+0.02;
    this.previousShort=this.short;
  }
}
