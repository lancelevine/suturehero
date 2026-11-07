/// <reference lib="webworker" />
// Classic worker: OpenCV's generated script uses importScripts and owns its
// WebAssembly heap here, away from rendering and tracking UI.
let cvReady:Promise<any>|undefined;
async function initializeCheckerboard(url:string){
 if(!cvReady)cvReady=(async()=>{
  (self as any).Module={locateFile:(name:string)=>new URL(name,url).href};
  importScripts(url);let cv=(self as any).cv;
  if(cv?.then)cv=await cv;if(cv?.ready?.then)await cv.ready;
  if(typeof cv?.findChessboardCorners!=='function'&&cv&&'onRuntimeInitialized' in cv)await new Promise<void>((resolve,reject)=>{
   const timeout=setTimeout(()=>reject(Error('OpenCV initialization timed out')),30000);cv.onRuntimeInitialized=()=>{clearTimeout(timeout);resolve();};
  });
  if(typeof cv?.findChessboardCorners!=='function')throw Error('Calibration OpenCV build does not expose checkerboard detection');return cv;
 })();return cvReady;
}
function detectCheckerboard(cv:any,image:{width:number;height:number;data:Uint8ClampedArray}){
 let src:any,gray:any,corners:any;
 try{
  src=new cv.Mat(image.height,image.width,cv.CV_8UC4);src.data.set(image.data);gray=new cv.Mat();corners=new cv.Mat();cv.cvtColor(src,gray,cv.COLOR_RGBA2GRAY);
  const found=cv.findChessboardCorners(gray,new cv.Size(8,6),corners,cv.CALIB_CB_ADAPTIVE_THRESH|cv.CALIB_CB_NORMALIZE_IMAGE);
  if(found&&corners.rows*corners.cols===48&&typeof cv.cornerSubPix==='function'&&typeof cv.TermCriteria==='function')cv.cornerSubPix(gray,corners,new cv.Size(3,3),new cv.Size(-1,-1),new cv.TermCriteria(3,20,.01));
  const points:Array<{x:number;y:number}>=[];
  if(found&&corners.rows*corners.cols===48&&corners.data32F?.length>=96)for(let i=0;i<48;i++)points.push({x:corners.data32F[i*2],y:corners.data32F[i*2+1]});
  let contrast=0,focus=0;
  if(points.length===48){
   const w=image.width,h=image.height,minX=Math.max(1,Math.ceil(Math.min(...points.map(p=>p.x)))),maxX=Math.min(w-2,Math.floor(Math.max(...points.map(p=>p.x)))),minY=Math.max(1,Math.ceil(Math.min(...points.map(p=>p.y)))),maxY=Math.min(h-2,Math.floor(Math.max(...points.map(p=>p.y))));
   const hist=new Uint32Array(256),g=gray.data;let count=0,lap=0;
   // Analyze only the inner checkerboard footprint, not surrounding texture.
   const polygon=[points[0],points[7],points[47],points[40]];
   const inside=(x:number,y:number)=>{let sign=0;for(let i=0;i<4;i++){const a=polygon[i],b=polygon[(i+1)%4],v=(b.x-a.x)*(y-a.y)-(b.y-a.y)*(x-a.x);if(Math.abs(v)<1e-6)continue;if(sign&&Math.sign(v)!==sign)return false;sign=Math.sign(v);}return true;};
   for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++)if(inside(x,y)){
    const i=y*w+x,value=g[i],l=g[i-1]+g[i+1]+g[i-w]+g[i+w]-4*value;hist[value]++;lap+=l*l;count++;
   }
   const quantile=(fraction:number)=>{let n=0;for(let i=0;i<256;i++){n+=hist[i];if(n>=count*fraction)return i;}return 255;};
   contrast=count?quantile(.8)-quantile(.2):0;
   const cell=Math.min(Math.hypot(points[7].x-points[0].x,points[7].y-points[0].y)/7,Math.hypot(points[40].x-points[0].x,points[40].y-points[0].y)/5);
   focus=count&&contrast>0?lap/count/(contrast*contrast)*cell:0;
  }
  return {width:image.width,height:image.height,corners:points,contrast,focus};
 }finally{corners?.delete();gray?.delete();src?.delete();}
}
self.onmessage=async({data})=>{
 try{const cv=await initializeCheckerboard(data.url);if(data.type==='init'){self.postMessage({id:data.id,ready:true});return;}
  const result=data.images.map((image:any)=>detectCheckerboard(cv,image));self.postMessage({id:data.id,result});
 }catch(error){self.postMessage({id:data.id,error:String(error)});}
};
