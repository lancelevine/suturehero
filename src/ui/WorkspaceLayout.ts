/** Reorganize existing practice controls without replacing their IDs or gameplay handlers. */
export function mountWorkspaceLayout(app:HTMLElement){
 document.body.classList.add('workspace-first');
 const main=app.querySelector('main')!,workspace=main.querySelector<HTMLElement>('.workspace')!,lesson=main.querySelector<HTMLElement>(':scope > aside')!;
 main.classList.add('suturing-app');
 const header=app.querySelector('header')!;
 header.querySelector('.lab')?.remove();header.querySelector('.status')?.remove();
 const buttons=document.createElement('div');buttons.className='workspace-header-actions';
 buttons.innerHTML='<button id="workspace-setup-toggle" type="button" aria-expanded="false">Setup</button><button id="workspace-plan-toggle" type="button" aria-expanded="false">Stitch plan</button><button id="workspace-review-toggle" type="button" aria-expanded="false">Review</button><button id="workspace-analysis-toggle" type="button" aria-expanded="false">Analysis</button><button id="workspace-calibrate-toggle" type="button" aria-expanded="false">⊕ Calibrate</button><button id="workspace-guide-toggle" type="button" aria-expanded="false">? Guide</button>'
  // Less-used tracking tools (added by TrackingLayout) live in one menu (2026-11-27).
  +'<details class="workspace-menu" id="workspace-tracking-menu"><summary>Tracking ▾</summary><div class="workspace-menu-items"></div></details>';
 buttons.prepend(app.querySelector('#camera-tracking-toggle')!);header.append(buttons);
 const viewport=workspace.querySelector<HTMLElement>('#viewport')!,cameraPanel=app.querySelector<HTMLElement>('#camera-tracking-panel')!;
 cameraPanel.removeAttribute('style');cameraPanel.className='workspace-camera-dock';
 const cameraHead=cameraPanel.firstElementChild as HTMLElement;cameraHead.removeAttribute('style');cameraHead.className='workspace-camera-heading';
 const end=cameraPanel.querySelector<HTMLButtonElement>('#camera-tracking-hide')!;end.textContent='Hide camera';cameraHead.querySelector('strong')!.textContent='Camera';
 const stop=document.createElement('button');stop.id='disable-camera-tracking';stop.type='button';stop.textContent='Disable tracking';cameraHead.append(stop);
 const trackingRoot=cameraPanel.querySelector<HTMLElement>('#tracking-app')!;trackingRoot.removeAttribute('style');
 const stage=document.createElement('div');stage.className='workspace-stage';
 const visual=document.createElement('div');visual.className='workspace-visuals';visual.append(viewport,cameraPanel);
 const calibration=document.createElement('aside');calibration.id='workspace-calibration-drawer';calibration.className='workspace-calibration-drawer';calibration.hidden=true;
 calibration.innerHTML='<div class="workspace-drawer-bar"><span title="Separate settings for each instrument">INSTRUMENT CALIBRATION</span><button type="button" id="close-calibration" aria-label="Close calibration">✕</button></div><div id="instrument-calibration"></div>';
 // Practice setup, stitch plan, review and guide open in one side panel beside the scene (2026-11-27),
 // instead of a row of collapsed cards under it. They stay <details> elements: opening one (button,
 // keyboard or script) shows the panel with that section and closes the others.
 const side=document.createElement('aside');side.id='workspace-side-panel';side.className='workspace-calibration-drawer workspace-side-panel';side.hidden=true;
 side.innerHTML='<div class="workspace-drawer-bar"><span class="workspace-side-title"></span><button type="button" id="close-side-panel" aria-label="Close panel">✕</button></div><div class="workspace-side-body"></div>';
 stage.append(visual,calibration,side);
 const viewTools=document.createElement('div');viewTools.className='workspace-view-tools';const resetNeedle=document.createElement('button');resetNeedle.id='reset-needle';resetNeedle.type='button';resetNeedle.textContent='Reset needle';resetNeedle.title='Put the needle back at its starting point (Sandbox)';const undoPass=document.createElement('button');undoPass.id='undo-pass';undoPass.type='button';undoPass.textContent='Undo pass';undoPass.title='Take back the last needle pass or tear (Sandbox)';const replay=document.createElement('button');replay.id='replay';replay.type='button';replay.textContent='Replay ½×';replay.title='Play the last 12 s back in slow motion with the instrument tip paths (Sandbox); click again to stop';viewTools.append(workspace.querySelector('#close-up')!,workspace.querySelector('#camera')!,resetNeedle,undoPass,replay);viewport.append(viewTools);
 const heading=workspace.querySelector<HTMLElement>('.scene-heading')!;heading.classList.add('workspace-scene-title');viewport.append(heading);
 const setup=workspace.querySelector<HTMLElement>('.practice-setup')!;
 const sideBody=side.querySelector<HTMLElement>('.workspace-side-body')!;
 const drawer=(id:string,title:string,elements:Element[])=>{const d=document.createElement('details');d.id=id;d.className='workspace-disclosure';d.dataset.title=title;const summary=document.createElement('summary');summary.textContent=title;d.append(summary,...elements);sideBody.append(d);return d;};
 const setupBox=drawer('workspace-practice-setup','Practice setup',[setup]);
 const plan=drawer('workspace-stitch-plan','Stitch plan',[workspace.querySelector('.bite-planning')!]);
 const course=drawer('workspace-session-review','Session & stitch review',[workspace.querySelector('.course-controls')!,workspace.querySelector('.stitch-summary')!]);
 // Skill Analysis (src/ui/SkillAnalysisPanel.ts) fills this host.
 const analysisHost=document.createElement('div');analysisHost.id='skill-analysis-host';
 const analysis=drawer('workspace-skill-analysis','Skill analysis',[analysisHost]);
 const grip=workspace.querySelector('.grip-settings')!;
 const notes=Array.from(workspace.querySelectorAll('.knot-note'));
 // Training curriculum (src/ui/CurriculumPanel.ts) fills this host.
 const curriculumHost=document.createElement('div');curriculumHost.id='curriculum-host';
 const guide=drawer('workspace-guide','Guide & controls',[curriculumHost,lesson,...notes,grip,workspace.querySelector('.controls')!]);
 const feedback=workspace.querySelector('.exercise-feedback')!,toolbar=workspace.querySelector('.toolbar')!,handling=workspace.querySelector('#skin-handling')!;
 const coach=document.createElement('div');coach.className='workspace-coach';coach.append(feedback,toolbar,handling);
 workspace.replaceChildren(stage,coach);
 lesson.classList.add('workspace-lesson');
 const reset=workspace.querySelector('#reset')!;buttons.append(reset);
 const sections=[['workspace-setup-toggle',setupBox],['workspace-plan-toggle',plan],['workspace-review-toggle',course],['workspace-analysis-toggle',analysis],['workspace-guide-toggle',guide]] as const;
 const syncSide=()=>{
  const open=sections.find(([,details])=>details.open)?.[1];
  side.hidden=!open;
  side.querySelector('.workspace-side-title')!.textContent=open?.dataset.title?.toUpperCase()??'';
  for(const [button,details] of sections)app.querySelector('#'+button)!.setAttribute('aria-expanded',String(details.open));
  if(open)toggleCalibration(false);
 };
 for(const [button,details] of sections){
  app.querySelector<HTMLButtonElement>('#'+button)!.onclick=()=>{details.open=!details.open;};
  const onChange=()=>{if(details.open)for(const [,other] of sections)if(other!==details&&other.open)other.open=false;syncSide();};
  details.addEventListener('toggle',onChange);
  // The toggle event arrives a task later; the attribute observer shows the panel as soon as a
  // section opens, including when page code opens one during start-up (2026-11-27).
  new MutationObserver(onChange).observe(details,{attributes:true,attributeFilter:['open']});
 }
 syncSide();
 app.querySelector('#close-side-panel')!.addEventListener('click',()=>{for(const [,details] of sections)details.open=false;});
 const trackingMenu=app.querySelector<HTMLDetailsElement>('#workspace-tracking-menu')!;
 // The menu stays open while one of its panels (a dialog) is in use, so closing the panel can return
 // focus to its button; any other click outside closes it.
 document.addEventListener('click',e=>{const target=e.target as HTMLElement;if(trackingMenu.open&&!trackingMenu.contains(target)&&!target.closest('dialog'))trackingMenu.open=false;});
 function toggleCalibration(open?:boolean){calibration.hidden=open===undefined?!calibration.hidden:!open;app.querySelector('#workspace-calibrate-toggle')!.setAttribute('aria-expanded',String(!calibration.hidden));if(!calibration.hidden)for(const [,details] of sections)if(details.open)details.open=false;}
 app.querySelector('#close-calibration')!.addEventListener('click',()=>toggleCalibration(false));
 app.querySelector('#workspace-calibrate-toggle')!.addEventListener('click',()=>{const open=calibration.hidden;toggleCalibration(open);if(open)window.dispatchEvent(new Event('suturehero:open-camera-setup'));});
 toggleCalibration(true);
 end.addEventListener('click',()=>{cameraPanel.hidden=true;cameraPanel.style.display='none';document.body.classList.remove('camera-setup-active');app.querySelector('#camera-tracking-toggle')!.setAttribute('aria-expanded','false');});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!document.querySelector('dialog[open]')){toggleCalibration(false);for(const [,details] of sections)details.open=false;}});
 return {calibrationHost:calibration.querySelector<HTMLElement>('#instrument-calibration')!,openSetup:()=>document.body.classList.add('camera-setup-active')};
}
