export {};
// Browser camera controls are optional: many UVC drivers expose controls to OBS but not Chrome.
type CameraNumericRange={min:number;max:number;step?:number};
type CameraCaps=MediaTrackCapabilities & {exposureMode?:string[];exposureTime?:CameraNumericRange;gain?:CameraNumericRange};
type CameraSettings=MediaTrackSettings & {exposureMode?:string;exposureTime?:number;gain?:number};
function panel(videoId:string, label:string){
 const video=document.querySelector<HTMLVideoElement>('#'+videoId)!;
 const container=document.createElement('section');
 container.className='tracking-panel';
 container.style.cssText='padding:12px;margin:8px 0 16px';
 container.innerHTML='<strong>'+label+' exposure</strong><p class="tracking-message" data-status>Start the camera to inspect browser-supported controls.</p><div data-controls></div>';
 const advanced=video.closest('#tracking-app')?.querySelector('.tracking-advanced-body');
 if(advanced)advanced.append(container);else video.closest('.tracking-video')?.after(container);
 const status=container.querySelector<HTMLElement>('[data-status]')!;
 const controls=container.querySelector<HTMLElement>('[data-controls]')!;
 let current:MediaStreamTrack|null=null;
 function row(title:string,control:HTMLElement){
  const wrap=document.createElement('label');wrap.style.cssText='display:flex;align-items:center;gap:10px;margin:8px 0;flex-wrap:wrap';
  const text=document.createElement('span');text.textContent=title;wrap.append(text,control);controls.append(wrap);
 }
 async function apply(track:MediaStreamTrack,key:string,value:string|number){
  try{
   await track.applyConstraints({advanced:[{[key]:value} as MediaTrackConstraintSet]});
   const settings=track.getSettings() as CameraSettings;
   status.textContent='Applied '+key+' = '+String(settings[key as keyof CameraSettings]??value)+'. Changes may reset when the camera restarts.';
  }catch(error){status.textContent='Camera rejected '+key+': '+String(error);}
 }
 function rebuild(track:MediaStreamTrack){
  controls.replaceChildren();
  const caps=track.getCapabilities() as CameraCaps;
  const settings=track.getSettings() as CameraSettings;
  let count=0;
  if(caps.exposureMode?.length){
   count++;
   const select=document.createElement('select');
   for(const mode of caps.exposureMode){const option=document.createElement('option');option.value=mode;option.textContent=mode;select.append(option);}
   select.value=settings.exposureMode||caps.exposureMode[0];
   select.addEventListener('change',()=>void apply(track,'exposureMode',select.value));
   row('Exposure mode',select);
  }
  for(const key of ['exposureTime','gain'] as const){
   const range=caps[key];if(!range||!Number.isFinite(range.min)||!Number.isFinite(range.max)||range.max<=range.min)continue;
   count++;
   const slider=document.createElement('input');slider.type='range';slider.min=String(range.min);slider.max=String(range.max);
   slider.step=String(range.step||'any');slider.value=String(settings[key]??range.min);
   const value=document.createElement('output');value.textContent=slider.value;
   slider.addEventListener('input',()=>{value.textContent=slider.value;});
   slider.addEventListener('change',()=>void apply(track,key,Number(slider.value)));
   const group=document.createElement('span');group.style.cssText='display:flex;align-items:center;gap:8px';group.append(slider,value);
   row(key==='exposureTime'?'Exposure time':'Gain',group);
  }
  status.textContent=count?'Browser controls detected. Adjust each camera independently.':'This webcam exposes no manual exposure/gain controls to this browser. OBS may still support driver-level exposure settings.';
 }
 window.setInterval(()=>{
  const track=(video.srcObject as MediaStream|null)?.getVideoTracks()[0]||null;
  if(track===current)return;
  current=track;
  if(!track){controls.replaceChildren();status.textContent='Start the camera to inspect browser-supported controls.';return;}
  try{rebuild(track);}catch(error){status.textContent='Unable to read camera capabilities: '+String(error);}
 },700);
}
panel('camera-video','Camera 1');
panel('camera-video-2','Camera 2');
