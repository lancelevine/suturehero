import {SKIN_TYPES} from '../environments/SkinTypes';
export interface NeedleProfile {id:string;label:string;radius:number;arc:number;tip:'cutting'|'taper';description:string}
/** Representative practice-scale profiles; commercial codes vary by product. */
export const NEEDLES:NeedleProfile[]=[
 {id:'ps2',label:'PS-2 · 3/8 cutting',radius:.3,arc:Math.PI*.75,tip:'cutting',description:'Small skin needle'},
 {id:'ct1',label:'CT-1 · 1/2 taper',radius:.43,arc:Math.PI,tip:'taper',description:'Larger taper needle'},
 {id:'sh',label:'SH · 1/2 taper',radius:.33,arc:Math.PI,tip:'taper',description:'Small half-circle taper'},
 {id:'fs2',label:'FS-2 · 3/8 cutting',radius:.29,arc:Math.PI*.75,tip:'cutting',description:'Skin cutting needle'},
 {id:'p3',label:'P-3 · 3/8 cutting',radius:.24,arc:Math.PI*.75,tip:'cutting',description:'Fine skin needle'},
 {id:'bv1',label:'BV-1 · 3/8 taper',radius:.22,arc:Math.PI*.75,tip:'taper',description:'Fine vascular needle'},
 // Sandbox default in the browser (2026-11-15): PS-2 radius with a shorter arc (0.6π ≈ 108°, ≈ 15 mm), so a free pass
 // needs less rotation. Not a catalogue needle, and too short for the guided bite (needs ≈ 133°): the guided exercise uses the PS-2.
 {id:'trainer',label:'Short trainer needle · 108° (Sandbox)',radius:.3,arc:Math.PI*.6,tip:'cutting',description:'Shorter practice needle: easier to complete a free pass'},
];
export interface SutureProfile {id:string;label:string;color:number;drag:number;bend:number;friction:number}
export const SUTURES:SutureProfile[]=[
 {id:'prolene',label:'Prolene · blue',color:0x315b9c,drag:.986,bend:1,friction:1},
 {id:'nylon',label:'Nylon · black',color:0x24242c,drag:.982,bend:1.18,friction:1.12},
 {id:'monocryl',label:'Monocryl · violet',color:0x8050ad,drag:.979,bend:.85,friction:1.18},
];
/** Needles that can complete the guided exercise's bite (all but the Sandbox trainer). */
export const GUIDED_NEEDLES=NEEDLES.filter(p=>p.id!=='trainer');
export function resolveSetup(search='',options:{trainerDefault?:boolean}={}){
 const params=new URLSearchParams(search);
 const microsurgery=params.get('environment')==='microsurgery';
 const fallback=options.trainerDefault&&!microsurgery?NEEDLES.find(p=>p.id==='trainer')!:NEEDLES[0];
 return {environment:microsurgery?'microsurgery':'skin',skin:SKIN_TYPES.find(p=>p.id===params.get('skin'))??SKIN_TYPES[1],needle:NEEDLES.find(p=>p.id===params.get('needle'))??fallback,suture:SUTURES.find(p=>p.id===params.get('suture'))??SUTURES[0]};
}
// A setup change reloads the practice so every module receives one consistent profile.
// In the browser the skin Sandbox defaults to the short trainer needle; tests and microsurgery keep the PS-2.
export const PRACTICE_SETUP=resolveSetup(typeof window==='undefined'?'':window.location.search,{trainerDefault:typeof window!=='undefined'});
