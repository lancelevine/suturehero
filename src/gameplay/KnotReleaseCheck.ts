export interface ReleaseObservation {
  closure:number;
  shortMaterial:number;
  loopMaterial:number;
  anchorError:number;
  finite:boolean;
}
/** Observes the guided model after release; not a knot-security or strength test. */
export class KnotReleaseCheck {
  leftReleased=false;
  rightReleased=false;
  state:'waiting'|'observing'|'passed'|'failed'='waiting';
  elapsed=0;
  readonly duration=3;
  private baseline?:ReleaseObservation;
  get anyReleased() {return this.leftReleased || this.rightReleased;}
  release(leftJaw:number,rightJaw:number) {
    this.leftReleased ||= leftJaw>=0.45;this.rightReleased ||= rightJaw>=0.45;
  }
  observe(dt:number,sample:ReleaseObservation) {
    if(!this.leftReleased || !this.rightReleased || this.state==='failed')return;
    this.baseline??={...sample};
    const base=this.baseline;
    if(!sample.finite || ![sample.closure,sample.shortMaterial,sample.loopMaterial,sample.anchorError].every(Number.isFinite) || base.closure-sample.closure>0.03 ||
      Math.abs(sample.shortMaterial-base.shortMaterial)>0.02 || Math.abs(sample.loopMaterial-base.loopMaterial)>0.02 || sample.anchorError>0.02) {
      this.state='failed';return;
    }
    this.elapsed=Math.min(this.duration,this.elapsed+Math.max(0,Math.min(dt,0.05)));
    this.state=this.elapsed+1e-8>=this.duration?(sample.closure>=0.95?'passed':'failed'):'observing';
  }
  get instruction() {
    if(this.state==='failed')return 'Release check detected loosening · Reset practice to try again';
    if(this.state==='passed')return 'Release-and-hold check complete ✓ · Guided knot stayed seated · Click Position driver at released tail';
    if(this.state==='observing')return 'Release check · Hands off while the free ends settle';
    return `Guided square-knot sequence complete · ${this.leftReleased?'Open right driver with period':this.rightReleased?'Open left forceps with X':'Open forceps X and driver period'} for release check`;
  }
  reset() {this.leftReleased=this.rightReleased=false;this.state='waiting';this.elapsed=0;this.baseline=undefined;}
}
