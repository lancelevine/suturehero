import {expect,it} from 'vitest';
import {InferredKnotSequence} from './InferredKnotSequence';
it('infers a surgeon start from a double first throw and its opposing lock',()=>{
 const k=new InferredKnotSequence();expect(k.technique).toBe('auto');
 k.seat({wraps:2,direction:1,postHeld:false});expect(k.technique).toBe('surgeon');expect(k.locked).toBe(false);
 k.seat({wraps:1,direction:-1,postHeld:false});expect(k.locked).toBe(true);
});
it('infers sliding from two same-direction singles without rejecting a slack proximal strand',()=>{
 for(const direction of [-1,1]){
  const k=new InferredKnotSequence();k.seat({wraps:1,direction,postHeld:false});expect(k.technique).toBe('single');
  k.seat({wraps:1,direction,postHeld:true});expect(k.technique).toBe('sliding');expect(k.sliding).toBe(true);
  k.seat({wraps:1,direction:-direction,postHeld:true});expect(k.locked).toBe(true);expect(k.sliding).toBe(false);
 }
});
it('reports an alternating single start as square rather than calling it a sliding knot',()=>{
 const k=new InferredKnotSequence();k.seat({wraps:1,direction:-1,postHeld:false});k.seat({wraps:1,direction:1,postHeld:false});
 expect(k.technique).toBe('square');expect(k.locked).toBe(true);
});
