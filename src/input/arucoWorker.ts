/// <reference lib="webworker" />
const MARKER_CODES=[0xb532,0x0f9a,0x332d,0x9946,0x549e,0x79cd,0x9e2e,0xc4f2,0xfeda];
type MarkerObservation={id:number;corners:Array<{x:number;y:number}>};
type LegacyDetector={detect:(frame:ImageData)=>MarkerObservation[];candidates?:unknown[];polys?:unknown[]};
type ArucoGlobal={DICTIONARIES:Record<string,{nBits:number;tau:number;codeList:number[]}>;Detector:new(options:{dictionaryName:string;maxHammingDistance:number})=>LegacyDetector};
const workerScope=self as DedicatedWorkerGlobalScope & {AR?:ArucoGlobal};
const base='https://cdn.jsdelivr.net/npm/js-aruco2@2.0.0/src/';
let detector:LegacyDetector|null=null;
const canvas=new OffscreenCanvas(1,1),ctx=canvas.getContext('2d',{willReadFrequently:true})!;
function candidatesOf(){return (Array.isArray(detector?.candidates)?detector.candidates:Array.isArray(detector?.polys)?detector.polys:[])??[];}
function cornersOf(candidate:unknown,ratio:number):Array<{x:number;y:number}>|null{
 const obj=candidate as {corners?:unknown;points?:unknown;vertices?:unknown}|null;
 const vertices=Array.isArray(candidate)?candidate:obj?.corners??obj?.points??obj?.vertices;
 if(!Array.isArray(vertices)||vertices.length!==4)return null;
 const pts=vertices.map((p:unknown)=>{if(Array.isArray(p))return {x:Number(p[0])*ratio,y:Number(p[1])*ratio};const q=p as {x?:number;y?:number};return {x:Number(q?.x)*ratio,y:Number(q?.y)*ratio};});
 return pts.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y))?pts:null;
}
async function initialize(){
 if(detector)return;
 importScripts(base+'cv.js',base+'aruco.js');
 if(!workerScope.AR)throw Error('ArUco library did not initialize in worker');
 workerScope.AR.DICTIONARIES.SUTUREHERO_4X4_50={nBits:16,tau:2,codeList:MARKER_CODES};
 detector=new workerScope.AR.Detector({dictionaryName:'SUTUREHERO_4X4_50',maxHammingDistance:1});
}

type GrayFrame={width:number;height:number;pixels:Uint8Array};
let previous:GrayFrame|null=null;
let tracked:MarkerObservation[]=[];
const lastDecodedAt=new Map<number,number>();
let frameNumber=0;
function grayFrame(frame:ImageData):GrayFrame{
 const width=Math.ceil(frame.width/2),height=Math.ceil(frame.height/2),pixels=new Uint8Array(width*height);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=(Math.min(frame.height-1,y*2)*frame.width+Math.min(frame.width-1,x*2))*4;
  pixels[y*width+x]=Math.round(.299*frame.data[i]+.587*frame.data[i+1]+.114*frame.data[i+2]);
 }
 return {width,height,pixels};
}
function patchMatch(a:GrayFrame,b:GrayFrame,x:number,y:number){
 const px=Math.round(x/2),py=Math.round(y/2),r=3,search=10;
 if(px<r+search||py<r+search||px>=a.width-r-search||py>=a.height-r-search||a.width!==b.width||a.height!==b.height)return null;
 let texture=0,mean=0;for(let j=-r;j<=r;j++)for(let i=-r;i<=r;i++)mean+=a.pixels[(py+j)*a.width+px+i];mean/=49;
 for(let j=-r;j<=r;j++)for(let i=-r;i<=r;i++)texture+=Math.abs(a.pixels[(py+j)*a.width+px+i]-mean);
 if(texture/49<12)return null;
 let best=Infinity,dxBest=0,dyBest=0;
 for(let dy=-search;dy<=search;dy++)for(let dx=-search;dx<=search;dx++){
  let cost=0;
  for(let j=-r;j<=r;j++)for(let i=-r;i<=r;i++)cost+=Math.abs(a.pixels[(py+j)*a.width+px+i]-b.pixels[(py+j+dy)*b.width+px+i+dx]);
  if(cost<best){best=cost;dxBest=dx;dyBest=dy;}
 }
 if(best/49>30)return null;
 return {x:x+dxBest*2,y:y+dyBest*2,dx:dxBest*2,dy:dyBest*2};
}
function flowTrack(a:GrayFrame|null,b:GrayFrame):MarkerObservation[]{
 if(!a||!tracked.length)return [];
 const results:MarkerObservation[]=[];
 for(const marker of tracked){
  if(performance.now()-(lastDecodedAt.get(marker.id)??0)>350)continue;
  const corners=marker.corners.map(p=>patchMatch(a,b,p.x,p.y));
  if(corners.some(p=>!p))continue;
  const pts=corners as Array<{x:number;y:number;dx:number;dy:number}>;
  const dx=pts.map(p=>p.dx).sort((x,y)=>x-y),dy=pts.map(p=>p.dy).sort((x,y)=>x-y);
  const mx=(dx[1]+dx[2])/2,my=(dy[1]+dy[2])/2;
  if(pts.some(p=>Math.hypot(p.dx-mx,p.dy-my)>8))continue;
  const area=(cs:Array<{x:number;y:number}>)=>Math.abs(cs.reduce((sum,p,i)=>sum+p.x*cs[(i+1)%4].y-cs[(i+1)%4].x*p.y,0))/2;
  if(area(pts)<100||area(pts)<area(marker.corners)*.65||area(pts)>area(marker.corners)*1.5)continue;
  results.push({id:marker.id,corners:pts.map(p=>({x:p.x,y:p.y}))});
 }
 return results;
}

function detect(frame:ImageData){
 const current=grayFrame(frame);
 const flowed=flowTrack(previous,current);
 previous=current;
 frameNumber++;
 // Run a full ID decode every third frame and whenever corner tracking fails.
 // Never propagate a marker ID beyond the short optical-flow confidence window.
 if(flowed.length&&frameNumber%3!==0){tracked=flowed;return {found:flowed,candidates:[],diagnostics:{candidateCount:0,rawMarkerCount:0,recognizedCount:flowed.length,rejectedCount:0,durationMs:0,note:'Optical-flow tracked corners (ID last decoded)',pass:'Optical flow',contrast:'Patch matching'}};}

 const start=performance.now(),raw=detector!.detect(frame);
 const all=[...raw],candidates=[...candidatesOf()].map(c=>cornersOf(c,1)).filter((c):c is Array<{x:number;y:number}>=>!!c);
 let pass='Original',contrast='Unmodified';
 if(raw.length===0){
  const w=Math.max(1,Math.round(frame.width/2)),h=Math.max(1,Math.round(frame.height/2)),ratio=frame.width/w;
  canvas.width=w;canvas.height=h;
  const source=new OffscreenCanvas(frame.width,frame.height);
  source.getContext('2d')!.putImageData(frame,0,0);
  ctx.drawImage(source,0,0,w,h);
  const reduced=ctx.getImageData(0,0,w,h);
  const histogram=new Uint32Array(256);
  for(let i=0;i<reduced.data.length;i+=4){const v=Math.round(.299*reduced.data[i]+.587*reduced.data[i+1]+.114*reduced.data[i+2]);histogram[v]++;}
  let acc=0,low=0,high=255;
  for(let i=0;i<256;i++){acc+=histogram[i];if(acc>=w*h*.02){low=i;break;}}
  acc=0;for(let i=255;i>=0;i--){acc+=histogram[i];if(acc>=w*h*.02){high=i;break;}}
  if(high-low>=12){const factor=255/(high-low);for(let i=0;i<reduced.data.length;i+=4){const v=Math.round(.299*reduced.data[i]+.587*reduced.data[i+1]+.114*reduced.data[i+2]);const y=Math.max(0,Math.min(255,Math.round((v-low)*factor)));reduced.data[i]=y;reduced.data[i+1]=y;reduced.data[i+2]=y;}contrast='Stretched '+low+'–'+high;}
  const fallback=detector!.detect(reduced);
  all.push(...fallback.map(m=>({...m,corners:m.corners.map(p=>({x:p.x*ratio,y:p.y*ratio}))})));
  candidates.push(...candidatesOf().map(c=>cornersOf(c,ratio)).filter((c):c is Array<{x:number;y:number}>=>!!c));
  pass='Original + half-resolution contrast';
  if(fallback.length===0){
   const gray=new Uint8Array(w*h),integral=new Float64Array((w+1)*(h+1));
   for(let y=0;y<h;y++){let row=0;for(let x=0;x<w;x++){const i=(y*w+x)*4,v=Math.round(.299*reduced.data[i]+.587*reduced.data[i+1]+.114*reduced.data[i+2]);gray[y*w+x]=v;row+=v;integral[(y+1)*(w+1)+x+1]=integral[y*(w+1)+x+1]+row;}}
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){const x0=Math.max(0,x-12),x1=Math.min(w,x+13),y0=Math.max(0,y-12),y1=Math.min(h,y+13),sum=integral[y1*(w+1)+x1]-integral[y0*(w+1)+x1]-integral[y1*(w+1)+x0]+integral[y0*(w+1)+x0],v=gray[y*w+x]>sum/((x1-x0)*(y1-y0))-7?255:0,i=(y*w+x)*4;reduced.data[i]=v;reduced.data[i+1]=v;reduced.data[i+2]=v;}
   const adaptive=detector!.detect(reduced);
   all.push(...adaptive.map(m=>({...m,corners:m.corners.map(p=>({x:p.x*ratio,y:p.y*ratio}))})));
   candidates.push(...candidatesOf().map(c=>cornersOf(c,ratio)).filter((c):c is Array<{x:number;y:number}>=>!!c));
   pass='Original + contrast + adaptive';contrast+=' · local mean threshold';
  }
 }
 const decoded=all.filter(m=>m.id>=0&&m.id<=8&&m.corners.length===4);
 for(const marker of decoded)lastDecodedAt.set(marker.id,performance.now());
 const found=[...decoded];
 for(const marker of flowed)if(!found.some(m=>m.id===marker.id))found.push(marker);
 tracked=found;
 return {found,candidates,diagnostics:{candidateCount:candidates.length,rawMarkerCount:all.length,recognizedCount:found.length,rejectedCount:all.length-found.length,durationMs:performance.now()-start,note:decoded.length?'Markers decoded':flowed.length?'Optical flow maintained marker through missed decode':candidates.length===0?'No quadrilaterals found':'Candidate shapes found; marker decode failed',pass,contrast}};
}
self.onmessage=async(e:MessageEvent<{type:string;frame?:ImageData;id?:number}>)=>{
 try{
  if(e.data.type==='init'){await initialize();self.postMessage({type:'ready'});}
  else if(e.data.type==='detect'&&e.data.frame){const result=detect(e.data.frame);self.postMessage({type:'result',id:e.data.id,...result});}
 }catch(error){self.postMessage({type:'error',id:e.data.id,message:String(error)});}
};
