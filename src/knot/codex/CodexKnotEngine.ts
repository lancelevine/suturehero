import type { Instrument } from '../../instruments/Instrument';
import { InferredKnotSequence } from '../../suture/InferredKnotSequence';
import type { KnotTechnique } from '../../suture/KnotTechnique';
import { ClaudeKnotEngine } from '../claude/ClaudeKnotEngine';

/**
 * Sequence evidence from physically completed throws. A sliding start needs
 * a taut short post; any verified opposing throw can lock even if fast input
 * leaves an extra turn in it.
 */
export class CodexEventLedger extends InferredKnotSequence {
  override get technique() {
    const first=this.throws[0],second=this.throws[1];
    if(!first)return 'auto' as const;
    if(first.wraps===2)return 'surgeon' as const;
    if(first.wraps>2)return 'multiple' as const;
    if(!second)return 'single' as const;
    if(second.direction!==first.direction)return 'square' as const;
    return second.postHeld?'sliding' as const:'single' as const;
  }
  override get label(){
    if(this.throws.length>1&&this.throws[1].direction===this.throws[0].direction&&!this.throws[1].postHeld)return 'Codex · unsecured same-direction throws';
    return `Codex · ${{auto:'detecting knot start',single:'single first throw',surgeon:"surgeon's start",sliding:'sliding start',square:'square start',multiple:'multiple-wrap start'}[this.technique]}`;
  }
  isLockThrow(index:number){
    const minimum=this.technique==='sliding'?2:1;
    return index>=minimum&&this.throws[index].direction!==this.throws[index-1].direction;
  }
  override get locked(){return this.throws.some((_,index)=>this.isLockThrow(index));}
  override get sliding(){
    if(this.locked)return false;
    if(this.throws.length===1)return this.throws[0].wraps===1;
    return this.technique==='sliding';
  }
  override get instruction(): string {
    if(!this.throws.length)return 'Form a complete throw; recognition uses verified tail passage and seating';
    if(this.throws.length>1&&this.throws[1].direction===this.throws[0].direction&&!this.throws[1].postHeld)return 'Same-direction throws lacked a taut post · reverse direction to lock them';
    if(this.technique==='single')return 'Reverse for a square throw, or keep the short post taut for a sliding start';
    if(this.sliding)return 'Keep the short post taut while advancing · reverse direction to lock';
    return this.locked?'Opposing lock verified · alternate later throws':'Reverse direction for an opposing lock';
  }
}

/** Claude's reliable free-end grasp plus Codex event classification. */
export class CodexKnotEngine extends ClaudeKnotEngine {
  override begin(tools:readonly Instrument[],technique?:KnotTechnique|'auto'){
    super.begin(tools,technique);
    if(technique==='auto')this.sequence=new CodexEventLedger();
  }
  override get lockSeated(){
    const ledger=this.sequence;
    // A chosen technique uses the shared sequence, which has no isLockThrow:
    // fall back to the classic check so its locks still seat.
    if(!(ledger instanceof CodexEventLedger))return super.lockSeated;
    if(!ledger.locked)return false;
    return ledger.throws.some((_,index)=>index<this.seatedThrows&&ledger.isLockThrow(index));
  }
}
