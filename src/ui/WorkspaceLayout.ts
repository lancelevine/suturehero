/** Reorganize existing practice controls without replacing their IDs or gameplay handlers. */
export function mountWorkspaceLayout(app:HTMLElement){
 document.body.classList.add('workspace-first');
 const main=app.querySelector('main')!,workspace=main.querySelector<HTMLElement>('.workspace')!,lesson=main.querySelector<HTMLElement>(':scope > aside')!;
 main.classList.add('suturing-app');
 const header=app.querySelector('header')!;
 header.querySelector('.lab')?.remove();header.querySelector('.status')?.remove();
 const buttons=document.createElement('div');buttons.className='workspace-header-actions';
 buttons.innerHTML='<button id="workspace-setup-toggle" type="button" aria-expanded="false">Practice setup</button><button id="workspace-calibrate-toggle" type="button" aria-expanded="false">⊕ Calibrate</button><button id="workspace-guide-toggle" type="button" aria-expanded="false">? Guide</button>';
 buttons.prepend(app.querySelector('#camera-tracking-toggle')!);header.append(buttons);
 const viewport=workspace.querySelector<HTMLElement>('#viewport')!,cameraPanel=app.querySelector<HTMLElement>('#camera-tracking-panel')!;
 cameraPanel.removeAttribute('style');cameraPanel.className='workspace-camera-dock';
 const cameraHead=cameraPanel.firstElementChild as HTMLElement;cameraHead.removeAttribute('style');cameraHead.className='workspace-camera-heading';
 const end=cameraPanel.querySelector<HTMLButtonElement>('#camera-tracking-hide')!;end.textContent='Done setting up';
 const stop=document.createElement('button');stop.id='disable-camera-tracking';stop.type='button';stop.textContent='Disable tracking';cameraHead.append(stop);
 const trackingRoot=cameraPanel.querySelector<HTMLElement>('#tracking-app')!;trackingRoot.removeAttribute('style');
 const stage=document.createElement('div');stage.className='workspace-stage';
 const visual=document.createElement('div');visual.className='workspace-visuals';visual.append(viewport,cameraPanel);
 const calibration=document.createElement('aside');calibration.id='workspace-calibration-drawer';calibration.className='workspace-calibration-drawer';calibration.hidden=true;
 calibration.innerHTML='<div class="workspace-drawer-bar"><span>INSTRUMENT SETUP</span><button type="button" id="close-calibration" aria-label="Close calibration">✕</button></div><div id="instrument-calibration"></div>';
 stage.append(visual,calibration);
 const viewTools=document.createElement('div');viewTools.className='workspace-view-tools';viewTools.append(workspace.querySelector('#close-up')!,workspace.querySelector('#camera')!);viewport.append(viewTools);
 const heading=workspace.querySelector<HTMLElement>('.scene-heading')!;heading.classList.add('workspace-scene-title');viewport.append(heading);
 const setup=workspace.querySelector<HTMLElement>('.practice-setup')!;
 const advanced=document.createElement('div');advanced.className='workspace-controls';
 const drawer=(id:string,title:string,elements:Element[])=>{const d=document.createElement('details');d.id=id;d.className='workspace-disclosure';const summary=document.createElement('summary');summary.textContent=title;d.append(summary,...elements);advanced.append(d);return d;};
 const setupBox=drawer('workspace-practice-setup','Practice setup',[setup]);
 const plan=drawer('workspace-stitch-plan','Stitch plan',[workspace.querySelector('.bite-planning')!]);
 const course=drawer('workspace-session-review','Session & stitch review',[workspace.querySelector('.course-controls')!,workspace.querySelector('.stitch-summary')!]);
 const grip=workspace.querySelector('.grip-settings')!;
 const notes=Array.from(workspace.querySelectorAll('.knot-note'));
 const guide=drawer('workspace-guide','Guide & controls',[lesson,...notes,grip,workspace.querySelector('.controls')!]);
 const feedback=workspace.querySelector('.exercise-feedback')!,toolbar=workspace.querySelector('.toolbar')!,handling=workspace.querySelector('#skin-handling')!;
 const coach=document.createElement('div');coach.className='workspace-coach';coach.append(feedback,toolbar,handling);
 workspace.replaceChildren(stage,coach,advanced);
 lesson.classList.add('workspace-lesson');
 const reset=workspace.querySelector('#reset')!;buttons.append(reset);
 for(const [button,details] of [['workspace-setup-toggle',setupBox],['workspace-guide-toggle',guide]] as const){const b=app.querySelector<HTMLButtonElement>('#'+button)!;b.onclick=()=>{details.open=!details.open;b.setAttribute('aria-expanded',String(details.open));if(details.open)details.scrollIntoView({behavior:'smooth',block:'nearest'});};details.addEventListener('toggle',()=>b.setAttribute('aria-expanded',String(details.open)));}
 const toggleCalibration=(open?:boolean)=>{calibration.hidden=open===undefined?!calibration.hidden:!open;app.querySelector('#workspace-calibrate-toggle')!.setAttribute('aria-expanded',String(!calibration.hidden));};
 app.querySelector('#close-calibration')!.addEventListener('click',()=>toggleCalibration(false));
 app.querySelector('#workspace-calibrate-toggle')!.addEventListener('click',()=>{const open=calibration.hidden;toggleCalibration(open);if(open)window.dispatchEvent(new Event('suturehero:open-camera-setup'));});
 toggleCalibration(true);
 end.addEventListener('click',()=>{document.body.classList.remove('camera-setup-active');toggleCalibration(false);});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')toggleCalibration(false);});
 return {calibrationHost:calibration.querySelector<HTMLElement>('#instrument-calibration')!,openSetup:()=>document.body.classList.add('camera-setup-active')};
}
