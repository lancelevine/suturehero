/** Dimensionless stretch/load proxy for a guided single-tail pull, not calibrated force. */
export class KnotLoadTest {
  stage:'idle'|'grasp'|'pulling'|'passed'|'failed'='idle';
  travel=0;
  load=0;
  held=0;
  slip=0;
  get active() {return this.stage!=='idle';}
  begin() {if(this.active)return false;this.stage='grasp';return true;}
  sample(distance:number,materialLength:number) {
    this.load=Math.max(0,8*(distance/Math.max(0.01,materialLength)-1));
  }
  update(dt:number,closed:boolean,opened:boolean,pull:number) {
    const step=Math.max(0,Math.min(dt,0.05));
    if(this.stage==='grasp') {if(closed)this.stage='pulling';return;}
    if(this.stage!=='pulling')return;
    if(opened) {this.stage='failed';return;}
    this.travel=Math.min(2,this.travel+Math.max(0,pull)*(this.load<0.1?0.2:0.04)*step);
    if(this.load>=0.15 && this.load<=0.55 && pull<=0.01)this.held+=step;else this.held=0;
    if(this.held>=1.5)this.stage='passed';
    if(this.slip>0.025)this.stage='failed';
  }
  get slipRate() {return this.stage==='pulling'?Math.max(0,this.load-0.65)*0.15:0;}
  get closureTarget() {return Math.max(0.4,1-this.slip*4-Math.min(this.load,2)*0.015);}
  get instruction() {
    if(this.stage==='grasp')return 'Close right driver with comma to regrasp the released tail';
    if(this.stage==='failed')return 'Pull check failed · Tail released or knot slipped · Reset to retry';
    if(this.stage==='passed')return 'Gentle pull check complete ✓ · Guided knot resisted the test load';
    return this.load<0.15?'Hold Left arrow to take up slack and load the tail':this.load<=0.55?'Gentle load · Release the arrow and hold steady':'Load too high · Stop pulling; excess load can slip the knot';
  }
  reset() {this.stage='idle';this.travel=this.load=this.held=this.slip=0;}
}
