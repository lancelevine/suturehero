import {expect,it} from 'vitest';
import {PredictiveDecodeSearch} from './PredictiveDecodeSearch';
const marker=(id=0,x=900)=>({id,corners:[{x,y:450},{x:x+40,y:450},{x:x+40,y:490},{x,y:490}]});
const groups=[[0,1,2,3,4,5],[10,11,12,13,14,15]];
it('preserves native pixels, predicts motion and performs periodic full scans',()=>{
 const s=new PredictiveDecodeSearch();expect(s.plan([marker()],0,1920,1080,true,groups).kind).toBe('full');s.result([marker()]);
 const a=s.plan([marker(0,920)],70,1920,1080,true,groups);expect(a.kind).toBe('predicted');expect(a.width*a.height).toBeLessThan(1920*1080*.2);expect(a.left+a.width).toBeGreaterThan(1040);
 expect(s.plan([marker()],360,1920,1080,true,groups).kind).toBe('predicted');s.result([marker()]);
 expect(s.plan([marker()],1010,1920,1080,true,groups).kind).toBe('full');
});
it('expands after a miss, then falls back to full scans until recovery',()=>{
 const s=new PredictiveDecodeSearch();s.plan([marker()],0,1920,1080,true,groups);s.result([marker()]);const a=s.plan([marker()],65,1920,1080,true,groups);s.result([]);const b=s.plan([],130,1920,1080,true,groups);expect(b.kind).toBe('expanded');expect(b.width).toBeGreaterThan(a.width);s.result([]);expect(s.plan([],195,1920,1080,true,groups).kind).toBe('full');s.result([]);expect(s.plan([],260,1920,1080,true,groups).kind).toBe('full');
});
it('accepts face changes within an instrument but recovers a separately missing instrument',()=>{
 const s=new PredictiveDecodeSearch();s.plan([marker(),marker(10,400)],0,1920,1080,true,groups);s.result([marker(1),marker(11,400)]);expect(s.plan([marker(1),marker(11,400)],65,1920,1080,true,groups).kind).toBe('predicted');s.result([marker(1)]);expect(s.plan([marker(1)],130,1920,1080,true,groups).kind).toBe('expanded');
});
it('bounds searches, expires old hints, and retains an explicit full-frame option',()=>{
 const s=new PredictiveDecodeSearch();s.plan([marker()],0,1920,1080,true,groups);s.result([marker()]);expect(s.plan([marker()],65,1920,1080,false,groups).kind).toBe('full');expect(s.plan([],600,1920,1080,true,groups).kind).toBe('full');expect(s.plan([marker()],650,640,480,true,groups).kind).toBe('full');
});
