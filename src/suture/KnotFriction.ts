import {PRACTICE_SETUP} from '../setup/PracticeSetup';
/** Material-coordinate stiction and rate-limited slip; coefficients are sandbox units. */
export class KnotFriction {
  state:'free'|'holding'|'sliding'='free';
  advance(current:number,target:number,dt:number,seating:number,seatedThrows:number) {
    const grip=Math.max(0,Math.min(1,seating))+seatedThrows;
    if(grip===0) {this.state='free';return target;}
    const difference=target-current;
    if(Math.abs(difference)<=0.006*grip*PRACTICE_SETUP.suture.friction) {this.state='holding';return current;}
    this.state='sliding';
    const maximum=0.8/(1+grip*2)/PRACTICE_SETUP.suture.friction*Math.max(0,Math.min(dt,0.05));
    return current+Math.sign(difference)*Math.min(Math.abs(difference),maximum);
  }
  reset() {this.state='free';}
}
