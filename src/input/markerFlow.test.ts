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

it('integer-offset scorer matches per-sample bilinear scoring exactly enough to pick the same offset',async()=>{
 const {integerOffsetScorer}=await import('./markerFlow');
 const w=64,h=48,pixels=new Uint8Array(w*h).map((_,i)=>(i*37+(i>>6)*11)%251);
 const f={width:w,height:h,pixels};
 const sample=(x:number,y:number)=>{const ix=Math.floor(x),iy=Math.floor(y),dx=x-ix,dy=y-iy,i=iy*w+ix;return pixels[i]*(1-dx)*(1-dy)+pixels[i+1]*dx*(1-dy)+pixels[i+w]*(1-dx)*dy+pixels[i+w+1]*dx*dy;};
 const samples=Array.from({length:30},(_,k)=>({x:20+(k%6)*1.37,y:15+Math.floor(k/6)*1.61,value:(k*29)%200}));
 const reference=(ox:number,oy:number)=>{let sum=0,sq=0;for(const p of samples){const x=p.x+ox,y=p.y+oy;if(!(x>=2&&y>=2&&x<w-2&&y<h-2))return Infinity;const d=sample(x,y)-p.value;sum+=d;sq+=d*d;}return (sq-sum*sum/samples.length)/samples.length;};
 const fast=integerOffsetScorer(f,samples);
 for(const [ox,oy] of [[0,0],[3,-2],[-6,5],[20,0],[-19,-14],[40,40]]){const a=reference(ox,oy),b=fast(ox,oy);if(a===Infinity)expect(b).toBe(Infinity);else expect(b).toBeCloseTo(a,9);}
});

it('fast grayscale pyramid is bit-identical to the clamped reference, including odd sizes',async()=>{
 const {framePyramid}=await import('./markerFlow');
 for(const [w,h] of [[64,48],[65,49],[960,540]]){
  const data=new Uint8ClampedArray(w*h*4).map((_,i)=>(i*31+(i>>7)*17)%256);
  const gray=framePyramid({width:w,height:h,data})[0];
  const W=Math.ceil(w/2),H=Math.ceil(h/2);
  for(let y=0;y<H;y+=Math.max(1,H>>4))for(let x=0;x<W;x+=1){
   let value=0;for(let j=0;j<2;j++)for(let i=0;i<2;i++){const k=(Math.min(h-1,y*2+j)*w+Math.min(w-1,x*2+i))*4;value+=.299*data[k]+.587*data[k+1]+.114*data[k+2];}
   expect(gray.pixels[y*W+x]).toBe(Math.round(value/4));
  }
  const lastRow=H-1;for(let x=0;x<W;x++){let value=0;for(let j=0;j<2;j++)for(let i=0;i<2;i++){const k=(Math.min(h-1,lastRow*2+j)*w+Math.min(w-1,x*2+i))*4;value+=.299*data[k]+.587*data[k+1]+.114*data[k+2];}expect(gray.pixels[lastRow*W+x]).toBe(Math.round(value/4));}
 }
});

it('half-scale pyramid from a 2×2-averaged frame matches the full-size pyramid',async()=>{
 const {framePyramid,halfScalePyramid}=await import('./markerFlow');
 const w=96,h=64,full=new Uint8ClampedArray(w*h*4);
 for(let i=0;i<w*h;i++){const v=(i*37+(i>>5)*13)%256;full[i*4]=full[i*4+1]=full[i*4+2]=v;full[i*4+3]=255;}
 // What a GPU 2× downscale produces: each pixel the average of a 2×2 block.
 const half=new Uint8ClampedArray((w/2)*(h/2)*4);
 for(let y=0;y<h/2;y++)for(let x=0;x<w/2;x++){let v=0;for(const [dx,dy] of [[0,0],[1,0],[0,1],[1,1]])v+=full[((y*2+dy)*w+x*2+dx)*4];v/=4;const k=(y*(w/2)+x)*4;half[k]=half[k+1]=half[k+2]=v;half[k+3]=255;}
 const a=framePyramid({width:w,height:h,data:full}),b=halfScalePyramid({width:w/2,height:h/2,data:half});
 expect(b.length).toBe(a.length);
 for(let level=0;level<a.length;level++){expect(b[level].width).toBe(a[level].width);let worst=0;for(let i=0;i<a[level].pixels.length;i++)worst=Math.max(worst,Math.abs(a[level].pixels[i]-b[level].pixels[i]));expect(worst).toBeLessThanOrEqual(1);}
});
