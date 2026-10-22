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
];
export interface SutureProfile {id:string;label:string;color:number;drag:number;bend:number;friction:number}
export const SUTURES:SutureProfile[]=[
 {id:'prolene',label:'Prolene · blue',color:0x315b9c,drag:.986,bend:1,friction:1},
 {id:'nylon',label:'Nylon · black',color:0x24242c,drag:.982,bend:1.18,friction:1.12},
 {id:'monocryl',label:'Monocryl · violet',color:0x8050ad,drag:.979,bend:.85,friction:1.18},
];
export function resolveSetup(search=''){
 const params=new URLSearchParams(search);
 return {environment:params.get('environment')==='microsurgery'?'microsurgery':'skin',skin:SKIN_TYPES.find(p=>p.id===params.get('skin'))??SKIN_TYPES[1],needle:NEEDLES.find(p=>p.id===params.get('needle'))??NEEDLES[0],suture:SUTURES.find(p=>p.id===params.get('suture'))??SUTURES[0]};
}
// A setup change reloads the practice so every module receives one consistent profile.
export const PRACTICE_SETUP=resolveSetup(typeof window==='undefined'?'':window.location.search);
