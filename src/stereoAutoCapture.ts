// Timed stereo capture workflow. Runs separately from marker detection.
const capture = document.querySelector<HTMLButtonElement>('#capture-stereo-pair')!;
const exportButton = document.querySelector<HTMLButtonElement>('#export-stereo-pairs')!;
const clearButton = document.querySelector<HTMLButtonElement>('#clear-stereo-pairs')!;
const status = document.querySelector<HTMLElement>('#stereo-calibration-status')!;
const video1 = document.querySelector<HTMLVideoElement>('#camera-video')!;
const video2 = document.querySelector<HTMLVideoElement>('#camera-video-2')!;
const camera1 = document.querySelector<HTMLSelectElement>('#camera-select')!;
const camera2 = document.querySelector<HTMLSelectElement>('#camera-select-2')!;
type Image = { width:number; height:number; image:string };
type Pair = { time:string; first:Image; second:Image; frameDeltaMs:null };
const pairs:Pair[]=[];
let timer:number|undefined;
let active=false;
const count=20, intervalMs=3000;
function frame(video:HTMLVideoElement):Image {
 const canvas=document.createElement('canvas');
 canvas.width=video.videoWidth;canvas.height=video.videoHeight;
 canvas.getContext('2d')!.drawImage(video,0,0,canvas.width,canvas.height);
 return {width:canvas.width,height:canvas.height,image:canvas.toDataURL('image/jpeg',.82)};
}
function ready(){
 return video1.readyState>=2 && video2.readyState>=2 && video1.videoWidth>0 && video2.videoWidth>0
  && !!video1.srcObject && !!video2.srcObject;
}
function update(message:string){
 status.textContent=message;
 exportButton.disabled=pairs.length===0;
 capture.textContent=active?'Stop auto capture':'Auto capture 20 pairs';
 clearButton.disabled=active;
}
function stop(){
 if(timer!==undefined)window.clearInterval(timer);
 timer=undefined;active=false;
 update(pairs.length+' pairs captured. Export captures when ready.');
}
function tick(){
 if(!ready()){stop();update('Camera stopped. Capture paused; '+pairs.length+' pairs saved.');return;}
 try {
  pairs.push({time:new Date().toISOString(),first:frame(video1),second:frame(video2),frameDeltaMs:null});
  if(pairs.length>=count){stop();return;}
  update('Captured '+pairs.length+' / '+count+' pairs. Next pair in 3 seconds. Move or tilt the board.');
 }catch(e){stop();update('Capture error: '+String(e));}
}
capture.addEventListener('click',event=>{
 event.stopImmediatePropagation();
 if(active){stop();return;}
 if(!ready()){update('Start both cameras before auto capture.');return;}
 pairs.length=0;active=true;tick();
 if(active)timer=window.setInterval(tick,intervalMs);
},true);
exportButton.addEventListener('click',event=>{
 event.stopImmediatePropagation();
 if(!pairs.length)return;
 const payload={
  format:'suturehero-stereo-captures-v1',
  board:{squaresX:8,squaresY:7,innerCornersX:7,innerCornersY:6,squareSizeMm:37},
  camera1:camera1.value,camera2:camera2.value,pairs
 };
 const url=URL.createObjectURL(new Blob([JSON.stringify(payload)],{type:'application/json'}));
 const link=document.createElement('a');link.href=url;
 link.download='suturehero-stereo-calibration-'+new Date().toISOString().slice(0,10)+'.json';
 link.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
 update('Exported '+pairs.length+' pairs (8 × 7 squares, 37 mm).');
},true);
clearButton.addEventListener('click',event=>{
 event.stopImmediatePropagation();
 if(active)return;
 if(pairs.length&&!window.confirm('Discard all calibration captures?'))return;
 pairs.length=0;update('0 pairs captured.');
},true);
const intro=document.querySelector<HTMLElement>('#capture-stereo-pair')?.closest('section')?.querySelector<HTMLElement>('p.tracking-message');
if(intro)intro.innerHTML='Checkerboard: <strong>8 × 7 squares · 7 × 6 inner corners · 37 mm squares</strong>. Start both cameras, then click Auto capture. Move and tilt the board between captures; keep both cameras fixed.';
update('0 pairs captured. Click Auto capture to take 20 pairs at 3-second intervals (about 57 seconds).');
