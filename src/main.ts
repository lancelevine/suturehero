import {knotEngineEntry} from './knot/engines';
import {SkillRecorder} from './gameplay/skillAnalysis';
import {mountSkillAnalysisPanel} from './ui/SkillAnalysisPanel';
import {IdealSuturePath} from './scene/IdealSuturePath';
import {SKIN_SURFACE_Y} from './tissue/FreeNeedlePass';
import {MICRO_GOAL_STITCHES,mountPracticeHud} from './ui/practiceHud';
import {MICRO_MM_PER_UNIT,SCENE_MM_PER_UNIT} from './setup/sceneScale';
import {setAttr,setData,setDisabled,setHidden,setText} from './ui/setText';
import {markStitchSteps,skinTractionText,updateCourseButtons,updateSandboxViewTools,updateTensionPanel} from './ui/practicePanels';
import {cachedQuery} from './ui/cachedQuery';
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
import {MICRO_TARGETS,microProfile,resolveMicroTarget,setClampSpread} from './environments/MicroTargets';
import {AclandClamp} from './scene/AclandClamp';
import {VesselFrame} from './scene/VesselFrame';
import {StaySutureMarks,type StayPlan} from './scene/StaySutureMarks';
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
import './ui/theme.css';
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
import { mountCourseExport } from './ui/courseExport';
import { environmentTexts, exerciseProgress, exerciseReadout, exerciseTitle, freeKnotStateText, graspStatusText, knotActionLabel, sandboxTitle } from './ui/practiceMessages';
import {FpsCounter} from './diagnostics/FrameRates';
import {TipCollisionCounter} from './gameplay/tipCollisions';
import {flipBlocker,FLIP_WARNING_SECONDS} from './gameplay/flipCheck';
import {RotationScore} from './gameplay/rotationScore';
import {challengeUrl,dailyChallenge,describeDaily,loadBest,saveBest,utcDay} from './gameplay/dailyChallenge';
import {WrapPlacementCheck,describeWraps} from './gameplay/wrapPlacement';
import {classifyPull,describePulls,type PullVerdict} from './gameplay/pullDirection';
import {SawingPullCheck} from './gameplay/sawingPulls';
import {VesselGraspCheck,describeVesselGrasp} from './gameplay/vesselGrasp';
import {LoadingCheck,RegraspCheck} from './suture/gripPosition';
import {BlindBiteCheck} from './scene/blindBite';
import {EdgePresentationCheck} from './gameplay/edgePresentation';
import {NeedleHandlingCheck} from './gameplay/needleHandling';
import {gapScan,type OpenSpan} from './gameplay/gapScan';
import {guideConsistency} from './scene/IdealSuturePath';
import {stitchSquareOffDeg} from './gameplay/sandboxSummary';
import {GapScanView} from './scene/GapScanView';
import {describeStepOffs} from './gameplay/stepOff';
import {BACK_WALL_WARNING,catchesBackWall} from './gameplay/backWallCatch';
import {AIR_KNOT_WARNING,AirKnotWatcher} from './gameplay/airKnot';
import {describeVesselEversion} from './gameplay/stitchOutcome';
import {describeKnotPlacement,knotPoint,knotSide,type KnotSide} from './gameplay/knotPlacement';
import {describeVesselCount,suggestedStitchCount} from './gameplay/vesselStitchCount';
import {describeLandmark} from './gameplay/landmark';
import {describeTensionHold} from './gameplay/tensionHold';
import {LandmarkLine} from './scene/LandmarkLine';
import {BODY_SITES} from './environments/bodySites';
import {BreakMonitor,describePull,resolveSize} from './gameplay/sutureStrength';
import {TissueTensionView} from './scene/TissueTensionView';
import {describeNerveAlignment,describeVesselTwist,normaliseTwist,startingTwist,TWIST_STEP_DEGREES} from './gameplay/nerveAlignment';
import {describeUnequalEdges} from './gameplay/unequalEdges';
import {UnequalEdgeMarks} from './scene/UnequalEdgeMarks';
import {loadSoundOn,saveSoundOn,SoundCues} from './ui/sound';
import {describeTail,tailLengthMm} from './gameplay/tailLength';
import {loadBests,recordBest} from './gameplay/personalBest';
import {describePlan} from './gameplay/planVsActual';
import {PlanMarks} from './scene/PlanMarks';
import {mountFirstRun} from './ui/firstRun';
import {MistakeLog,mountReplayTimeline} from './ui/replayTimeline';
import {describeEndurance} from './gameplay/endurance';
import {TAPER_IN_SKIN_TEAR_FACTOR} from './gameplay/PracticeSession';
import {describeDilation,dilateStep} from './gameplay/vesselDilation';
import {describeLumenNarrowing,lumenNarrowingPercent} from './gameplay/lumenNarrowing';
import {describeVesselBites,vesselBite} from './gameplay/vesselBite';
const app=document.querySelector<HTMLDivElement>('#app')!;
/** User-facing build number: bump for each user-visible change (AGENTS.md → Versioning). */
/** Camera-driven instruments stay inside this box (scene units); allocated once, not per frame. */
const CAMERA_POSE_MIN=new THREE.Vector3(-4,.15,-3),CAMERA_POSE_MAX=new THREE.Vector3(4,4,4);
const APP_BUILD='0.253';
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
   setTimeout(()=>mountSandboxSummaryPanel(host,{skillReport:()=>exportSkillReport(),active:()=>session.sandbox||session.canFinishSandboxStitch||session.freePass.passes.length>0,passes:()=>session.freePass.passes,torn:()=>session.freePass.torn,stitches:()=>session.course.active?[]:session.course.completed.map(r=>({siteZ:r.site.siteZ,review:r.review})),build:()=>document.querySelector('.version')?.textContent??'',stitchRecords:()=>session.course.completed.map(r=>({number:r.number,review:r.review,meta:r.meta})),sessionSeconds:()=>session.clock.secondsSoFar}),0);}
  /** How long the "tissue torn" message stays (ms), and the torn passes already announced. */
  const TORN_MESSAGE_MS=3500;let tornSeen=0,tornMessageUntil=0,cutSeen=0,cutMessageUntil=0;view.scene.add(passMarks.root);
  const tipMarkers=new TipMarkers([{root:tools[0].root,color:0x65d8c1},{root:tools[1].root,color:0xe65353}]);view.scene.add(tipMarkers.root);
  const needle=new SutureModel(); const grasp=new NeedleGrasp(needle);
  // Slow-motion replay of the last 12 s of the Sandbox (scene/ReplayController.ts).
  const replay=new ReplayController(tools,needle);
  const tissue=new TissuePatch();const artery=new ArteryTissue();artery.root.visible=false;
  // Adjustable Acland double clamp on the vessel (src/scene/AclandClamp.ts, src/environments/MicroTargets.ts).
  const aclandClamp=new AclandClamp();
  let nerveTwist=0;
  // Vessel dilation step (src/gameplay/vesselDilation.ts): one Dilate button for both ends.
  let dilation=1,intimaTorn=false;
  const dilateButton=document.createElement('button');dilateButton.type='button';dilateButton.textContent='Dilate ends';dilateButton.hidden=true;dilateButton.className='vessel-turn';
  dilateButton.addEventListener('click',()=>{({dilation,torn:intimaTorn}=dilateStep(dilation,intimaTorn));artery.setDilation(dilation);dilateButton.blur();});
  document.querySelector('.workspace-view-tools')?.prepend(dilateButton);
  const nerveButtons=([['Turn right end −10°',-TWIST_STEP_DEGREES],['Turn right end +10°',TWIST_STEP_DEGREES]] as const).map(([label,step])=>{
   const button=document.createElement('button');button.type='button';button.textContent=label;button.hidden=true;button.className='vessel-turn';
   button.addEventListener('click',()=>{nerveTwist=normaliseTwist(nerveTwist+step);artery.setFascicleTwist(nerveTwist);});document.querySelector('.workspace-view-tools')?.prepend(button);return button;});
  let flipWarning={text:'',until:0};
  // Pull direction when tying (gameplay/pullDirection.ts): sampled from the tips as each throw seats.
  const wrapCheck=new WrapPlacementCheck();const wrapTip=new THREE.Vector3(),wrapSite=new THREE.Vector3();let wrapSeated=0;
  const wrapNote=()=>{const knot=session.freeKnot;if(session.environment.id!=='skin'||!knot.active){if(!knot.active)wrapCheck.reset();return '';}
   if(knot.seatedThrows!==wrapSeated){wrapSeated=knot.seatedThrows;wrapCheck.nextThrow();}
   tools[1].root.updateWorldMatrix(true,false);const tip=tools[1].root.localToWorld(wrapTip.set(0,0,.05));wrapSite.copy(knot.entry).add(knot.exit).multiplyScalar(.5);
   wrapCheck.update(knot.winding,tip.distanceTo(wrapSite)*SCENE_MM_PER_UNIT,knot.gripLabel('right')==='short tail');const text=describeWraps(wrapCheck);return text?text+' · ':'';};
  const throwPulls:PullVerdict[]=[];let seenSeated=0;const pullTipA=new THREE.Vector3(),pullTipB=new THREE.Vector3();
  const pullNoteTying=()=>{if(session.environment.id!=='skin')return '';const seated=session.freeKnot.seatedThrows;
   if(seated<seenSeated)throwPulls.length=0;
   if(seated>seenSeated){tools[0].root.updateWorldMatrix(true,false);tools[1].root.updateWorldMatrix(true,false);throwPulls.push(classifyPull(tools[0].root.localToWorld(pullTipA.set(0,0,.05)),tools[1].root.localToWorld(pullTipB.set(0,0,.05))));}
   seenSeated=seated;const text=session.freeKnot.active?describePulls(throwPulls):'';return text?text+' · ':'';};
  // Needle dulling (gameplay/needleWear.ts): each new free pass wears the needle; Fresh needle resets it.
  const freshNeedleButton=document.createElement('button');freshNeedleButton.type='button';freshNeedleButton.textContent='Fresh needle';freshNeedleButton.hidden=true;freshNeedleButton.className='vessel-turn';freshNeedleButton.title='Swap in a new needle (resets needle wear)';
  freshNeedleButton.addEventListener('click',()=>session.needleWear.fresh());document.querySelector('.workspace-view-tools')?.prepend(freshNeedleButton);
  let wornPasses=0;
  const needleWearNote=()=>{if(!session.sandbox)return '';const count=session.freePass.passes.length;if(count>wornPasses)for(let i=wornPasses;i<count;i++)session.needleWear.addPass();wornPasses=count;freshNeedleButton.hidden=false;const holes=session.nearbyHoles;const text=[session.needleWear.describe(),holes?`${holes} old needle hole${holes===1?'':'s'} near this stitch · tissue cuts through ~${Math.round((1-session.holeStrength)*100)}% sooner`:''].filter(Boolean).join(' · ');return text?text+' · ':'';};
  // Turn / flip the vessel (microsurgery only): the next stitch site comes to the top, as with the double clamp.
  const vesselTurnButtons:HTMLButtonElement[]=([['Turn vessel 45°',Math.PI/4],['Flip vessel',Math.PI]] as const).map(([label,turn])=>{
   const button=document.createElement('button');button.type='button';button.textContent=label;button.hidden=true;button.className='vessel-turn';
   button.addEventListener('click',()=>{const blocked=flipBlocker({needleInWall:session.pass.phase==='passing',untiedThread:session.pass.phase==='complete',wallHeld:session.eversion.held});if(blocked){flipWarning={text:blocked,until:performance.now()+FLIP_WARNING_SECONDS*1000};return;}vesselFrame.turnBy(turn);});document.querySelector('.workspace-view-tools')?.prepend(button);return button;});
  // Save the tied vessel stitch (frozen on the vessel) and turn the vessel so the next site is on top.
  const saveVesselButton=document.createElement('button');saveVesselButton.type='button';saveVesselButton.textContent='Save stitch & turn';saveVesselButton.hidden=true;saveVesselButton.className='vessel-turn';
  saveVesselButton.addEventListener('click',()=>{
    if(!session.canSaveVesselStitch)return;
    const sources=session.freeKnot.active?[freeView.root]:[knotView.root];
    vesselStitchesView.retain(sources,0);
    // The frozen copy is in world coordinates; place it in the turned vessel frame so it turns with the vessel.
    vesselStitchesView.root.updateWorldMatrix(true,false);
    vesselStitchesView.root.children.at(-1)?.applyMatrix4(vesselStitchesView.root.matrixWorld.clone().invert());
    {const prof=microProfile(resolveMicroTarget(microSelect.value));vesselBites.push(vesselBite(session.pass.entry.x,session.pass.exit.x,prof.gap,prof.outerRadius-prof.innerRadius));}
    vesselAngles.push(vesselFrame.angle);session.saveVesselStitch();resetCourseTools();vesselFrame.turnBy(2*Math.PI/vesselGoal());
  });
  document.querySelector('.workspace-view-tools')?.prepend(saveVesselButton);vesselTurnButtons.push(saveVesselButton);
  // Stay suture plan marks on the vessel ends (src/scene/StaySutureMarks.ts).
  const stayMarks=new StaySutureMarks();
  const stayPlan=()=>{const v=document.querySelector<HTMLSelectElement>('#stay-plan')?.value;return (v==='180'||v==='120'?v:'none') as StayPlan;};
  // Vessel, clamp and stay marks turn together about the vessel axis (src/scene/VesselFrame.ts).
  const vesselFrame=new VesselFrame();vesselFrame.root.add(artery.root,aclandClamp.root,stayMarks.root);
  // Saved vessel stitches stay on the vessel and turn with it (anastomosis plan step 2).
  // Saved stitch positions (vessel turn angle at each save) and the suggested count by circumference (src/gameplay/vesselStitchCount.ts).
  const vesselAngles:number[]=[];
  const vesselBites:ReturnType<typeof vesselBite>[]=[];
  const vesselGrasp=new VesselGraspCheck();
  const vesselDiameterMm=()=>2*microProfile(resolveMicroTarget(microSelect.value)).outerRadius*MICRO_MM_PER_UNIT;
  const vesselGoal=()=>suggestedStitchCount(vesselDiameterMm());
  const vesselStitchesView=new CompletedStitchesView();vesselFrame.root.add(vesselStitchesView.root);
  view.scene.add(tissue.root,vesselFrame.root,needle.root,...tools.map(tool=>tool.root));
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
  // Guided course results export (src/ui/courseExport.ts).
  mountCourseExport(courseReview,{active:()=>session.course.active,stitches:()=>session.course.completed.map(r=>({number:r.number,review:r.review,meta:r.meta})),build:()=>document.querySelector('.version')?.textContent??''});
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
  // Knot placement (src/gameplay/knotPlacement.ts): which side of the incision each kept knot sits on.
  const knotSides:KnotSide[]=[];
  const recordKnotSide=()=>{const free=session.freeKnot.active,long=free?session.freeKnot.long:session.knotSlack.long,short=free?session.freeKnot.short:session.knotSlack.short;const point=knotPoint(long.points,short.points);if(point)knotSides.push(knotSide(point.x));};
  document.querySelector('#start-course')!.addEventListener('click',()=>{knotSides.length=0;});
  document.querySelector('#next-stitch')!.addEventListener('click',()=>{
    const site=session.course.siteZ,sources=session.freeKnot.active?[freeView.root]:[knotView.root];
    if(session.canAdvanceStitch)recordKnotSide();
    if(session.advanceStitch()){completedView.retain(sources,site);resetCourseTools();}
    (document.activeElement as HTMLElement|null)?.blur();
  });
  document.querySelector('#free-tying')!.addEventListener('click',()=>{
    // Sandbox with a completed free pass: tie on that stitch (Stage B3); otherwise the tying lab's preplaced stitch.
    // A tied Sandbox stitch: keep it (frozen knot, closure at its position) and start the next one.
    if(session.canFinishSandboxStitch){recordKnotSide();completedView.retain([freeView.root],0);session.finishSandboxStitch();input.scissorsActive=false;scissors.reset();cutFeedback='';(document.activeElement as HTMLElement|null)?.blur();return;}
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
  // Suture size and breaking strength (src/gameplay/sutureStrength.ts).
  const sutureSize=resolveSize(new URL(location.href).searchParams.get('size'));
  const sizeSelect=document.querySelector('#suture-size') as HTMLSelectElement;sizeSelect.value=sutureSize.id;
  const breakMonitors={long:new BreakMonitor(),short:new BreakMonitor()};
  const techniqueSelect=document.querySelector('#knot-technique') as HTMLSelectElement;
  const knotEngineSelect=document.querySelector('#knot-engine') as HTMLSelectElement;knotEngineSelect.value=knotEngineEntry(PRACTICE_SETUP.knotEngine).id;
  needleSelect.value=PRACTICE_SETUP.needle.id;materialSelect.value=PRACTICE_SETUP.suture.id;
  techniqueSelect.value=params.get('technique')==='sliding'?'sliding':'surgeon';
  session.selectedTechnique=techniqueSelect.value==='sliding'?'sliding':'surgeon';
  const restartSetup=()=>{
    const url=new URL(location.href);url.searchParams.set('skin',skinSelect.value);url.searchParams.set('needle',needleSelect.value);url.searchParams.set('suture',materialSelect.value);url.searchParams.set('size',sizeSelect.value);
    url.searchParams.set('environment',session.environment.id);url.searchParams.set('target',microSelect.value);url.searchParams.set('technique',techniqueSelect.value);url.searchParams.set('knot',knotEngineSelect.value);
    // Body site and its sliders (src/environments/bodySites.ts).
    if(siteSelect.value){url.searchParams.set('site',siteSelect.value);for(const key of ['thick','tough','tension'])url.searchParams.set(key,String(Number(siteSlider(key).value)/100));}
    else for(const key of ['site','thick','tough','tension'])url.searchParams.delete(key);
    location.assign(url.href);
  };
  // Body site presets and sliders: picking a site loads its preset values; a slider change restarts with the override.
  const siteSelect=document.querySelector<HTMLSelectElement>('#body-site')!;
  const siteSlider=(key:string)=>document.querySelector<HTMLInputElement>(`#site-${key}`)!;
  {const current=PRACTICE_SETUP.skin.site;siteSelect.value=current?.id??'';document.querySelector<HTMLElement>('#site-sliders')!.hidden=!current;
   for(const [key,field] of [['thick','thickness'],['tough','toughness'],['tension','tension']] as const){const input=siteSlider(key),value=current?current[field]:1;input.value=String(Math.round(value*100));document.querySelector(`#site-${key}-value`)!.textContent=`${value.toFixed(2)}×`;input.addEventListener('change',restartSetup);}
   siteSelect.addEventListener('change',()=>{const site=BODY_SITES.find(s=>s.id===siteSelect.value);if(site){siteSlider('thick').value=String(Math.round(site.thickness*100));siteSlider('tough').value=String(Math.round(site.toughness*100));siteSlider('tension').value=String(Math.round(site.tension*100));}restartSetup();});}
  techniqueSelect.addEventListener('change',restartSetup);knotEngineSelect.addEventListener('change',restartSetup);skinSelect.addEventListener('change',restartSetup);needleSelect.addEventListener('change',restartSetup);materialSelect.addEventListener('change',restartSetup);sizeSelect.addEventListener('change',restartSetup);
  const originalLesson=document.querySelector('.lesson p')!.textContent!;
  const originalEversion=document.querySelector('#eversion-note')!.textContent!;
  const originalFree=document.querySelector('#free-note')!.textContent!;
  const switchEnvironment=(id:EnvironmentId)=>{
    input.scissorsActive=false;scissors.reset();cutFeedback='';session.setEnvironment(id,resolveMicroTarget(microSelect.value));artery.setTarget(resolveMicroTarget(microSelect.value));const micro=id==='microsurgery';scissors.setStyle(micro?'westcott':'mayo');scissors.minimumHeight=micro?-.65:.04;
    tissue.root.visible=!micro;artery.root.visible=micro;view.setMicrosurgery(micro);
    // Environment wording (src/ui/practiceMessages.ts environmentTexts).
    const texts=environmentTexts(micro,microSelect.value,MICRO_TARGETS[resolveMicroTarget(microSelect.value)].label,{lesson:originalLesson,eversion:originalEversion,free:originalFree});
    const button=document.querySelector('#switch-environment')!;button.textContent=texts.switchButton;button.setAttribute('aria-pressed',String(micro));
    document.querySelector('#viewport')!.setAttribute('data-environment',id);
    (document.querySelector('#micro-target-field') as HTMLElement).hidden=!micro;
    (document.querySelector('#clamp-field') as HTMLElement).hidden=!micro;
    (document.querySelector('#landmark-exercise') as HTMLElement).hidden=micro;
    (document.querySelector('#unequal-exercise') as HTMLElement).hidden=micro;
    (document.querySelector('#endurance-exercise') as HTMLElement).hidden=micro;
    const planToggle=document.querySelector<HTMLElement>('.plan-toggle');if(planToggle)planToggle.hidden=micro;
    aclandClamp.update(microProfile(resolveMicroTarget(microSelect.value)),micro&&microSelect.value!=='nerve');
    // Nerve repair: a fresh random fascicle twist on the right end each time (src/gameplay/nerveAlignment.ts).
    nerveTwist=micro?startingTwist():0;artery.setFascicleTwist(nerveTwist);
    dilation=1;intimaTorn=false;artery.setDilation(1);dilateButton.hidden=!micro||microSelect.value==='nerve';
    for(const button of nerveButtons)button.hidden=!micro;
    vesselFrame.setAxisHeight(microProfile(resolveMicroTarget(microSelect.value)).centerY);vesselFrame.setAngle(0);vesselStitchesView.clear();vesselAngles.length=0;vesselBites.length=0;vesselGrasp.reset();
    for(const button of vesselTurnButtons)button.hidden=!micro;
    (document.querySelector('#stay-field') as HTMLElement).hidden=!micro;
    stayMarks.update(microProfile(resolveMicroTarget(microSelect.value)),stayPlan(),micro);
    (document.querySelector('#skin-type-field') as HTMLElement).hidden=micro;
    document.querySelector('.scene-heading h2')!.textContent=texts.heading;
    const tag=document.querySelector('.scene-tag')!;tag.textContent=texts.tag;tag.setAttribute('title',texts.tagTitle);
    document.querySelector('.scene-label')!.innerHTML=`<i></i> LIVE VIEW <span>•</span> ${texts.sceneLabel}`;
    document.querySelector('.steps>div:first-child span')!.innerHTML=`${texts.firstStep}<small>Position forceps · Z grasp · E lift</small>`;
    document.querySelector('.lesson p')!.textContent=texts.lesson;
    document.querySelector('#eversion-note')!.textContent=texts.eversion;
    document.querySelector('#free-note')!.textContent=texts.free;
    const url=new URL(location.href);url.searchParams.set('environment',id);url.searchParams.set('target',microSelect.value);history.replaceState(null,'',url);
    closeUp=micro;closeUpButton.setAttribute('aria-pressed',String(micro));closeUpButton.textContent=micro?'Wide view':'Close-up view';
    if(micro)view.microCloseUp();else view.resetCamera();
  };
  microSelect.addEventListener('change',()=>switchEnvironment('microsurgery'));
  document.querySelector('#stay-plan')!.addEventListener('change',()=>stayMarks.update(microProfile(resolveMicroTarget(microSelect.value)),stayPlan(),session.environment.id==='microsurgery'));
  {const clampInput=document.querySelector<HTMLInputElement>('#clamp-spread')!,clampValue=document.querySelector<HTMLOutputElement>('#clamp-spread-value')!;
   clampInput.addEventListener('change',()=>{const factor=setClampSpread(Number(clampInput.value)/100);clampValue.textContent=`${Math.round(factor*100)}%`;switchEnvironment('microsurgery');});}
  document.querySelector('#switch-environment')!.addEventListener('click',()=>{const url=new URL(location.href);url.searchParams.set('environment',session.environment.id==='skin'?'microsurgery':'skin');url.searchParams.set('skin',skinSelect.value);url.searchParams.set('needle',needleSelect.value);url.searchParams.set('suture',materialSelect.value);url.searchParams.set('size',sizeSelect.value);url.searchParams.set('technique',techniqueSelect.value);url.searchParams.set('target',microSelect.value);location.assign(url.href);});
  switchEnvironment(params.get('environment')==='microsurgery'?'microsurgery':'skin');
  const handoffGuide=new HandoffGuide(); view.scene.add(handoffGuide.root);
  document.querySelector('#position-forceps')!.addEventListener('click',()=>{
    if(session.positionForceps() && session.positioningSkin){closeUp=true;closeUpButton.setAttribute('aria-pressed','true');closeUpButton.textContent='Wide view';view.edgeCloseUp(session.eversion.target);}
  });
  const passGuide=new PassGuide(session.pass); view.scene.add(passGuide.root);
  // Dashed cyan ideal suture line along the wound (src/scene/IdealSuturePath.ts).
  const idealPath=new IdealSuturePath(SKIN_SURFACE_Y); view.scene.add(idealPath.root);
  // Landmark alignment exercise (src/gameplay/landmark.ts): a centred line the first stitch must meet.
  const landmarkLine=new LandmarkLine(SKIN_SURFACE_Y); view.scene.add(landmarkLine.root);
  const landmarkButton=document.querySelector<HTMLButtonElement>('#landmark-exercise')!;
  // Unequal-edges exercise (src/gameplay/unequalEdges.ts): guide dots and graded bite steps.
  const unequalMarks=new UnequalEdgeMarks(SKIN_SURFACE_Y); view.scene.add(unequalMarks.root);
  const unequalButton=document.querySelector<HTMLButtonElement>('#unequal-exercise')!;
  // Endurance run (src/gameplay/endurance.ts): 20 passes, precision drift first → last five.
  const enduranceButton=document.querySelector<HTMLButtonElement>('#endurance-exercise')!;
  let enduranceExercise=new URL(location.href).searchParams.get('exercise')==='endurance';
  const showEnduranceState=()=>{enduranceButton.setAttribute('aria-pressed',String(enduranceExercise));enduranceButton.textContent=enduranceExercise?'End endurance run':'Endurance (20 passes)';};
  showEnduranceState();
  enduranceButton.addEventListener('click',()=>{enduranceExercise=!enduranceExercise;const url=new URL(location.href);if(enduranceExercise)url.searchParams.set('exercise','endurance');else url.searchParams.delete('exercise');history.replaceState(null,'',url);showEnduranceState();enduranceButton.blur();});
  let unequalExercise=new URL(location.href).searchParams.get('exercise')==='unequal';
  const showUnequalState=()=>{unequalButton.setAttribute('aria-pressed',String(unequalExercise));unequalButton.textContent=unequalExercise?'End unequal edges':'Unequal edges exercise';};
  showUnequalState();
  unequalButton.addEventListener('click',()=>{unequalExercise=!unequalExercise;const url=new URL(location.href);if(unequalExercise)url.searchParams.set('exercise','unequal');else url.searchParams.delete('exercise');history.replaceState(null,'',url);showUnequalState();unequalButton.blur();});
  // Daily challenge (gameplay/dailyChallenge.ts): same body site and stitch count for everyone each day.
  const dailyParams=new URL(location.href).searchParams;
  const daily=dailyParams.get('exercise')==='daily'?dailyChallenge(dailyParams.get('day')??utcDay(new Date())):null;
  document.querySelector('#daily-challenge')?.addEventListener('click',()=>{location.href=challengeUrl(dailyChallenge(utcDay(new Date())),location.href);});
  let dailyFinished:number|null=null;
  const dailyStorage=(()=>{try{return localStorage;}catch{return null;}})();
  let dailyBest=daily?loadBest(dailyStorage,daily.day):null;
  const dailyNote=()=>{if(!daily||session.environment.id!=='skin')return '';const tied=session.course.active?0:session.course.completed.length;
   if(dailyFinished===null&&tied>=daily.stitches){dailyFinished=session.clock.secondsSoFar;saveBest(dailyStorage,daily.day,dailyFinished);dailyBest=loadBest(dailyStorage,daily.day);}
   return describeDaily(daily,tied,dailyBest,dailyFinished)+' · ';};
  let landmarkExercise=new URL(location.href).searchParams.get('exercise')==='landmark';
  const showLandmarkState=()=>{landmarkButton.setAttribute('aria-pressed',String(landmarkExercise));landmarkButton.textContent=landmarkExercise?'End landmark exercise':'Landmark exercise';};
  showLandmarkState();
  landmarkButton.addEventListener('click',()=>{landmarkExercise=!landmarkExercise;const url=new URL(location.href);if(landmarkExercise)url.searchParams.set('exercise','landmark');else url.searchParams.delete('exercise');history.replaceState(null,'',url);showLandmarkState();landmarkButton.blur();});
  // Gap scan after a finished 3-stitch session (src/gameplay/gapScan.ts); recomputed only when the stitch sites change.
  const gapScanView=new GapScanView(SKIN_SURFACE_Y); view.scene.add(gapScanView.root);
  // Tension heatmap around each tied stitch (src/scene/TissueTensionView.ts).
  const tensionView=new TissueTensionView(SKIN_SURFACE_Y); view.scene.add(tensionView.root);
  // Plan vs actual (src/gameplay/planVsActual.ts): click spots on the skin while planning, compare with the passes.
  const planMarks=new PlanMarks(SKIN_SURFACE_Y); view.scene.add(planMarks.root);
  const plannedZ:number[]=[];let planning=false;
  {const toolsBar=document.querySelector('.workspace-view-tools');
   const planButton=document.createElement('button');planButton.type='button';planButton.className='plan-toggle';
   const clearButton=document.createElement('button');clearButton.type='button';clearButton.textContent='Clear plan';clearButton.hidden=true;
   const label=()=>{planButton.textContent=planning?'Done planning':'Plan stitches';planButton.setAttribute('aria-pressed',String(planning));clearButton.hidden=!plannedZ.length;};label();
   planButton.addEventListener('click',()=>{planning=!planning;label();planButton.blur();});
   clearButton.addEventListener('click',()=>{plannedZ.length=0;label();clearButton.blur();});
   toolsBar?.prepend(clearButton);toolsBar?.prepend(planButton);planButton.hidden=session.environment.id!=='skin';
   // A click (not a drag) on the skin while planning adds a spot at that point along the wound.
   const canvas=view.renderer.domElement;let downAt:{x:number;y:number}|null=null;
   canvas.addEventListener('pointerdown',e=>{downAt={x:e.clientX,y:e.clientY};});
   canvas.addEventListener('pointerup',e=>{
    if(!planning||!downAt||Math.hypot(e.clientX-downAt.x,e.clientY-downAt.y)>5||session.environment.id!=='skin')return;
    const rect=canvas.getBoundingClientRect(),ray=new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1),view.camera);
    const hit=ray.intersectObject(tissue.root,true)[0];
    if(hit&&Math.abs(hit.point.x)<0.8){plannedZ.push(hit.point.z+session.course.siteZ);plannedZ.sort((a,b)=>a-b);label();}
   });}
  let scannedSites:readonly unknown[]|null=null,openSpans:OpenSpan[]=[];
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
  let trackingLoopFps=0;
  const simulatorFps=new FpsCounter(performance.now());
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
   setText(cameraStatus,'Tracking '+pose.instrument);
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
   desiredPosition.clamp(CAMERA_POSE_MIN,CAMERA_POSE_MAX);
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
  // Per-frame element lookups are cached (src/ui/cachedQuery.ts).
  // In-scene HUD: timer, live stats, challenge (src/ui/practiceHud.ts). Display only.
  // Personal bests (src/gameplay/personalBest.ts): saved once per completion of the HUD challenge.
  const bestStorage=(()=>{try{return localStorage;}catch{return null;}})();
  const challengeId=()=>session.environment.id==='microsurgery'?`micro-${microSelect.value}`:session.course.active?'course':'sandbox';
  const challengeGoal=()=>session.environment.id==='microsurgery'?vesselGoal():session.course.active?3:6;
  const challengeDone=()=>(session.environment.id==='microsurgery'?session.vesselStitches:session.course.completed.length)>=challengeGoal();
  let bestRecordedFor='';
  const challengeBest=()=>{const id=challengeId();if(challengeDone()&&bestRecordedFor!==id){bestRecordedFor=id;recordBest(bestStorage,id,Math.round(session.clock.secondsSoFar));}if(!challengeDone()&&bestRecordedFor===id)bestRecordedFor='';return loadBests(bestStorage)[id];};
  mountPracticeHud(document.querySelector<HTMLElement>('#viewport')!,()=>{
   const last=[...session.freePass.passes].reverse().find(p=>p.exitEdge!==null);
   const free=session.freeKnot;
   return {seconds:session.clock.secondsSoFar,
    precisionMm:last&&last.exitEdge!==null?Math.abs(last.entryEdge-last.exitEdge)*SCENE_MM_PER_UNIT:null,
    tension:free.active?Math.max(free.tension.long.tautness,free.tension.short.tautness):null,
    stitches:session.environment.id==='microsurgery'?session.vesselStitches:session.course.completed.length,course:session.course.active,
    micro:session.environment.id==='microsurgery'?{alignmentMm:(session.wound.initialGap*(1-session.wound.closure)+Math.abs(session.wound.edgeMismatch))*MICRO_MM_PER_UNIT,closure:session.wound.closure,goal:vesselGoal()}:undefined,bestSeconds:challengeBest()};
  });
  // Skill Analysis: needle-driver tip motion and forceps hold, sampled each frame (src/gameplay/skillAnalysis.ts).
  // Skill Analysis report for the session export (the Sandbox panel reads it when exporting).
  let exportSkillReport:()=>unknown=()=>null;
  const skillRecorder=new SkillRecorder();
  /** Needle-driver tip in its local frame (scene units); reused vector for the per-frame sample. */
  const DRIVER_TIP_LOCAL=new THREE.Vector3(0,0,.05),skillTip=new THREE.Vector3(),forcepsSkillTip=new THREE.Vector3(),needleSkillPoint=new THREE.Vector3();
  /** The needle within this distance of both tips (mm) means a handoff, not a collision. */
  const NEEDLE_HANDOFF_MM=15;
  const tipCollisions=new TipCollisionCounter();
  const regraspCheck=new RegraspCheck();
  const loadingCheck=new LoadingCheck();
  const blindBites=new BlindBiteCheck();
  const edgePresentation=new EdgePresentationCheck();
  const needleHandling=new NeedleHandlingCheck();
  const sawingPulls=new SawingPullCheck();const rotationScore=new RotationScore();let sawingClock=0;
  let skillClock=0;
  const sampleSkill=()=>{
   const t=session.clock.secondsSoFar;if(t<skillClock){skillRecorder.clear();tipCollisions.reset();regraspCheck.reset();loadingCheck.reset();blindBites.reset();edgePresentation.reset();needleHandling.reset();sawingPulls.reset();rotationScore.reset();}skillClock=t;
   tools[1].root.updateWorldMatrix(true,false);
   const tip=tools[1].root.localToWorld(skillTip.copy(DRIVER_TIP_LOCAL)).multiplyScalar(SCENE_MM_PER_UNIT);
   const hold=session.eversion;
   skillRecorder.add({t,x:tip.x,z:tip.z,holding:hold.held,safeHold:hold.held&&!['stretching','slipping','slipped'].includes(hold.traction.state)});
   // Tip collisions (src/gameplay/tipCollisions.ts): a handoff is when the needle is near both tips.
   tools[0].root.updateWorldMatrix(true,false);needle.root.updateWorldMatrix(true,false);
   const forcepsTip=tools[0].root.localToWorld(forcepsSkillTip.copy(DRIVER_TIP_LOCAL)).multiplyScalar(SCENE_MM_PER_UNIT);
   const needleMm=needle.root.getWorldPosition(needleSkillPoint).multiplyScalar(SCENE_MM_PER_UNIT);
   regraspCheck.update(needle.points,grasp.heldPoint,session.freePass.inTissue);
   loadingCheck.update(needle.points,grasp.heldPoint,grasp.holder?.kind==='needle-driver',session.freePass.inTissue);
   needleHandling.update(grasp.holder?.kind??null,session.freePass.inTissue,t);
   sawingPulls.update(session.freeThread.tension,session.freePass.threadedPasses().length>0,Math.max(0,t-sawingClock));rotationScore.update(session.freePass.inTissue,session.freePass.forcingWarning,Math.max(0,t-sawingClock));sawingClock=t;
   edgePresentation.update(session.freePass.inTissue,{held:hold.held,ready:hold.ready,lift:hold.lift,traction:hold.traction.state});
   blindBites.update(session.freePass.passes.map(p=>p.exit),view.camera,[tools[0].root,tools[1].root,scissors.root]);
   tipCollisions.update(tip.distanceTo(forcepsTip),needleMm.distanceTo(tip)<NEEDLE_HANDOFF_MM&&needleMm.distanceTo(forcepsTip)<NEEDLE_HANDOFF_MM);
  };
  const passSymmetries=()=>session.freePass.passes.filter(p=>p.exitEdge!==null).map(p=>Math.abs(p.entryEdge-p.exitEdge!)*SCENE_MM_PER_UNIT);
  mountSkillAnalysisPanel(document.querySelector<HTMLElement>('#skill-analysis-host')!,()=>({...skillRecorder.report(session.clock.secondsSoFar,passSymmetries(),session.freePass.passes.map(p=>({x:p.entry.x*SCENE_MM_PER_UNIT,z:p.entry.z*SCENE_MM_PER_UNIT}))),tipCollisions:tipCollisions.count,sawingPulls:sawingPulls.count,rotatingShare:rotationScore.rotatingShare,regrasps:{total:regraspCheck.regrasps,onTip:regraspCheck.tipGrabs},needleLoading:{total:loadingCheck.loads,good:loadingCheck.good},blindExits:{total:blindBites.exits,hidden:blindBites.hidden},edgePresentation:{total:edgePresentation.total,everted:edgePresentation.counts.everted},needleHandling:{drops:needleHandling.drops,regrabs:needleHandling.regrabs,loads:needleHandling.loads}}),()=>!!document.querySelector<HTMLDetailsElement>('#workspace-skill-analysis')?.open);
  exportSkillReport=()=>{const r=skillRecorder.report(session.clock.secondsSoFar,passSymmetries());return {...r,path:undefined,ideal:undefined,speed:undefined};};
  // Mistakes for the replay timeline (src/ui/replayTimeline.ts), on the replay's clock (s).
  const mistakeLog=new MistakeLog();
  const replayTimeline=mountReplayTimeline(document.querySelector<HTMLElement>('#viewport')!);
  let seen={torn:0,collisions:0,blind:0,tipGrabs:0,air:false};
  const noteMistakes=(now:number)=>{
   const torn=session.freePass.torn.length;if(torn>seen.torn)mistakeLog.add(now,'tear');
   if(tipCollisions.count>seen.collisions)mistakeLog.add(now,'tip collision');
   if(blindBites.hidden>seen.blind)mistakeLog.add(now,'blind exit');
   if(regraspCheck.tipGrabs>seen.tipGrabs)mistakeLog.add(now,'regrasp on the tip');
   if(airKnot.flagged&&!seen.air)mistakeLog.add(now,'air knot');
   seen={torn,collisions:tipCollisions.count,blind:blindBites.hidden,tipGrabs:regraspCheck.tipGrabs,air:airKnot.flagged};
  };
  const frameQuery=cachedQuery();
  // Guided first run (src/ui/firstRun.ts): once per browser, never for automated checks.
  mountFirstRun(document.querySelector<HTMLElement>('#viewport')!,(()=>{try{return localStorage;}catch{return null;}})(),navigator.webdriver===true);
  // Sound cues (src/ui/sound.ts): pop-through, kept stitch, over-pulled thread; toggle in the view tools.
  const soundStorage=(()=>{try{return localStorage;}catch{return null;}})();
  const sound=new SoundCues(loadSoundOn(soundStorage));
  {const button=document.createElement('button');button.type='button';button.className='sound-toggle';
   const label=()=>{button.textContent=sound.on?'Sound on':'Sound off';button.setAttribute('aria-pressed',String(sound.on));};label();
   button.addEventListener('click',()=>{sound.on=!sound.on;saveSoundOn(soundStorage,sound.on);label();button.blur();});
   document.querySelector('.workspace-view-tools')?.append(button);}
  let heardPasses=0,heardStitches=0,heardOverPull=false;
  const playCues=()=>{
   const passes=session.freePass.passes.length;if(passes>heardPasses)sound.play('pop');heardPasses=passes;
   const kept=session.environment.id==='microsurgery'?session.vesselStitches:session.course.completed.length;if(kept>heardStitches)sound.play('chime');heardStitches=kept;
   const free=session.freeKnot;const over=free.active&&(free.tension.long.state==='excessive'||free.tension.short.state==='excessive');if(over&&!heardOverPull)sound.play('tug');heardOverPull=over;
  };
  // Back-wall catch alert during a vessel bite (src/gameplay/backWallCatch.ts).
  const vesselGraspJaw=new THREE.Vector3();
  const vesselGraspNote=()=>{const text=session.environment.id==='microsurgery'?describeVesselGrasp(vesselGrasp):'';return text?text+' · ':'';};
  const vesselNote=()=>{if(session.environment.id!=='microsurgery'||!vesselAngles.length)return '';
   // After the last suggested stitch: estimated lumen narrowing at the join (src/gameplay/lumenNarrowing.ts).
   const done=vesselAngles.length>=vesselGoal()?describeLumenNarrowing(lumenNarrowingPercent({dilation,stitches:vesselAngles.length,suggested:vesselGoal(),inverted:session.vesselEversions.filter(e=>e<-0.002).length}))+' · ':'';
   return done+describeVesselCount(vesselAngles,vesselDiameterMm())+' · '+describeVesselBites(vesselBites)+' · '+describeVesselEversion(session.vesselEversions)+' · ';};
  // Air knot (src/gameplay/airKnot.ts): first throw not seated before the next, from any knot engine.
  const airKnot=new AirKnotWatcher();
  const airKnotNote=()=>{const free=session.freeKnot;if(!free.active){airKnot.reset();return '';}airKnot.update(free.sequence?.throws.length??0,free.seatedThrows,free.sequence?.sliding??false);return airKnot.flagged?AIR_KNOT_WARNING+' · ':'';};
  const landmarkNote=()=>{if(!landmarkExercise||session.environment.id!=='skin')return '';const first=session.freePass.passes.find(p=>p.exit&&!p.torn);const z=session.course.completed[0]?.site.siteZ??(first?(first.entry.z+first.exit!.z)/2:null);return describeLandmark(z)+' · ';};
  const tensionHoldNote=()=>{if(!session.sandbox||session.freeKnot.active)return '';const text=describeTensionHold(session.freeThread.loopSlackUnits());return text?text+' · ':'';};
  const pullNote=()=>{const free=session.freeKnot;if(!free.active){breakMonitors.long.reset();breakMonitors.short.reset();return '';}const peak=Math.max(breakMonitors.long.peakShare,breakMonitors.short.peakShare);return peak>0.05?describePull(peak,sutureSize)+' · ':'';};
  const vesselModeNote=()=>{if(session.environment.id!=='microsurgery')return '';
   if(microSelect.value==='vein')return session.eversion.held?'Vein held open · take the bite now · ':'Vein collapsed · hold the wall open with forceps counterpressure before each bite · ';
   if(microSelect.value==='diseased-artery')return 'Diseased artery: take inside-out bites that pin the plaque and intima to the wall · ';
   return '';};
  const dilationNote=()=>session.environment.id==='microsurgery'&&microSelect.value!=='nerve'?describeDilation(dilation,intimaTorn)+' · ':'';
  const nerveNote=()=>session.environment.id!=='microsurgery'?'':(microSelect.value==='nerve'?describeNerveAlignment(nerveTwist):describeVesselTwist(nerveTwist))+' · ';
  const unequalNote=()=>unequalExercise&&session.environment.id==='skin'?describeUnequalEdges(session.freePass.passes)+' · ':'';
  const planNote=()=>{if(!plannedZ.length||session.environment.id!=='skin')return '';const actual=session.freePass.passes.filter(p=>p.exit&&!p.torn).map(p=>(p.entry.z+p.exit!.z)/2);const text=describePlan(plannedZ,actual);return text?text+' · ':'';};
  const enduranceNote=()=>enduranceExercise&&session.environment.id==='skin'?describeEndurance(session.freePass.passes)+' · ':'';
  const backWallNote=()=>session.environment.id==='microsurgery'&&session.pass.phase==='passing'&&catchesBackWall({centreY:session.pass.center.y,radius:session.pass.radius},microProfile(resolveMicroTarget(microSelect.value)))?BACK_WALL_WARNING+' · ':'';
  const stitchStepElements=Array.from(document.querySelectorAll<HTMLElement>('[data-stitch-step]'));
  let markedStitchStep=-1;
  view.renderer.setAnimationLoop((time)=>{if(!view.renderingAvailable||(document.body.classList.contains('tracking-lab-active')&&!viewInLab())){last=time;return;}const frameStarted=performance.now();perf.sample('Simulator frame interval',Math.max(0,time-last));const dt=Math.min((time-last)/1000,.05);frameDt=dt;heldDisplay.restore();if(!replay.step(dt)){if(demo?.running){/* The demo's knot physics is tuned at 1/60 s steps (src/demo/freeKnotDemo.test.ts): slice longer frames. */const slices=Math.max(1,Math.ceil(dt*60-1e-6));for(let i=0;i<slices;i++){demo.step(dt/slices);session.update(dt/slices);}}else session.update(dt);if(session.sandbox||session.freeKnot.active)replay.record(time/1000);} last=time;
    if(cameraEnabled){
     const fps=simulatorFps.tick(time);
     if(fps!==null)cameraPerformance.textContent='Simulator '+fps+' FPS · Tracking loop '+trackingLoopFps+' FPS';
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
    const cuttingButton=frameQuery('#select-scissors') as HTMLButtonElement;
    setDisabled(cuttingButton,!canUseScissors());setDisabled(saveVesselButton,!session.canSaveVesselStitch);setText(cuttingButton,input.scissorsActive?'Use needle driver':'Use scissors');const scissorsPressed=String(input.scissorsActive);if(cuttingButton.getAttribute('aria-pressed')!==scissorsPressed)cuttingButton.setAttribute('aria-pressed',scissorsPressed);
    setDisabled((frameQuery('#position-scissors') as HTMLButtonElement),!canUseScissors());
    const cut=scissors.findCut(input.scissorsActive?(session.freeKnot.active?session.freeKnot.strands:[session.knotSlack.short,session.knotSlack.long]):[]);
    if(cut){
      if(session.freeKnot.active){const free=session.freeKnot,tail=tailLengthMm(cut.coordinate,free.minimumCut(cut.strand),cut.strand.restLength,SCENE_MM_PER_UNIT);const done=free.cut(cut.strand,cut.coordinate);cutFeedback=free.cutMessage+(done?' · '+describeTail(tail):'');}
      else cutFeedback=session.knotSlack.cut(cut.strand,cut.coordinate)?'Suture cut · Knot retained':'Leave a free tail outside the knot';
    }
    playCues();noteMistakes(time/1000);replayTimeline.update(replay.replaying,replay.progress,mistakeLog.within(replay.window));
    // Suture breaking strength: a pull held past this size's breaking point snaps the strand.
    if(session.freeKnot.active){const free=session.freeKnot;for(const key of ['long','short'] as const){if(breakMonitors[key].update(free.tension[key].demand,dt,sutureSize)){const strand=free[key];const at=Math.max(free.minimumCut(strand)+1,Math.floor(strand.count*0.6));if(free.cut(strand,at)){cutFeedback=`Suture snapped (${sutureSize.label}) · pulled too hard`;mistakeLog.add(time/1000,'suture snapped');}}}}
    fragmentsView.update(session.freeKnot.active?session.freeKnot.fragments:session.knotSlack.fragments);
    setText(frameQuery('#right-tool-name'),input.scissorsActive?(session.environment.id==='microsurgery'?'Westcott scissors':'Mayo scissors'):session.environment.id==='microsurgery'?'Castroviejo driver':'Right needle driver'); if(session.environment.id==='skin'){tissue.setTargets(session.pass.entry,session.pass.exit);tissue.update(session.wound,session.eversion,session.course.tissueSites,session.course.siteZ,session.tissueField);}else artery.update(session.wound,session.eversion);
    setHidden(crossSectionToggle.parentElement!,session.environment.id!=='skin');
    setHidden(crossSectionPanel,session.environment.id!=='skin'||!crossSectionToggle.checked);
    if(!crossSectionPanel.hidden)crossSection.update(session.tissueField,session.course.siteZ,session.pass,session.eversion);
    epidermalGuide.root.visible=session.environment.id==='skin'&&session.pass.phase==='passing'&&session.oppositeEdgeRequired;
    if(epidermalGuide.root.visible){const a=session.epidermalAlignment;epidermalGuide.update(a.left,a.right,session.oppositeEdgeReady);}
    setHidden((frameQuery('#guided-technique-field') as HTMLElement),session.freeKnot.active);
    const knot=session.knot;
    const knotState=frameQuery('#knot-state') as HTMLElement;
    setHidden(knotState,!session.freeKnot.active);
    const handlingHint=session.freeKnot.active?session.freeKnot.handlingHint:'';
    if(session.freeKnot.active){
      const free=session.freeKnot,state=free.retainedThrow.phase;
      setText(knotState,freeKnotStateText({phase:state,knotAtTissue:free.knotAtTissue,throws:free.sequence?.throws.length,label:free.sequence?.label,hasOpening:free.passage.hasOpening,handlingHint}));
      setData(knotState,'phase',state==='seated'&&!free.knotAtTissue?'tightened':state);
    }
    setDisabled((frameQuery('#begin-free-knot') as HTMLButtonElement),!session.canBeginKnot);
    const course=session.course;
    setHidden((frameQuery('.bite-planning') as HTMLElement),session.environment.id!=='skin');
    setDisabled((frameQuery('#bite-controls') as HTMLFieldSetElement),!session.canPlanBites);
    for(const [input,output,value] of [[rightBite,'#right-bite-value',session.pass.entry.x/DEFAULT_BITE_WIDTH],[leftBite,'#left-bite-value',-session.pass.exit.x/DEFAULT_BITE_WIDTH]] as const){
      const percent=String(Math.round(value*100));if(input.value!==percent)input.value=percent;setPlanText(output,`${percent}%`);
    }
    setAttr(stitchPosition,'min',String(Math.ceil(course.positionLimits.min*100-1e-7)));setAttr(stitchPosition,'max',String(Math.floor(course.positionLimits.max*100+1e-7)));{const site=String(Math.round(course.siteZ*100));if(stitchPosition.value!==site)stitchPosition.value=site;}
    setPlanText('#stitch-position-value',course.siteZ.toFixed(2));
    setPlanText('#bite-plan-status',!session.canPlanBites?'Bite plan locked for this stitch':session.bitePlanLimited?'Widths adjusted to fit the needle and preserve dermal purchase.':'Bite widths are relative to the default bite; position uses practice units.');
    setPlanText('#spacing-review',course.active?`${course.spacingReview} · ${course.closureReview}${knotSides.length?' · '+describeKnotPlacement(knotSides):''}${!course.finished?' · Sites reserve room for the remaining stitches, with a minimum 0.30 separation.':''}`:course.completed.length?`Sandbox · ${describeSpacing(summarizeSandbox([],[],course.completed.map(r=>({siteZ:r.site.siteZ,review:r.review}))).spacingMm)} · ${describeStepOffs(course.tissueSites)}${knotSides.length?' · '+describeKnotPlacement(knotSides):''}`:'Start a 3-stitch session to review spacing.');
    setHidden((frameQuery('.course-controls') as HTMLElement),session.environment.id!=='skin');
    completedView.update(course.completed.length,course.siteZ);
    updateCourseButtons(frameQuery,{skin:session.environment.id==='skin',active:course.active,finished:course.finished,index:course.index,canAdvance:session.canAdvanceStitch,canFinishSandboxStitch:session.canFinishSandboxStitch,canTieFreePass:session.canTieFreePass});
    if(courseStatus.textContent!==course.status)courseStatus.textContent=course.status;
    if(courseRevision!==course.revision){
      courseRevision=course.revision;courseReview.replaceChildren(...course.completed.map(stitch=>{const item=document.createElement('li');item.textContent=`Stitch ${stitch.number} · ${stitch.review.join(' · ')}`;return item;}));setHidden(courseReview,!course.completed.length);
    }
    const assessment=session.stitchAssessment;
    const currentStep=Number(assessment.stage.match(/^(\d)/)?.[1]??0);
    // The step list is static page markup: re-mark it only when the step changes.
    if(currentStep!==markedStitchStep){markedStitchStep=currentStep;markStitchSteps(stitchStepElements,currentStep);}
    for(const [selector,text] of [['#stitch-stage',assessment.stage],['#stitch-quality',[...assessment.feedback,...(session.freeKnot.active&&session.freeKnot.sequence?.locked?[`Release hold: ${Math.round(session.freeReleaseProgress*100)}%`]:[])].join(' · ')]]){
      const element=frameQuery(selector)!;if(element.textContent!==text)element.textContent=text;
    }
    setData((frameQuery('#stitch-stage') as HTMLElement),'complete',String(assessment.complete||assessment.labFinished));
    // Strand tension meters and cue (src/ui/practicePanels.ts).
    idealPath.update(session.environment.id==='skin',session.course.siteZ);
    idealPath.setConsistency(guideConsistency(session.freePass.passes.filter(p=>p.exit&&!p.torn).map(p=>({entryAngleDeg:p.entryAngleDeg,squareOffDeg:stitchSquareOffDeg(p.entry,p.exit!)}))));
    landmarkLine.update(landmarkExercise&&session.environment.id==='skin',session.course.siteZ);
    unequalMarks.update(unequalExercise&&session.environment.id==='skin',session.course.siteZ);
    {const sites=session.course.tissueSites,show=session.environment.id==='skin'&&(session.course.finished||session.sandbox&&sites.length>=2);if(show&&sites!==scannedSites){scannedSites=sites;openSpans=gapScan(sites);}gapScanView.update(show?openSpans:[],session.course.siteZ);}
    tensionView.update(session.course.tissueSites,session.course.siteZ,session.environment.id==='skin');
    planMarks.update(plannedZ,session.course.siteZ,session.environment.id==='skin');
    sampleSkill();
    updateTensionPanel(frameQuery,session.freeKnot.active?session.freeKnot:null);
    const edge=session.eversion;
    const skinContext=session.environment.id==='skin'&&!knot.active&&!course.finished&&!session.freeKnot.grips.has('left')&&grasp.holder?.kind!=='forceps'&&!(session.pass.phase==='complete'&&session.pull.phase==='waiting'&&!edge.held);
    const tractionAlert=skinContext&&['stretching','slipping','slipped'].includes(edge.traction.state);
    const skinPanel=frameQuery('#skin-handling') as HTMLElement;
    setHidden(skinPanel,!skinContext||!edge.active&&edge.traction.state!=='slipped');
    if(!skinPanel.hidden){
      const traction=edge.traction,meter=frameQuery('#skin-traction') as HTMLMeterElement;
      if(Math.abs(meter.value-traction.load)>.001)meter.value=traction.load;
      if(meter.dataset.state!==traction.state)meter.dataset.state=traction.state;
      const text=skinTractionText({alert:tractionAlert,instruction:edge.instruction,held:edge.held,ready:edge.ready,state:traction.state,progress:traction.progress,edgesShown:session.oppositeEdgeRequired&&session.pass.phase==='passing'});
      setPlanText('#skin-traction-state',text.state);setPlanText('#skin-traction-hint',text.hint);
    }
    edgeMarker.visible=!knot.active && (session.preparingEdge || edge.held || tractionAlert);
    edgeMarker.position.copy(edge.target);edgeMarker.material.color.setHex(tractionAlert?(edge.traction.state==='stretching'?0xf4b95d:0xf08b86):edge.held?0x65df9b:0xf7ce73);
    setHidden((frameQuery('#eversion-note') as HTMLElement),!session.preparingEdge && session.pass.phase!=='passing');
    const knotAction=frameQuery('#knot-action') as HTMLButtonElement;
    setDisabled(knotAction,!session.canKnotAction);
    setText(knotAction,knotActionLabel({loadTestActive:session.loadTest.active,releaseCheckState:session.releaseCheck.state,knotPhase:knot.phase,technique:knot.sequence?.technique,throws:knot.throws}));
    setHidden((frameQuery('.grip-settings') as HTMLElement),knot.active || session.freeKnot.active || session.positioningSkin);
    setHidden((frameQuery('#free-note') as HTMLElement),!session.freeKnot.active);
    setHidden((frameQuery('#knot-note') as HTMLElement),!knot.active);
    needle.root.updateWorldMatrix(true,false);
    knotView.update(knot,tools,session.wound.deformPoint(session.pass.entry),session.wound.deformPoint(session.pass.exit),needle.points[0].clone().applyMatrix4(needle.root.matrixWorld),session.knotSlack,session.pass.halfWidth);
    const exercise=session.placement; const pose=needle.getTipPose(); guide.update(pose.position,exercise);
    const title=frameQuery('#exercise-title')!;
    const pass=session.pass; passGuide.update(pass); if(session.canPlanBites)passGuide.root.visible=true; if(session.sandbox)passGuide.root.visible=false; if(!showNeedleGuide.checked || knot.active || session.freeKnot.active) passGuide.root.visible=false;
    setDisabled((frameQuery('#begin-pass') as HTMLButtonElement),!session.canBeginPass);
    updateSandboxViewTools(frameQuery,{replaying:replay.replaying,replayAvailable:replay.available,replayProgress:replay.progress,sandbox:session.sandbox,
     undoable:session.freePass.inTissue||session.freePass.passes.length>0||session.freePass.torn.length>0});
    setText(frameQuery('#begin-pass'),session.sandbox?'Start guided exercise':session.preparingEdge?'Begin needle pass':'Start guided pass');
    {const heading=frameQuery('.scene-heading h2');const microHeading=session.environment.id==='microsurgery'?`${MICRO_TARGETS[resolveMicroTarget(microSelect.value)].label} anastomosis · one stitch`:null;const headingText=microHeading??(session.sandbox?'Sandbox':'Simple interrupted suture');if(heading&&heading.textContent!==headingText)heading.textContent=headingText;}
    {const label=Array.from(frameQuery('.toolbar > span')?.childNodes??[]).find(n=>n.nodeType===Node.TEXT_NODE&&n.textContent!.trim());const labelText=session.sandbox?' Sandbox ':' Guided stitch ';if(label&&label.textContent!==labelText)label.textContent=labelText;}
    setText(frameQuery('#position-forceps'),pass.phase==='passing'&&session.oppositeEdgeRequired?'Position forceps at opposite edge':session.positioningSkin?'Position forceps at skin edge':'Position forceps');
    const pull=session.pull;
    setDisabled((frameQuery('#position-forceps') as HTMLButtonElement),!session.canPositionForceps);
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
    setData((frameQuery('#exercise-title') as HTMLElement),'passSupport',pass.phase==='passing'?(session.oppositeEdgeRequired?(session.oppositeEdgeReady?'aligned':'opposite'):'entry'):'idle');
    {const free=session.freeKnot,outcome=session.sandboxStitchOutcome;
     if(session.environment.id==='microsurgery'&&microSelect.value!=='nerve'){tools[0].root.updateWorldMatrix(true,false);vesselGrasp.update(tools[0].root.localToWorld(vesselGraspJaw.set(0,0,0.05)),tools[0].openness,microProfile(resolveMicroTarget(microSelect.value)));}
     freshNeedleButton.hidden=!session.sandbox;
     setText(frameQuery('#exercise-readout'),dailyNote()+wrapNote()+pullNoteTying()+needleWearNote()+(performance.now()<flipWarning.until?flipWarning.text+' · ':'')+vesselGraspNote()+enduranceNote()+planNote()+unequalNote()+dilationNote()+vesselModeNote()+nerveNote()+pullNote()+tensionHoldNote()+landmarkNote()+airKnotNote()+backWallNote()+vesselNote()+exerciseReadout({sandbox:session.sandbox,edge,tractionAlert,preparingEdge:session.preparingEdge,oppositeEdgeRequired:session.oppositeEdgeRequired,oppositeEdgeInstruction:session.oppositeEdgeInstruction,
      freePasses:freePass.passes,skin:{label:PRACTICE_SETUP.skin.label,tearDegrees:Math.round(PRACTICE_SETUP.skin.tear.degrees*(PRACTICE_SETUP.needle.tip==='taper'?TAPER_IN_SKIN_TEAR_FACTOR:1)),tearText:formatMm(PRACTICE_SETUP.skin.tear.units*(PRACTICE_SETUP.needle.tip==='taper'?TAPER_IN_SKIN_TEAR_FACTOR:1))},pass,wound:session.wound,
      freeKnot:free.active?{forcepsHolding:free.grips.has('left')?free.gripLabel('left'):null,driverHolding:free.grips.has('right')?free.gripLabel('right'):null,winding:free.winding,driverOnTissue:free.driverOnTissue,instruction:free.instruction,handlingHint,reachLimited:free.reachLimited,tightness:free.retainedThrow.active?free.retainedThrow.tightness:null,outcome:outcome?{security:outcome.knot.security,notes:outcome.knot.notes,edgeNotes:outcome.edges.notes}:null}:null,
      knot:knot.active?{throws:knot.throws,targetThrows:knot.targetThrows,threadState:knot.threadState,phase:knot.phase,slack:session.knotSlack.enabled?{state:session.knotSlack.state,friction:session.knotSlack.material.friction.state}:null,loadTest:session.loadTest.active?{load:session.loadTest.load,slip:session.loadTest.slip}:null,releaseState:session.releaseCheck.state}:null,
      pull,threadGuideState:needle.threadGuide.state,scissorsActive:input.scissorsActive,cutFeedback}));}
    {const progress=exerciseProgress({sandbox:session.sandbox,preparingEdge:session.preparingEdge,edgeLift:edge.lift,freeKnotActive:session.freeKnot.active,loadTest:session.loadTest,releaseCheck:session.releaseCheck,knot,pull,pass});
    {const bar=frameQuery('#placement-progress') as HTMLProgressElement;if(bar.value!==progress.value)bar.value=progress.value;}setText(frameQuery('#progress-label'),progress.label);
    // Sandbox progress is on the HUD stat card; the bar would only repeat "Sandbox".
    const holdProgress=frameQuery('.hold-progress') as HTMLElement|null;if(holdProgress&&holdProgress.hidden!==session.sandbox)holdProgress.hidden=session.sandbox;}
    const status=frameQuery('#grasp-status')!; const statusText=graspStatusText({tractionAlert,edge,passPhase:pass.phase,oppositeEdgeRequired:session.oppositeEdgeRequired,oppositeEdgeInstruction:session.oppositeEdgeInstruction,preparingEdge:session.preparingEdge,freeKnotActive:session.freeKnot.active,loadTestActive:session.loadTest.active,driverOpenness:tools[1].openness,knot,releaseCheck:session.releaseCheck,graspStatus:grasp.status}); if(status.textContent!==statusText) status.textContent=statusText; if(session.environment.id==='microsurgery')for(const selector of ['#exercise-title','#exercise-readout','#grasp-status','#position-forceps']){
      const element=frameQuery(selector)!;setText(element,element.textContent!.replaceAll('Skin edge','Vessel edge').replaceAll('skin edge','vessel edge').replaceAll('Dermal purchase','Wall purchase'));
    } view.controls.update(); perf.measure('Simulator render submission',()=>view.renderer.render(view.scene,view.camera)); tools.forEach(tool=>{const meter=frameQuery(`#${tool.id}-jaw`) as HTMLMeterElement,opening=tool.id==='right'&&input.scissorsActive?scissors.openness:tool.openness;if(meter.value!==opening)meter.value=opening;});perf.sample('Simulator CPU frame',performance.now()-frameStarted);});
  window.addEventListener('pagehide',()=>{input.dispose(); view.renderer.setAnimationLoop(null);});
} catch(error) { document.querySelector('#error')!.textContent='The 3D workspace could not start. Please use a browser with WebGL enabled.'; console.error(error); }
