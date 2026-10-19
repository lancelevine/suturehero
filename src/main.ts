import { PassGuide } from './scene/PassGuide';
import { PlacementGuide } from './scene/PlacementGuide';
import './style.css';
import { createScene } from './scene/createScene';
import { Instrument } from './instruments/Instrument';
import { KeyboardInput } from './input/KeyboardInput';
import { createTissuePatch } from './tissue/TissuePatch';
import { SutureModel } from './suture/SutureModel';
import { NeedleGrasp } from './suture/NeedleGrasp';
import { PracticeSession } from './gameplay/PracticeSession';
const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=`
<header><a class="brand" href="./"><span class="brand-icon">✳</span> SUTURE<span class="muted">HERO</span></a><span class="lab">THE PRACTICE LAB <span class="version">BUILD 0.4</span></span><span class="status"><i></i> Sandbox active</span></header>
<main><aside><div class="eyebrow">01 / FOUNDATIONS</div><h1>A steady hand.<br>A better stitch.</h1><p class="intro">Your surgical skills start here. Explore the workspace and get a feel for your instruments.</p><div class="lesson"><span class="tag">FREE PRACTICE</span><h2>First tissue pass</h2><p>Grasp with the right needle driver. Bring the blue needle tip to the gold target, point it downward, and hold steady for one second. Engage the assisted pass (it aligns the needle plane to the guide), then use U to advance or O to reverse.</p><div class="rule"></div><div class="objective"><span>◉</span><div>Simple interrupted suture<small>Future milestone · interaction & physics</small></div></div></div><div class="steps"><div class="active"><b>01</b><span>Pick up the needle<small>Close Z (left) or comma (right)</small></span></div><div><b>02</b><span>Align the needle tip<small>Gold ring · downward direction</small></span></div><div><b>03</b><span>Drive through tissue<small>Assisted arc · U forward / O back</small></span></div></div><div class="notice">RESEARCH PROTOTYPE<p>For exploration only. Not a clinical training or assessment tool.</p></div></aside>
<section class="workspace"><div class="scene-heading"><div><span class="eyebrow">WORKSPACE</span><h2>Simple interrupted suture</h2></div><span class="scene-tag">3D SANDBOX</span></div><div id="viewport" aria-label="Interactive 3D surgical workspace"><div class="scene-label"><i></i> LIVE VIEW <span>•</span> TISSUE PAD 01</div><div class="legend"><span><i class="left-dot"></i> Left forceps</span><span><i class="right-dot"></i> Right needle driver</span></div><div class="camera-hint">Drag to orbit · Scroll to zoom</div><div id="error" role="alert"></div></div><div class="toolbar"><span><i></i> Needle placement <small id="grasp-status" role="status">Bring open jaws to the needle</small></span><div><button id="begin-pass" disabled>Begin assisted pass</button><button id="camera">↺ Reset view</button><button id="reset">Reset practice</button></div></div><div class="exercise-feedback"><div><strong id="exercise-title" role="status">Pick up with the needle driver</strong><span id="exercise-readout">Bring the blue tip to the gold ring.</span></div><div class="hold-progress"><label for="placement-progress"><span id="progress-label">Steady hold · 1 second</span></label><progress id="placement-progress" max="1" value="0"></progress></div></div><section class="controls"><div class="controls-title"><h2>Take control</h2><span>Both instruments respond simultaneously</span></div><div class="control-grid"><article><h3><i class="left-dot"></i> Left forceps <span>01</span></h3><dl><div><dt>Move across pad</dt><dd>W A S D</dd></div><div><dt>Raise / lower</dt><dd>E / Q</dd></div><div><dt>Pitch · yaw · roll</dt><dd>T G · F H · R Y</dd></div><div><dt>Close / open jaws</dt><dd>Z / X</dd></div></dl><div class="jaw"><span>Jaw opening</span><meter id="left-jaw" min="0" max="1" value="0.65"></meter></div></article><article><h3><i class="right-dot"></i> Right needle driver <span>02</span></h3><dl><div><dt>Move across pad</dt><dd>↑ ← ↓ →</dd></div><div><dt>Raise / lower</dt><dd>PgUp / PgDn</dd></div><div><dt>Pitch · yaw · roll</dt><dd>I K · J L · U O</dd></div><div><dt>Close / open jaws</dt><dd>, / .</dd></div></dl><div class="jaw"><span>Jaw opening</span><meter id="right-jaw" min="0" max="1" value="0.65"></meter></div></article></div><p class="tip">↳ Open X (left) or period (right) to release. Hold Shift for 20% speed. Blue tip + ground projection show depth. Hold keys for continuous motion. Rotation pivots at the instrument tip. During the assisted pass, right-tool movement follows the circular guide; U / O drive it. Keyboard required.</p></section></section></main><footer><span>SUTURE HERO / An open practice space</span><span>Precision takes practice.</span></footer>`;
try {
  const view=createScene(document.querySelector('#viewport')!);
  const tools=[new Instrument('left',0x65d8c1),new Instrument('right',0xe4b16e)];
  const needle=new SutureModel(); const grasp=new NeedleGrasp(needle);
  view.scene.add(createTissuePatch(),needle.root,...tools.map(tool=>tool.root));
  const input=new KeyboardInput(); const session=new PracticeSession(input,tools,grasp);
  const guide=new PlacementGuide(session.placement.target); view.scene.add(guide.root);
  const passGuide=new PassGuide(session.pass); view.scene.add(passGuide.root);
  document.querySelector('#begin-pass')!.addEventListener('click',()=>session.beginPass());
  document.querySelector('#reset')!.addEventListener('click',()=>session.reset());
  document.querySelector('#camera')!.addEventListener('click',view.resetCamera);
  let last=performance.now();
  view.renderer.setAnimationLoop((time)=>{session.update((time-last)/1000); last=time;
    const exercise=session.placement; const pose=needle.getTipPose(); guide.update(pose.position,exercise);
    const title=document.querySelector('#exercise-title')!;
    const pass=session.pass; passGuide.update(pass);
    (document.querySelector('#begin-pass') as HTMLButtonElement).disabled=!session.canBeginPass;
    const message=pass.phase==='complete'?'Tissue pass complete ✓ · Thread pull-through comes next':pass.phase==='passing'?'Follow the arc · U advances / O reverses · Shift for precision':pass.phase==='interrupted'?'Pass interrupted · Reset practice or realign and regrasp':session.canBeginPass?'Aligned ✓ · Click Begin assisted pass':!grasp.holder?'Pick up with the needle driver':grasp.holder.kind!=='needle-driver'?'Transfer to the right needle driver':exercise.progress>0?'Aligned · hold steady':'Align blue tip with gold ring, pointing downward';
    if(title.textContent!==message) title.textContent=message;
    document.querySelector('#exercise-readout')!.textContent=pass.phase==='passing' || pass.phase==='complete'?`Assisted pass: ${Math.round(pass.progress*100)}% · Gold entry → blue exit · Open jaws to abort`:`Distance: ${exercise.distance.toFixed(2)} / 0.12 units · Angle: ${exercise.angle.toFixed(0)}° / 20°`;
    (document.querySelector('#placement-progress') as HTMLProgressElement).value=pass.phase==='passing' || pass.phase==='complete'?pass.progress:exercise.progress;
    document.querySelector('#progress-label')!.textContent=pass.phase==='passing' || pass.phase==='complete'?'Tissue pass progress':'Steady hold · 1 second';
    const status=document.querySelector('#grasp-status')!; if(status.textContent!==grasp.status) status.textContent=grasp.status; view.controls.update(); view.renderer.render(view.scene,view.camera); tools.forEach(tool=>{(document.querySelector(`#${tool.id}-jaw`) as HTMLMeterElement).value=tool.openness;});});
  window.addEventListener('pagehide',()=>{input.dispose(); view.renderer.setAnimationLoop(null);});
} catch(error) { document.querySelector('#error')!.textContent='The 3D workspace could not start. Please use a browser with WebGL enabled.'; console.error(error); }
