import {expect,it} from 'vitest';
import {framePyramid,trackMarker} from './markerFlow';
const width=400,height=300;
function scene(x=170,y=140,angle=0,size=36,visible=true){
 const data=new Uint8ClampedArray(width*height*4),c=Math.cos(angle),s=Math.sin(angle);
 for(let py=0;py<height;py++)for(let px=0;px<width;px++){
  const u=(c*(px-x)+s*(py-y))/size+.5,v=(-s*(px-x)+c*(py-y))/size+.5;
  let value=225;
  if(visible&&u>=0&&u<1&&v>=0&&v<1){const a=Math.floor(u*6),b=Math.floor(v*6);value=a===0||a===5||b===0||b===5?15:((0xb532>>((4-b)*4+(4-a)))&1)?235:15;}
  const i=(py*width+px)*4;data[i]=data[i+1]=data[i+2]=value;data[i+3]=255;
 }
 const corners=[[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]].map(([a,b])=>({x:x+size*(c*a-s*b),y:y+size*(s*a+c*b)}));
 return {frame:framePyramid({width,height,data}),marker:{id:0,corners}};
}
it.each([24,36,64])('tracks a %ipx marker through translation and direction reversals',size=>{
 let source=scene(170,140,0,size),marker=source.marker;
 for(const [x,y] of [[176,144],[188,151],[206,161],[190,149],[170,140]]){
  const next=scene(x,y,0,size),result=trackMarker(source.frame,next.frame,marker);
  expect(result,'visible marker should remain tracked').not.toBeNull();
  result!.corners.forEach((p,i)=>expect(Math.hypot(p.x-next.marker.corners[i].x,p.y-next.marker.corners[i].y)).toBeLessThan(2));
  source=next;marker=result!;
 }
});
it('tracks corners while the marker turns, rather than freezing the old square',()=>{
 let source=scene(),marker=source.marker;
 for(let n=1;n<=5;n++){
  const next=scene(170+n*3,140+n, n*.10),result=trackMarker(source.frame,next.frame,marker);
  expect(result).not.toBeNull();result!.corners.forEach((p,i)=>expect(Math.hypot(p.x-next.marker.corners[i].x,p.y-next.marker.corners[i].y)).toBeLessThan(4));
  source=next;marker=result!;
 }
});
it('rejects a blank image and recovers from the last successful reference after a miss',()=>{
 const source=scene(),blank=scene(170,140,0,36,false);
 expect(trackMarker(source.frame,blank.frame,source.marker)).toBeNull();
 const next=scene(182,146),result=trackMarker(source.frame,next.frame,source.marker);
 expect(result).not.toBeNull();expect(result!.corners[0].x).toBeCloseTo(next.marker.corners[0].x,0);
});
