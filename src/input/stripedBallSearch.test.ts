import {expect,it} from 'vitest';
import {findStripedBalls} from './stripedBallSearch';
function image(bands=3,angle=0,background=220,rect=false,r=13){
 const w=100,h=90,data=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const dx=x-50,dy=y-45,t=(dx*Math.cos(angle)+dy*Math.sin(angle))/r;
  const inside=rect?Math.abs(dx)<=r*1.3&&Math.abs(dy)<=r*1.3:dx*dx+dy*dy<=r*r;
  let value=background;
  if(inside){value=240;for(let b=0;b<bands;b++)if(Math.abs(t-(b-(bands-1)/2)*.4)<.09)value=25;}
  const i=(y*w+x)*4;data[i]=data[i+1]=data[i+2]=value;data[i+3]=255;
 }
 return {data,w,h};
}
it('finds three-band monochrome balls at varied rotations and lighting',()=>{
 for(const angle of [0,.25,.6,1,1.5,2.2])for(const bg of [45,160,220]){
  const {data,w,h}=image(3,angle,bg),balls=findStripedBalls(data,w,h,{x:49,y:44},13);
  expect(balls.length,`angle ${angle}, bg ${bg}`).toBeGreaterThan(0);expect(Math.hypot(balls[0].x-50,balls[0].y-45)).toBeLessThan(2);
 }
});
it('rejects plain spheres, incorrect stripe counts, and striped rectangles',()=>{
 for(const n of [0,1,2,4]){const {data,w,h}=image(n);expect(findStripedBalls(data,w,h,{x:50,y:45},13)).toEqual([]);}
 const {data,w,h}=image(3,0,220,true);expect(findStripedBalls(data,w,h,{x:50,y:45},13)).toEqual([]);
});
it('rejects unresolved small balls rather than reporting unstable jaw measurements',()=>{
 const {data,w,h}=image(3,0,220,false,4);expect(findStripedBalls(data,w,h,{x:50,y:45},4)).toEqual([]);
});
it('keeps both identical candidates when a jaw moves across a shared search crop',()=>{
 const w=220,h=140,data=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  let value=238;
  for(const cx of [80,140])if((x-cx)**2+(y-70)**2<=400){value=240;for(const t of [-.4,0,.4])if(Math.abs((x-cx)/20-t)<.09)value=25;}
  const i=(y*w+x)*4;data[i]=data[i+1]=data[i+2]=value;data[i+3]=255;
 }
 const balls=findStripedBalls(data,w,h,{x:110,y:70},22.5);
 expect(balls.some(p=>Math.hypot(p.x-80,p.y-70)<2)).toBe(true);expect(balls.some(p=>Math.hypot(p.x-140,p.y-70)<2)).toBe(true);
});
