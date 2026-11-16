import { expect, it } from 'vitest';
import { CodexEventLedger, CodexKnotEngine } from './CodexKnotEngine';

it('requires taut-post evidence before calling same-direction throws sliding',()=>{
 const ledger=new CodexEventLedger();
 ledger.seat({wraps:1,direction:1,postHeld:false});ledger.seat({wraps:1,direction:1,postHeld:false});
 expect(ledger.technique).toBe('single');expect(ledger.sliding).toBe(false);expect(ledger.label).toMatch(/unsecured/);
 ledger.seat({wraps:1,direction:-1,postHeld:false});expect(ledger.locked).toBe(true);
});

it('accepts an extra-turn opposing throw as locking evidence',()=>{
 const ledger=new CodexEventLedger();ledger.seat({wraps:2,direction:1,postHeld:false});ledger.seat({wraps:2,direction:-1,postHeld:true});
 expect(ledger.technique).toBe('surgeon');expect(ledger.locked).toBe(true);
});

it('implements the shared engine through the optimized Claude base',()=>{
 const engine=new CodexKnotEngine();expect(engine).toBeInstanceOf(CodexKnotEngine);expect(engine.active).toBe(false);
});
