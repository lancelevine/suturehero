import * as THREE from 'three';
import {instrumentCalibration,trackerTipDistanceMm,trackerToTipOffset,type InstrumentCalibration} from '../input/InstrumentCalibration';
import type {BallInstrumentName} from '../input/ballTrackingSlots';
import {trackedInstrumentRotation} from '../input/trackingFrame';
const names={forceps:'Forceps',needleDriver:'Needle driver',scissors:'Scissors'};
const colors={forceps:'#319b84',needleDriver:'#c65353',scissors:'#557ed0'};
const axisColors=['#d76060','#329c75','#588bd1'];
type Sample=NonNullable<ReturnType<InstrumentCalibration['preview']>>;
/** CPU-projected SVG: a live 3D orientation view without another WebGL context. */
export class CalibrationPreview {
 readonly element=document.createElement('section');
 private selected:BallInstrumentName='needleDriver';
 private centers=new Map<BallInstrumentName,THREE.Vector3>();
 private jaws=new Map<BallInstrumentName,{opening:number;seenAt:number}>();
 private last?:Sample;private lastTool?:BallInstrumentName;private frame=0;private lastFrame=0;private disposed=false;
 constructor(private calibration=instrumentCalibration){
  this.element.className='calibration-live-preview';
  this.element.innerHTML=`<div class="calibration-preview-heading"><strong data-preview-title>Live needle driver</strong><span data-preview-status role="status">Show the marker</span></div><svg viewBox="0 0 300 260" role="img" aria-label="Live calibrated instrument movement and rotation"><defs><clipPath id="calibration-preview-clip"><rect x="1" y="1" width="298" height="258" rx="8"/></clipPath></defs><g clip-path="url(#calibration-preview-clip)"><path d="M15 130H285M150 17V245M25 190L275 110" stroke="#e0eae5" fill="none"/><g data-preview-ghost fill="none" stroke="#bdcfc5" stroke-width="2" opacity=".55"/><g data-preview-tool fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><g data-preview-marker stroke="#23724f" stroke-width="2" fill="#e0f3e9"/><g data-preview-axes stroke-width="2" font-size="10" font-weight="bold"/></g><text x="10" y="15" fill="#789387" font-size="9">Faint: upright reference</text><g class="calibration-fixed-axes" aria-label="Fixed axis guide: X left/right, Y up/down, Z depth"><rect x="8" y="163" width="99" height="89" rx="7" fill="#ffffff" opacity=".93"/><text x="15" y="175" font-size="9" fill="#627d70">FIXED AXES</text><g transform="translate(36 221)" stroke-width="2.5" font-size="14" font-weight="bold"><path d="M0 0H36" stroke="#d76060"/><text x="40" y="5" fill="#d76060">X</text><path d="M0 0V-32" stroke="#329c75"/><text x="-5" y="-37" fill="#329c75">Y</text><path d="M0 0L22 17" stroke="#588bd1"/><text x="27" y="24" fill="#588bd1">Z</text></g></g></svg><p data-preview-marker-label class="calibration-hint"></p><p class="calibration-preview-legend"><b style="color:#d76060">X left/right</b> · <b style="color:#329c75">Y up/down</b> · <b style="color:#588bd1">Z depth</b></p><div class="calibration-preview-actions"><span data-preview-motion>Move or turn one axis at a time</span><button type="button" data-preview-center title="Center the illustration without changing calibration">Center view</button></div><details><summary>Input → mapped readings</summary><table class="calibration-preview-values"><thead><tr><th>Marker input</th><th>Virtual output</th></tr></thead><tbody data-preview-values></tbody></table><small>Green square shows the assumed tracker center from calibrated offsets, not a measured camera overlay. Movement uses practice units. Rotation uses neutral-relative axes. Tip motion includes rotation about the tracker. This schematic shows calibrated input; tissue and reach limits apply in the workspace.</small></details>`;
  this.element.querySelector('[data-preview-center]')!.addEventListener('click',()=>{const sample=this.calibration.preview(this.selected);if(sample){this.centers.set(this.selected,sample.movement.clone());this.lastFrame=0;}});
  const unsubscribe=calibration.subscribe((name,reason)=>{if(reason==='neutral'||reason==='reset'){this.centers.delete(name);if(name===this.selected){this.last=undefined;this.lastTool=undefined;}}if(name===this.selected)this.element.querySelector('[data-preview-motion]')!.textContent=reason==='profile'?'Mapping updated · move or turn to check':'Move or turn one axis at a time';this.lastFrame=0;});
  const custom=(event:Event)=>this.jaw((event as CustomEvent).detail);
  const message=(event:MessageEvent)=>{if(event.origin===location.origin&&event.source===window)this.jaw(event.data);};
  window.addEventListener('suturehero:jaw-opening',custom);window.addEventListener('message',message);
  window.addEventListener('pagehide',()=>{this.disposed=true;cancelAnimationFrame(this.frame);unsubscribe();window.removeEventListener('suturehero:jaw-opening',custom);window.removeEventListener('message',message);},{once:true});
  this.render();this.frame=requestAnimationFrame(time=>this.tick(time));
 }
 setInstrument(name:BallInstrumentName){if(name!==this.selected){this.selected=name;this.last=undefined;this.lastTool=undefined;this.element.querySelector('[data-preview-motion]')!.textContent='Move or turn one axis at a time';}this.lastFrame=0;this.render();}
 private jaw(data:{type?:string;instrument?:BallInstrumentName;opening?:number}){
  if(data?.type!=='suturehero:jaw-opening'||!data.instrument||!Object.hasOwn(names,data.instrument)||!Number.isFinite(data.opening))return;
  this.jaws.set(data.instrument,{opening:THREE.MathUtils.clamp(data.opening!,0,1),seenAt:performance.now()});
 }
 private tick(time:number){
  if(this.disposed)return;
  if(time-this.lastFrame>=50&&!document.hidden){const r=this.element.getBoundingClientRect();if(r.width&&r.height&&r.bottom>0&&r.top<innerHeight){this.lastFrame=time;this.render();}}
  this.frame=requestAnimationFrame(next=>this.tick(next));
 }
 private paths(opening:number){
  const v=(x:number,z:number,y=0)=>new THREE.Vector3(x,y,z),paths:THREE.Vector3[][]=[];
  const ring=(x:number)=>Array.from({length:25},(_,i)=>{const a=i/24*Math.PI*2;return v(x+.16*Math.cos(a),1.8+.2*Math.sin(a));});
  if(this.selected==='forceps')for(const side of [-1,1])paths.push([v(0,2),v(side*.1,1.4),v(side*.12,.65),v(side*opening*.15,0)]);
  else{
   const pivot=this.selected==='scissors'?.65:.35;
   for(const side of [-1,1]){paths.push([v(side*.18,1.62),v(side*.04,pivot),v(side*opening*.18,-.15)]);paths.push(ring(side*.18));}
   paths.push(Array.from({length:17},(_,i)=>{const a=i/16*Math.PI*2;return v(.045*Math.cos(a),pivot+.045*Math.sin(a));}));
  }
  // An asymmetric colored shaft mark makes axial roll visible on forceps too.
  paths.push([v(.07,1.02,.04),v(.07,1.22,.04)]);
  return paths;
 }
 private project(v:THREE.Vector3){return {x:150+75*(v.x+v.z*.42),y:130-75*v.y+75*v.z*.24};}
 private draw(paths:THREE.Vector3[][],rotation:THREE.Quaternion,movement:THREE.Vector3){return paths.map(path=>path.map((point,i)=>{const p=this.project(point.clone().multiplyScalar(.8).applyQuaternion(rotation).add(movement));return `${i?'L':'M'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`;}).join(' '));}
 private render(){
  const sample=this.calibration.preview(this.selected),fresh=!!sample,last=sample??(this.lastTool===this.selected?this.last:undefined);
  this.element.dataset.instrument=this.selected;this.element.dataset.tracking=fresh?'live':last?'lost':'waiting';
  const title=this.element.querySelector('[data-preview-title]')!,titleText='Live '+names[this.selected].toLowerCase();if(title.textContent!==titleText)title.textContent=titleText;
  const status=this.element.querySelector('[data-preview-status]')!,statusText=fresh?'Tracking':last?'Marker lost · holding pose':'Show this marker';if(status.textContent!==statusText)status.textContent=statusText;
  const movement=(last?.movement.clone()??new THREE.Vector3()).sub(this.centers.get(this.selected)??new THREE.Vector3());
  const rotation=trackedInstrumentRotation(last?.quaternion??new THREE.Quaternion()),jaw=this.jaws.get(this.selected),opening=jaw?.opening??.65;
  const paths=this.paths(opening),tool=this.draw(paths,rotation,movement),ghost=this.draw(this.paths(.65),trackedInstrumentRotation(),new THREE.Vector3());
  const paint=(selector:string,lines:string[],live=false)=>{const group=this.element.querySelector(selector)!;while(group.childElementCount<lines.length)group.append(document.createElementNS('http://www.w3.org/2000/svg','path'));while(group.childElementCount>lines.length)group.lastElementChild!.remove();Array.from(group.children).forEach((node,i)=>{if(node.getAttribute('d')!==lines[i])node.setAttribute('d',lines[i]);if(live){const stroke=i===lines.length-1?colors[this.selected]:'#52717c';if(node.getAttribute('stroke')!==stroke)node.setAttribute('stroke',stroke);}});};
  paint('[data-preview-tool]',tool,true);paint('[data-preview-ghost]',ghost);
  // Use the actual calibrated tracker center, not an arbitrary point on the drawing.
  // Tool geometry is schematic; tracker offset is in the same practice units as output.
  const profile=this.calibration.profile(this.selected),offset=trackerToTipOffset(this.selected,profile);
  const markerMovement=(last?.markerMovement.clone()??offset.negate()).sub(this.centers.get(this.selected)??new THREE.Vector3());
  const markerRotation=last?.markerRotation??new THREE.Quaternion();
  const corners=[[-.08,-.08],[.08,-.08],[.08,.08],[-.08,.08],[-.08,-.08]].map(([x,y])=>this.project(new THREE.Vector3(x,y,0).applyQuaternion(markerRotation).add(markerMovement)));
  const center=this.project(markerMovement),tip=this.project(movement),marker=this.element.querySelector('[data-preview-marker]')!;
  marker.innerHTML=`<path d="M${tip.x} ${tip.y}L${center.x} ${center.y}" fill="none" stroke-dasharray="3 3" opacity=".65"/><path d="${corners.map((p,i)=>`${i?'L':'M'}${p.x} ${p.y}`).join(' ')}"/><circle cx="${corners[0].x}" cy="${corners[0].y}" r="2.5" fill="#23724f"/><circle cx="${center.x}" cy="${center.y}" r="1.5"/>`;
  this.element.querySelector('[data-preview-marker-label]')!.textContent=`Tracker reference · ${trackerTipDistanceMm[this.selected]} mm toward handle${profile.tipOffset.some(v=>v!==0)?' + custom offset':''} · corner dot shows roll.`;
  const origin=this.project(movement),axes=this.element.querySelector('[data-preview-axes]')!;
  axes.innerHTML=[new THREE.Vector3(.42,0,0),new THREE.Vector3(0,.42,0),new THREE.Vector3(0,0,.42)].map((axis,i)=>{const end=this.project(axis.add(movement));return `<path d="M${origin.x} ${origin.y}L${end.x} ${end.y}" stroke="${axisColors[i]}"/><text x="${end.x+3}" y="${end.y-3}" fill="${axisColors[i]}">${'XYZ'[i]}</text>`;}).join('');
  if(sample){
   const p=this.calibration.profile(this.selected);
   if(this.last&&this.lastTool===this.selected){const move=sample.rawMovement.clone().sub(this.last.rawMovement),turn=sample.rawRotation.clone().sub(this.last.rawRotation);const rotating=turn.length()>.004,changing=rotating||move.length()>.003;if(changing){const delta=(rotating?turn:move).toArray(),input=delta.map(Math.abs).indexOf(Math.max(...delta.map(Math.abs))),map=rotating?p.rotationAxes:p.translationAxes,output=map.indexOf(input as 0|1|2),reversed=(rotating?p.rotationInvert:p.translationInvert)[output];this.element.querySelector('[data-preview-motion]')!.textContent=`${rotating?'Turn':'Move'}: marker ${'XYZ'[input]} → virtual ${'XYZ'[output]}${reversed?' · reversed':''}${!rotating&&output===2&&sample.depthLocked?' · mono depth locked':''}`;}}
   const number=(n:number,rotation=false)=>(rotation?THREE.MathUtils.radToDeg(n).toFixed(0)+'°':n.toFixed(2));
   this.element.querySelector('[data-preview-values]')!.innerHTML=(['Move','Turn'] as const).flatMap((kind,k)=>[0,1,2].map(axis=>{const raw=(k?sample.rawRotation:sample.rawMovement).toArray(),mapped=(k?sample.mappedRotation:sample.movement).toArray(),input=(k?p.rotationAxes:p.translationAxes)[axis];return `<tr><td>${kind} ${'XYZ'[input]} ${number(raw[input],!!k)}</td><td>${'XYZ'[axis]} ${number(mapped[axis],!!k)}</td></tr>`;})).join('')+`<tr><td>Jaws</td><td>${jaw?Math.round(jaw.opening*100)+'%'+(performance.now()-jaw.seenAt>500?' · last known':''):'Calibrate on Jaws tab'}</td></tr>`;
   this.last=sample;this.lastTool=this.selected;
  }else if(!last)this.element.querySelector('[data-preview-values]')!.innerHTML='<tr><td colspan="2">Waiting for this instrument’s marker.</td></tr>';
 }
}
