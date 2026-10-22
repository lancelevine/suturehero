export type KnotTechnique='surgeon'|'sliding';
export interface ThrowRecord {wraps:number;direction:number;postHeld:boolean}
/** Technique rules, independent of input and strand/contact solving. */
export class KnotTechniqueSequence {
  readonly throws:ThrowRecord[]=[];
  constructor(readonly technique:KnotTechnique='surgeon'){}
  get label(){return this.technique==='surgeon'?"Surgeon's start":'Sliding start';}
  get requiredWraps(){return this.technique==='surgeon' && !this.throws.length?2:1;}
  get requiredDirection(){
    if(!this.throws.length)return 0;
    const previous=this.throws.at(-1)!.direction;
    return this.technique==='sliding'&&this.throws.length===1?previous:-previous;
  }
  acceptsGeometry(wraps:number,direction:number){return wraps===this.requiredWraps&&(!this.requiredDirection||direction===this.requiredDirection);}
  get sliding(){return this.technique==='sliding'&&this.throws.length<=2;}
  get locked(){return this.throws.length>=(this.technique==='surgeon'?2:3);}
  accepts(wraps:number,direction:number,postHeld:boolean){return this.acceptsGeometry(wraps,direction) && (this.technique!=='sliding'||this.throws.length>=2||postHeld);}
  seat(record:ThrowRecord){if(!this.accepts(record.wraps,record.direction,record.postHeld))return false;this.throws.push({...record});return true;}
  get instruction(){
    if(!this.throws.length)return this.technique==='surgeon'?'First throw: wrap twice, then pull the tail through':'First throw: wrap once · Keep the short strand taut as the post';
    if(this.technique==='sliding'&&this.throws.length===1)return 'Second throw: same direction · Keep the short post taut';
    if(this.technique==='sliding'&&this.throws.length===2)return 'Sliding start formed · Advance along the taut short post, then reverse for a locking throw';
    return this.locked?'Start locked · Continue with opposing square throws':'Next throw: one wrap in the opposite direction';
  }
}
