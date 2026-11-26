import {knotEngineEntry} from './knot/engines';
import {mountIphoneStart} from './ui/iphoneStart';
import {cameraMode as deviceCameraMode} from './input/cameraDevices';
import {mountDemoControl,type DemoControl} from './ui/demoControl';
import {ReplayController} from './scene/ReplayController';
import {describeSpacing,summarizeSandbox} from './gameplay/sandboxSummary';
import {mountSandboxSummaryPanel} from './ui/SandboxSummaryPanel';
import {formatMm} from './setup/sceneScale';
import {mountProductionMode} from './ui/productionMode';
import {TipMarkers} from './scene/tipMarkers';
import {FreePassMarks} from './scene/freePassMarks';
import {HeldInstrumentDisplay} from './scene/heldInstrumentDisplay';
import {viewInLab} from './trackingLab/liveView';
import {mountTrackingStatusBadge} from './ui/TrackingStatusBadge';
import {trackingPerformance as perf} from './diagnostics/TrackingPerformance';
import {TrackedPositionBridge} from './input/TrackedPositionBridge';
import {TRACKING_MESSAGE,isTrackingStatus,parseJawOpening,parseTrackingFps,parseTrackingPose,type TrackedInstrument} from './input/trackingMessages';
import {mountWorkspaceLayout} from './ui/WorkspaceLayout';
import {mountCalibrationPanel} from './ui/InstrumentCalibrationPanel';
import {instrumentCalibration} from './input/InstrumentCalibration';
import './ui/workspace.css';
import {trackedInstrumentRotation} from './input/trackingFrame';
import {EpidermalAlignmentGuide} from './scene/EpidermalAlignmentGuide';
import {CrossSectionView} from './scene/CrossSectionView';
import {DEFAULT_BITE_WIDTH} from './tissue/BitePlan';
import {CompletedStitchesView} from './scene/CompletedStitchesView';
import {MICRO_TARGETS,resolveMicroTarget} from './environments/MicroTargets';
import {Scissors} from './instruments/Scissors';
import {InstrumentControls} from './input/InstrumentControls';
import {FragmentView} from './scene/FragmentView';
import {PRACTICE_SETUP} from './setup/PracticeSetup';
import {ArteryTissue} from './tissue/ArteryTissue';
import type {EnvironmentId} from './environments/PracticeEnvironment';
import * as THREE from 'three';
import { FreeKnotView } from './scene/FreeKnotView';
import { KnotView } from './scene/KnotView';
import { GraspGuide } from './scene/GraspGuide';
import { HandoffGuide } from './scene/HandoffGuide';
import { PassGuide } from './scene/PassGuide';
import { PlacementGuide } from './scene/PlacementGuide';
import './style.css';
declare const __SUTUREHERO_BUILD__: string;
declare const __SUTUREHERO_REVISION__: string;
import { createScene } from './scene/createScene';
import { Instrument } from './instruments/Instrument';
import { KeyboardInput } from './input/KeyboardInput';
import { TissuePatch } from './tissue/TissuePatch';
import { SutureModel } from './suture/SutureModel';
import { NeedleGrasp } from './suture/NeedleGrasp';
import { PracticeSession } from './gameplay/PracticeSession';
import { practicePageMarkup } from './ui/practicePageMarkup';
import { exerciseProgress, exerciseReadout, exerciseTitle, graspStatusText, knotActionLabel, sandboxTitle } from './ui/practiceMessages';
const app=document.querySelector<HTMLDivElement>('#app')!;
/** User-facing build number: bump for each user-visible change (AGENTS.md → Versioning). */
const APP_BUILD='0.220';
app.innerHTML=practicePageMarkup({build:APP_BUILD,buildInfo:__SUTUREHERO_BUILD__,revision:__SUTUREHERO_REVISION__});
const workspaceLayout=mountWorkspaceLayout(app);
mountCalibrationPanel(workspaceLayout.calibrationHost);
// Tracking Lab carries recording, IndexedDB, import/export, and replay UI.
// Keep it out of the initial simulator bundle; the tab mounts as soon as its
// independent chunk is ready.
void import('./trackingLab/ui').then(({mountTrackingLab})=>mountTrackingLab(app));
const productionMode=mountProductionMode(app);
try {
  const view=createScene(document.querySelector('#viewport')!);
  const tools=[new Instrument('left',0x65d8c1),new Instrument('right',0xe65353)];
  const heldDisplay=new HeldInstrumentDisplay();
  const passMarks=new FreePassMarks();
  // Sandbox session summary, targets, progress and export (ui/SandboxSummaryPanel.ts).
  {const review=document.querySelector('#workspace-session-review');const host=document.createElement('div');if(review)review.querySelector('summary')?.after(host);else document.querySelector('.exercise-feedback')?.after(host);
   // Mounted after the session exists (it is created further down this setup).
   setTimeout(()=>mountSandboxSummaryPanel(host,{active:()=>session.sandbox||session.canFinishSandboxStitch||session.freePass.passes.length>0,passes:()=>session.freePass.passes,torn:()=>session.freePass.torn,stitches:()=>session.course.active?[]:session.course.completed.map(r=>({siteZ:r.site.siteZ,review:r.review})),build:()=>document.querySelector('.version')?.textContent??'',stitchRecords:()=>session.course.completed.map(r=>({number:r.number,review:r.review,meta:r.meta})),sessionSeconds:()=>session.clock.secondsSoFar}),0);}
  /** How long the "tissue torn" message stays (ms), and the torn passes already announced. */
  const TORN_MESSAGE_MS=3500;let tornSeen=0,tornMessageUntil=0,cutSeen=0,cutMessageUntil=0;view.scene.add(passMarks.root);
  const tipMarkers=new TipMarkers([{root:tools[0].root,color:0x65d8c1},{root:tools[1].root,color:0xe65353}]);view.scene.add(tipMarkers.root);
  const needle=new SutureModel(); const grasp=new NeedleGrasp(needle);
  // Slow-motion replay of the last 12 s of the Sandbox (scene/ReplayController.ts).
  const replay=new ReplayController(tools,needle);
  const tissue=new TissuePatch();const artery=new ArteryTissue();artery.root.visible=false;
  view.scene.add(tissue.root,artery.root,needle.root,...tools.map(tool=>tool.root));
  const scissors=new Scissors();view.scene.add(scissors.root);
  const fragmentsView=new FragmentView();view.scene.add(fragmentsView.root);
  const input=new InstrumentControls(new KeyboardInput()); const session=new PracticeSession(input,tools,grasp);
  const epidermalGuide=new EpidermalAlignmentGuide();view.scene.add(epidermalGuide.root);
  const edgeMarker=new THREE.Mesh(new THREE.SphereGeometry(0.032,12,8),new THREE.MeshBasicMaterial({color:0xf7ce73}));view.scene.add(edgeMarker);
  const freeView=new FreeKnotView(session.freeKnot);view.scene.add(freeView.root);
  const knotView=new KnotView(); view.scene.add(knotView.root);
  const completedView=new CompletedStitchesView();view.scene.add(completedView.root);
  document.querySelector('#knot-action')!.addEventListener('click',()=>session.knotAction());
  const guide=new PlacementGuide(session.placement.target); view.scene.add(guide.root);
  const graspGuide=new GraspGuide(); view.scene.add(graspGuide.root);
  document.querySelector('#grip-point')!.addEventListener('input',event=>{
    session.gripFraction=Number((event.target as HTMLInputElement).value)/100;
    document.querySelector('#grip-label')!.textContent=`${Math.round((1-session.gripFraction)*100)}% behind tip`;
  });
  document.querySelector('#begin-free-knot')!.addEventListener('click',()=>{
    if(session.continueFreeTying()){input.scissorsActive=false;scissors.reset();cutFeedback='';closeUp=true;closeUpButton.setAttribute('aria-pressed','true');closeUpButton.textContent='Wide view';view.closeUp(freeTarget());}
    (document.activeElement as HTMLElement|null)?.blur();
  });
  let cutFeedback='';
  let closeUp=false;
  const closeUpButton=document.querySelector('#close-up') as HTMLButtonElement;
  const freeTarget=()=>session.freeKnot.entry.clone().set(0,0.8,0.25);
  const courseStatus=document.querySelector('#course-status')!,courseReview=document.querySelector('#course-review') as HTMLOListElement;
  let courseRevision=-1;
  const rightBite=document.querySelector('#right-bite') as HTMLInputElement,leftBite=document.querySelector('#left-bite') as HTMLInputElement,stitchPosition=document.querySelector('#stitch-position') as HTMLInputElement;
  const setPlanText=(selector:string,text:string)=>{const element=document.querySelector(selector)!;if(element.textContent!==text)element.textContent=text;};
  const changeBites=()=>session.setBiteWidths(Number(rightBite.value)/100,Number(leftBite.value)/100);
  rightBite.addEventListener('input',changeBites);leftBite.addEventListener('input',changeBites);
  stitchPosition.addEventListener('input',()=>session.setStitchPosition(Number(stitchPosition.value)/100));
  const crossSectionPanel=document.querySelector('#cross-section') as HTMLElement;
  const crossSectionToggle=document.querySelector('#show-cross-section') as HTMLInputElement;
  const crossSection=new CrossSectionView(document.querySelector('#cross-section-canvas')!,document.querySelector('#cross-section-readout')!);
  crossSectionToggle.addEventListener('change',()=>crossSectionToggle.blur());
  const showNeedleGuide=document.querySelector('#show-needle-guide') as HTMLInputElement;
  showNeedleGuide.addEventListener('change',()=>showNeedleGuide.blur());
  const resetCourseTools=()=>{input.scissorsActive=false;scissors.reset();cutFeedback='';closeUp=false;closeUpButton.setAttribute('aria-pressed','false');closeUpButton.textContent='Close-up view';view.resetCamera();};
  document.querySelector('#start-course')!.addEventListener('click',()=>{if(session.startCourse())resetCourseTools();(document.activeElement as HTMLElement|null)?.blur();});
  document.querySelector('#next-stitch')!.addEventListener('click',()=>{
    const site=session.course.siteZ,sources=session.freeKnot.active?[freeView.root]:[knotView.root];
    if(session.advanceStitch()){completedView.retain(sources,site);resetCourseTools();}
    (document.activeElement as HTMLElement|null)?.blur();
  });
  document.querySelector('#free-tying')!.addEventListener('click',()=>{
    // Sandbox with a completed free pass: tie on that stitch (Stage B3); otherwise the tying lab's preplaced stitch.
    // A tied Sandbox stitch: keep it (frozen knot, closure at its position) and start the next one.
    if(session.canFinishSandboxStitch){completedView.retain([freeView.root],0);session.finishSandboxStitch();input.scissorsActive=false;scissors.reset();cutFeedback='';(document.activeElement as HTMLElement|null)?.blur();return;}
    const onFreePass=session.canTieFreePass;
    input.scissorsActive=false;scissors.reset();cutFeedback='';if(onFreePass)session.tieFreePass();else session.beginFreeTying('auto');closeUp=true;closeUpButton.setAttribute('aria-pressed','true');closeUpButton.textContent='Wide view';view.closeUp(freeTarget());
  });
  closeUpButton.addEventListener('click',()=>{
    closeUp=!closeUp; closeUpButton.setAttribute('aria-pressed',String(closeUp)); closeUpButton.textContent=closeUp?'Wide view':'Close-up view';
    if(closeUp){if(session.preparingEdge)view.edgeCloseUp(session.eversion.target);else view.closeUp(session.freeKnot.active?freeTarget():needle.getTipPose().position);} else view.resetCamera();
  });
  const params=new URLSearchParams(location.search);
  const graphicsSelect=document.querySelector('#graphics-quality') as HTMLSelectElement;
  graphicsSelect.value=params.get('graphics')==='low'?'low':'standard';view.setFastGraphics(graphicsSelect.value==='low');
  graphicsSelect.addEventListener('change',()=>{view.setFastGraphics(graphicsSelect.value==='low');const url=new URL(location.href);url.searchParams.set('graphics',graphicsSelect.value);history.replaceState(null,'',url);});
  document.querySelector('#viewport')!.addEventListener('suturehero:graphics-recovered',()=>{
    graphicsSelect.value='low';const url=new URL(location.href);url.searchParams.set('graphics','low');history.replaceState(null,'',url);
  });
  const skinSelect=document.querySelector('#skin-type') as HTMLSelectElement;skinSelect.value=PRACTICE_SETUP.skin.id;
  const microSelect=document.querySelector('#micro-target') as HTMLSelectElement;microSelect.value=resolveMicroTarget(params.get('target'));
  const needleSelect=document.querySelector('#needle-type') as HTMLSelectElement;
  const materialSelect=document.querySelector('#suture-material') as HTMLSelectElement;
  const techniqueSelect=document.querySelector('#knot-technique') as HTMLSelectElement;
  const knotEngineSelect=document.querySelector('#knot-engine') as HTMLSelectElement;knotEngineSelect.value=knotEngineEntry(PRACTICE_SETUP.knotEngine).id;
  needleSelect.value=PRACTICE_SETUP.needle.id;materialSelect.value=PRACTICE_SETUP.suture.id;
  techniqueSelect.value=params.get('technique')==='sliding'?'sliding':'surgeon';
  session.selectedTechnique=techniqueSelect.value==='sliding'?'sliding':'surgeon';
  const restartSetup=()=>{
    const url=new URL(location.href);url.searchParams.set('skin',skinSelect.value);url.searchParams.set('needle',needleSelect.value);url.searchParams.set('suture',materialSelect.value);
    url.searchParams.set('environment',session.environment.id);url.searchParams.set('target',microSelect.value);url.searchParams.set('technique',techniqueSelect.value);url.searchParams.set('knot',knotEngineSelect.value);location.assign(url.href);
  };
  techniqueSelect.addEventListener('change',restartSetup);knotEngineSelect.addEventListener('change',restartSetup);skinSelect.addEventListener('change',restartSetup);needleSelect.addEventListener('change',restartSetup);materialSelect.addEventListener('change',restartSetup);
  const originalLesson=document.querySelector('.lesson p')!.textContent!;
  const originalEversion=document.querySelector('#eversion-note')!.textContent!;
  const originalFree=document.querySelector('#free-note')!.textContent!;
  const switchEnvironment=(id:EnvironmentId)=>{
    input.scissorsActive=false;scissors.reset();cutFeedback='';session.setEnvironment(id,resolveMicroTarget(microSelect.value));artery.setTarget(resolveMicroTarget(microSelect.value));const micro=id==='microsurgery';scissors.setStyle(micro?'westcott':'mayo');scissors.minimumHeight=micro?-.65:.04;
    tissue.root.visible=!micro;artery.root.visible=micro;view.setMicrosurgery(micro);
    const button=document.querySelector('#switch-environment')!;button.textContent=micro?'Skin environment':'Microsurgery environment';button.setAttribute('aria-pressed',String(micro));
    document.querySelector('#viewport')!.setAttribute('data-environment',id);
    (document.querySelector('#micro-target-field') as HTMLElement).hidden=!micro;
    (document.querySelector('#skin-type-field') as HTMLElement).hidden=micro;
    document.querySelector('.scene-heading h2')!.textContent=micro?`${MICRO_TARGETS[resolveMicroTarget(microSelect.value)].label} anastomosis · one stitch`:'Simple interrupted suture';
    const tag=document.querySelector('.scene-tag')!;tag.textContent=micro?(microSelect.value==='nerve'?'NERVE + FASCICLES':'HOLLOW ARTERY ENDS'):'3-LAYER TISSUE PAD';tag.setAttribute('title',micro?'Outer wall · Lumen · Cut ends':'Epidermis · Dermis · Subcutaneous fat');
    document.querySelector('.scene-label')!.innerHTML=`<i></i> LIVE VIEW <span>•</span> ${micro?(microSelect.value==='nerve'?'NERVE ENDS':'VESSEL ENDS'):'TISSUE PAD 01'}`;
    document.querySelector('.steps>div:first-child span')!.innerHTML=`Evert the right ${micro?'tissue':'skin'} edge<small>Position forceps · Z grasp · E lift</small>`;
    document.querySelector('.lesson p')!.textContent=micro?originalLesson.replaceAll('skin edge','vessel edge'):originalLesson;
    document.querySelector('#eversion-note')!.textContent=micro?'Grasp the right vessel edge with the forceps, lift briefly to evert the wall, then begin the needle pass. Release the wall before transferring the needle. The arterial wall carries the stitch load. This is one anterior-wall stitch; a complete circumferential anastomosis is not yet modeled.':originalEversion;
    if(micro&&microSelect.value==='nerve')document.querySelector('#eversion-note')!.textContent='Grasp the outer nerve sheath with the forceps and lift gently before the guided pass. The epineurial sheath carries the stitch load; the fascicle bundles are shown inside. This is a practice approximation of one stitch.';
    document.querySelector('#free-note')!.textContent=micro?originalFree.replaceAll('skin edge','vessel edge'):originalFree;
    const url=new URL(location.href);url.searchParams.set('environment',id);url.searchParams.set('target',microSelect.value);history.replaceState(null,'',url);
    closeUp=micro;closeUpButton.setAttribute('aria-pressed',String(micro));closeUpButton.textContent=micro?'Wide view':'Close-up view';
    if(micro)view.microCloseUp();else view.resetCamera();
  };
  microSelect.addEventListener('change',()=>switchEnvironment('microsurgery'));
  document.querySelector('#switch-environment')!.addEventListener('click',()=>{const url=new URL(location.href);url.searchParams.set('environment',session.environment.id==='skin'?'microsurgery':'skin');url.searchParams.set('skin',skinSelect.value);url.searchParams.set('needle',needleSelect.value);url.searchParams.set('suture',materialSelect.value);url.searchParams.set('technique',techniqueSelect.value);url.searchParams.set('target',microSelect.value);location.assign(url.href);});
  switchEnvironment(params.get('environment')==='microsurgery'?'microsurgery':'skin');
  const handoffGuide=new HandoffGuide(); view.scene.add(handoffGuide.root);
  document.querySelector('#position-forceps')!.addEventListener('click',()=>{
    if(session.positionForceps() && session.positioningSkin){closeUp=true;closeUpButton.setAttribute('aria-pressed','true');closeUpButton.textContent='Wide view';view.edgeCloseUp(session.eversion.target);}
  });
  const passGuide=new PassGuide(session.pass); view.scene.add(passGuide.root);
  // Sandbox: put the needle back at its starting point, cancelling a pass in progress (completed passes stay).
  view.scene.add(replay.paths);
  let demo:DemoControl|null=null;
  // Demo button: the instruments perform a simple interrupted suture by themselves (ui/demoControl.ts).
  {const viewTools=document.querySelector<HTMLElement>('.workspace-view-tools'),viewport=document.querySelector<HTMLElement>('#viewport');
   if(viewTools&&viewport)demo=mountDemoControl(viewTools,viewport,{session,needle,grasp,left:tools[0],right:tools[1],scissors:{
    position:()=>{const button=document.querySelector<HTMLButtonElement>('#position-scissors');if(!button||button.disabled)return false;button.click();return true;},
    close:closed=>window.dispatchEvent(new KeyboardEvent(closed?'keydown':'keyup',{code:'Comma'})),
    putAway:()=>{if(input.scissorsActive)document.querySelector<HTMLButtonElement>('#select-scissors')?.click();},
   }},()=>PRACTICE_SETUP.needle.id==='trainer',()=>{
    // Start from a clean practice in the close-up view.
    document.querySelector<HTMLButtonElement>('#reset')?.click();
    const closeUpButton=document.querySelector<HTMLButtonElement>('#close-up');if(closeUpButton?.getAttribute('aria-pressed')==='false')closeUpButton.click();
   });}
  // Development only: lets browser checks (scripts/check-sandbox.mjs) drive the Sandbox directly.
  if((import.meta as ImportMeta&{env?:{DEV?:boolean}}).env?.DEV)(window as unknown as {__sutureHeroSandbox?:object}).__sutureHeroSandbox={session,needle,tools,grasp,heldDisplay,scene:view.scene};
  document.querySelector('#replay')?.addEventListener('click',()=>{if(replay.replaying)replay.stop();else replay.start();});
  document.querySelector('#reset')?.addEventListener('click',()=>replay.clear());
  document.querySelector('#undo-pass')?.addEventListener('click',()=>{if(!session.sandbox)return;const wasIn=session.freePass.inTissue;if(session.freePass.undoLast()){if(wasIn)grasp.reset();session.freeThread.reset();session.freePass.rejection=null;}});
  document.querySelector('#reset-needle')?.addEventListener('click',()=>{if(!session.sandbox)return;session.freePass.abortCurrent();session.freePass.unthreadAll();session.freeThread.reset();grasp.reset();});
  document.querySelector('#begin-pass')!.addEventListener('click',()=>{
   // The Sandbox trainer needle is too short for the guided bite: reload the guided exercise with the standard PS-2.
   if(session.sandbox&&PRACTICE_SETUP.needle.id==='trainer'){const url=new URL(window.location.href);url.searchParams.set('needle','ps2');url.searchParams.set('start','guided');window.location.assign(url.href);return;}
   session.beginPass();
  });
  // After that reload, start the guided exercise straight away.
  if(new URLSearchParams(window.location.search).get('start')==='guided'){const url=new URL(window.location.href);url.searchParams.delete('start');window.history.replaceState(null,'',url.href);queueMicrotask(()=>session.beginPass());}
  document.querySelector('#reset')!.addEventListener('click',()=>{input.scissorsActive=false;scissors.reset();cutFeedback='';session.reset();});
  document.querySelector('#camera')!.addEventListener('click',()=>{closeUp=false; closeUpButton.setAttribute('aria-pressed','false'); closeUpButton.textContent='Close-up view'; view.resetCamera();});
  const canUseScissors=()=>!session.course.finished&&(session.freeKnot.active||session.knot.phase==='complete'&&session.releaseCheck.state==='passed'&&(!session.loadTest.active||session.loadTest.stage==='passed'));
  document.querySelector('#select-scissors')!.addEventListener('click',()=>{
    if(!canUseScissors())return;input.scissorsActive=!input.scissorsActive;cutFeedback='';
    (document.activeElement as HTMLElement|null)?.blur();
  });
  document.querySelector('#position-scissors')!.addEventListener('click',()=>{
    if(!canUseScissors())return;
    const strand=session.freeKnot.active?session.freeKnot.nextTrimTarget:session.knotSlack.nextTrimTarget;
    if(!strand){cutFeedback='Both tails trimmed or no free tail available';return;}
    const minimum=session.freeKnot.active?session.freeKnot.minimumCut(strand):3;
    if(minimum>strand.count-3){cutFeedback='Not enough free tail to position the scissors';return;}
    const index=Math.min(strand.count-3,minimum+Math.floor((strand.count-3-minimum)*.3));
    scissors.positionAt(strand.points[index]);input.scissorsActive=true;
    (document.activeElement as HTMLElement|null)?.blur();
  });
  // Camera mode embeds the existing diagnostic lab; both pages share its
  // proven solver and camera controls rather than creating a second tracker.
  type CameraInstrument=TrackedInstrument;
  type CameraPose={position:THREE.Vector3;quaternion:THREE.Quaternion;seenAt:number;shared?:boolean;unitsPerMm?:number};
  const cameraPoses=new Map<CameraInstrument,CameraPose>();
  const cameraOrigins=new Map<CameraInstrument,TrackedPositionBridge>();
  const cameraToggle=document.querySelector<HTMLButtonElement>('#camera-tracking-toggle')!;
  const cameraPanel=document.querySelector<HTMLElement>('#camera-tracking-panel')!;
  let trackingModuleLoaded=false;
  const cameraStatus=document.querySelector<HTMLElement>('#camera-tracking-status')!;
  const cameraPerformance=document.querySelector<HTMLElement>('#camera-performance')!;
  const trackingBadge=mountTrackingStatusBadge(document.querySelector<HTMLElement>('#viewport')!);
  let lastTrackingStatusAt=performance.now();
  let trackingLoopFps=0,simulatorFrames=0,simulatorFps=0,lastSimulatorFps=performance.now();
  let cameraEnabled=false;
  const setCameraMode=async(enabled:boolean)=>{
   cameraEnabled=enabled;cameraToggle.setAttribute('aria-pressed',String(enabled));cameraToggle.setAttribute('aria-expanded',String(enabled));
   cameraToggle.textContent='Camera';
   cameraPanel.style.display=enabled?'flex':'none';cameraPanel.hidden=!enabled;
   if(enabled)workspaceLayout.openSetup();else document.body.classList.remove('camera-setup-active');
   cameraPoses.clear();cameraOrigins.clear();
   if(enabled&&!trackingModuleLoaded){
    trackingModuleLoaded=true;
    try{
     await import('./tracking');
     await import('./stereoAutoCapture');
    }catch(error){cameraStatus.textContent='Tracking initialization failed';console.error(error);}
   }
   if(!enabled){trackingBadge.off();document.querySelector<HTMLButtonElement>('#stop-camera')?.click();document.querySelector<HTMLButtonElement>('#stop-camera-2')?.click();}
   cameraStatus.textContent=enabled?'Start a camera below':'Camera tracking off';
  };
  cameraToggle.addEventListener('click',()=>{if(cameraEnabled){const show=cameraPanel.hidden;cameraPanel.hidden=!show;cameraPanel.style.display=show?'flex':'none';cameraToggle.setAttribute('aria-expanded',String(show));if(show)workspaceLayout.openSetup();else document.body.classList.remove('camera-setup-active');}else void setCameraMode(true);});
  window.addEventListener('suturehero:open-camera-setup',()=>{if(cameraEnabled){cameraPanel.hidden=false;cameraPanel.style.display='flex';workspaceLayout.openSetup();}else void setCameraMode(true);});
  void setCameraMode(true); // Open setup without starting a camera stream.
  // iPhone camera type (the default on an iPhone): open Production with a one-tap back camera start (ui/iphoneStart.ts).
  {const stage=document.querySelector<HTMLElement>('#production-mode .production-stage');if(stage&&deviceCameraMode()==='iphone')mountIphoneStart(stage,productionMode.open);}
  document.querySelector('#disable-camera-tracking')!.addEventListener('click',()=>{void setCameraMode(false);});
  instrumentCalibration.subscribe((name,reason)=>{if(reason==='reset'){cameraOrigins.delete(name);cameraPoses.delete(name);}if(reason==='neutral'){let bridge=cameraOrigins.get(name);if(!bridge){bridge=new TrackedPositionBridge();cameraOrigins.set(name,bridge);}bridge.alignOnNeutral();}});
  const onTrackingData=(data:unknown)=>{
   if(!cameraEnabled)return;
   if(isTrackingStatus(data)){if(trackingBadge.update(data))lastTrackingStatusAt=performance.now();return;}
   const fps=parseTrackingFps(data);
   if(fps!==null){trackingLoopFps=fps;return;}
   const pose=parseTrackingPose(data);if(!pose)return;
   cameraStatus.textContent='Tracking '+pose.instrument;
   cameraPoses.set(pose.instrument,{shared:pose.shared===true,unitsPerMm:pose.unitsPerMm,
    position:new THREE.Vector3().fromArray(pose.position),
    quaternion:new THREE.Quaternion().fromArray(pose.quaternion).normalize(),seenAt:performance.now()
   });
  };
  window.addEventListener(TRACKING_MESSAGE.pose,(event)=>onTrackingData((event as CustomEvent).detail));
  window.addEventListener(TRACKING_MESSAGE.fps,(event)=>onTrackingData((event as CustomEvent).detail));
  window.addEventListener(TRACKING_MESSAGE.status,(event)=>onTrackingData((event as CustomEvent).detail));
  window.setInterval(()=>{if(cameraEnabled&&performance.now()-lastTrackingStatusAt>2000)trackingBadge.waiting();},500);
  const jawTracking=new Map<CameraInstrument,{opening:number;seenAt:number}>();
  const onJawTracking=(data:unknown)=>{
   // Jaw openings now come only from the Bluetooth jaw sensors (build 0.205), which keep
   // working with camera tracking off, so they are not gated on camera mode (build 0.212).
   const jaw=parseJawOpening(data);if(!jaw)return;
   jawTracking.set(jaw.instrument,{opening:jaw.opening,seenAt:performance.now()});
  };
  window.addEventListener(TRACKING_MESSAGE.jawOpening,(event)=>onJawTracking((event as CustomEvent).detail));
  let frameDt=1/60;
  const applyCameraPose=(name:CameraInstrument,object:THREE.Object3D)=>{
   const pose=cameraPoses.get(name);
   if(!pose||performance.now()-pose.seenAt>350)return;
   let bridge=cameraOrigins.get(name);if(!bridge){bridge=new TrackedPositionBridge();cameraOrigins.set(name,bridge);}
   // First acquisition preserves placement; explicit neutral aligns tracked XY,
   // retaining the instrument's current depth and subsequent relative motion.
   // A shared-frame pose is the real tip in the common stereo workspace: no per-instrument offset.
   const desiredPosition=pose.shared?pose.position.clone():bridge.target(pose.position,object.position);
   desiredPosition.clamp(new THREE.Vector3(-4,.15,-3),new THREE.Vector3(4,4,4));
   // Use the same neutral handle-up mounting orientation as the lab previews.
   const desiredRotation=trackedInstrumentRotation(pose.quaternion);
   // Suppress subpixel bridge jitter without introducing another long
   // interpolation window. The lab's adaptive pose filter remains authoritative.
   const positionError=object.position.distanceTo(desiredPosition);
   if(positionError>.004) object.position.lerp(desiredPosition,1-Math.exp(-Math.min(frameDt,.05)*45));
   const angularError=object.quaternion.angleTo(desiredRotation);
   if(angularError>THREE.MathUtils.degToRad(.22))
    object.quaternion.slerp(desiredRotation,1-Math.exp(-Math.min(frameDt,.05)*50));
  };
  let last=performance.now();
  view.renderer.setAnimationLoop((time)=>{if(!view.renderingAvailable||(document.body.classList.contains('tracking-lab-active')&&!viewInLab())){last=time;return;}const frameStarted=performance.now();perf.sample('Simulator frame interval',Math.max(0,time-last));const dt=Math.min((time-last)/1000,.05);frameDt=dt;heldDisplay.restore();if(!replay.step(dt)){if(demo?.running){/* The demo's knot physics is tuned at 1/60 s steps (src/demo/freeKnotDemo.test.ts): slice longer frames. */const slices=Math.max(1,Math.ceil(dt*60-1e-6));for(let i=0;i<slices;i++){demo.step(dt/slices);session.update(dt/slices);}}else session.update(dt);if(session.sandbox||session.freeKnot.active)replay.record(time/1000);} last=time;
    if(cameraEnabled){
     simulatorFrames++;
     if(time-lastSimulatorFps>=1000){
      simulatorFps=Math.round(simulatorFrames*1000/(time-lastSimulatorFps));simulatorFrames=0;lastSimulatorFps=time;
      cameraPerformance.textContent='Simulator '+simulatorFps+' FPS · Tracking loop '+trackingLoopFps+' FPS';
     }
    }
    for(const [name,model] of [['forceps',tools[0]],['needleDriver',tools[1]]] as const){
     const jaw=jawTracking.get(name);if(jaw&&time-jaw.seenAt<350)model.setTrackedOpening(jaw.opening);
    }
    if(cameraEnabled){
     applyCameraPose('forceps',tools[0].root);
     applyCameraPose('needleDriver',tools[1].root);
    }
    // Measured stereo tips: grasp reach in real millimetres (NeedleGrasp.setMetricReach).
    passMarks.update(session.sandbox?[...session.freePass.passes,...session.freePass.torn,...(session.freePass.current?[session.freePass.current]:[])]:[],session.sandbox?session.freePass.rents:[]);
    // Sandbox: while the needle is in the skin, draw its holder (camera- or keyboard-driven) gripping it (src/scene/heldInstrumentDisplay.ts).
    if(session.sandbox&&session.freePass.inTissue&&grasp.holder)heldDisplay.lockToNeedle(grasp.holder.root,()=>{needle.root.updateWorldMatrix(true,false);grasp.placeHeldNeedle(needle.root.matrixWorld.clone());});
    else heldDisplay.glideBack(dt);
    // Measured-tip dots in the scene (src/scene/tipMarkers.ts); hidden in Production mode.
    {const shared=cameraEnabled?[cameraPoses.get('forceps'),cameraPoses.get('needleDriver')].find(p=>p?.shared&&p.unitsPerMm&&performance.now()-p.seenAt<=350):undefined;grasp.setMetricReach(shared?.unitsPerMm??null);const fresh=(name:CameraInstrument)=>{const p=cameraPoses.get(name);return !!p?.shared&&performance.now()-p.seenAt<=350;};tipMarkers.update(shared?.unitsPerMm??null,!document.body.classList.contains('production-active'),root=>root===tools[0].root?fresh('forceps'):fresh('needleDriver'));}
    if(!canUseScissors())input.scissorsActive=false;
    scissors.update(input.sampleScissors(),dt);
    const scissorsJaw=jawTracking.get('scissors');
    if(scissorsJaw&&time-scissorsJaw.seenAt<350)scissors.setTrackedOpening(scissorsJaw.opening);
    if(cameraEnabled)applyCameraPose('scissors',scissors.root);
    const cuttingButton=document.querySelector('#select-scissors') as HTMLButtonElement;
    cuttingButton.disabled=!canUseScissors();cuttingButton.textContent=input.scissorsActive?'Use needle driver':'Use scissors';cuttingButton.setAttribute('aria-pressed',String(input.scissorsActive));
    (document.querySelector('#position-scissors') as HTMLButtonElement).disabled=!canUseScissors();
    const cut=scissors.findCut(input.scissorsActive?(session.freeKnot.active?session.freeKnot.strands:[session.knotSlack.short,session.knotSlack.long]):[]);
    if(cut){
      if(session.freeKnot.active){session.freeKnot.cut(cut.strand,cut.coordinate);cutFeedback=session.freeKnot.cutMessage;}
      else cutFeedback=session.knotSlack.cut(cut.strand,cut.coordinate)?'Suture cut · Knot retained':'Leave a free tail outside the knot';
    }
    fragmentsView.update(session.freeKnot.active?session.freeKnot.fragments:session.knotSlack.fragments);
    document.querySelector('#right-tool-name')!.textContent=input.scissorsActive?(session.environment.id==='microsurgery'?'Westcott scissors':'Mayo scissors'):session.environment.id==='microsurgery'?'Castroviejo driver':'Right needle driver'; if(session.environment.id==='skin'){tissue.setTargets(session.pass.entry,session.pass.exit);tissue.update(session.wound,session.eversion,session.course.tissueSites,session.course.siteZ,session.tissueField);}else artery.update(session.wound,session.eversion);
    crossSectionToggle.parentElement!.hidden=session.environment.id!=='skin';
    crossSectionPanel.hidden=session.environment.id!=='skin'||!crossSectionToggle.checked;
    if(!crossSectionPanel.hidden)crossSection.update(session.tissueField,session.course.siteZ,session.pass,session.eversion);
    epidermalGuide.root.visible=session.environment.id==='skin'&&session.pass.phase==='passing'&&session.oppositeEdgeRequired;
    if(epidermalGuide.root.visible){const a=session.epidermalAlignment;epidermalGuide.update(a.left,a.right,session.oppositeEdgeReady);}
    (document.querySelector('#guided-technique-field') as HTMLElement).hidden=session.freeKnot.active;
    const knot=session.knot;
    const knotState=document.querySelector('#knot-state') as HTMLElement;
    knotState.hidden=!session.freeKnot.active;
    const handlingHint=session.freeKnot.active?session.freeKnot.handlingHint:'';
    if(session.freeKnot.active){
      const free=session.freeKnot,state=free.retainedThrow.phase;
      knotState.textContent=state==='seated'?free.knotAtTissue?`Throw ${free.sequence?.throws.length||1} seated at tissue · ${free.sequence?.label??''}`:handlingHint:state==='retained'||state==='passed'?handlingHint:free.passage.hasOpening?handlingHint:`No throw formed · ${handlingHint}`;
      knotState.dataset.phase=state==='seated'&&!free.knotAtTissue?'tightened':state;
    }
    (document.querySelector('#begin-free-knot') as HTMLButtonElement).disabled=!session.canBeginKnot;
    const course=session.course;
    (document.querySelector('.bite-planning') as HTMLElement).hidden=session.environment.id!=='skin';
    (document.querySelector('#bite-controls') as HTMLFieldSetElement).disabled=!session.canPlanBites;
    for(const [input,output,value] of [[rightBite,'#right-bite-value',session.pass.entry.x/DEFAULT_BITE_WIDTH],[leftBite,'#left-bite-value',-session.pass.exit.x/DEFAULT_BITE_WIDTH]] as const){
      const percent=String(Math.round(value*100));if(input.value!==percent)input.value=percent;setPlanText(output,`${percent}%`);
    }
    stitchPosition.min=String(Math.ceil(course.positionLimits.min*100-1e-7));stitchPosition.max=String(Math.floor(course.positionLimits.max*100+1e-7));stitchPosition.value=String(Math.round(course.siteZ*100));
    setPlanText('#stitch-position-value',course.siteZ.toFixed(2));
    setPlanText('#bite-plan-status',!session.canPlanBites?'Bite plan locked for this stitch':session.bitePlanLimited?'Widths adjusted to fit the needle and preserve dermal purchase.':'Bite widths are relative to the default bite; position uses practice units.');
    setPlanText('#spacing-review',course.active?`${course.spacingReview} · ${course.closureReview}${!course.finished?' · Sites reserve room for the remaining stitches, with a minimum 0.30 separation.':''}`:course.completed.length?`Sandbox · ${describeSpacing(summarizeSandbox([],[],course.completed.map(r=>({siteZ:r.site.siteZ,review:r.review}))).spacingMm)}`:'Start a 3-stitch session to review spacing.');
    (document.querySelector('.course-controls') as HTMLElement).hidden=session.environment.id!=='skin';
    completedView.update(course.completed.length,course.siteZ);
    const courseStart=document.querySelector('#start-course') as HTMLButtonElement,courseNext=document.querySelector('#next-stitch') as HTMLButtonElement;
    courseStart.disabled=session.environment.id!=='skin'||course.active&&!course.finished;
    courseStart.textContent=course.finished?'New 3-stitch session':'Start 3-stitch session';
    courseNext.disabled=!session.canAdvanceStitch;courseNext.textContent=course.index===2?'Finish session':'Save & next stitch';
    courseNext.hidden=!course.active;
    (document.querySelector('#free-tying') as HTMLButtonElement).disabled=course.active;
    {const tying=document.querySelector('#free-tying')!;const tyingText=session.canFinishSandboxStitch?'Finish stitch · next':session.canTieFreePass?'Tie knot on this stitch':'Free tying lab';if(tying.textContent!==tyingText)tying.textContent=tyingText;}
    if(courseStatus.textContent!==course.status)courseStatus.textContent=course.status;
    if(courseRevision!==course.revision){
      courseRevision=course.revision;courseReview.replaceChildren(...course.completed.map(stitch=>{const item=document.createElement('li');item.textContent=`Stitch ${stitch.number} · ${stitch.review.join(' · ')}`;return item;}));courseReview.hidden=!course.completed.length;
    }
    const assessment=session.stitchAssessment;
    const currentStep=Number(assessment.stage.match(/^(\d)/)?.[1]??0);
    for(const element of Array.from(document.querySelectorAll<HTMLElement>('[data-stitch-step]'))){
      const number=Number(element.dataset.stitchStep);element.classList.toggle('active',number===currentStep);element.classList.toggle('done',currentStep>number);
      if(number===currentStep)element.setAttribute('aria-current','step');else element.removeAttribute('aria-current');
    }
    for(const [selector,text] of [['#stitch-stage',assessment.stage],['#stitch-quality',[...assessment.feedback,...(session.freeKnot.active&&session.freeKnot.sequence?.locked?[`Release hold: ${Math.round(session.freeReleaseProgress*100)}%`]:[])].join(' · ')]]){
      const element=document.querySelector(selector)!;if(element.textContent!==text)element.textContent=text;
    }
    (document.querySelector('#stitch-stage') as HTMLElement).dataset.complete=String(assessment.complete||assessment.labFinished);
    (document.querySelector('#tension-panel') as HTMLElement).hidden=!session.freeKnot.active;
    if(session.freeKnot.active){
      for(const side of ['long','short'] as const){
        const tension=session.freeKnot.tension[side],meter=document.querySelector(`#${side}-tension`) as HTMLMeterElement;
        const value=tension.state==='released'?0:tension.tautness*.65+tension.demand*.35;
        if(Math.abs(meter.value-value)>.001)meter.value=value;
        if(meter.dataset.state!==tension.state){meter.dataset.state=tension.state;meter.setAttribute('aria-label',`${side} strand: ${tension.state}`);}
        const label=document.querySelector(`#${side}-tension-state`)!;if(label.textContent!==tension.state)label.textContent=tension.state;
      }
      const cue=document.querySelector('#tension-cue')!;if(cue.textContent!==session.freeKnot.tensionHint)cue.textContent=session.freeKnot.tensionHint;
    }
    const edge=session.eversion;
    const skinContext=session.environment.id==='skin'&&!knot.active&&!course.finished&&!session.freeKnot.grips.has('left')&&grasp.holder?.kind!=='forceps'&&!(session.pass.phase==='complete'&&session.pull.phase==='waiting'&&!edge.held);
    const tractionAlert=skinContext&&['stretching','slipping','slipped'].includes(edge.traction.state);
    const skinPanel=document.querySelector('#skin-handling') as HTMLElement;
    skinPanel.hidden=!skinContext||!edge.active&&edge.traction.state!=='slipped';
    if(!skinPanel.hidden){
      const traction=edge.traction,meter=document.querySelector('#skin-traction') as HTMLMeterElement;
      if(Math.abs(meter.value-traction.load)>.001)meter.value=traction.load;
      if(meter.dataset.state!==traction.state)meter.dataset.state=traction.state;
      setPlanText('#skin-traction-state',tractionAlert?edge.instruction:edge.held?'Gentle skin traction':'Skin released · Traction easing');
      setPlanText('#skin-traction-hint',session.oppositeEdgeRequired&&session.pass.phase==='passing'&&!tractionAlert?'Amber rings mark the visible epidermal edges; green means flush. Pull D gently; E/Q adjusts surface height.':traction.state==='slipped'?'Open the forceps with X, use Position forceps if needed, then close Z and lift gently.':traction.progress>0&&edge.held?`Slip buildup: ${Math.round(traction.progress*100)}% · Ease the pull to recover.`:edge.ready?'Edge everted · Keep this gentle hold for the needle pass.':'A small lift everts the skin. Shift slows movement; Q lowers the forceps.');
    }
    edgeMarker.visible=!knot.active && (session.preparingEdge || edge.held || tractionAlert);
    edgeMarker.position.copy(edge.target);edgeMarker.material.color.setHex(tractionAlert?(edge.traction.state==='stretching'?0xf4b95d:0xf08b86):edge.held?0x65df9b:0xf7ce73);
    (document.querySelector('#eversion-note') as HTMLElement).hidden=!session.preparingEdge && session.pass.phase!=='passing';
    const knotAction=document.querySelector('#knot-action') as HTMLButtonElement;
    knotAction.disabled=!session.canKnotAction;
    knotAction.textContent=knotActionLabel({loadTestActive:session.loadTest.active,releaseCheckState:session.releaseCheck.state,knotPhase:knot.phase,technique:knot.sequence?.technique,throws:knot.throws});
    (document.querySelector('.grip-settings') as HTMLElement).hidden=knot.active || session.freeKnot.active || session.positioningSkin;
    (document.querySelector('#free-note') as HTMLElement).hidden=!session.freeKnot.active;
    (document.querySelector('#knot-note') as HTMLElement).hidden=!knot.active;
    needle.root.updateWorldMatrix(true,false);
    knotView.update(knot,tools,session.wound.deformPoint(session.pass.entry),session.wound.deformPoint(session.pass.exit),needle.points[0].clone().applyMatrix4(needle.root.matrixWorld),session.knotSlack,session.pass.halfWidth);
    const exercise=session.placement; const pose=needle.getTipPose(); guide.update(pose.position,exercise);
    const title=document.querySelector('#exercise-title')!;
    const pass=session.pass; passGuide.update(pass); if(session.canPlanBites)passGuide.root.visible=true; if(session.sandbox)passGuide.root.visible=false; if(!showNeedleGuide.checked || knot.active || session.freeKnot.active) passGuide.root.visible=false;
    (document.querySelector('#begin-pass') as HTMLButtonElement).disabled=!session.canBeginPass;
    {const replayButton=document.querySelector<HTMLButtonElement>('#replay');if(replayButton){replayButton.disabled=!replay.replaying&&!replay.available;const label=replay.replaying?`Stop replay ${Math.round(replay.progress*100)}%`:'Replay ½×';if(replayButton.textContent!==label)replayButton.textContent=label;}}
    {const resetNeedle=document.querySelector<HTMLButtonElement>('#reset-needle');if(resetNeedle)resetNeedle.disabled=!session.sandbox;const undo=document.querySelector<HTMLButtonElement>('#undo-pass');if(undo)undo.disabled=!session.sandbox||(!session.freePass.inTissue&&!session.freePass.passes.length&&!session.freePass.torn.length);}
    document.querySelector('#begin-pass')!.textContent=session.sandbox?'Start guided exercise':session.preparingEdge?'Begin needle pass':'Start guided pass';
    {const heading=document.querySelector('.scene-heading h2');const microHeading=session.environment.id==='microsurgery'?`${MICRO_TARGETS[resolveMicroTarget(microSelect.value)].label} anastomosis · one stitch`:null;const headingText=microHeading??(session.sandbox?'Sandbox':'Simple interrupted suture');if(heading&&heading.textContent!==headingText)heading.textContent=headingText;}
    {const label=Array.from(document.querySelector('.toolbar > span')?.childNodes??[]).find(n=>n.nodeType===Node.TEXT_NODE&&n.textContent!.trim());const labelText=session.sandbox?' Sandbox ':' Guided stitch ';if(label&&label.textContent!==labelText)label.textContent=labelText;}
    document.querySelector('#position-forceps')!.textContent=session.positioningSkin?'Position forceps at skin edge':'Position forceps';
    const pull=session.pull;
    (document.querySelector('#position-forceps') as HTMLButtonElement).disabled=!session.canPositionForceps;
    const selectedLocal=session.selectedGripPoint;
    graspGuide.update(grasp,selectedLocal,session.canPositionForceps); graspGuide.root.visible=!knot.active && !session.freeKnot.active && !edge.held && !session.positioningSkin && !session.sandbox;
    const selectedWorld=selectedLocal.clone().applyMatrix4(needle.root.matrixWorld);
    handoffGuide.update(selectedWorld,!edge.held && pass.phase==='complete' && pull.phase==='waiting',grasp.candidate?.kind==='forceps' || !!grasp.receiver);
    guide.root.visible=!session.sandbox && !edge.held && !session.preparingEdge && !session.freeKnot.active && !knot.active && (pass.phase==='idle' || pass.phase==='interrupted');
    freeView.update(session.freeKnot);
    needle.root.visible=!course.finished;
    if(course.finished){freeView.root.visible=knotView.root.visible=passGuide.root.visible=guide.root.visible=graspGuide.root.visible=handoffGuide.root.visible=edgeMarker.visible=false;}
    // Sandbox (PracticeSession.sandbox): free play until a guided exercise starts.
    const freePass=session.freePass,inSkin=freePass.current;
    // A pass that just tore out (forced off the curve): say so for a few seconds.
    if(freePass.torn.length>tornSeen){tornSeen=freePass.torn.length;tornMessageUntil=performance.now()+TORN_MESSAGE_MS;}else if(freePass.torn.length<tornSeen)tornSeen=freePass.torn.length;
    if(session.cutThroughs>cutSeen){cutSeen=session.cutThroughs;cutMessageUntil=performance.now()+TORN_MESSAGE_MS;}else if(session.cutThroughs<cutSeen)cutSeen=session.cutThroughs;
    // Trainee instructions (src/ui/practiceMessages.ts).
    const sandboxMessage=sandboxTitle({now:performance.now(),cutMessageUntil,tornMessageUntil,rejection:freePass.rejection,inSkin,forcingWarning:freePass.forcingWarning,threadGripIds:[...session.threadGrasp.grips.keys()],holder:grasp.holder,heldPoint:grasp.heldPoint,candidate:grasp.candidate});
    const message=exerciseTitle({sandbox:session.sandbox,sandboxTitle:sandboxMessage,edge,tractionAlert,preparingEdge:session.preparingEdge,passPhase:pass.phase,pullPhase:pull.phase,oppositeEdgeRequired:session.oppositeEdgeRequired,oppositeEdgeInstruction:session.oppositeEdgeInstruction,tailsTrimmed:session.knotSlack.trimmed,trimmedTails:session.knotSlack.trimmedTails.size,stitchComplete:assessment.complete,freeKnotActive:session.freeKnot.active,knot,forcepsOpenness:tools[0].openness,loadTest:session.loadTest,releaseInstruction:session.releaseCheck.instruction,holderKind:grasp.holder?.kind??null,candidateKind:grasp.candidate?.kind??null,hasReceiver:!!grasp.receiver});
    if(title.textContent!==message) title.textContent=message;
    (document.querySelector('#exercise-title') as HTMLElement).dataset.passSupport=pass.phase==='passing'?(session.oppositeEdgeRequired?(session.oppositeEdgeReady?'aligned':'opposite'):'entry'):'idle';
    {const free=session.freeKnot,outcome=session.sandboxStitchOutcome;
     document.querySelector('#exercise-readout')!.textContent=exerciseReadout({sandbox:session.sandbox,edge,tractionAlert,preparingEdge:session.preparingEdge,oppositeEdgeRequired:session.oppositeEdgeRequired,oppositeEdgeInstruction:session.oppositeEdgeInstruction,
      freePasses:freePass.passes,skin:{label:PRACTICE_SETUP.skin.label,tearDegrees:PRACTICE_SETUP.skin.tear.degrees,tearText:formatMm(PRACTICE_SETUP.skin.tear.units)},pass,wound:session.wound,
      freeKnot:free.active?{forcepsHolding:free.grips.has('left')?free.gripLabel('left'):null,driverHolding:free.grips.has('right')?free.gripLabel('right'):null,winding:free.winding,driverOnTissue:free.driverOnTissue,instruction:free.instruction,handlingHint,reachLimited:free.reachLimited,tightness:free.retainedThrow.active?free.retainedThrow.tightness:null,outcome:outcome?{security:outcome.knot.security,notes:outcome.knot.notes,edgeNotes:outcome.edges.notes}:null}:null,
      knot:knot.active?{throws:knot.throws,targetThrows:knot.targetThrows,threadState:knot.threadState,phase:knot.phase,slack:session.knotSlack.enabled?{state:session.knotSlack.state,friction:session.knotSlack.material.friction.state}:null,loadTest:session.loadTest.active?{load:session.loadTest.load,slip:session.loadTest.slip}:null,releaseState:session.releaseCheck.state}:null,
      pull,threadGuideState:needle.threadGuide.state,scissorsActive:input.scissorsActive,cutFeedback});}
    {const progress=exerciseProgress({sandbox:session.sandbox,preparingEdge:session.preparingEdge,edgeLift:edge.lift,freeKnotActive:session.freeKnot.active,loadTest:session.loadTest,releaseCheck:session.releaseCheck,knot,pull,pass});
    (document.querySelector('#placement-progress') as HTMLProgressElement).value=progress.value;document.querySelector('#progress-label')!.textContent=progress.label;}
    if(pass.phase==='passing'&&session.oppositeEdgeRequired)(document.querySelector('#position-forceps') as HTMLButtonElement).textContent='Position forceps at opposite edge';
    const status=document.querySelector('#grasp-status')!; const statusText=graspStatusText({tractionAlert,edge,passPhase:pass.phase,oppositeEdgeRequired:session.oppositeEdgeRequired,oppositeEdgeInstruction:session.oppositeEdgeInstruction,preparingEdge:session.preparingEdge,freeKnotActive:session.freeKnot.active,loadTestActive:session.loadTest.active,driverOpenness:tools[1].openness,knot,releaseCheck:session.releaseCheck,graspStatus:grasp.status}); if(status.textContent!==statusText) status.textContent=statusText; if(session.environment.id==='microsurgery')for(const selector of ['#exercise-title','#exercise-readout','#grasp-status','#position-forceps']){
      const element=document.querySelector(selector)!;element.textContent=element.textContent!.replaceAll('Skin edge','Vessel edge').replaceAll('skin edge','vessel edge').replaceAll('Dermal purchase','Wall purchase');
    } view.controls.update(); perf.measure('Simulator render submission',()=>view.renderer.render(view.scene,view.camera)); tools.forEach(tool=>{(document.querySelector(`#${tool.id}-jaw`) as HTMLMeterElement).value=tool.id==='right'&&input.scissorsActive?scissors.openness:tool.openness;});perf.sample('Simulator CPU frame',performance.now()-frameStarted);});
  window.addEventListener('pagehide',()=>{input.dispose(); view.renderer.setAnimationLoop(null);});
} catch(error) { document.querySelector('#error')!.textContent='The 3D workspace could not start. Please use a browser with WebGL enabled.'; console.error(error); }
