import {expect,it} from 'vitest';
import {findColorBalls,partnerSearchCenter} from './colorBallSearch';
const color=[30/365,100/365,235/365];
function image(){
 const data=new Uint8ClampedArray(200*120*4);data.fill(255);
 const disk=(cx:number,cy:number,r:number,rgb:number[])=>{for(let y=0;y<120;y++)for(let x=0;x<200;x++)if(Math.hypot(x-cx,y-cy)<=r)data.set([...rgb,255],(y*200+x)*4);};
 return {data,disk};
}
it('uses the visible ball to correct its partner location predicted from the ID marker',()=>{
 expect(partnerSearchCenter({x:50,y:40},{x:30,y:20},{x:80,y:20})).toEqual({x:100,y:40});
});
it('recovers a weak partner locally without weakening initial acquisition',()=>{
 const frame=image();frame.disk(100,50,5,[70,110,235]);
 expect(findColorBalls(frame.data,200,120,color,365,{x:100,y:50},60)).toHaveLength(0);
 expect(findColorBalls(frame.data,200,120,color,365,{x:100,y:50},60,15)).toHaveLength(0);
 const found=findColorBalls(frame.data,200,120,color,365,{x:100,y:50},20,20,.12);
 expect(found).toHaveLength(1);expect(found[0].x).toBeCloseTo(100);expect(found[0].y).toBeCloseTo(50);
});
it('keeps recovery bounded and rejects unrelated colors and elongated shapes',()=>{
 const frame=image();frame.disk(160,50,6,[70,110,235]);frame.disk(100,50,6,[30,200,40]);
 expect(findColorBalls(frame.data,200,120,color,365,{x:100,y:50},20,20,.12)).toHaveLength(0);
 for(let y=48;y<=51;y++)for(let x=90;x<=110;x++)frame.data.set([30,100,235,255],(y*200+x)*4);
 expect(findColorBalls(frame.data,200,120,color,365,{x:100,y:50},20,20,.12)).toHaveLength(0);
});
