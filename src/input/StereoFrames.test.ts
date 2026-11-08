import {expect,it} from 'vitest';
import {StereoFrames} from './StereoFrames';
const marker=(x:number,id=3)=>({id,corners:[{x,y:0},{x:x+10,y:0},{x:x+10,y:10},{x,y:10}]});
it('aligns moving corners at the same image time despite uneven worker completion',()=>{
 const f=new StereoFrames();f.push(0,0,[marker(0)]);f.push(1,20,[marker(-80)]);f.push(0,40,[marker(40)]);f.push(1,60,[marker(-40)]);
 const pair=f.pair(90)!;expect(pair.at).toBe(40);expect(pair.first[0].corners[0].x-pair.second[0].corners[0].x).toBe(100);
});
it('never invents a missing face, extrapolates, or pairs stale frames',()=>{
 const f=new StereoFrames();f.push(0,0,[marker(0)]);f.push(1,20,[marker(0)]);expect(f.pair(20)).toBeNull();
 f.push(0,40,[]);expect(f.pair(50)!.first).toEqual([]);expect(f.pair(300)).toBeNull();
});
it('ignores old decoded geometry arriving after newer flow and clears on reset',()=>{
 const f=new StereoFrames();f.push(0,30,[marker(30)]);f.push(0,10,[marker(10)]);f.push(1,30,[marker(0)]);
 expect(f.pair(40)!.first[0].corners[0].x).toBe(30);f.clear();expect(f.pair(40)).toBeNull();
});
it('explains why no pair is available',()=>{
 const f=new StereoFrames();
 f.push(0,0,[marker(0)]);expect(f.pair(10)).toBeNull();expect(f.lastFailure).toBe('no frames yet from camera 2');
 f.push(1,5,[marker(0)]);expect(f.pair(300)).toBeNull();expect(f.lastFailure).toMatch(/camera 1 newest frame is 300 ms old/);
 const g=new StereoFrames();g.push(0,0,[marker(0)]);g.push(0,150,[marker(0)]);g.push(1,100,[marker(0)]);
 expect(g.pair(160)).toBeNull();expect(g.lastFailure).toMatch(/camera 1 frame gap 150 ms/);
 g.push(0,200,[marker(0)]);g.push(1,190,[marker(0)]);expect(g.pair(210)).not.toBeNull();expect(g.lastFailure).toBeNull();
});
