import {expect,it} from 'vitest';
import {PredictiveDecodeSearch} from './PredictiveDecodeSearch';
const marker=(id=0,x=900)=>({id,corners:[{x,y:450},{x:x+40,y:450},{x:x+40,y:490},{x,y:490}]});
const groups=[[0,1,2,3,4,5],[10,11,12,13,14,15]];
it('preserves native pixels, predicts motion and performs periodic full scans',()=>{
 const s=new PredictiveDecodeSearch();expect(s.plan([marker()],0,1920,1080,true,groups).kind).toBe('full');s.result([marker()]);
 const a=s.plan([marker(0,920)],70,1920,1080,true,groups);expect(a.kind).toBe('predicted');expect(a.width*a.height).toBeLessThan(1920*1080*.2);expect(a.left+a.width).toBeGreaterThan(1040);
 expect(s.plan([marker()],200,1920,1080,true,groups).kind).toBe('predicted');s.result([marker()]);
 // Periodic discovery (build 0.124): a quarter-frame tile every 250 ms instead of one whole frame per second.
 const tile=s.plan([marker()],260,1920,1080,true,groups);expect(tile.kind).toBe('discovery');expect(tile.width*tile.height).toBeLessThan(1920*1080*.45);
});
it('covers the whole frame with overlapping discovery tiles, and a tile is never a miss',()=>{
 const s=new PredictiveDecodeSearch();s.plan([marker()],0,1920,1080,true,groups);s.result([marker()]);
 const tiles=[1,2,3,4].map(i=>{const r=s.plan([marker()],i*260,1920,1080,true,groups);s.result([]);return r;});
 expect(tiles.every(t=>t.kind==='discovery')).toBe(true);
 for(const [x,y] of [[0,0],[1919,0],[0,1079],[1919,1079],[960,540],[955,535]])expect(tiles.some(t=>x>=t.left&&x<t.left+t.width&&y>=t.top&&y<t.top+t.height)).toBe(true);
 // A marker straddling the centre lies wholly inside at least one tile.
 const box={x0:930,y0:520,x1:990,y1:580};
 expect(tiles.some(t=>box.x0>=t.left&&box.x1<t.left+t.width&&box.y0>=t.top&&box.y1<t.top+t.height)).toBe(true);
 // Empty tile results did not count as misses: the next plan is still a normal prediction.
 expect(s.plan([marker()],1100,1920,1080,true,groups).kind).toBe('predicted');
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
