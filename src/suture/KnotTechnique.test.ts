import {expect,it} from 'vitest';
import {KnotTechniqueSequence} from './KnotTechnique';
it('requires a double surgeon first throw followed by alternating single throws',()=>{
 const sequence=new KnotTechniqueSequence('surgeon');
 expect(sequence.seat({wraps:1,direction:1,postHeld:false})).toBe(false);
 expect(sequence.seat({wraps:2,direction:1,postHeld:false})).toBe(true);
 expect(sequence.seat({wraps:1,direction:1,postHeld:false})).toBe(false);
 expect(sequence.seat({wraps:1,direction:-1,postHeld:false})).toBe(true);
 expect(sequence.requiredDirection).toBe(1);
});
it('requires a taut post for both sliding throws, then opposing locking throws',()=>{
 const sequence=new KnotTechniqueSequence('sliding');
 expect(sequence.seat({wraps:1,direction:-1,postHeld:false})).toBe(false);
 expect(sequence.seat({wraps:1,direction:-1,postHeld:true})).toBe(true);
 expect(sequence.seat({wraps:1,direction:1,postHeld:true})).toBe(false);
 expect(sequence.seat({wraps:1,direction:-1,postHeld:false})).toBe(false);
 expect(sequence.seat({wraps:1,direction:-1,postHeld:true})).toBe(true);
 expect(sequence.instruction).toContain('Advance');
 expect(sequence.seat({wraps:1,direction:1,postHeld:false})).toBe(true);
 expect(sequence.requiredDirection).toBe(-1);
});
