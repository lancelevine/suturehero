import type {ThrowRecord} from './KnotTechnique';
/** Classifies observed free throws without prescribing their count or direction. */
export class InferredKnotSequence {
 readonly throws:ThrowRecord[]=[];
 get technique(){
  const first=this.throws[0],second=this.throws[1];
  if(!first)return 'auto';
  if(first.wraps===2)return 'surgeon';
  if(first.wraps>2||second&&second.wraps!==1)return 'multiple';
  if(!second)return 'single';
  return second.direction===first.direction?'sliding':'square';
 }
 get label(){return {auto:'Detecting knot start',single:'Single first throw',surgeon:"Surgeon's start detected",sliding:'Sliding start detected',square:'Square start detected',multiple:'Multiple-wrap start detected'}[this.technique];}
 // Zero asks the observer to count the actual wraps until driver clearance.
 get requiredWraps(){return 0;}
 get requiredDirection(){return this.throws.length?-this.throws.at(-1)!.direction:0;}
 get locked(){
  const minimum=this.technique==='sliding'?3:2;
  return this.throws.some((t,i)=>i>=minimum-1&&t.wraps===1&&t.direction!==this.throws[i-1].direction);
 }
 get sliding(){return !this.locked&&(this.technique==='single'||this.technique==='sliding');}
 acceptsGeometry(wraps:number,direction:number){return Number.isInteger(wraps)&&wraps>=1&&(direction===1||direction===-1);}
 seat(record:ThrowRecord){if(!this.acceptsGeometry(record.wraps,record.direction))return false;this.throws.push({...record});return true;}
 get instruction(){
  if(!this.throws.length)return 'Wrap once or twice · The starting knot is detected from your thread';
  if(this.technique==='single')return 'Repeat the same direction for a sliding start, or reverse for a square throw';
  if(this.sliding)return 'Keep the post between knot and driver taut to advance · Reverse for a locking throw';
  return this.locked?'Opposing lock added · Alternate later throws':'Reverse direction for an opposing locking throw';
 }
}
