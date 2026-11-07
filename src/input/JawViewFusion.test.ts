import {expect,it} from 'vitest';
import {JawViewFusion} from './JawViewFusion';
it('combines agreeing calibrated views and falls back when one camera loses the balls',()=>{
 const f=new JawViewFusion();f.update(0,.4,0,100,0);
 const both=f.update(1,.5,30,100,30)!;expect(both.cameras).toHaveLength(2);expect(both.opening).toBeCloseTo(.45);
 const fallback=f.update(1,.8,400,100,400)!;expect(fallback.cameras).toEqual([1]);expect(fallback.opening).toBe(.8);
});
it('does not average conflicting views or let a stale camera refresh output',()=>{
 const f=new JawViewFusion();f.update(0,.1,0,100,0);
 expect(f.update(1,.9,30,90,30)!.opening).toBe(.1);
 expect(f.update(0,.1,0,100,400)).toBeNull();
});
it('prefers a fresh view over a larger but occluded view during a brief hold',()=>{
 const f=new JawViewFusion();f.update(0,.1,0,500,0);
 expect(f.update(1,.8,180,20,180)!.cameras).toEqual([1]);
});
