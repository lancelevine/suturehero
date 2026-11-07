import {stereoBoard} from './input/stereoBoard';
import {frameClock} from './input/CameraFrameClock';
import {boardMotion,captureCoverage,describeBoard,pairCaptureDecision,type BoardMeasurement,type CapturePose} from './input/stereoCaptureQuality';
const capture=document.querySelector<HTMLButtonElement>('#capture-stereo-pair')!;
const exportButton=document.querySelector<HTMLButtonElement>('#export-stereo-pairs')!;
const clearButton=document.querySelector<HTMLButtonElement>('#clear-stereo-pairs')!;
const squareSize=document.querySelector<HTMLInputElement>('#stereo-square-size-mm')!;
const status=document.querySelector<HTMLElement>('#stereo-calibration-status')!;
const videos=[document.querySelector<HTMLVideoElement>('#camera-video')!,document.querySelector<HTMLVideoElement>('#camera-video-2')!] as const;
const cameras=[document.querySelector<HTMLSelectElement>('#camera-select')!,document.querySelector<HTMLSelectElement>('#camera-select-2')!] as const;
const quality=document.querySelector<HTMLElement>('#checkerboard-quality')!;quality.setAttribute('role','status');quality.setAttribute('aria-live','polite');
const coverage=document.createElement('p');coverage.className='tracking-message';quality.after(coverage);
const previewButton=document.createElement('button');previewButton.type='button';previewButton.textContent='Preview capture quality';capture.before(previewButton);
const board={...stereoBoard,squareSizeMm:Number(squareSize.value)};
type ImageCapture={width:number;height:number;image:string};
type Pair={time:string;first:ImageCapture;second:ImageCapture;frameDeltaMs:number;quality:CapturePose};
const pairs:Pair[]=[],poses:CapturePose[]=[];
const snapshots=videos.map(()=>document.createElement('canvas'));
const checks=videos.map(()=>document.createElement('canvas'));
const overlays=videos.map(video=>{const canvas=document.createElement('canvas');canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:contain;pointer-events:none;z-index:3';canvas.setAttribute('aria-hidden','true');video.parentElement!.append(canvas);return canvas;});
let active=false,completed=false,processing=false,preview=false,epoch=0,lastAccepted=-Infinity;
let lastGood:{measurements:BoardMeasurement[];at:number}|undefined,stableSince:number|undefined;
let configuration:string|undefined;
let worker:Worker|undefined,workerReady:Promise<void>|undefined,workerError='';
let sequence=0;
const pending=new Map<number,{resolve:(value:any)=>void;reject:(reason:Error)=>void;timeout:number}>();
const config=()=>JSON.stringify(cameras.map((c,i)=>({id:c.value,width:videos[i].videoWidth,height:videos[i].videoHeight})));
const ready=()=>cameras.every(c=>!!c.value)&&cameras[0].value!==cameras[1].value&&videos.every((v,i)=>{
 if(!v.srcObject||v.readyState<2||!v.videoWidth)return false;
 const device=(v.srcObject as MediaStream).getVideoTracks?.()[0]?.getSettings?.().deviceId;
 return !device||device===cameras[i].value;
});
const visible=()=>capture.getClientRects().length>0;
function update(message?:string){
 status.dataset.accepted=String(pairs.length);status.dataset.complete=String(completed);
 if(message)status.textContent=message;
 const progress=captureCoverage(poses);
 coverage.textContent=progress.complete?'Coverage complete: enough accepted pairs to export for solving.':poses.length+' accepted · Still needed: '+progress.missing.join(' · ');
 exportButton.disabled=pairs.length===0;clearButton.disabled=active;squareSize.disabled=active||pairs.length>0;
 capture.disabled=completed||pairs.length>=40;
 capture.textContent=completed?'Capture complete':active?'Pause capture':pairs.length?'Resume good-pair capture':'Start quality-guided capture';
 previewButton.disabled=active||completed;previewButton.textContent=preview?'Stop quality preview':workerError?'Retry quality preview':'Preview capture quality';
}
function stop(message:string){active=false;epoch++;update(message);}
function request(message:Record<string,unknown>,transfer:Transferable[]=[]):Promise<any>{
 const id=++sequence;
 return new Promise((resolve,reject)=>{
  const timeout=window.setTimeout(()=>{pending.delete(id);reject(Error('Checkerboard worker timed out'));},35000);
  pending.set(id,{resolve,reject,timeout});worker!.postMessage({...message,id,url:new URL('./vendor/opencv.js',document.baseURI).href},transfer);
 });
}
function disposeWorker(){worker?.terminate();worker=undefined;workerReady=undefined;for(const p of pending.values()){clearTimeout(p.timeout);p.reject(Error('Checkerboard worker stopped'));}pending.clear();}
async function initialize(){
 if(workerError)throw Error(workerError);
 if(!workerReady){
  worker=new Worker(new URL('./input/checkerboardWorker.ts',import.meta.url));
  worker.onmessage=({data})=>{const p=pending.get(data.id);if(!p)return;clearTimeout(p.timeout);pending.delete(data.id);if(data.error)p.reject(Error(data.error));else p.resolve(data);};
  worker.onerror=()=>{for(const p of pending.values()){clearTimeout(p.timeout);p.reject(Error('Checkerboard worker failed to load'));}pending.clear();};
  workerReady=request({type:'init'}).then(()=>{});
 }
 return workerReady;
}
function draw(index:number,m:BoardMeasurement,good:boolean){
 const canvas=overlays[index];canvas.width=m.width;canvas.height=m.height;
 const context=canvas.getContext('2d')!;context.strokeStyle=context.fillStyle=good?'#35dc87':'#ffc35a';context.lineWidth=2;
 for(const p of m.corners){context.beginPath();context.arc(p.x,p.y,2.5,0,Math.PI*2);context.fill();}
 if(m.corners.length===48){context.beginPath();for(const [i,j] of [0,7,47,40].entries()){const p=m.corners[j];if(i)context.lineTo(p.x,p.y);else context.moveTo(p.x,p.y);}context.closePath();context.stroke();}
}
function clearOverlays(){for(const canvas of overlays)canvas.getContext('2d')!.clearRect(0,0,canvas.width,canvas.height);}
function snapshot(index:number){
 const video=videos[index],canvas=snapshots[index],small=checks[index];
 if(canvas.width!==video.videoWidth||canvas.height!==video.videoHeight){canvas.width=video.videoWidth;canvas.height=video.videoHeight;}
 canvas.getContext('2d')!.drawImage(video,0,0);
 const scale=Math.min(1,640/canvas.width);small.width=Math.round(canvas.width*scale);small.height=Math.round(canvas.height*scale);
 const context=small.getContext('2d',{willReadFrequently:true})!;context.drawImage(canvas,0,0,small.width,small.height);
 return context.getImageData(0,0,small.width,small.height);
}
const encode=(i:number):ImageCapture=>({width:snapshots[i].width,height:snapshots[i].height,image:snapshots[i].toDataURL('image/jpeg',.92)});
async function tick(){
 if(processing||completed||workerError||!(active||preview&&visible()))return;
 if(!ready()){clearOverlays();lastGood=undefined;stableSince=undefined;quality.textContent='Start both cameras and select two distinct devices to check board quality.';if(active)stop('Camera views unavailable or device selection changed; accepted pairs retained.');return;}
 if(configuration&&config()!==configuration){clearOverlays();quality.textContent='Camera order or resolution changed. Accepted pairs retain their original camera identities; clear before collecting a new set.';if(active)stop('Camera order or resolution changed. Clear captures before starting a new set.');return;}
 const token=epoch;processing=true;
 try{
  quality.textContent=workerReady?'Checking both views…':'Loading checkerboard quality worker…';await initialize();if(token!==epoch)return;
  const sources=videos.map(v=>v.srcObject),clocks=videos.map(v=>frameClock(v));
  const frameDeltaMs=clocks.every(Boolean)?Math.abs(clocks[0]!.presentedAt-clocks[1]!.presentedAt):null;
  const attemptConfig=config(),at=performance.now(),images=[snapshot(0),snapshot(1)];
  const response=await request({type:'check',images},images.map(image=>image.data.buffer));
  if(token!==epoch||config()!==attemptConfig||!ready()||sources.some((source,i)=>source!==videos[i].srcObject))return;
  const measurements=response.result as BoardMeasurement[];
  const descriptions=measurements.map(describeBoard),individualGood=descriptions.every(d=>!d.reasons.length);
  if(individualGood&&lastGood&&at-lastGood.at<2000&&measurements.every((m,i)=>boardMotion(lastGood!.measurements[i],m)<Math.max(1.2,(descriptions[i].quality?.cellPx??8)*.06))){stableSince??=lastGood.at;}
  else stableSince=at;
  lastGood=individualGood?{measurements,at}:undefined;
  const decision=pairCaptureDecision(measurements[0],measurements[1],poses,individualGood?at-(stableSince??at):0,frameDeltaMs);
  measurements.forEach((m,i)=>draw(i,m,descriptions[i].reasons.length===0));
  quality.textContent=descriptions.map((d,i)=>'Camera '+(i+1)+': '+(d.quality?'48 corners · square '+d.quality.cellPx.toFixed(0)+' px · contrast '+d.quality.contrast.toFixed(0)+' · sharpness '+d.quality.focus.toFixed(2):'board not found')).join(' | ')+
   ' · '+(decision.accepted?'Ready — good new pair':decision.reasons.join(' · '));
  if(active&&decision.accepted&&at-lastAccepted>=1500){
   configuration??=attemptConfig;
   const pose=decision.pose!;pairs.push({time:new Date().toISOString(),first:encode(0),second:encode(1),frameDeltaMs:frameDeltaMs!,quality:pose});poses.push(pose);lastAccepted=at;
   if(captureCoverage(poses).complete){completed=true;preview=false;stop('Capture complete: '+pairs.length+' good, distinct pairs with position, distance and tilt coverage. Export to solve and validate calibration.');return;}
   if(pairs.length>=40){preview=false;stop('Capture paused at 40 accepted pairs, but coverage is incomplete. Export this partial set or clear it and follow the coverage guidance.');return;}
   update('Accepted pair '+pairs.length+'. Move the board, then hold still for the next pair.');
  }else if(active)update('Not saved: '+(decision.reasons.join(' · ')||'Waiting between accepted captures'));
  else update();
 }catch(error){workerError=String(error);preview=false;stop('Quality checking unavailable: '+workerError+'. No unverified pairs were saved.');}
 finally{processing=false;}
}
previewButton.addEventListener('click',()=>{if(workerError){workerError='';disposeWorker();}preview=!preview;epoch++;lastGood=undefined;stableSince=undefined;if(!preview)clearOverlays();update();void tick();});
capture.addEventListener('click',()=>{
 if(active){stop('Capture paused. '+pairs.length+' accepted pairs retained.');return;}
 if(!ready()){update('Start both cameras with two distinct selected devices before capture.');return;}
 if(configuration&&config()!==configuration){update('Clear captures before changing camera order or resolution.');return;}
 if(workerError){workerError='';disposeWorker();}
 active=true;preview=true;epoch++;lastGood=undefined;stableSince=undefined;update('Checking image quality and waiting for a steady board…');void tick();
});
exportButton.addEventListener('click',()=>{
 if(!pairs.length)return;
 const progress=captureCoverage(poses);
 const identities=configuration?JSON.parse(configuration) as Array<{id:string}>:[];
 const payload={format:'suturehero-stereo-captures-v1',board,camera1:identities[0]?.id??cameras[0].value,camera2:identities[1]?.id??cameras[1].value,pairs,diagnostics:{captureQualities:poses,qualityGateVersion:1,qualityCheckMaxWidth:640,coverage:progress,notice:'Capture-quality and pose-coverage checks only. Camera intrinsics, extrinsics and reprojection accuracy must still be solved and validated. Frame delta uses presentation callbacks, not hardware synchronization.'}};
 const url=URL.createObjectURL(new Blob([JSON.stringify(payload)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='suturehero-stereo-calibration-'+new Date().toISOString().slice(0,10)+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 update('Exported '+pairs.length+' accepted pairs'+(progress.complete?' — ready to solve.':' — partial coverage.'));
});
clearButton.addEventListener('click',()=>{
 if(active)return;if(pairs.length&&!confirm('Discard accepted calibration captures?'))return;
 epoch++;pairs.length=poses.length=0;configuration=undefined;completed=false;lastAccepted=-Infinity;lastGood=undefined;stableSince=undefined;clearOverlays();update('Captures cleared.');
});
squareSize.addEventListener('change',()=>{const mm=Number(squareSize.value);if(!Number.isFinite(mm)||mm<1||mm>100){squareSize.value=String(board.squareSizeMm);return;}board.squareSizeMm=mm;updateIntro();});
function updateIntro(){const intro=capture.closest('section')?.querySelector<HTMLElement>('p.tracking-message');if(intro)intro.innerHTML=`Checkerboard: <strong>9 × 7 squares · 8 × 6 inner corners · ${board.squareSizeMm} mm squares</strong>. Keep the full board sharp and still in both views. Capture stops after at least 20 good, distinct pairs with position, distance and tilt coverage. Keep the cameras fixed. Export captures to solve the calibration.`;}
const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)&&!completed){preview=true;update();void tick();}else if(!active)clearOverlays();});observer.observe(capture);
const timer=window.setInterval(()=>{void tick();},650);
window.addEventListener('pagehide',()=>{clearInterval(timer);observer.disconnect();disposeWorker();},{once:true});
updateIntro();update('Start both cameras, then preview quality or start guided capture. Only accepted pairs will be saved.');
