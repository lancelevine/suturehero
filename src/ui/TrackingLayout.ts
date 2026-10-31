import {mountCalibrationPanel} from './InstrumentCalibrationPanel';
import {mountCameraPicker} from './CameraPicker';
/** Keep the real camera element mounted and visible while controls are rearranged. */
export function mountTrackingLayout(root:HTMLElement){
 root.classList.add('tracking-clean');const embedded=root.dataset.embedded==='true';
 const layout=root.querySelector<HTMLElement>('.tracking-layout')!,primary=layout.firstElementChild as HTMLElement,virtual=layout.lastElementChild as HTMLElement;
 primary.classList.add('tracking-camera-card');virtual.classList.add('tracking-virtual-card');
 const preview=root.querySelector<HTMLElement>('#primary-camera-preview')!,cameraRow=root.querySelector<HTMLElement>('#camera-select')!.closest<HTMLElement>('.tracking-actions')!;
 const stage=document.createElement('div');stage.className='tracking-camera-stage';
 const head=document.createElement('div');head.className='tracking-camera-title';head.innerHTML='<strong>Camera view</strong><span>Markers & ball colors</span>';
 const status=root.querySelector<HTMLElement>('#camera-status')!;
 const feeds=document.createElement('div');feeds.className='tracking-camera-feeds';
 const secondVideo=root.querySelector<HTMLVideoElement>('#camera-video-2')!,secondPreview=secondVideo.closest<HTMLElement>('.tracking-video')!;
 preview.dataset.cameraLabel='Camera 1';secondPreview.dataset.cameraLabel='Camera 2';
 feeds.append(preview,secondPreview);
 const updateFeeds=()=>{const active=!!secondVideo.srcObject;secondPreview.hidden=!active;feeds.classList.toggle('two-cameras',active);head.querySelector('strong')!.textContent=active?'Camera views':'Camera view';};
 secondVideo.addEventListener('loadedmetadata',updateFeeds);secondVideo.addEventListener('emptied',updateFeeds);secondVideo.addEventListener('playing',updateFeeds);updateFeeds();
 stage.append(head,feeds,cameraRow,status);
 const controls=document.createElement('details');controls.className='tracking-advanced';controls.innerHTML='<summary>Camera settings, diagnostics & stereo</summary><div class="tracking-advanced-body"></div>';
 const body=controls.lastElementChild!;
 for(const child of Array.from(primary.children))body.append(child);
 primary.replaceChildren(stage,controls);
 const footer=root.querySelector('.tracking-settings-footer');if(footer)body.append(footer);
 const expand=root.querySelector('#camera-expand');if(expand)head.append(expand);
 // The source fields remain available to all existing tracking and calibration handlers.
 const jaws=root.querySelector<HTMLElement>('#ball-enable')!.closest<HTMLElement>('details')!;
 const external=document.querySelector<HTMLElement>('#instrument-calibration');
 let host=external;
 if(!host){host=document.createElement('aside');host.className='tracking-calibration-card';layout.append(host);}
 mountCalibrationPanel(host).attachJawControls(jaws);
 if(embedded){root.querySelector('header')!.classList.add('tracking-embedded-hidden');virtual.classList.add('tracking-embedded-hidden');}
 else{document.body.classList.add('tracking-setup-page');root.querySelector('h1')?.classList.add('tracking-embedded-hidden');}
 // Preview stays outside the scrollable controls, including when jaw/pose tabs switch.
 for(const id of ['rotation-gain','rotation-sensitivity'])root.querySelector('#'+id)?.closest('label')?.classList.add('tracking-embedded-hidden');
 mountCameraPicker(root);
}
