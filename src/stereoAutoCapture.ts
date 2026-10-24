export {};
// Fail-closed stereo capture: accept a pair only when both frames contain
// all 42 corners of the 8 x 7-square checkerboard.
const capture = document.querySelector<HTMLButtonElement>('#capture-stereo-pair')!;
const exportButton = document.querySelector<HTMLButtonElement>('#export-stereo-pairs')!;
const clearButton = document.querySelector<HTMLButtonElement>('#clear-stereo-pairs')!;
const statusElement = document.querySelector<HTMLElement>('#stereo-calibration-status')!;
const video1 = document.querySelector<HTMLVideoElement>('#camera-video')!;
const video2 = document.querySelector<HTMLVideoElement>('#camera-video-2')!;
const camera1 = document.querySelector<HTMLSelectElement>('#camera-select')!;
const camera2 = document.querySelector<HTMLSelectElement>('#camera-select-2')!;
type ImageCapture = {width:number;height:number;image:string};
type Pair = {time:string;first:ImageCapture;second:ImageCapture;frameDeltaMs:null};
type CV = {
 Mat:new()=>any; Size:new(w:number,h:number)=>any;
 imread:(canvas:HTMLCanvasElement)=>any;
 cvtColor:(src:any,dst:any,code:number)=>void;
 findChessboardCorners:(gray:any,size:any,corners:any,flags:number)=>boolean;
 COLOR_RGBA2GRAY:number;CALIB_CB_ADAPTIVE_THRESH:number;CALIB_CB_NORMALIZE_IMAGE:number;
};
const pairs:Pair[]=[];
let active=false;
let timer:number|undefined;
let processing=false;
let detector:CV|undefined;
let detectorError='';
const target=20;
const intervalMs=3000;
const board={squaresX:8,squaresY:7,innerCornersX:7,innerCornersY:6,squareSizeMm:37};
function ready():boolean {
 return video1.readyState>=2&&video2.readyState>=2&&video1.videoWidth>0&&video2.videoWidth>0
  &&!!video1.srcObject&&!!video2.srcObject;
}
function update(message:string):void {
 statusElement.textContent=message;
 exportButton.disabled=pairs.length===0;
 clearButton.disabled=active;
 capture.textContent=active?'Stop validated capture':'Capture 20 validated pairs';
}
function frame(video:HTMLVideoElement):{canvas:HTMLCanvasElement;image:ImageCapture}{
 const canvas=document.createElement('canvas');
 canvas.width=video.videoWidth;canvas.height=video.videoHeight;
 canvas.getContext('2d')!.drawImage(video,0,0);
 return {canvas,image:{width:canvas.width,height:canvas.height,image:canvas.toDataURL('image/jpeg',.82)}};
}
function checkerboardVisible(cv:CV,canvas:HTMLCanvasElement):boolean {
 // Detect on a downsampled image to keep the UI responsive.
 const small=document.createElement('canvas');
 const scale=Math.min(1,960/canvas.width);
 small.width=Math.round(canvas.width*scale);
 small.height=Math.round(canvas.height*scale);
 small.getContext('2d')!.drawImage(canvas,0,0,small.width,small.height);
 let src:any,gray:any,corners:any;
 try {
  src=cv.imread(small);gray=new cv.Mat();corners=new cv.Mat();
  cv.cvtColor(src,gray,cv.COLOR_RGBA2GRAY);
  const found=cv.findChessboardCorners(gray,new cv.Size(7,6),corners,
   cv.CALIB_CB_ADAPTIVE_THRESH|cv.CALIB_CB_NORMALIZE_IMAGE);
  return found&&corners.rows*corners.cols===42;
 } finally {
  corners?.delete();gray?.delete();src?.delete();
 }
}
async function loadDetector():Promise<CV>{
 if(detector)return detector;
 if(detectorError)throw Error(detectorError);
 // The standard OpenCV.js build may omit calib3d. Detect this explicitly.
 const globalCV=window as unknown as {cv?:any};
 if(!globalCV.cv){
  await new Promise<void>((resolve,reject)=>{
   const script=document.createElement('script');
   script.src='https://docs.opencv.org/4.x/opencv.js';
   script.async=true;
   script.onload=()=>resolve();
   script.onerror=()=>reject(Error('Unable to load OpenCV.js. Check network access.'));
   document.head.appendChild(script);
  });
 }
 let cv=globalCV.cv;
 if(cv instanceof Promise)cv=await cv;
 if(cv?.ready instanceof Promise)await cv.ready;
 if(typeof cv?.findChessboardCorners!=='function'){
  detectorError='This OpenCV.js build does not include checkerboard detection (calib3d). Validated capture is unavailable; no unverified images will be saved.';
  throw Error(detectorError);
 }
 detector=cv as CV;
 return detector;
}
function stop(message?:string):void{
 active=false;
 if(timer!==undefined)window.clearInterval(timer);
 timer=undefined;
 update(message??(pairs.length+' validated pairs saved. Export when ready.'));
}
async function tick():Promise<void>{
 if(!active||processing)return;
 if(!ready()){stop('Camera stopped. '+pairs.length+' validated pairs retained.');return;}
 processing=true;
 try {
  const cv=await loadDetector();
  if(!active)return;
  const first=frame(video1),second=frame(video2);
  const valid1=checkerboardVisible(cv,first.canvas);
  const valid2=checkerboardVisible(cv,second.canvas);
  if(valid1&&valid2){
   pairs.push({time:new Date().toISOString(),first:first.image,second:second.image,frameDeltaMs:null});
  }
  if(pairs.length>=target){stop('20 / 20 validated pairs captured. Ready to export.');return;}
  update(pairs.length+' / '+target+' accepted · Camera 1: '+(valid1?'42 corners ✓':'board not found')+
   ' · Camera 2: '+(valid2?'42 corners ✓':'board not found')+
   '. '+(valid1&&valid2?'Move or tilt board for next pair.':'Keep all squares visible in both cameras.'));
 }catch(error){
  stop('Validated capture stopped: '+String(error));
 }finally{processing=false;}
}
capture.addEventListener('click',event=>{
 event.stopImmediatePropagation();
 if(active){stop();return;}
 if(!ready()){update('Start both cameras before capture.');return;}
 pairs.length=0;
 active=true;
 update('Loading checkerboard detector…');
 void tick().then(()=>{
  if(active)timer=window.setInterval(()=>{void tick();},intervalMs);
 });
},true);
exportButton.addEventListener('click',event=>{
 event.stopImmediatePropagation();
 if(!pairs.length)return;
 const payload={format:'suturehero-stereo-captures-v1',board,camera1:camera1.value,camera2:camera2.value,pairs};
 const url=URL.createObjectURL(new Blob([JSON.stringify(payload)],{type:'application/json'}));
 const link=document.createElement('a');link.href=url;
 link.download='suturehero-stereo-calibration-'+new Date().toISOString().slice(0,10)+'.json';
 link.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
 update('Exported '+pairs.length+' validated stereo pairs.');
},true);
clearButton.addEventListener('click',event=>{
 event.stopImmediatePropagation();
 if(active)return;
 if(pairs.length&&!window.confirm('Discard all validated calibration captures?'))return;
 pairs.length=0;update('0 validated pairs captured.');
},true);
const intro=capture.closest('section')?.querySelector<HTMLElement>('p.tracking-message');
if(intro)intro.innerHTML='Checkerboard: <strong>8 × 7 squares · 7 × 6 inner corners · 37 mm squares</strong>. The app accepts a pair only when both cameras detect all 42 inner corners. Tilt and reposition the board between captures; do not move the cameras.';
update('0 validated pairs captured. Start both cameras, then capture. Checks every 3 seconds.');
