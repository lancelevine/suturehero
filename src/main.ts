import {TrackedPositionBridge} from './input/TrackedPositionBridge';
import {mountWorkspaceLayout} from './ui/WorkspaceLayout';
import {mountCalibrationPanel} from './ui/InstrumentCalibrationPanel';
import {instrumentCalibration} from './input/InstrumentCalibration';
import './ui/workspace.css';
import {trackedInstrumentRotation} from './input/trackingFrame';
import {EpidermalAlignmentGuide} from './scene/EpidermalAlignmentGuide';
import {CrossSectionView} from './scene/CrossSectionView';
import {DEFAULT_BITE_WIDTH} from './tissue/BitePlan';
import {CompletedStitchesView} from './scene/CompletedStitchesView';
import {SKIN_TYPES} from './environments/SkinTypes';
import {MICRO_TARGETS,resolveMicroTarget} from './environments/MicroTargets';
import {Scissors} from './instruments/Scissors';
import {InstrumentControls} from './input/InstrumentControls';
import {FragmentView} from './scene/FragmentView';
import {NEEDLES,SUTURES,PRACTICE_SETUP} from './setup/PracticeSetup';
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
const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=`
<header><a class="brand" href="./"><img class="brand-logo" src="./suturehero-emblem.svg" alt="" aria-hidden="true"><span class="brand-name">Suture<span class="muted">Hero</span></span></a><span class="lab">THE PRACTICE LAB</span><span class="version">BUILD 0.57 · ${__SUTUREHERO_BUILD__} (${__SUTUREHERO_REVISION__})</span><span class="status"><i></i> Sandbox active</span><button id="camera-tracking-toggle" type="button" aria-pressed="false">Camera</button></header>
<div id="camera-tracking-panel" hidden style="position:fixed;right:12px;top:70px;width:min(480px,90vw);height:min(650px,75vh);z-index:100;background:#131820;border:1px solid #637080;border-radius:12px;box-shadow:0 8px 36px #0009;display:none;flex-direction:column;overflow:hidden">
<div style="display:flex;gap:8px;align-items:center;justify-content:space-between;padding:8px 12px;color:white"><strong>Camera tracking controls</strong><span id="camera-performance" style="font-size:11px">FPS: measuring…</span><span id="camera-tracking-status" role="status">Start a camera below</span><button id="camera-tracking-hide" type="button">Hide controls</button></div>
<div id="tracking-app" data-embedded="true" style="flex:1;overflow:auto;min-height:0"></div>
</div>
<main><aside><div class="eyebrow">01 / FOUNDATIONS</div><h1>A steady hand.<br>A better stitch.</h1><p class="intro">Your surgical skills start here. Explore the workspace and get a feel for your instruments.</p><div class="lesson"><span class="tag">FREE PRACTICE</span><h2>Pass & tie</h2><p>Start guided pass, then position the forceps at the right skin edge. Close Z and lift briefly with E to evert it. Click Begin needle pass when ready. Hold U to pass right to left. Open X to release the skin. Choose a needle grip point, click Position forceps, close Z, then open the driver with period. Hold R to continue the needle’s curve; Y reverses. After extraction, choose guided knot tying or Tie freely after pass. Release the seated knot for its hold check, then trim both free tails and review your stitch feedback.</p><div class="rule"></div><div class="objective"><span>◉</span><div>Simple interrupted suture<small>Pass · tie · release · trim</small></div></div></div><div class="steps" role="list"><div data-stitch-step="1" role="listitem"><b>01</b><span>Evert and pass<small>Grasp the edge · Follow the needle curve</small></span></div><div data-stitch-step="2" role="listitem"><b>02</b><span>Transfer and extract<small>Left Z · right period · left R</small></span></div><div data-stitch-step="3" role="listitem"><b>03</b><span>Tie and seat<small>Choose guided or free tying</small></span></div><div data-stitch-step="4" role="listitem"><b>04</b><span>Release and hold<small>Open both jaws · Let the knot settle</small></span></div><div data-stitch-step="5" role="listitem"><b>05</b><span>Trim both tails<small>Scissors · Position at each free tail</small></span></div><div data-stitch-step="6" role="listitem"><b>06</b><span>Review the stitch<small>Bites · edges · knot placement</small></span></div></div><div class="notice">RESEARCH PROTOTYPE<p>For exploration only. Not a clinical training or assessment tool.</p></div></aside>
<section class="workspace"><div class="scene-heading"><div><span class="eyebrow">WORKSPACE</span><h2>Simple interrupted suture</h2></div><span class="scene-tag" title="Epidermis · Dermis · Subcutaneous fat">3-LAYER TISSUE PAD</span></div><div class="practice-setup"><button id="switch-environment" aria-pressed="false">Microsurgery environment</button><label id="skin-type-field">Skin <select id="skin-type">${SKIN_TYPES.map(p=>`<option value="${p.id}">${p.label}</option>`).join('')}</select></label><label id="micro-target-field" hidden>Anastomosis <select id="micro-target">${Object.values(MICRO_TARGETS).map(p=>`<option value="${p.id}">${p.label}</option>`).join('')}</select></label><label>Needle <select id="needle-type">${NEEDLES.map(p=>`<option value="${p.id}">${p.label}</option>`).join('')}</select></label><label>Suture <select id="suture-material">${SUTURES.map(p=>`<option value="${p.id}">${p.label}</option>`).join('')}</select></label><label>Graphics <select id="graphics-quality"><option value="standard">Standard</option><option value="low">Fast · no shadows</option></select></label><label id="guided-technique-field">Guided technique <select id="knot-technique"><option value="surgeon">Surgeon's · double first wrap</option><option value="sliding">Sliding · same-direction start</option></select></label><small>Practice setup changes restart. Graphics can change anytime. Sizes use a practice scale.</small></div><div id="viewport" aria-label="Interactive 3D surgical workspace"><div class="scene-label"><i></i> LIVE VIEW <span>•</span> TISSUE PAD 01</div><div class="legend"><span><i class="left-dot"></i> Left forceps</span><span><i class="right-dot"></i> Right needle driver</span><span><i class="scissors-dot"></i> Scissors</span></div><div class="camera-hint">Drag to orbit · Scroll to zoom</div><div id="knot-state" class="knot-state" role="status" hidden></div><div id="error" role="alert"></div></div><div class="toolbar"><span><i></i> Guided stitch <small id="grasp-status" role="status">Click Start guided pass when ready</small></span><div><button id="select-scissors" aria-pressed="false" disabled>Use scissors</button><button id="position-scissors" disabled>Position scissors at tail</button><button id="free-tying">Free tying lab</button><button id="begin-pass" >Start guided pass</button><button id="position-forceps" disabled>Position forceps</button><button id="knot-action" disabled>Begin knot tying</button><button id="begin-free-knot" disabled>Tie freely after pass</button><button id="close-up" aria-pressed="false">Close-up view</button><button id="camera">↺ Reset view</button><button id="reset">Reset practice</button></div></div><div class="exercise-feedback"><div><strong id="exercise-title" role="status">Ready to start</strong><span id="exercise-readout">Entry is automatically aligned on the right.</span></div><div class="hold-progress"><label for="placement-progress"><span id="progress-label">Guided pass progress</span></label><progress id="placement-progress" max="1" value="0"></progress></div></div><section id="skin-handling" class="skin-handling" hidden aria-label="Forceps tissue traction"><div><strong id="skin-traction-state" role="status">Gentle traction</strong><label>Relative skin traction <meter id="skin-traction" min="0" max="1" value="0"></meter></label></div><small id="skin-traction-hint">Lift gently to evert the edge.</small></section><div class="knot-note" id="eversion-note" hidden>First maneuver: grasp the upper skin edge with the left forceps; the attached dermis lifts with it. Lift to evert the skin. Position forceps at skin edge is optional. Close Z, hold E briefly (Shift slows movement), then stop and click Begin needle pass. Hold the right edge through the first side. At the pause, open X, position forceps at the opposite left edge, close Z and pull inward with D until the visible epidermal edges meet. Use E/Q only as needed to level their surfaces. Then U advances the driver. Open X before transferring the needle. The dermis carries suture load; epidermis and fat follow its movement. Tissue deformation is a local visual approximation.</div><div class="knot-note" id="knot-note" hidden>Guided knot practice · Loop, grasp the short tail, then pull opposite ends. Thread slack is simulated through both throws. The pull check uses approximate load and slip; knot topology remains guided. Load is relative, not a measured force or knot-security assessment.</div><div class="knot-note" id="free-note" hidden>Free tying lab · Both instruments move with their usual keys. The forceps start holding the long tail. Close an open jaw near thread to grasp it, or near either skin edge to grasp and evert the tissue. Open X to release before switching between skin and thread. Gold marks the actual short tip; green means the driver holds that end. Shaft, jaw and strand contact are approximate. Wrapping comes from moving thread around the driver, not R/Y progress. Wrap the long strand around the driver, grasp the gold short tail and pull it through the opening and clear of the driver. Pull both held ends apart to tighten one retained throw. The starting knot is detected from your actual wraps and throw directions; no selection is required. Surgeon’s uses a double first wrap followed by an opposing single throw. Sliding uses two same-direction single throws with the short strand held taut as the post, then opposing locking throws. Earlier throws remain connected. Retention and sliding are approximate. Reset practice returns to guided mode.</div><section class="bite-planning" aria-label="Bite placement"><h3>Plan this stitch</h3><fieldset id="bite-controls"><label>Right entry <input id="right-bite" type="range" min="50" max="150" value="100" step="1"><output id="right-bite-value">100%</output></label><label>Left exit <input id="left-bite" type="range" min="50" max="150" value="100" step="1"><output id="left-bite-value">100%</output></label><label>Position along incision <input id="stitch-position" type="range" min="-110" max="110" value="0" step="5"><output id="stitch-position-value">0.00</output></label></fieldset><p id="bite-plan-status">Bite widths are relative to the default bite; position uses practice units.</p><label><input id="show-needle-guide" type="checkbox" checked> Show needle arc</label><label><input id="show-cross-section" type="checkbox"> Show skin cross-section</label><section id="cross-section" hidden aria-label="Skin cross-section"><canvas id="cross-section-canvas" width="600" height="260" role="img" aria-label="Side-on slice showing epidermis, dermis, fat and the planned needle path"></canvas><p id="cross-section-readout" role="status"></p><small>Pink: epidermis · Rose: dermis · Gold: fat. Dashed blue: planned path, not a live thread trace. Illustrative depth response.</small></section><small>Arc overlay only; needle movement remains assisted.</small><p id="spacing-review">Save two stitches to review spacing.</p></section><section class="course-controls" aria-label="Multi-stitch session"><div><strong id="course-status" role="status">One-stitch practice</strong><button id="start-course">Start 3-stitch session</button><button id="next-stitch" disabled>Save & next stitch</button></div><p id="course-note">Skin exercise: place three interrupted stitches along the incision. Complete, release and trim each stitch before saving it. The pad recenters on the next site. Saved sutures stay fixed while neighboring stitches share tissue closure.</p><ol id="course-review" hidden></ol></section><section class="stitch-summary" aria-label="Stitch exercise"><h3 id="stitch-stage">1 / 6 · Evert and pass the needle</h3><p id="stitch-quality"></p><div id="tension-panel" hidden><span>Relative strand tension</span><div class="tension-arms"><label>Long <meter id="long-tension" min="0" max="1" value="0"></meter><b id="long-tension-state">released</b></label><label>Short <meter id="short-tension" min="0" max="1" value="0"></meter><b id="short-tension-state">released</b></label></div><small id="tension-cue">Take up slack gently.</small></div></section><div class="grip-settings"><label for="grip-point">Forceps grip position <span id="grip-label">10% behind tip</span></label><input id="grip-point" type="range" min="82" max="100" value="90" step="1"><p>Purple ring: selected assist point · Green: reachable grip · Gold: held point. Move manually to choose another exposed point.</p></div><section class="controls"><div class="controls-title"><h2>Take control</h2><span>Both instruments respond simultaneously</span></div><div class="control-grid"><article><h3><i class="left-dot"></i> Left forceps <span>01</span></h3><dl><div><dt>Move across pad</dt><dd>W A S D</dd></div><div><dt>Raise / lower</dt><dd>E / Q</dd></div><div><dt>Pitch · yaw · roll</dt><dd>T G · F H · R Y</dd></div><div><dt>Close / open jaws</dt><dd>Z / X</dd></div></dl><div class="jaw"><span>Jaw opening</span><meter id="left-jaw" min="0" max="1" value="0.65"></meter></div></article><article><h3><i class="right-dot"></i> <b id="right-tool-name">Right needle driver</b> <span>02</span></h3><dl><div><dt>Move across pad</dt><dd>↑ ← ↓ →</dd></div><div><dt>Raise / lower</dt><dd>N / M</dd></div><div><dt>Pitch · yaw · roll</dt><dd>I K · J L · U O</dd></div><div><dt>Close / open jaws</dt><dd>, / .</dd></div></dl><div class="jaw"><span>Jaw opening</span><meter id="right-jaw" min="0" max="1" value="0.65"></meter></div></article></div><p class="tip">↳ Open X (left) or period (right) to release. Hold Shift for 20% speed. Blue tip + ground projection show depth. Close Z near either skin edge and lift E to evert during free handling; X releases. Hold keys for continuous motion. Rotation pivots at the instrument tip. Position forceps is an optional positioning aid; the purple ring selects a body grip; the blue sphere shows the assist range. During the assisted pass, right-tool movement follows the circular guide; U / O drive it. After handoff, R / Y continue the same circular needle path. For knot tying, follow the prompted wrap and pull keys. Keyboard required.</p></section></section></main><footer><span>SUTURE HERO / An open practice space</span><span>Precision takes practice.</span></footer>`;
const workspaceLayout=mountWorkspaceLayout(app);
mountCalibrationPanel(workspaceLayout.calibrationHost);
try {
  const view=createScene(document.querySelector('#viewport')!);
  const tools=[new Instrument('left',0x65d8c1),new Instrument('right',0xe65353)];
  const needle=new SutureModel(); const grasp=new NeedleGrasp(needle);
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
    input.scissorsActive=false;scissors.reset();cutFeedback='';session.beginFreeTying('auto');closeUp=true;closeUpButton.setAttribute('aria-pressed','true');closeUpButton.textContent='Wide view';view.closeUp(freeTarget());
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
  needleSelect.value=PRACTICE_SETUP.needle.id;materialSelect.value=PRACTICE_SETUP.suture.id;
  techniqueSelect.value=params.get('technique')==='sliding'?'sliding':'surgeon';
  session.selectedTechnique=techniqueSelect.value==='sliding'?'sliding':'surgeon';
  const restartSetup=()=>{
    const url=new URL(location.href);url.searchParams.set('skin',skinSelect.value);url.searchParams.set('needle',needleSelect.value);url.searchParams.set('suture',materialSelect.value);
    url.searchParams.set('environment',session.environment.id);url.searchParams.set('target',microSelect.value);url.searchParams.set('technique',techniqueSelect.value);location.assign(url.href);
  };
  techniqueSelect.addEventListener('change',restartSetup);skinSelect.addEventListener('change',restartSetup);needleSelect.addEventListener('change',restartSetup);materialSelect.addEventListener('change',restartSetup);
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
  document.querySelector('#begin-pass')!.addEventListener('click',()=>session.beginPass());
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
  type CameraInstrument='needleDriver'|'forceps'|'scissors';
  type CameraPose={position:THREE.Vector3;quaternion:THREE.Quaternion;seenAt:number};
  const cameraPoses=new Map<CameraInstrument,CameraPose>();
  const cameraOrigins=new Map<CameraInstrument,TrackedPositionBridge>();
  const cameraToggle=document.querySelector<HTMLButtonElement>('#camera-tracking-toggle')!;
  const cameraPanel=document.querySelector<HTMLElement>('#camera-tracking-panel')!;
  let trackingModuleLoaded=false;
  const cameraStatus=document.querySelector<HTMLElement>('#camera-tracking-status')!;
  const cameraPerformance=document.querySelector<HTMLElement>('#camera-performance')!;
  let trackingLoopFps=0,simulatorFrames=0,simulatorFps=0,lastSimulatorFps=performance.now();
  let cameraEnabled=false;
  const setCameraMode=async(enabled:boolean)=>{
   cameraEnabled=enabled;cameraToggle.setAttribute('aria-pressed',String(enabled));
   cameraToggle.textContent='Camera';
   cameraPanel.style.display=enabled?'flex':'none';cameraPanel.hidden=!enabled;
   if(enabled)workspaceLayout.openSetup();else document.body.classList.remove('camera-setup-active');
   cameraPoses.clear();cameraOrigins.clear();
   if(enabled&&!trackingModuleLoaded){
    trackingModuleLoaded=true;
    try{
     await import('./tracking');
     await Promise.all([import('./stereoAutoCapture'),import('./cameraExposure')]);
    }catch(error){cameraStatus.textContent='Tracking initialization failed';console.error(error);}
   }
   if(!enabled){document.querySelector<HTMLButtonElement>('#stop-camera')?.click();document.querySelector<HTMLButtonElement>('#stop-camera-2')?.click();}
   cameraStatus.textContent=enabled?'Start a camera below':'Camera tracking off';
  };
  cameraToggle.addEventListener('click',()=>{if(cameraEnabled){cameraPanel.hidden=false;cameraPanel.style.display='flex';workspaceLayout.openSetup();}else void setCameraMode(true);});
  window.addEventListener('suturehero:open-camera-setup',()=>{if(cameraEnabled){cameraPanel.hidden=false;cameraPanel.style.display='flex';workspaceLayout.openSetup();}else void setCameraMode(true);});
  void setCameraMode(true); // Open setup without starting a camera stream.
  document.querySelector('#disable-camera-tracking')!.addEventListener('click',()=>{void setCameraMode(false);});
  instrumentCalibration.subscribe((name,reason)=>{if(reason==='reset')cameraOrigins.delete(name);if(reason==='neutral'){let bridge=cameraOrigins.get(name);if(!bridge){bridge=new TrackedPositionBridge();cameraOrigins.set(name,bridge);}bridge.alignOnNeutral();}});
  const onTrackingData=(data:any)=>{
   if(!cameraEnabled)return;
   if(data?.type==='suturehero:tracking-fps'&&typeof data.fps==='number'){
    trackingLoopFps=data.fps;return;
   }
   if(!data||data.type!=='suturehero:tracking-pose'||!['needleDriver','forceps','scissors'].includes(data.instrument))return;
   if(!Array.isArray(data.position)||data.position.length!==3||!Array.isArray(data.quaternion)||data.quaternion.length!==4)return;
   if(![...data.position,...data.quaternion].every((v:unknown)=>typeof v==='number'&&Number.isFinite(v)))return;
   cameraStatus.textContent='Tracking '+data.instrument;
   cameraPoses.set(data.instrument as CameraInstrument,{
    position:new THREE.Vector3().fromArray(data.position),
    quaternion:new THREE.Quaternion().fromArray(data.quaternion).normalize(),seenAt:performance.now()
   });
  };
  window.addEventListener('suturehero:tracking-pose',(event)=>onTrackingData((event as CustomEvent).detail));
  window.addEventListener('suturehero:tracking-fps',(event)=>onTrackingData((event as CustomEvent).detail));
  const jawTracking=new Map<CameraInstrument,{opening:number;seenAt:number}>();
  const onJawTracking=(data:any)=>{
   if(!cameraEnabled||data?.type!=='suturehero:jaw-opening'||!['forceps','needleDriver','scissors'].includes(data.instrument)||!Number.isFinite(data.opening))return;
   jawTracking.set(data.instrument as CameraInstrument,{opening:THREE.MathUtils.clamp(data.opening,0,1),seenAt:performance.now()});
  };
  window.addEventListener('suturehero:jaw-opening',(event)=>onJawTracking((event as CustomEvent).detail));
  let frameDt=1/60;
  const applyCameraPose=(name:CameraInstrument,object:THREE.Object3D)=>{
   const pose=cameraPoses.get(name);
   if(!pose||performance.now()-pose.seenAt>350)return;
   let bridge=cameraOrigins.get(name);if(!bridge){bridge=new TrackedPositionBridge();cameraOrigins.set(name,bridge);}
   // First acquisition preserves placement; explicit neutral aligns tracked XY,
   // retaining the instrument's current depth and subsequent relative motion.
   const desiredPosition=bridge.target(pose.position,object.position);
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
  view.renderer.setAnimationLoop((time)=>{if(!view.renderingAvailable){last=time;return;}const dt=Math.min((time-last)/1000,.05);frameDt=dt;session.update(dt); last=time;
    if(cameraEnabled){
     simulatorFrames++;
     if(time-lastSimulatorFps>=1000){
      simulatorFps=Math.round(simulatorFrames*1000/(time-lastSimulatorFps));simulatorFrames=0;lastSimulatorFps=time;
      cameraPerformance.textContent='Simulator '+simulatorFps+' FPS · Tracking loop '+trackingLoopFps+' FPS';
     }
    }
    if(cameraEnabled){
     for(const [name,model] of [['forceps',tools[0]],['needleDriver',tools[1]]] as const){
      const jaw=jawTracking.get(name);if(jaw&&time-jaw.seenAt<350)model.setTrackedOpening(jaw.opening);
     }
    }
    if(cameraEnabled){
     applyCameraPose('forceps',tools[0].root);
     applyCameraPose('needleDriver',tools[1].root);
    }
    if(!canUseScissors())input.scissorsActive=false;
    scissors.update(input.sampleScissors(),dt);
    const scissorsJaw=jawTracking.get('scissors');
    if(cameraEnabled&&scissorsJaw&&time-scissorsJaw.seenAt<350)scissors.setTrackedOpening(scissorsJaw.opening);
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
    setPlanText('#spacing-review',course.active?`${course.spacingReview} · ${course.closureReview}${!course.finished?' · Sites reserve room for the remaining stitches, with a minimum 0.30 separation.':''}`:'Start a 3-stitch session to review spacing.');
    (document.querySelector('.course-controls') as HTMLElement).hidden=session.environment.id!=='skin';
    completedView.update(course.completed.length,course.siteZ);
    const courseStart=document.querySelector('#start-course') as HTMLButtonElement,courseNext=document.querySelector('#next-stitch') as HTMLButtonElement;
    courseStart.disabled=session.environment.id!=='skin'||course.active&&!course.finished;
    courseStart.textContent=course.finished?'New 3-stitch session':'Start 3-stitch session';
    courseNext.disabled=!session.canAdvanceStitch;courseNext.textContent=course.index===2?'Finish session':'Save & next stitch';
    courseNext.hidden=!course.active;
    (document.querySelector('#free-tying') as HTMLButtonElement).disabled=course.active;
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
    knotAction.textContent=session.loadTest.active?'Pull check active':session.releaseCheck.state==='passed' && !session.loadTest.active?'Position driver at released tail':knot.phase==='between'?(knot.sequence?.technique==='sliding'&&knot.throws===1?'Next same-direction throw':'Next opposing throw'):knot.phase==='tail'?'Position driver at tail':'Begin knot tying';
    (document.querySelector('.grip-settings') as HTMLElement).hidden=knot.active || session.freeKnot.active || session.positioningSkin;
    (document.querySelector('#free-note') as HTMLElement).hidden=!session.freeKnot.active;
    (document.querySelector('#knot-note') as HTMLElement).hidden=!knot.active;
    needle.root.updateWorldMatrix(true,false);
    knotView.update(knot,tools,session.wound.deformPoint(session.pass.entry),session.wound.deformPoint(session.pass.exit),needle.points[0].clone().applyMatrix4(needle.root.matrixWorld),session.knotSlack,session.pass.halfWidth);
    const exercise=session.placement; const pose=needle.getTipPose(); guide.update(pose.position,exercise);
    const title=document.querySelector('#exercise-title')!;
    const pass=session.pass; passGuide.update(pass); if(session.canPlanBites)passGuide.root.visible=true; if(!showNeedleGuide.checked || knot.active || session.freeKnot.active) passGuide.root.visible=false;
    (document.querySelector('#begin-pass') as HTMLButtonElement).disabled=!session.canBeginPass;
    document.querySelector('#begin-pass')!.textContent=session.preparingEdge?'Begin needle pass':'Start guided pass';
    document.querySelector('#position-forceps')!.textContent=session.positioningSkin?'Position forceps at skin edge':'Position forceps';
    const pull=session.pull;
    (document.querySelector('#position-forceps') as HTMLButtonElement).disabled=!session.canPositionForceps;
    const selectedLocal=session.selectedGripPoint;
    graspGuide.update(grasp,selectedLocal,session.canPositionForceps); graspGuide.root.visible=!knot.active && !session.freeKnot.active && !edge.held && !session.positioningSkin;
    const selectedWorld=selectedLocal.clone().applyMatrix4(needle.root.matrixWorld);
    handoffGuide.update(selectedWorld,!edge.held && pass.phase==='complete' && pull.phase==='waiting',grasp.candidate?.kind==='forceps' || !!grasp.receiver);
    guide.root.visible=!edge.held && !session.preparingEdge && !session.freeKnot.active && !knot.active && (pass.phase==='idle' || pass.phase==='interrupted');
    freeView.update(session.freeKnot);
    needle.root.visible=!course.finished;
    if(course.finished){freeView.root.visible=knotView.root.visible=passGuide.root.visible=guide.root.visible=graspGuide.root.visible=handoffGuide.root.visible=edgeMarker.visible=false;}
    const message=session.knotSlack.trimmed?(assessment.complete?'Tails trimmed · Stitch exercise complete':`Tails trimmed: ${session.knotSlack.trimmedTails.size}/2 · Position scissors at the other tail`):tractionAlert?(pass.phase==='passing'?'Pass paused · ':'')+edge.instruction:edge.held && !session.preparingEdge && pass.phase==='idle'? (edge.ready?'Skin edge everted · Move freely or open X to release':'Skin edge held · Lift E to evert · Open X to release'):session.preparingEdge?edge.instruction:pass.phase==='passing'&&session.oppositeEdgeRequired?session.oppositeEdgeInstruction:pass.phase==='passing' && !edge.ready?'Pass paused · Regrasp and evert the skin edge to continue':pass.phase==='complete' && pull.phase==='waiting' && edge.held?'Needle emerged · Open left forceps with X to release the skin, then Position forceps':session.freeKnot.active?'Free tying lab · Move either instrument freely · Close near thread to grasp; open to release':knot.active?(tools[0].openness>0.2 && knot.phase!=='complete' && knot.phase!=='between'?'Close left forceps with Z to hold the long strand':session.loadTest.active?session.loadTest.instruction:knot.phase==='complete'?session.releaseCheck.instruction:knot.instruction):pull.phase==='complete'?'Needle curved fully through ✓ · Click Begin knot tying':pull.phase==='pulling'?(grasp.holder?.kind==='forceps'?'Hold R to follow the curve · Y reverses · Shift for precision':'Extraction paused · Regrasp with left forceps to continue'):pass.phase==='complete'?(grasp.receiver?'Left grip ready · Open right driver with period':grasp.holder?.kind==='needle-driver'?grasp.candidate?.kind==='forceps'?'Needle body in reach · Hold Z to close left forceps':'Click Position forceps, then hold Z and open the driver with period':'Grasp the exposed needle body with left forceps (Z)'):pass.phase==='passing'?'Follow the arc · U advances / O reverses · Shift for precision':pass.phase==='interrupted'?'Pass interrupted · Click Start guided pass to restart':'Click Start guided pass · First grasp and evert the right skin edge';
    if(title.textContent!==message) title.textContent=message;
    (document.querySelector('#exercise-title') as HTMLElement).dataset.passSupport=pass.phase==='passing'?(session.oppositeEdgeRequired?(session.oppositeEdgeReady?'aligned':'opposite'):'entry'):'idle';
    document.querySelector('#exercise-readout')!.textContent=session.preparingEdge || (pass.phase==='passing' && edge.active)?`Skin edge: ${edge.held?'held':'released'} · ${session.oppositeEdgeRequired&&pass.phase==='passing'?session.oppositeEdgeInstruction:edge.ready?'Eversion ready':tractionAlert?edge.instruction:edge.held?'Lift gently with E':'Close Z near the edge, then lift with E'} · ${session.preparingEdge?'Needle stays right → left':`Assisted pass: ${Math.round(pass.progress*100)}% · Dermal purchase: ${session.wound.dermalBiteCount}/2`}`:session.freeKnot.active?`Forceps: ${edge.held?'holding skin edge':session.freeKnot.grips.has('left')?'holding '+session.freeKnot.gripLabel('left'):'free'} · Driver: ${session.freeKnot.grips.has('right')?'holding '+session.freeKnot.gripLabel('right'):'free'} · Contact winding: ${session.freeKnot.winding.toFixed(2)} turns · ${session.freeKnot.driverOnTissue?'Driver at tissue surface · ':''} ${session.freeKnot.instruction} · ${handlingHint} · ${session.freeKnot.reachLimited?'Thread at reach limit':'Physical strand handling'}${session.freeKnot.retainedThrow.active?' · Tightening: '+Math.round(session.freeKnot.retainedThrow.tightness*100)+'%':''}`:knot.active?`${knot.throws} / ${knot.targetThrows} throws seated · Dermal purchase: ${session.wound.dermalBiteCount}/2 · ${knot.threadState}${session.knotSlack.enabled?' · '+session.knotSlack.state+' · '+(session.knotSlack.material.friction.state==='holding'?'Sliding held':session.knotSlack.material.friction.state==='sliding'?'Sliding resisted':'Thread feeds freely'):''}${session.loadTest.active?' · Pull load: '+session.loadTest.load.toFixed(2)+' (relative) · Slip: '+session.loadTest.slip.toFixed(3):''}${knot.phase==='complete'?' · Release check: '+session.releaseCheck.state:''} · ${session.wound.closure>0.95?'Local wound edges approximated':session.wound.closure>0.05?'Wound edges drawing together':'Wound edges open'}`:pull.phase!=='waiting'?`Needle rotation: ${Math.round(pull.angle*180/Math.PI)}° / ${Math.round(pull.totalAngle*180/Math.PI)}° · ${needle.threadGuide.state}`:pass.phase==='passing' || pass.phase==='complete'?`Assisted pass: ${Math.round(pass.progress*100)}% · Right entry → left exit · Open jaws to abort`:'First evert the right skin edge · Optional forceps positioning available';
    if(session.freeKnot.active)document.querySelector('#exercise-readout')!.textContent+=` · Dermal purchase: ${session.wound.dermalBiteCount}/2 · ${session.wound.closure>.95?'Local wound edges approximated':session.wound.closure>.05?'Wound edges drawing together':'Wound edges open'}`;
    if(input.scissorsActive||cutFeedback)document.querySelector('#exercise-readout')!.textContent+=` · ${input.scissorsActive?'Scissors: arrows / N M / I K J L U O · comma closes · period opens · ':''}${cutFeedback}`;
    (document.querySelector('#placement-progress') as HTMLProgressElement).value=session.preparingEdge?Math.min(1,Math.max(0,edge.lift/0.09)):session.freeKnot.active?0:session.loadTest.active?session.loadTest.held/1.5:knot.phase==='complete'?(session.releaseCheck.state==='waiting'?0:session.releaseCheck.elapsed/session.releaseCheck.duration):knot.active?knot.progress:pull.phase!=='waiting'?pull.progress:pass.phase==='passing' || pass.phase==='complete'?pass.progress:0;
    document.querySelector('#progress-label')!.textContent=session.preparingEdge?'Skin edge eversion':session.freeKnot.active?'Free thread handling':session.loadTest.active?'Gentle load hold':knot.phase==='complete'?'Release hold check':knot.active?(knot.phase==='wrapping'?'Loop progress':knot.phase==='seating'?'Seating progress':'Throw progress'):pull.phase!=='waiting'?'Needle & thread pull-through':pass.phase==='passing' || pass.phase==='complete'?'Tissue pass progress':'Guided pass progress';
    if(pass.phase==='passing'&&session.oppositeEdgeRequired)(document.querySelector('#position-forceps') as HTMLButtonElement).textContent='Position forceps at opposite edge';
    const status=document.querySelector('#grasp-status')!; const statusText=tractionAlert?edge.instruction:pass.phase==='passing'&&session.oppositeEdgeRequired?session.oppositeEdgeInstruction:session.preparingEdge || edge.held?`Forceps: ${edge.held?'holding skin edge':'ready to grasp skin'} · ${edge.ready?'Edge everted':'Lift E to evert · X releases'}`:session.freeKnot.active?'Free movement · Start holds the long tail in the forceps · Driver can grasp nearby thread':session.loadTest.active?`Forceps: released · Driver: ${tools[1].openness<=0.2?'holding test tail':'open'} · Guided pull check`:knot.phase==='complete'?`Forceps: ${session.releaseCheck.leftReleased?'released':'holding'} · Driver: ${session.releaseCheck.rightReleased?'released':'holding'} · Release-and-hold check`:knot.active?'Forceps: long strand · Driver: short tail · Follow the stage prompts':grasp.status; if(status.textContent!==statusText) status.textContent=statusText; if(session.environment.id==='microsurgery')for(const selector of ['#exercise-title','#exercise-readout','#grasp-status','#position-forceps']){
      const element=document.querySelector(selector)!;element.textContent=element.textContent!.replaceAll('Skin edge','Vessel edge').replaceAll('skin edge','vessel edge').replaceAll('Dermal purchase','Wall purchase');
    } view.controls.update(); view.renderer.render(view.scene,view.camera); tools.forEach(tool=>{(document.querySelector(`#${tool.id}-jaw`) as HTMLMeterElement).value=tool.id==='right'&&input.scissorsActive?scissors.openness:tool.openness;});});
  window.addEventListener('pagehide',()=>{input.dispose(); view.renderer.setAnimationLoop(null);});
} catch(error) { document.querySelector('#error')!.textContent='The 3D workspace could not start. Please use a browser with WebGL enabled.'; console.error(error); }
