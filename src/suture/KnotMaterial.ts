/** Conserves material within the loop + its two free spans, excluding guided tissue routes. */
export class KnotMaterial {
  readonly total=3.1;
  short=1.35;
  long=this.total-this.short;
  loop=0;
  overreach=false;
  update(loopLength:number,shortReach:number,longReach:number) {
    this.loop=Math.max(0,Math.min(loopLength,this.total-0.02));
    const available=this.total-this.loop;
    this.overreach=shortReach+longReach>available;
    if(this.overreach) {
      // Keep the material ledger valid even when kinematic grips exceed reach.
      this.short=available*shortReach/Math.max(1e-8,shortReach+longReach);
    } else {
      this.short=Math.max(shortReach,Math.min(1.35,available-longReach));
    }
    this.short=Math.max(0.01,Math.min(available-0.01,this.short));
    this.long=available-this.short;
  }
}
