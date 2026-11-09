import {mountCalibrationPanel} from './InstrumentCalibrationPanel';
import {mountCameraPicker} from './CameraPicker';
/** Move existing controls so camera streams and their handlers stay attached. */
export function mountTrackingLayout(root:HTMLElement){
 root.classList.add('tracking-clean','tracking-panels');const embedded=root.dataset.embedded==='true';
 const layout=root.querySelector<HTMLElement>('.tracking-layout')!,primary=layout.firstElementChild as HTMLElement,virtual=layout.lastElementChild as HTMLElement;
 primary.classList.add('tracking-camera-card');virtual.classList.add('tracking-virtual-card');
 const preview=root.querySelector<HTMLElement>('#primary-camera-preview')!,cameraRow=root.querySelector<HTMLElement>('#camera-select')!.closest<HTMLElement>('.tracking-actions')!;
 const stage=document.createElement('div');stage.className='tracking-camera-stage';
 const head=document.createElement('div');head.className='tracking-camera-title';head.innerHTML='<strong>Live view</strong>';
 const status=root.querySelector<HTMLElement>('#camera-status')!;
 const feeds=document.createElement('div');feeds.className='tracking-camera-feeds';
 const secondVideo=root.querySelector<HTMLVideoElement>('#camera-video-2')!,secondPreview=secondVideo.closest<HTMLElement>('.tracking-video')!;
 preview.dataset.cameraLabel='Camera 1';secondPreview.dataset.cameraLabel='Camera 2';feeds.append(preview,secondPreview);
 const fitFeeds=()=>{
  if(secondPreview.hidden)return;
  const first=preview.querySelector<HTMLVideoElement>('video')!;
  const ratio=(v:HTMLVideoElement)=>v.videoWidth&&v.videoHeight?v.videoWidth/v.videoHeight:16/9;
  const height=Math.max(0,stage.clientHeight-head.offsetHeight-3);
  const width=Math.min(stage.clientWidth,height/(1/ratio(first)+1/ratio(secondVideo)));
  feeds.style.setProperty('--dual-feed-width',`${width}px`);
 };
 const updateFeeds=()=>{const active=!!secondVideo.srcObject;secondPreview.hidden=!active;feeds.classList.toggle('two-cameras',active);fitFeeds();};
 secondVideo.addEventListener('loadedmetadata',updateFeeds);secondVideo.addEventListener('emptied',updateFeeds);secondVideo.addEventListener('playing',updateFeeds);updateFeeds();
 for(const [video,frame] of [[preview.querySelector<HTMLVideoElement>('video')!,preview],[secondVideo,secondPreview]] as const){
  const size=()=>{frame.style.setProperty('--camera-aspect',video.videoWidth&&video.videoHeight?`${video.videoWidth} / ${video.videoHeight}`:'16 / 9');fitFeeds();};
  video.addEventListener('loadedmetadata',size);video.addEventListener('resize',size);video.addEventListener('emptied',size);size();
 }
 stage.append(head,feeds,cameraRow,status);
 const feedResize=new ResizeObserver(fitFeeds);feedResize.observe(stage);feedResize.observe(head);
 window.addEventListener('pagehide',()=>feedResize.disconnect(),{once:true});
 const navigation=embedded?document.querySelector('.workspace-header-actions')!:root.querySelector('header')!;
 const panel=(id:string,title:string,description:string)=>{
  const dialog=document.createElement('dialog');dialog.id=id;dialog.className='tracking-tools-panel';dialog.setAttribute('aria-labelledby',id+'-title');
  dialog.innerHTML=`<div class="tracking-tools-heading"><div><div class="eyebrow">TRACKING</div><h2 id="${id}-title">${title}</h2></div><button type="button" aria-label="Close ${title.toLowerCase()}">✕</button></div><p class="tracking-message">${description}</p><div class="tracking-tools-body"></div>`;
  const button=document.createElement('button');button.type='button';button.id=id+'-toggle';button.textContent=title;button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-controls',id);button.setAttribute('aria-expanded','false');
  button.onclick=()=>{dialog.showModal();button.setAttribute('aria-expanded','true');};dialog.querySelector('button')!.onclick=()=>dialog.close();dialog.addEventListener('close',()=>button.setAttribute('aria-expanded','false'));
  navigation.append(button);root.append(dialog);return dialog.querySelector<HTMLElement>('.tracking-tools-body')!;
 };
 const setup=panel('tracking-setup-panel','Tracking setup','Choose your marker geometry and tracking mode. Instrument pose, depth lock and jaw calibration are in Calibrate.');
 const diagnostics=panel('tracking-diagnostics-panel','Diagnostics','Inspect recognition, motion and performance without changing camera setup.');diagnostics.classList.add('tracking-diagnostics-body');
 const performance=document.querySelector('#camera-performance');if(embedded&&performance)diagnostics.prepend(performance);
 const section=(host:HTMLElement,title:string)=>{const details=document.createElement('details');details.className='tracking-details';details.innerHTML='<summary></summary><div class="tracking-details-body"></div>';details.querySelector('summary')!.textContent=title;host.append(details);return details.lastElementChild as HTMLElement;};
 const group=(id:string,selector:string)=>root.querySelector('#'+id)!.closest<HTMLElement>(selector)!;
 const model=section(setup,'Markers & tracking mode');model.parentElement!.setAttribute('open','');
 model.append(group('tracker-type','.tracking-actions'));
 const mode=group('tracking-mode','.tracking-actions');
 // One depth lock per instrument lives in Calibrate. Retain its bound source
 // control privately so legacy synchronization does not gain a second UI.
 const compatibility=document.createElement('div');compatibility.hidden=true;compatibility.append(group('lock-depth','label'));root.append(compatibility);
 const experiments=section(diagnostics,'Experimental tracking');
 for(const id of ['flow-rotation','face-transition','stable-depth'])experiments.append(group(id,'label'));
 model.append(mode,root.querySelector('#tracking-mode-info')!);
 const depth=section(setup,'Working depth');depth.append(group('working-depth-mm','section'),group('depth-sensitivity','label'));
 const stereo=section(setup,'Stereo calibration');stereo.append(group('start-stereo-all','.tracking-actions'),group('capture-stereo-pair','section'),group('stereo-import','section'));
 // Shortcut on the main bar: start both cameras + metric 3D without opening Tracking setup.
 // Its messages (e.g. "select a second camera") are mirrored under the camera views.
 const stereoStart=root.querySelector<HTMLButtonElement>('#start-stereo-all'),stereoStartStatus=root.querySelector<HTMLElement>('#stereo-quick-status');
 if(stereoStart&&stereoStartStatus){
  const shortcut=document.createElement('button');shortcut.type='button';shortcut.id='start-stereo-shortcut';shortcut.textContent='Start 2 cameras + metric 3D';
  shortcut.onclick=()=>stereoStart.click();
  const shortcutStatus=document.createElement('p');shortcutStatus.id='start-stereo-shortcut-status';shortcutStatus.className='tracking-message';shortcutStatus.setAttribute('role','status');shortcutStatus.hidden=true;
  const mirror=()=>{shortcut.disabled=stereoStart.disabled;shortcutStatus.textContent=stereoStartStatus.textContent??'';shortcutStatus.hidden=!shortcutStatus.textContent;};
  new MutationObserver(mirror).observe(stereoStartStatus,{childList:true,characterData:true,subtree:true});
  new MutationObserver(mirror).observe(stereoStart,{attributes:true,attributeFilter:['disabled']});
  navigation.append(shortcut);stage.append(shortcutStatus);
 }
 const cameraSettings=section(stage,'Camera controls · focus & exposure');cameraSettings.parentElement!.setAttribute('open','');cameraSettings.classList.add('tracking-camera-settings');
 cameraSettings.append(root.querySelector('#camera-settings-controls')!,group('camera-select-2','.tracking-actions'));
 const disable=document.querySelector('#disable-camera-tracking');if(embedded&&disable)cameraSettings.append(disable);
 const recognition=section(diagnostics,'Recognition & image diagnostics');recognition.parentElement!.setAttribute('open','');
 recognition.append(root.querySelector('[aria-label="Live camera diagnostics"]')!);
 for(const id of ['aruco-correction','corner-debug'])recognition.append(group(id,'.tracking-actions'));
 for(const id of ['roi-decode','show-threshold','show-crop'])recognition.append(group(id,'label'));
 for(const id of ['threshold-preview','crop-views','camera-status-2','stereo-match-status'])recognition.append(root.querySelector('#'+id)!);
 const motion=section(diagnostics,'Instrument motion');motion.append(virtual.querySelector(':scope > .tracking-details')!,root.querySelector('#stereo-view-indicator')!);
 const simulation=section(diagnostics,'Simulated input');simulation.append(group('simulation','.tracking-actions'));
 const expand=root.querySelector('#camera-expand');if(expand)head.append(expand);
 const jaws=group('ball-enable','details');
 let host=document.querySelector<HTMLElement>('#instrument-calibration');
 if(!host){host=document.createElement('aside');host.className='tracking-calibration-card';layout.append(host);}
 mountCalibrationPanel(host).attachJawControls(jaws);
 primary.replaceChildren(stage);
 if(embedded){root.querySelector('header')!.classList.add('tracking-embedded-hidden');virtual.classList.add('tracking-embedded-hidden');}
 else{document.body.classList.add('tracking-setup-page');virtual.querySelector('h2')!.textContent='Instrument preview';}
 for(const id of ['rotation-gain','rotation-sensitivity'])root.querySelector('#'+id)?.closest('label')?.classList.add('tracking-embedded-hidden');
 mountCameraPicker(root);
 // These panels must remain accessible when the camera feed is hidden.
 document.body.append(setup.closest('dialog')!,diagnostics.closest('dialog')!);
 return {diagnosticsHost:diagnostics};
}
