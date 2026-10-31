import {instrumentCalibration,type Axis} from '../input/InstrumentCalibration';
import {BALL_INSTRUMENTS,type BallInstrumentName} from '../input/ballTrackingSlots';
const names={forceps:'Forceps',needleDriver:'Needle driver',scissors:'Scissors'};
const mounted=new WeakMap<HTMLElement,InstrumentCalibrationPanel>();
export function mountCalibrationPanel(host:HTMLElement){let p=mounted.get(host);if(!p){p=new InstrumentCalibrationPanel(host);mounted.set(host,p);}return p;}
export class InstrumentCalibrationPanel {
 private selected:BallInstrumentName='forceps';private pane='pose';private jaws?:HTMLElement;private guideStep=-1;private guideSamples:(number[]|null)[]=[null,null];
 constructor(private host:HTMLElement){
  this.render();host.addEventListener('click',e=>this.click(e));host.addEventListener('input',e=>this.input(e));host.addEventListener('change',e=>this.change(e));
  setInterval(()=>{const button=host.querySelector<HTMLButtonElement>('[data-neutral]');if(button)button.disabled=!instrumentCalibration.hasFreshPose(this.selected);const status=host.querySelector('[data-pose-status]');const text=instrumentCalibration.hasFreshPose(this.selected)?'Marker tracked · ready to set neutral':'Show this instrument’s marker to set neutral';if(status&&status.textContent!==text)status.textContent=text;this.updateGuide();},300);
 }
 attachJawControls(element:HTMLElement){this.jaws=element;this.placeJaws();}
 private placeJaws(){const target=this.host.querySelector('[data-jaw-host]');if(target&&this.jaws){target.append(this.jaws);if(this.jaws instanceof HTMLDetailsElement)this.jaws.open=true;const select=this.jaws.querySelector<HTMLSelectElement>('#ball-instrument');if(select){select.value=this.selected;select.dispatchEvent(new Event('change'));select.closest('label')?.classList.add('calibration-original-selector');}}}
 private render(){
  const p=instrumentCalibration.profile(this.selected),axisNames=['X · left/right','Y · up/down','Z · depth'];
  const axes=(kind:'translation'|'rotation')=>`<table class="calibration-axis-table"><thead><tr><th>Virtual axis</th><th>Camera input</th><th>Invert</th></tr></thead><tbody>${axisNames.map((label,i)=>`<tr><td>${label}</td><td><select data-axis="${kind}" data-index="${i}" aria-label="${kind} ${label}">${axisNames.map((text,j)=>`<option value="${j}" ${p[`${kind}Axes`][i]===j?'selected':''}>${text}</option>`).join('')}</select></td><td><input type="checkbox" data-invert="${kind}" data-index="${i}" aria-label="Invert ${kind} ${label}" ${p[`${kind}Invert`][i]?'checked':''}></td></tr>`).join('')}</tbody></table>`;
  this.host.innerHTML=`<div class="calibration-heading"><h2>Instrument calibration</h2><small>Separate settings for each instrument.</small></div><div class="calibration-tools" role="group" aria-label="Instrument">${BALL_INSTRUMENTS.map(n=>`<button type="button" data-calibration-tool="${n}" aria-pressed="${n===this.selected}">${names[n]}</button>`).join('')}</div><div class="calibration-tabs" role="group" aria-label="Calibration settings">${['pose','jaws','axes'].map(n=>`<button type="button" data-calibration-pane="${n}" aria-pressed="${n===this.pane}">${n==='pose'?'Pose':n==='jaws'?'Jaws':'Axis mapping'}</button>`).join('')}</div><section class="calibration-body" data-calibration-section="pose" ${this.pane==='pose'?'':'hidden'}><div class="neutral-reference" role="group" aria-label="Neutral pose reference"><strong>Reference pose · ${names[this.selected]}</strong><svg viewBox="0 0 280 164" role="img" aria-label="Camera above, instrument tip pointing toward the operating field, tracker visible"><rect x="10" y="8" width="260" height="148" rx="12" fill="#f4f9f6" stroke="#d7e6db"/><rect x="110" y="17" width="60" height="22" rx="7" fill="#385b67"/><circle cx="140" cy="28" r="7" fill="#8fd5dc"/><text x="181" y="31" font-size="10" fill="#58736b">Camera</text><path d="M140 42v16" stroke="#7da89a" stroke-width="2" stroke-dasharray="3 4"/><g transform="rotate(-12 140 100)"><rect x="129" y="57" width="22" height="28" rx="4" fill="#e1f2eb" stroke="#39836d" stroke-width="2"/><path d="M134 62h12m-12 7h12m-12 7h12" stroke="#39836d" stroke-width="2"/><path d="M137 85v42m6-42v42" stroke="#456b7b" stroke-width="4" stroke-linecap="round"/><path d="M137 127l3 12 3-12" fill="#456b7b"/></g><path d="M63 142h154" stroke="#a6bcb1" stroke-width="3" stroke-linecap="round"/><text x="16" y="65" font-size="10" fill="#52786b">Tracker</text><path d="M55 68 125 71" stroke="#719c87" stroke-width="1.5"/><text x="17" y="131" font-size="10" fill="#52786b">Tip down</text><path d="M64 126 129 135" stroke="#719c87" stroke-width="1.5"/></svg><p class="calibration-hint">Hold the instrument comfortably near the center of the camera view, with its tip toward the work surface and its marker clearly visible. This drawing is a positioning guide, not a live alignment measurement. Hold still, then set neutral.</p></div><button type="button" class="primary-action" data-neutral disabled>⊕ Set neutral pose</button><p data-pose-status class="calibration-hint">Show this instrument’s marker to set neutral</p><div class="rotation-guide"><h3>Guided rotation calibration</h3><p class="calibration-hint">No axis guessing. Set neutral first, then follow the two outlines. Keep the marker in view and rotate the instrument, without translating it.</p><svg viewBox="0 0 280 145" role="img" aria-label="Target instrument outline for guided rotation"><rect width="280" height="145" rx="10" fill="#f5f8fa"/><g transform="translate(140 72)"><g data-guide-target transform="rotate(0)"><path d="M-9 -55L-9 37L0 55L9 37L9 -55" fill="none" stroke="#288b76" stroke-width="4" stroke-dasharray="6 4"/></g><g data-guide-live transform="rotate(0)"><path d="M-7 -55L-7 37L0 55L7 37L7 -55" fill="none" stroke="#385b78" stroke-width="3"/></g></g><text x="10" y="18" font-size="11" fill="#3c5b67">Green dashed = target · Blue = tracked</text></svg><p data-guide-instruction class="calibration-hint">Start by setting neutral, then click Begin guided calibration.</p><p data-guide-measure class="calibration-hint"></p><button type="button" data-guide-start>Begin guided calibration</button> <button type="button" data-guide-capture disabled>Capture this direction</button> <button type="button" data-guide-cancel>Cancel</button></div><h3>Mounting orientation</h3><div class="calibration-presets"><button type="button" data-mount="upright" aria-pressed="${p.mountingDegrees.every(n=>n===0)}">Upright</button><button type="button" data-mount="flip" aria-pressed="${p.mountingDegrees[0]===180&&p.mountingDegrees[1]===0&&p.mountingDegrees[2]===0}">Flip 180°</button><button type="button" data-mount="side" aria-pressed="${p.mountingDegrees[0]===0&&p.mountingDegrees[1]===0&&p.mountingDegrees[2]===90}">Sideways</button></div><label>Movement sensitivity <output data-gain-output="movementGain">${p.movementGain.toFixed(2)}×</output><input type="range" min="0.1" max="4" step=".05" value="${p.movementGain}" data-gain="movementGain"></label><label>Rotation sensitivity <output data-gain-output="rotationGain">${p.rotationGain.toFixed(2)}×</output><input type="range" min=".1" max="3" step=".05" value="${p.rotationGain}" data-gain="rotationGain"></label><label class="calibration-check"><span>Lock depth (one camera)</span><input type="checkbox" data-profile-check="depthLock" ${p.depthLock?'checked':''}></label><details><summary>Tip offset & fine adjustments</summary><p class="calibration-hint">Tip offsets use the marker’s local axes and practice units. These are independent of the measured physical tracker-to-tip distances.</p>${(['mountingDegrees','tipOffset'] as const).map(key=>`<fieldset><legend>${key==='tipOffset'?'Marker-frame tip offset (practice units)':'Mounting offsets (degrees)'}</legend><div class="calibration-numbers">${['X','Y','Z'].map((axis,i)=>`<label>${axis}<input type="number" min="${key==='tipOffset'?-2:-180}" max="${key==='tipOffset'?2:180}" step="${key==='tipOffset'?.01:1}" value="${p[key][i]}" data-vector="${key}" data-index="${i}"></label>`).join('')}</div></fieldset>`).join('')}</details></section><section class="calibration-body calibration-jaws" data-calibration-section="jaws" ${this.pane==='jaws'?'':'hidden'}><label class="calibration-check"><span>Reverse jaw opening</span><input type="checkbox" data-profile-check="jawInverted" ${p.jawInverted?'checked':''}></label><p class="calibration-hint">Ball colors and closed/open measurements belong to the current camera session.</p><div data-jaw-host>${this.jaws?'':'<p class="calibration-hint">Enable camera tracking to select ball colors and calibrate closed/open positions.</p>'}</div></section><section class="calibration-body" data-calibration-section="axes" ${this.pane==='axes'?'':'hidden'}><h3>Movement mapping</h3>${axes('translation')}<h3>Rotation mapping</h3>${axes('rotation')}<p class="calibration-hint">Each input axis is assigned once. Swapping a mapping updates its other assignment automatically.</p></section><div class="calibration-footer"><button type="button" class="primary-action" data-save>Save ${names[this.selected].toLowerCase()}</button><button type="button" data-reset>Reset</button><p data-calibration-message role="status">Changes preview immediately. Save keeps them in this browser.</p></div>`;
  this.placeJaws();
 }
 private message(text:string){this.host.querySelector('[data-calibration-message]')!.textContent=text;}
 private click(e:Event){const b=(e.target as HTMLElement).closest<HTMLButtonElement>('button');if(!b)return;
  if(b.dataset.calibrationTool){this.guideStep=-1;this.selected=b.dataset.calibrationTool as BallInstrumentName;this.render();return;}
  if(b.dataset.calibrationPane){this.guideStep=-1;this.pane=b.dataset.calibrationPane;this.render();return;}
  if(b.hasAttribute('data-guide-start')){
   if(!instrumentCalibration.captureNeutral(this.selected)){this.message('Show the marker and set neutral first.');return;}
   this.guideStep=0;this.guideSamples=[null,null];this.updateGuide();this.message('Guided calibration: tilt right as shown, then capture.');return;
  }
  if(b.hasAttribute('data-guide-cancel')){this.guideStep=-1;this.updateGuide();return;}
  if(b.hasAttribute('data-guide-capture')){this.captureGuide();return;}
  if(b.hasAttribute('data-neutral')){this.message(instrumentCalibration.captureNeutral(this.selected)?'Neutral pose set. Physical movement starts from this pose.':'A recent marker pose is needed.');return;}
  if(b.hasAttribute('data-save')){this.message(instrumentCalibration.save(this.selected)?'Profile saved in this browser.':'Browser storage is unavailable; settings remain active for this session.');return;}
  if(b.hasAttribute('data-reset')){instrumentCalibration.reset(this.selected);this.render();this.message('This instrument’s live settings were reset. Save to keep the reset.');return;}
  if(b.dataset.mount){instrumentCalibration.update(this.selected,{mountingDegrees:b.dataset.mount==='flip'?[180,0,0]:b.dataset.mount==='side'?[0,0,90]:[0,0,0]});this.render();this.message('Mounting orientation updated.');}
 }
 private updateGuide(){
  const target=this.host.querySelector<SVGGElement>('[data-guide-target]');
  if(!target)return;
  const instruction=this.host.querySelector('[data-guide-instruction]');
  const measurement=this.host.querySelector('[data-guide-measure]');
  const capture=this.host.querySelector<HTMLButtonElement>('[data-guide-capture]');
  const raw=instrumentCalibration.rawNeutralRotation(this.selected);
  const step=this.guideStep;
  target.setAttribute('transform','rotate('+(step===0?35:step===1?-35:0)+')');
  const live=this.host.querySelector<SVGGElement>('[data-guide-live]');
  // A schematic magnitude cue; raw axis mapping is deliberately not assumed.
  const magnitude=raw?Math.min(60,raw.length()*180/Math.PI):0;
  live?.setAttribute('transform','rotate('+(step===1?-magnitude:magnitude)+')');
  if(instruction)instruction.textContent=step===0?'Step 1 of 2: tilt the physical instrument to your RIGHT (~30–45°), keeping the tip roughly in place. Capture at the end.':step===1?'Step 2 of 2: return to neutral, then tilt FORWARD / away from you (~30–45°). Capture at the end.':step===2?'Both directions captured. Mapping applied; test X and Y rotation and Save.':'Set neutral and begin. Follow the green dashed outline for each tilt.';
  if(measurement)measurement.textContent=raw?'Detected rotation: '+(raw.length()*180/Math.PI).toFixed(0)+'° · raw axes '+raw.toArray().map(v=>(v*180/Math.PI).toFixed(0)+'°').join(' / '):'Waiting for marker tracking';
  if(capture)capture.disabled=step<0||step>1||!raw||raw.length()<.18;
 }
 private captureGuide(){
  const raw=instrumentCalibration.rawNeutralRotation(this.selected);
  if(this.guideStep<0||this.guideStep>1||!raw||raw.length()<.18){this.message('Tilt at least 10° with the marker visible before capturing.');return;}
  this.guideSamples[this.guideStep]=raw.toArray();
  if(this.guideStep===0){this.guideStep=1;this.updateGuide();return;}
  const [x,y]=this.guideSamples;
  if(!x||!y)return;
  // Choose distinct camera axes that maximize independent responses.
  let best=-Infinity,xi=0,yi=1;
  for(let i=0;i<3;i++)for(let j=0;j<3;j++)if(i!==j){
   const score=Math.abs(x[i])+Math.abs(y[j])-.65*(Math.abs(x[j])+Math.abs(y[i]));
   if(score>best){best=score;xi=i;yi=j;}
  }
  if(Math.abs(x[xi])<.15||Math.abs(y[yi])<.15){this.message('Directions were not distinct enough. Try again with larger, separate tilts.');this.guideStep=0;this.guideSamples=[null,null];this.updateGuide();return;}
  const zi=[0,1,2].find(i=>i!==xi&&i!==yi)!;
  const p=instrumentCalibration.profile(this.selected);
  p.rotationAxes=[xi,yi,zi] as [Axis,Axis,Axis];
  p.rotationInvert=[x[xi]<0,y[yi]<0,p.rotationInvert[2]];
  instrumentCalibration.update(this.selected,{rotationAxes:p.rotationAxes,rotationInvert:p.rotationInvert});
  this.guideStep=2;this.updateGuide();
  this.message('Rotation axes mapped automatically. Try tilting in both directions, then Save.');
 }
 private input(e:Event){const el=e.target as HTMLInputElement;if(el.dataset.gain){const key=el.dataset.gain as 'movementGain'|'rotationGain';instrumentCalibration.update(this.selected,{[key]:Number(el.value)});this.host.querySelector(`[data-gain-output="${key}"]`)!.textContent=Number(el.value).toFixed(2)+'×';this.message('Unsaved changes · previewing live');}}
 private change(e:Event){const el=e.target as HTMLInputElement|HTMLSelectElement,p=instrumentCalibration.profile(this.selected);
  if(el.dataset.profileCheck){const key=el.dataset.profileCheck as 'depthLock'|'jawInverted';instrumentCalibration.update(this.selected,{[key]:(el as HTMLInputElement).checked});this.message('Unsaved changes · previewing live');}
  if(el.dataset.vector){const key=el.dataset.vector as 'tipOffset'|'mountingDegrees',i=Number(el.dataset.index);const value=Number(el.value);if(!Number.isFinite(value))return;p[key][i]=value;instrumentCalibration.update(this.selected,{[key]:p[key]});}
  if(el.dataset.invert){const key=`${el.dataset.invert}Invert` as 'translationInvert'|'rotationInvert';p[key][Number(el.dataset.index)]=(el as HTMLInputElement).checked;instrumentCalibration.update(this.selected,{[key]:p[key]});}
  if(el.dataset.axis){const key=`${el.dataset.axis}Axes` as 'translationAxes'|'rotationAxes',i=Number(el.dataset.index),next=Number(el.value) as Axis,j=p[key].indexOf(next);[p[key][i],p[key][j]]=[p[key][j],p[key][i]];instrumentCalibration.update(this.selected,{[key]:p[key]});this.render();this.message('Axis mapping updated · unsaved');}
 }
}
