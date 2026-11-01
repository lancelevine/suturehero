import {expect,it} from 'vitest';
import {MarkerRestLatch} from './MarkerRestLatch';
const face=(id:number,dx=0,dy=0)=>({id,corners:[{x:100+dx,y:100+dy},{x:130+dx,y:100+dy},{x:130+dx,y:130+dy},{x:100+dx,y:130+dy}]});
it('keeps a stationary pose through single/overlap/other-face observations with corner jitter',()=>{
 const latch=new MarkerRestLatch();expect(latch.observe([face(0)],0)).toBe(false);
 for(let i=1;i<30;i++){const jitter=i%2?.3:-.3,visible=i%3===0?[face(1,jitter)]:i%3===1?[face(0,jitter),face(1,jitter)]:[face(0,jitter)];expect(latch.observe(visible,i*70)).toBe(true);}
});
it('releases on accumulated slow movement, translation, scale or rotation',()=>{
 const latch=new MarkerRestLatch();latch.observe([face(0)],0);expect(latch.observe([face(0,.4)],70)).toBe(true);expect(latch.observe([face(0,.8)],140)).toBe(true);expect(latch.observe([face(0,1.2)],210)).toBe(false);
 expect(latch.observe([face(0,1.2,3)],280)).toBe(false);
 const zoom=face(0);zoom.corners=zoom.corners.map(p=>({x:115+(p.x-115)*1.15,y:115+(p.y-115)*1.15}));expect(latch.observe([zoom],350)).toBe(false);
});
it('does not freeze an unseen face, a stale reacquisition or another instrument',()=>{
 const a=new MarkerRestLatch(),b=new MarkerRestLatch();a.observe([face(0)],0);expect(a.observe([face(1)],70)).toBe(false);expect(a.observe([face(1)],1000)).toBe(false);expect(b.observe([face(10)],1000)).toBe(false);
});
