import {expect,it} from 'vitest';
import {MonocularDepthFilter} from './MonocularDepthFilter';
it('holds small stationary depth noise and ignores repeated observations and isolated spikes',()=>{
 const f=new MonocularDepthFilter();expect(f.update(0,0,false,0)).toBe(0);
 for(let i=1;i<=30;i++)expect(Math.abs(f.update(i%2?.02:-.02,i*70,false,0))).toBeLessThan(.025);
 for(let i=0;i<20;i++)expect(f.update(2,2100,false,0)).toBe(0);
 f.update(2,2170,false,0);expect(f.update(0,2240,false,0)).toBe(0);expect(f.update(0,2310,false,0)).toBe(0);
});
it('confirms sustained motion but caps every depth step and follows deliberate near/far movement',()=>{
 const f=new MonocularDepthFilter();f.update(0,0,false,0);let previous=0;
 for(let i=1;i<=30;i++){const next=f.update(1,i*70,false,0);expect(Math.abs(next-previous)).toBeLessThanOrEqual(1.4*.07+1e-9);previous=next;}
 expect(previous).toBeGreaterThan(.97);
});
it('unlocks at the existing depth and then follows relative movement without a snap',()=>{
 const f=new MonocularDepthFilter();f.update(-1,0,true,.15);expect(f.update(-1,70,false,.15)).toBe(.15);let z=.15;
 for(let i=2;i<=30;i++)z=f.update(-.5,i*70,false,.15);expect(z).toBeCloseTo(.65,1);
});
it('keeps instruments independent and holds low-confidence estimates',()=>{
 const a=new MonocularDepthFilter(),b=new MonocularDepthFilter();a.update(.1,0,false,0);b.update(.9,0,false,0);
 for(let i=1;i<10;i++)expect(a.update(2,i*70,false,0,false)).toBe(.1);expect(b.update(.9,700,false,0)).toBe(.9);
});
