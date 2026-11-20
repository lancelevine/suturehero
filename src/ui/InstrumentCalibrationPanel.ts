import {latestStereoTips,stereoTipCalibration,TIP_READOUT_MAX_AGE_MS,tipsApartMm} from '../input/stereoTipCalibration';
import {TABLE_POINTS,tableHeight} from '../input/tableHeight';
import {ACCURACY_TOUCHES,tipAccuracyCheck,type AccuracyResult} from '../input/tipAccuracy';
/** Where the worst touch was relative to the others (camera-1 axes: x right, z away from Camera 1). */
function worstWhere(result:AccuracyResult):string{
 const mean=[0,1,2].map(i=>result.touches.reduce((sum,t)=>sum+t.at[i],0)/result.touches.length);
 const worst=result.touches[result.worstIndex].at,dx=worst[0]-mean[0],dz=worst[2]-mean[2];
 const parts=[Math.abs(dx)>20?(dx>0?'right':'left'):'',Math.abs(dz)>20?(dz>0?'far from Camera 1':'near Camera 1'):''].filter(Boolean);
 return parts.length?` (touch ${result.worstIndex+1}, toward the ${parts.join(', ')})`:` (touch ${result.worstIndex+1})`;
}
import {parseTrackerType,readStored,trackerTypeStorageKey} from '../input/trackingStorage';
import {cameraMode} from '../input/cameraDevices';
import {GuidedCalibration,guidedDirections,solveGuidedRotation} from '../input/GuidedCalibration';
import {CalibrationPreview} from './CalibrationPreview';
import {instrumentCalibration,type Axis} from '../input/InstrumentCalibration';
import {type BallInstrumentName} from '../input/ballTrackingSlots';
const calibrationOrder:readonly BallInstrumentName[]=['needleDriver','forceps','scissors'];
const names={forceps:'Forceps',needleDriver:'Needle driver',scissors:'Scissors'};
const mounted=new WeakMap<HTMLElement,InstrumentCalibrationPanel>();
export function mountCalibrationPanel(host:HTMLElement){let p=mounted.get(host);if(!p){p=new InstrumentCalibrationPanel(host);mounted.set(host,p);}return p;}
/** The tracking page's jaw-tracking state (hidden checkbox; shown to users as the Jaws tab switch). */
/** The selected marker tracker (tips are saved per tracker type). */
const currentTrackerType=()=>parseTrackerType(readStored(trackerTypeStorageKey(cameraMode())));
function jawTrackingCheckbox(){return document.querySelector<HTMLInputElement>('#ball-enable');}
export class InstrumentCalibrationPanel {
 private preview=new CalibrationPreview();
 private selected:BallInstrumentName='needleDriver';private tableNote='';private accuracyNote='';private pane='pose';private jaws?:HTMLElement;private guide?:GuidedCalibration;
 constructor(private host:HTMLElement){
  host.classList.add('instrument-calibration-panel');this.render();host.addEventListener('click',e=>this.click(e));host.addEventListener('input',e=>this.input(e));host.addEventListener('change',e=>this.change(e));
  setInterval(()=>{const button=host.querySelector<HTMLButtonElement>('[data-neutral]');if(button)button.disabled=!instrumentCalibration.hasFreshPose(this.selected);const status=host.querySelector('[data-pose-status]');const text=instrumentCalibration.hasFreshPose(this.selected)?'Marker tracked · ready to set neutral':'Show this instrument’s marker to set neutral';if(status&&status.textContent!==text)status.textContent=text;this.updateGuide();this.updateTip();},100);
 }
 /** Tip calibration status and the forceps–needle driver tip distance. */
 private updateTip(){
  const status=this.host.querySelector('[data-tip-status]'),apart=this.host.querySelector('[data-tips-apart]'),button=this.host.querySelector<HTMLButtonElement>('[data-tip-capture]');if(!status||!apart||!button)return;
  const capturing=stereoTipCalibration.capturing(this.selected),saved=stereoTipCalibration.saved(this.selected,currentTrackerType());
  const message=stereoTipCalibration.status();
  const text=capturing?message:saved?`Calibrated: tip ${Math.hypot(...saved.tip).toFixed(0)} mm from the ring centre (±${saved.rmsMm.toFixed(1)} mm)${saved.bodyToModel?' · jaw orientation set':' · jaw orientation not set'}. ${/not calibrated|jaw orientation|Hold the jaws/i.test(message)?message:''}`:(message&&/not calibrated|cancelled/i.test(message)?message+' ':'')+'Not calibrated: with both cameras tracking, press Calibrate tip, rest the tip on one spot and rock the instrument for 8 s.';
  if(status.textContent!==text)status.textContent=text;
  button.textContent=capturing?'Cancel':'Calibrate tip';
  const distance=tipsApartMm(performance.now());
  const apartText=distance===null?'Tips apart: calibrate both tips and track both instruments in stereo.':`Tips apart: ${distance.toFixed(1)} mm (touch the real tips together to check).`;
  if(apart.textContent!==apartText)apart.textContent=apartText;
  const table=this.host.querySelector('[data-table-status]');
  const pending=tableHeight.pendingTouches(),tableSet=tableHeight.points().length>=TABLE_POINTS;
  const tableText=pending?`Touch ${pending} of ${TABLE_POINTS} recorded · touch another spot on the table and press again.`:this.tableNote||(tableSet?'Table height set: the table is the skin surface.':`Not set: rest this instrument's calibrated tip on the table and press Record table touch at ${TABLE_POINTS} spots.`);
  if(table&&table.textContent!==tableText)table.textContent=tableText;
  const accuracy=this.host.querySelector('[data-accuracy-status]');
  const pendingTouches=tipAccuracyCheck.pending(),last=tipAccuracyCheck.lastResult();
  const accuracyText=pendingTouches.length?`Touch ${pendingTouches.length} of ${ACCURACY_TOUCHES}: ${pendingTouches.map(t=>t.distanceMm.toFixed(1)).join(', ')} mm · move to another spot and touch again.`:this.accuracyNote||(last?`Last check (${new Date(last.checkedAt).toLocaleString()}): touching tips ${last.meanMm.toFixed(1)} mm apart on average, worst ${last.worstMm.toFixed(1)} mm${worstWhere(last)}.`:`Not checked: touch the real tips together at ${ACCURACY_TOUCHES} spots around your workspace, pressing Record touch each time.`);
  if(accuracy&&accuracy.textContent!==accuracyText)accuracy.textContent=accuracyText;
 }
 attachJawControls(element:HTMLElement){this.jaws=element;this.placeJaws();}
 private placeJaws(){const target=this.host.querySelector('[data-jaw-host]');if(target&&this.jaws){target.append(this.jaws);if(this.jaws instanceof HTMLDetailsElement)this.jaws.open=true;const select=this.jaws.querySelector<HTMLSelectElement>('#ball-instrument');if(select){select.value=this.selected;select.dispatchEvent(new Event('change'));select.closest('label')?.classList.add('calibration-original-selector');}}}
 private render(){
  const p=instrumentCalibration.profile(this.selected);
  const movementLabels=['X · left/right','Y · up/down','Z · depth'];
  const rotationRows=[{axis:2,label:'Left/right tilt · about Z'},{axis:0,label:'Forward/back tilt · about X'},{axis:1,label:'Axial roll · about Y'}] as const;
  const axes=(kind:'translation'|'rotation')=>{
   const rows=kind==='translation'?movementLabels.map((label,axis)=>({label,axis})):rotationRows;
   const inputLabels=kind==='translation'?movementLabels:['Camera X rotation','Camera Y rotation','Camera Z rotation'];
   return `<table class="calibration-axis-table"><thead><tr><th>${kind==='translation'?'Virtual axis':'Virtual rotation'}</th><th>Camera input</th><th>Invert</th></tr></thead><tbody>${rows.map(({label,axis:i})=>`<tr><td>${label}</td><td><select data-axis="${kind}" data-index="${i}" aria-label="${kind} ${label}">${inputLabels.map((text,j)=>`<option value="${j}" ${p[`${kind}Axes`][i]===j?'selected':''}>${text}</option>`).join('')}</select></td><td><input type="checkbox" data-invert="${kind}" data-index="${i}" aria-label="Invert ${kind} ${label}" ${p[`${kind}Invert`][i]?'checked':''}></td></tr>`).join('')}</tbody></table>`;
  };
  this.host.innerHTML=`<div class="calibration-heading"><h2>Instrument calibration</h2><small>Separate settings for each instrument.</small></div><div class="calibration-tools" role="group" aria-label="Instrument">${calibrationOrder.map(n=>`<button type="button" data-calibration-tool="${n}" aria-pressed="${n===this.selected}">${names[n]}</button>`).join('')}</div><div class="calibration-neutral-action"><button type="button" class="primary-action" data-neutral disabled>⊕ Set neutral pose</button><p data-pose-status class="calibration-hint">Show this instrument’s marker to set neutral</p></div><div class="calibration-tip" data-tip-section><div class="calibration-tip-row"><strong>Tip · 2 cameras</strong><button type="button" data-tip-capture>Calibrate tip</button><button type="button" data-tip-jaw title="Hold the instrument with the jaws opening sideways (finger rings level, side by side), then press.">Set jaw orientation</button><button type="button" data-tip-remove>Remove</button></div><p class="calibration-hint" data-tip-status></p><p class="calibration-hint" data-tips-apart></p><div class="calibration-tip-row"><strong>Accuracy check</strong><button type="button" data-accuracy-touch title="Touch the two real tips together, then press. Repeat at spots spread around your workspace.">Record touch</button><button type="button" data-accuracy-cancel>Cancel</button></div><p class="calibration-hint" data-accuracy-status></p><div class="calibration-tip-row"><strong>Table height</strong><button type="button" data-table-touch>Record table touch</button><button type="button" data-table-clear>Clear</button></div><p class="calibration-hint" data-table-status></p></div><div class="calibration-tabs" role="group" aria-label="Calibration settings">${['pose','jaws','axes'].map(n=>`<button type="button" data-calibration-pane="${n}" aria-pressed="${n===this.pane}">${n==='pose'?'Pose':n==='jaws'?'Jaws':'Axis mapping'}</button>`).join('')}</div><div data-live-preview-host></div><button type="button" class="calibration-guide-shortcut" data-show-guide>Guided calibration checks ↓</button><section class="calibration-body" data-calibration-section="pose" ${this.pane==='pose'?'':'hidden'}><details class="neutral-reference" aria-label="Neutral pose reference"><summary>Neutral pose reference</summary><strong>Reference pose · ${names[this.selected]}</strong><svg viewBox="0 0 280 164" role="img" aria-label="Camera above, instrument tip pointing toward the operating field, tracker visible"><rect x="10" y="8" width="260" height="148" rx="12" fill="#f4f9f6" stroke="#d7e6db"/><rect x="110" y="17" width="60" height="22" rx="7" fill="#385b67"/><circle cx="140" cy="28" r="7" fill="#8fd5dc"/><text x="181" y="31" font-size="10" fill="#58736b">Camera</text><path d="M140 42v16" stroke="#7da89a" stroke-width="2" stroke-dasharray="3 4"/><g transform="rotate(-12 140 100)"><rect x="129" y="57" width="22" height="28" rx="4" fill="#e1f2eb" stroke="#39836d" stroke-width="2"/><path d="M134 62h12m-12 7h12m-12 7h12" stroke="#39836d" stroke-width="2"/><path d="M137 85v42m6-42v42" stroke="#456b7b" stroke-width="4" stroke-linecap="round"/><path d="M137 127l3 12 3-12" fill="#456b7b"/></g><path d="M63 142h154" stroke="#a6bcb1" stroke-width="3" stroke-linecap="round"/><text x="16" y="65" font-size="10" fill="#52786b">Tracker</text><path d="M55 68 125 71" stroke="#719c87" stroke-width="1.5"/><text x="17" y="131" font-size="10" fill="#52786b">Tip down</text><path d="M64 126 129 135" stroke="#719c87" stroke-width="1.5"/></svg><p class="calibration-hint">Hold the instrument comfortably near the center of the camera view, with its tip toward the work surface and its marker clearly visible. This drawing is a positioning guide, not a live alignment measurement. Hold still, then set neutral.</p></details><details class="rotation-guide"><summary>Guided rotation checks</summary><p class="calibration-hint">Six checks: right/left, forward/back, and roll both ways. Keep the marker visible. Hold each pose steady, and return to the same neutral pose between checks. Mapping is applied only after all three opposite pairs agree. This maps direction, not physical angle or movement scale.</p><svg viewBox="0 0 280 145" role="img" aria-label="Target instrument outline for guided rotation"><rect width="280" height="145" rx="10" fill="#f5f8fa"/><g transform="translate(140 72)"><g data-guide-target transform="rotate(0)"><path d="M-9 -55L-9 37L0 55L9 37L9 -55" fill="none" stroke="#288b76" stroke-width="4" stroke-dasharray="6 4"/></g><g data-guide-live transform="rotate(0)"><path d="M-7 -55L-7 37L0 55L7 37L7 -55" fill="none" stroke="#385b78" stroke-width="3"/></g></g><text x="10" y="18" font-size="11" fill="#3c5b67">Dashed = target · Blue = turn amount</text></svg><p data-guide-instruction class="calibration-hint">Start by setting neutral, then click Begin guided calibration.</p><p data-guide-measure class="calibration-hint"></p><button type="button" data-guide-start>Begin guided calibration</button> <button type="button" data-guide-capture disabled>Capture this direction</button> <button type="button" data-guide-cancel>Cancel</button></details><h3>Mounting orientation</h3><div class="calibration-presets"><button type="button" data-mount="upright" aria-pressed="${p.mountingDegrees.every(n=>n===0)}">Upright</button><button type="button" data-mount="flip" aria-pressed="${p.mountingDegrees[0]===180&&p.mountingDegrees[1]===0&&p.mountingDegrees[2]===0}">Flip 180°</button><button type="button" data-mount="side" aria-pressed="${p.mountingDegrees[0]===0&&p.mountingDegrees[1]===0&&p.mountingDegrees[2]===90}">Sideways</button></div><label>Movement sensitivity <output data-gain-output="movementGain">${p.movementGain.toFixed(2)}×</output><input type="range" min="0.1" max="4" step=".05" value="${p.movementGain}" data-gain="movementGain"></label><label>Rotation sensitivity <output data-gain-output="rotationGain">${p.rotationGain.toFixed(2)}×</output><input type="range" min=".1" max="3" step=".05" value="${p.rotationGain}" data-gain="rotationGain"></label><label class="calibration-check"><span>Lock depth (one camera)</span><input type="checkbox" data-profile-check="depthLock" ${p.depthLock?'checked':''}></label><details><summary>Tip offset & fine adjustments</summary><p class="calibration-hint">Tip offsets use the marker’s local axes and practice units. These are independent of the measured physical tracker-to-tip distances.</p>${(['mountingDegrees','tipOffset'] as const).map(key=>`<fieldset><legend>${key==='tipOffset'?'Marker-frame tip offset (practice units)':'Mounting offsets (degrees)'}</legend><div class="calibration-numbers">${['X','Y','Z'].map((axis,i)=>`<label>${axis}<input type="number" min="${key==='tipOffset'?-2:-180}" max="${key==='tipOffset'?2:180}" step="${key==='tipOffset'?.01:1}" value="${p[key][i]}" data-vector="${key}" data-index="${i}"></label>`).join('')}</div></fieldset>`).join('')}</details></section><section class="calibration-body calibration-jaws" data-calibration-section="jaws" ${this.pane==='jaws'?'':'hidden'}><label class="calibration-check"><span>Jaw tracking</span><input type="checkbox" data-jaw-enable ${jawTrackingCheckbox()?.checked?'checked':''}></label><label class="calibration-check"><span>Reverse jaw opening</span><input type="checkbox" data-profile-check="jawInverted" ${p.jawInverted?'checked':''}></label><p class="calibration-hint">Ball assignments and closed/open measurements save per camera view. A striped-ball trial is available for the needle driver.</p><div data-jaw-host>${this.jaws?'':'<p class="calibration-hint">Enable camera tracking to select ball colors and calibrate closed/open positions.</p>'}</div></section><section class="calibration-body" data-calibration-section="axes" ${this.pane==='axes'?'':'hidden'}><h3>Movement mapping</h3>${axes('translation')}<h3>Rotation mapping</h3><p class="calibration-hint">For the upright reference: tilt left/right about Z, tilt forward/back about X, and roll about the shaft (Y). Rotation axes name the pivot axis, not the direction the tip moves. Swaps and inversions also adjust a companion axis to keep tilt consistent through shaft roll.</p>${axes('rotation')}<p class="calibration-hint">Each input axis is assigned once. Swapping a mapping updates its other assignment automatically.</p></section><div class="calibration-footer"><button type="button" class="primary-action" data-save>Save ${names[this.selected].toLowerCase()}</button><button type="button" data-reset>Reset</button><p data-calibration-message role="status">Changes preview immediately. Save keeps them in this browser.</p></div>`;
  this.host.querySelector('[data-live-preview-host]')!.replaceWith(this.preview.element);this.preview.setInstrument(this.selected);
  this.placeJaws();
 }
 private message(text:string){this.host.querySelector('[data-calibration-message]')!.textContent=text;}
 private click(e:Event){const b=(e.target as HTMLElement).closest<HTMLButtonElement>('button');if(!b)return;
  // Stereo tip calibration (src/input/stereoTipCalibration.ts).
  if(b.hasAttribute('data-tip-capture')){if(stereoTipCalibration.capturing())stereoTipCalibration.cancel();else stereoTipCalibration.start(this.selected,currentTrackerType(),performance.now());this.updateTip();return;}
  if(b.hasAttribute('data-table-touch')){const tip=latestStereoTips.get(this.selected);if(tip&&performance.now()-tip.at<=TIP_READOUT_MAX_AGE_MS){this.tableNote=tableHeight.addTouch(tip.mm)>=TABLE_POINTS?'Table height set: the table is now the skin surface.':'';}else this.tableNote='No measured tip for this instrument: calibrate its tip and track it with both cameras.';this.updateTip();return;}
  if(b.hasAttribute('data-accuracy-touch')){const now=performance.now(),forceps=latestStereoTips.get('forceps'),driver=latestStereoTips.get('needleDriver');if(forceps&&driver&&now-forceps.at<=TIP_READOUT_MAX_AGE_MS&&now-driver.at<=TIP_READOUT_MAX_AGE_MS){tipAccuracyCheck.record(forceps.mm,driver.mm);this.accuracyNote='';}else this.accuracyNote='Both tips must be calibrated and tracked by both cameras.';this.updateTip();return;}
  if(b.hasAttribute('data-accuracy-cancel')){tipAccuracyCheck.cancel();this.accuracyNote='Accuracy check cancelled.';this.updateTip();return;}
  if(b.hasAttribute('data-table-clear')){tableHeight.clear();this.tableNote='Table height cleared.';this.updateTip();return;}
  if(b.hasAttribute('data-tip-jaw')){stereoTipCalibration.requestJawOrientation(this.selected,currentTrackerType());this.updateTip();return;}
  if(b.hasAttribute('data-tip-remove')){stereoTipCalibration.remove(this.selected,currentTrackerType());this.updateTip();return;}
  if(b.hasAttribute('data-show-guide')){this.pane='pose';this.render();const guide=this.host.querySelector<HTMLDetailsElement>('.rotation-guide')!;guide.open=true;guide.scrollIntoView({block:'start',behavior:'smooth'});return;}
  if(b.dataset.calibrationTool){this.guide=undefined;this.selected=b.dataset.calibrationTool as BallInstrumentName;this.render();return;}
  if(b.dataset.calibrationPane){this.guide=undefined;this.pane=b.dataset.calibrationPane;this.render();return;}
  if(b.hasAttribute('data-guide-start')){
   if(!instrumentCalibration.captureNeutral(this.selected)){this.message('Show the marker and set neutral first.');return;}
   this.guide=new GuidedCalibration();this.updateGuide();this.message('Guided calibration: hold neutral steady and confirm it first.');return;
  }
  if(b.hasAttribute('data-guide-cancel')){this.guide=undefined;this.updateGuide();return;}
  if(b.hasAttribute('data-guide-capture')){this.captureGuide();return;}
  if(b.hasAttribute('data-neutral')){this.guide=undefined;this.updateGuide();this.message(instrumentCalibration.captureNeutral(this.selected)?'Neutral pose set and remembered after reload (set it again if you move the camera). Main view aligns to tracked X/Y and keeps its depth.':'A recent marker pose is needed.');return;}
  if(b.hasAttribute('data-save')){this.message(instrumentCalibration.save(this.selected)?'Profile saved in this browser.':'Browser storage is unavailable; settings remain active for this session.');return;}
  if(b.hasAttribute('data-reset')){instrumentCalibration.reset(this.selected);this.render();this.message('This instrument’s live settings were reset. Save to keep the reset.');return;}
  if(b.dataset.mount){this.guide=undefined;instrumentCalibration.update(this.selected,{mountingDegrees:b.dataset.mount==='flip'?[180,0,0]:b.dataset.mount==='side'?[0,0,90]:[0,0,0]});this.render();this.message('Mounting orientation updated.');}
 }
 private updateGuide(){
  const target=this.host.querySelector<SVGGElement>('[data-guide-target]');if(!target)return;
  const sample=instrumentCalibration.preview(this.selected),raw=instrumentCalibration.rawNeutralRotation(this.selected),guide=this.guide;
  guide?.observe(raw,sample?.observedAt??0,performance.now());
  const complete=guide&&guide.step>=6;
  const instruction=!guide?'Set neutral and begin. Six directions will be checked.':complete?'Six checks passed. Test the live preview, then Save.':guide.neutral?`Return to neutral before check ${guide.step+1} of 6, hold still, then confirm.`:`Check ${guide.step+1} of 6: ${guidedDirections[guide.step]}. Keep your hand in place, hold still, then capture.`;
  this.host.querySelector('[data-guide-instruction]')!.textContent=instruction;
  this.host.querySelector('[data-guide-measure]')!.textContent=guide&&!complete?guide.readiness():raw?`Detected rotation: ${(raw.length()*180/Math.PI).toFixed(0)}°`:'Waiting for marker tracking';
  const capture=this.host.querySelector<HTMLButtonElement>('[data-guide-capture]')!;
  capture.textContent=guide?.neutral?'Confirm neutral':'Capture this direction';capture.disabled=!guide||!!complete||guide.readiness()!=='Ready';
  target.setAttribute('transform',`rotate(${!guide||guide.neutral?0:guide.step%2===0?35:-35})`);
  // Schematic magnitude only: labels give the actual requested 3D direction.
  this.host.querySelector('[data-guide-live]')?.setAttribute('transform',`rotate(${(guide&&guide.step%2?-1:1)*Math.min(60,(raw?.length()??0)*180/Math.PI)})`);
 }
 private captureGuide(){
  // Capture the stable window that enabled the displayed button. Do not add a
  // new frame in the middle of the click and silently invalidate that window.
  const guide=this.guide,sample=instrumentCalibration.preview(this.selected);
  if(!sample||performance.now()-sample.observedAt>350){this.updateGuide();return;}
  if(!guide||!guide.capture())return;
  if(guide.step===6){
   const mapping=solveGuidedRotation(guide.samples);
   if(!mapping){this.guide=undefined;this.message('Checks did not agree: keep tilts separate, and roll clockwise looking from handle toward tip. The three directions must form one consistent frame. Existing mapping kept; begin again to retry.');this.updateGuide();return;}
   instrumentCalibration.update(this.selected,mapping);
   this.message('All six rotation checks passed. Mapping applied; compare the live marker and instrument, then Save.');
  }
  this.updateGuide();
 }
 private input(e:Event){const el=e.target as HTMLInputElement;if(el.dataset.gain){const key=el.dataset.gain as 'movementGain'|'rotationGain';instrumentCalibration.update(this.selected,{[key]:Number(el.value)});this.host.querySelector(`[data-gain-output="${key}"]`)!.textContent=Number(el.value).toFixed(2)+'×';this.message('Unsaved changes · previewing live');}}
 private change(e:Event){const el=e.target as HTMLInputElement|HTMLSelectElement,p=instrumentCalibration.profile(this.selected);
  // The Jaws tab switch drives the tracking page's (hidden) jaw-tracking state.
  if(el.hasAttribute('data-jaw-enable')){const target=jawTrackingCheckbox();if(target){target.checked=(el as HTMLInputElement).checked;target.dispatchEvent(new Event('change'));}return;}
  if(el.dataset.profileCheck){const key=el.dataset.profileCheck as 'depthLock'|'jawInverted';instrumentCalibration.update(this.selected,{[key]:(el as HTMLInputElement).checked});this.message('Unsaved changes · previewing live');}
  if(el.dataset.vector){const key=el.dataset.vector as 'tipOffset'|'mountingDegrees',i=Number(el.dataset.index);const value=Number(el.value);if(!Number.isFinite(value))return;p[key][i]=value;instrumentCalibration.update(this.selected,{[key]:p[key]});}
  if(el.dataset.invert){
   const key=`${el.dataset.invert}Invert` as 'translationInvert'|'rotationInvert',index=Number(el.dataset.index);p[key][index]=(el as HTMLInputElement).checked;
   instrumentCalibration.update(this.selected,{[key]:p[key]});
   const actual=instrumentCalibration.profile(this.selected),companion=key==='rotationInvert'?actual.rotationInvert.findIndex((v,i)=>i!==index&&v!==p.rotationInvert[i]):-1;
   if(key==='rotationInvert')this.host.querySelectorAll<HTMLInputElement>('[data-invert=rotation]').forEach(input=>input.checked=actual.rotationInvert[Number(input.dataset.index)]);
   this.message(companion>=0?`Direction updated; ${['forward/back tilt','shaft roll','left/right tilt'][companion]} also adjusted to keep a consistent 3D frame. Save to keep it.`:'Direction updated · previewing live · Save to keep it');
  }
  if(el.dataset.axis){const key=`${el.dataset.axis}Axes` as 'translationAxes'|'rotationAxes',i=Number(el.dataset.index),next=Number(el.value) as Axis,j=p[key].indexOf(next);[p[key][i],p[key][j]]=[p[key][j],p[key][i]];instrumentCalibration.update(this.selected,{[key]:p[key]});this.render();this.message('Axis mapping updated; shaft roll adjusted as needed to keep tilt consistent · unsaved');}
 }
}
