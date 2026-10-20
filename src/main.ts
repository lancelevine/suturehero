import { KnotView } from './scene/KnotView';
import { GraspGuide } from './scene/GraspGuide';
import { HandoffGuide } from './scene/HandoffGuide';
import { PassGuide } from './scene/PassGuide';
import { PlacementGuide } from './scene/PlacementGuide';
import './style.css';
import { createScene } from './scene/createScene';
import { Instrument } from './instruments/Instrument';
import { KeyboardInput } from './input/KeyboardInput';
import { TissuePatch } from './tissue/TissuePatch';
import { SutureModel } from './suture/SutureModel';
import { NeedleGrasp } from './suture/NeedleGrasp';
import { PracticeSession } from './gameplay/PracticeSession';
const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=`
<header><a class="brand" href="./"><span class="brand-icon">✳</span> SUTURE<span class="muted">HERO</span></a><span class="lab">THE PRACTICE LAB <span class="version">BUILD 0.16</span></span><span class="status"><i></i> Sandbox active</span></header>
<main><aside><div class="eyebrow">01 / FOUNDATIONS</div><h1>A steady hand.<br>A better stitch.</h1><p class="intro">Your surgical skills start here. Explore the workspace and get a feel for your instruments.</p><div class="lesson"><span class="tag">FREE PRACTICE</span><h2>Pass & tie</h2><p>Click Start guided pass to load the driver at the right entry point. Hold U to pass right to left. Choose a grip point, click Position forceps, close Z, then open the driver with period. Hold R to continue the needle’s curve; Y reverses. After extraction, begin guided knot tying and follow the prompts.</p><div class="rule"></div><div class="objective"><span>◉</span><div>Simple interrupted suture<small>Guided pass + two opposing throws</small></div></div></div><div class="steps"><div class="active"><b>01</b><span>Start guided pass<small>Needle loads automatically</small></span></div><div><b>02</b><span>Follow the needle curve<small>No angle or hold test</small></span></div><div><b>03</b><span>Drive through tissue<small>Right → left · U forward / O back</small></span></div><div><b>04</b><span>Transfer & pull through<small>Left Z · right period · left R</small></span></div></div><div class="notice">RESEARCH PROTOTYPE<p>For exploration only. Not a clinical training or assessment tool.</p></div></aside>
<section class="workspace"><div class="scene-heading"><div><span class="eyebrow">WORKSPACE</span><h2>Simple interrupted suture</h2></div><span class="scene-tag">3D SANDBOX</span></div><div id="viewport" aria-label="Interactive 3D surgical workspace"><div class="scene-label"><i></i> LIVE VIEW <span>•</span> TISSUE PAD 01</div><div class="legend"><span><i class="left-dot"></i> Left forceps</span><span><i class="right-dot"></i> Right needle driver</span></div><div class="camera-hint">Drag to orbit · Scroll to zoom</div><div id="error" role="alert"></div></div><div class="toolbar"><span><i></i> Guided stitch <small id="grasp-status" role="status">Click Start guided pass when ready</small></span><div><button id="begin-pass" >Start guided pass</button><button id="position-forceps" disabled>Position forceps</button><button id="knot-action" disabled>Begin knot tying</button><button id="close-up" aria-pressed="false">Close-up view</button><button id="camera">↺ Reset view</button><button id="reset">Reset practice</button></div></div><div class="exercise-feedback"><div><strong id="exercise-title" role="status">Ready to start</strong><span id="exercise-readout">Entry is automatically aligned on the right.</span></div><div class="hold-progress"><label for="placement-progress"><span id="progress-label">Guided pass progress</span></label><progress id="placement-progress" max="1" value="0"></progress></div></div><div class="knot-note" id="knot-note" hidden>Guided knot practice · Loop, grasp the short tail, then pull opposite ends. First-throw slack is simulated; wrapping and wound closure remain guided. Physical tension and knot security are not simulated.</div><div class="grip-settings"><label for="grip-point">Forceps grip position <span id="grip-label">10% behind tip</span></label><input id="grip-point" type="range" min="82" max="100" value="90" step="1"><p>Purple ring: selected assist point · Green: reachable grip · Gold: held point. Move manually to choose another exposed point.</p></div><section class="controls"><div class="controls-title"><h2>Take control</h2><span>Both instruments respond simultaneously</span></div><div class="control-grid"><article><h3><i class="left-dot"></i> Left forceps <span>01</span></h3><dl><div><dt>Move across pad</dt><dd>W A S D</dd></div><div><dt>Raise / lower</dt><dd>E / Q</dd></div><div><dt>Pitch · yaw · roll</dt><dd>T G · F H · R Y</dd></div><div><dt>Close / open jaws</dt><dd>Z / X</dd></div></dl><div class="jaw"><span>Jaw opening</span><meter id="left-jaw" min="0" max="1" value="0.65"></meter></div></article><article><h3><i class="right-dot"></i> Right needle driver <span>02</span></h3><dl><div><dt>Move across pad</dt><dd>↑ ← ↓ →</dd></div><div><dt>Raise / lower</dt><dd>PgUp / PgDn</dd></div><div><dt>Pitch · yaw · roll</dt><dd>I K · J L · U O</dd></div><div><dt>Close / open jaws</dt><dd>, / .</dd></div></dl><div class="jaw"><span>Jaw opening</span><meter id="right-jaw" min="0" max="1" value="0.65"></meter></div></article></div><p class="tip">↳ Open X (left) or period (right) to release. Hold Shift for 20% speed. Blue tip + ground projection show depth. Hold keys for continuous motion. Rotation pivots at the instrument tip. Position forceps is an optional positioning aid; the purple ring selects a body grip; the blue sphere shows the assist range. During the assisted pass, right-tool movement follows the circular guide; U / O drive it. After handoff, R / Y continue the same circular needle path. For knot tying, follow the prompted wrap and pull keys. Keyboard required.</p></section></section></main><footer><span>SUTURE HERO / An open practice space</span><span>Precision takes practice.</span></footer>`;
try {
  const view=createScene(document.querySelector('#viewport')!);
  const tools=[new Instrument('left',0x65d8c1),new Instrument('right',0xe4b16e)];
  const needle=new SutureModel(); const grasp=new NeedleGrasp(needle);
  const tissue=new TissuePatch();
  view.scene.add(tissue.root,needle.root,...tools.map(tool=>tool.root));
  const input=new KeyboardInput(); const session=new PracticeSession(input,tools,grasp);
  const knotView=new KnotView(); view.scene.add(knotView.root);
  document.querySelector('#knot-action')!.addEventListener('click',()=>session.knotAction());
  const guide=new PlacementGuide(session.placement.target); view.scene.add(guide.root);
  const graspGuide=new GraspGuide(); view.scene.add(graspGuide.root);
  document.querySelector('#grip-point')!.addEventListener('input',event=>{
    session.gripFraction=Number((event.target as HTMLInputElement).value)/100;
    document.querySelector('#grip-label')!.textContent=`${Math.round((1-session.gripFraction)*100)}% behind tip`;
  });
  let closeUp=false;
  const closeUpButton=document.querySelector('#close-up') as HTMLButtonElement;
  closeUpButton.addEventListener('click',()=>{
    closeUp=!closeUp; closeUpButton.setAttribute('aria-pressed',String(closeUp)); closeUpButton.textContent=closeUp?'Wide view':'Close-up view';
    if(closeUp) view.closeUp(needle.getTipPose().position); else view.resetCamera();
  });
  const handoffGuide=new HandoffGuide(); view.scene.add(handoffGuide.root);
  document.querySelector('#position-forceps')!.addEventListener('click',()=>session.positionForceps());
  const passGuide=new PassGuide(session.pass); view.scene.add(passGuide.root);
  document.querySelector('#begin-pass')!.addEventListener('click',()=>session.beginPass());
  document.querySelector('#reset')!.addEventListener('click',()=>session.reset());
  document.querySelector('#camera')!.addEventListener('click',()=>{closeUp=false; closeUpButton.setAttribute('aria-pressed','false'); closeUpButton.textContent='Close-up view'; view.resetCamera();});
  let last=performance.now();
  view.renderer.setAnimationLoop((time)=>{session.update((time-last)/1000); last=time; tissue.update(session.wound);
    const knot=session.knot;
    const knotAction=document.querySelector('#knot-action') as HTMLButtonElement;
    knotAction.disabled=!session.canKnotAction;
    knotAction.textContent=knot.phase==='between'?'Next opposing throw':knot.phase==='tail'?'Position driver at tail':'Begin knot tying';
    (document.querySelector('.grip-settings') as HTMLElement).hidden=knot.active;
    (document.querySelector('#knot-note') as HTMLElement).hidden=!knot.active;
    needle.root.updateWorldMatrix(true,false);
    knotView.update(knot,tools,session.wound.deformPoint(session.pass.entry),session.wound.deformPoint(session.pass.exit),needle.points[0].clone().applyMatrix4(needle.root.matrixWorld),session.knotSlack);
    const exercise=session.placement; const pose=needle.getTipPose(); guide.update(pose.position,exercise);
    const title=document.querySelector('#exercise-title')!;
    const pass=session.pass; passGuide.update(pass); if(knot.active) passGuide.root.visible=false;
    (document.querySelector('#begin-pass') as HTMLButtonElement).disabled=!session.canBeginPass;
    const pull=session.pull;
    (document.querySelector('#position-forceps') as HTMLButtonElement).disabled=!session.canPositionForceps;
    const selectedLocal=session.selectedGripPoint;
    graspGuide.update(grasp,selectedLocal,session.canPositionForceps); graspGuide.root.visible=!knot.active;
    const selectedWorld=selectedLocal.clone().applyMatrix4(needle.root.matrixWorld);
    handoffGuide.update(selectedWorld,pass.phase==='complete' && pull.phase==='waiting',grasp.candidate?.kind==='forceps' || !!grasp.receiver);
    guide.root.visible=!knot.active && (pass.phase==='idle' || pass.phase==='interrupted');
    const message=knot.active?(tools[0].openness>0.2 && knot.phase!=='complete' && knot.phase!=='between'?'Close left forceps with Z to hold the long strand':knot.instruction):pull.phase==='complete'?'Needle curved fully through ✓ · Click Begin knot tying':pull.phase==='pulling'?(grasp.holder?.kind==='forceps'?'Hold R to follow the curve · Y reverses · Shift for precision':'Extraction paused · Regrasp with left forceps to continue'):pass.phase==='complete'?(grasp.receiver?'Left grip ready · Open right driver with period':grasp.holder?.kind==='needle-driver'?grasp.candidate?.kind==='forceps'?'Needle body in reach · Hold Z to close left forceps':'Click Position forceps, then hold Z and open the driver with period':'Grasp the exposed needle body with left forceps (Z)'):pass.phase==='passing'?'Follow the arc · U advances / O reverses · Shift for precision':pass.phase==='interrupted'?'Pass interrupted · Click Start guided pass to restart':'Click Start guided pass · The needle is loaded and aligned for you';
    if(title.textContent!==message) title.textContent=message;
    document.querySelector('#exercise-readout')!.textContent=knot.active?`${knot.throws} / 2 opposing throws seated · ${knot.threadState}${session.knotSlack.enabled?' · '+session.knotSlack.state:''} · ${session.wound.closure>0.95?'Local wound edges approximated':session.wound.closure>0.05?'Wound edges drawing together':'Wound edges open'}`:pull.phase!=='waiting'?`Needle rotation: ${Math.round(pull.angle*180/Math.PI)}° / ${Math.round(pull.totalAngle*180/Math.PI)}° · ${needle.threadGuide.state}`:pass.phase==='passing' || pass.phase==='complete'?`Assisted pass: ${Math.round(pass.progress*100)}% · Right entry → left exit · Open jaws to abort`:'No alignment test · Start loads the needle at the right entry';
    (document.querySelector('#placement-progress') as HTMLProgressElement).value=knot.active?knot.progress:pull.phase!=='waiting'?pull.progress:pass.phase==='passing' || pass.phase==='complete'?pass.progress:0;
    document.querySelector('#progress-label')!.textContent=knot.active?(knot.phase==='wrapping'?'Loop progress':knot.phase==='seating'?'Seating progress':'Throw progress'):pull.phase!=='waiting'?'Needle & thread pull-through':pass.phase==='passing' || pass.phase==='complete'?'Tissue pass progress':'Guided pass progress';
    const status=document.querySelector('#grasp-status')!; const statusText=knot.active?'Forceps: long strand · Driver: short tail · Follow the stage prompts':grasp.status; if(status.textContent!==statusText) status.textContent=statusText; view.controls.update(); view.renderer.render(view.scene,view.camera); tools.forEach(tool=>{(document.querySelector(`#${tool.id}-jaw`) as HTMLMeterElement).value=tool.openness;});});
  window.addEventListener('pagehide',()=>{input.dispose(); view.renderer.setAnimationLoop(null);});
} catch(error) { document.querySelector('#error')!.textContent='The 3D workspace could not start. Please use a browser with WebGL enabled.'; console.error(error); }
