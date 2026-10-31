/** Device cards reuse the existing camera controls and their permission/start/stop logic. */
export function mountCameraPicker(root:HTMLElement){
 const selects=[root.querySelector<HTMLSelectElement>('#camera-select')!,root.querySelector<HTMLSelectElement>('#camera-select-2')!];
 const videos=[root.querySelector<HTMLVideoElement>('#camera-video')!,root.querySelector<HTMLVideoElement>('#camera-video-2')!];
 const dialog=document.createElement('dialog');dialog.className='camera-picker-dialog';
 dialog.innerHTML='<div class="camera-picker-heading"><h2>Choose a camera</h2><button type="button" data-camera-close aria-label="Close camera picker">✕</button></div><p>Choose one device for each camera. A preview is shown for the camera already running; select a device card to start that camera.</p><div class="camera-picker-devices"></div><p class="camera-picker-message" role="status"></p>';
 root.append(dialog);let slot=0;
 const render=()=>{
  const container=dialog.querySelector('.camera-picker-devices')!;container.replaceChildren();
  for(const option of Array.from(selects[slot].options)){
   if(slot===1&&!option.value)continue;
   const button=document.createElement('button');button.type='button';button.className='camera-device-card';button.setAttribute('aria-pressed',String(selects[slot].value===option.value));
   const preview=document.createElement('div');preview.className='camera-device-preview';preview.textContent='▣';
   if(selects[slot].value===option.value&&videos[slot].srcObject){const video=document.createElement('video');video.autoplay=true;video.muted=true;video.playsInline=true;video.srcObject=videos[slot].srcObject;preview.replaceChildren(video);void video.play().catch(()=>{});}
   const title=document.createElement('strong');title.textContent=option.textContent||'Camera';const note=document.createElement('small');note.textContent=selects[slot].value===option.value?'Selected for camera '+(slot+1):'Use for camera '+(slot+1);
   button.append(preview,title,note);button.onclick=()=>{
    if(slot===1&&option.value===selects[0].value){dialog.querySelector('.camera-picker-message')!.textContent='Choose a different device for the second camera.';return;}
    if(selects[slot].value===option.value&&videos[slot].srcObject){dialog.close();return;}
    selects[slot].value=option.value;selects[slot].dispatchEvent(new Event('change'));
    root.querySelector<HTMLButtonElement>(slot===0?'#start-camera':'#start-camera-2')!.click();dialog.close();
   };container.append(button);
  }
  dialog.querySelector('.camera-picker-message')!.textContent=selects[slot].options.length<=1?'Start a camera to grant permission and reveal device names.':'';
 };
 const names:HTMLElement[]=[];
 for(let i=0;i<2;i++){
  const select=selects[i],button=document.createElement('button');button.type='button';button.className='camera-picker-trigger';button.id=i===0?'choose-primary-camera':'choose-secondary-camera';
  select.classList.add('camera-original-select');const label=root.querySelector<HTMLLabelElement>(`label[for="${select.id}"]`);label?.classList.add('camera-original-select');
  const name=document.createElement('span');name.className='camera-selected-name';names.push(name);select.after(name,button);
  button.textContent='Choose camera';button.onclick=()=>{slot=i;render();dialog.showModal();};
 }
 const refreshNames=()=>selects.forEach((select,i)=>{names[i].textContent=select.selectedOptions[0]?.textContent||'No camera selected';});
 for(const select of selects){new MutationObserver(refreshNames).observe(select,{childList:true,subtree:true,attributes:true});select.addEventListener('change',refreshNames);}
 refreshNames();dialog.querySelector('[data-camera-close]')!.addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>dialog.querySelectorAll('video').forEach(video=>video.srcObject=null));
 dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
}
