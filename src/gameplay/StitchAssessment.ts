import type {Vector3} from 'three';
export interface StitchFrame {
 lab:boolean;skin:boolean;pass:boolean;extracted:boolean;knot:boolean;seated:boolean;released:boolean;trimmed:number;
 bites:readonly (Vector3|null)[];closure:number;eversion:number;pucker:number;peakPull:number;deepGap?:number;compression?:number;edgeMismatch?:number;planned?:boolean;skinTractionPeak?:number;skinGraspSlips?:number;
}
/** Observes achieved exercise stages. Quality feedback is geometric, not a clinical score. */
export function assessStitch(f:StitchFrame){
 const [a,b]=f.bites,purchase=!!a&&!!b;
 const symmetric=purchase&&Math.abs(Math.abs(a!.x)-Math.abs(b!.x))/Math.max(.01,Math.abs(a!.x),Math.abs(b!.x))<.15;
 const aligned=purchase&&Math.abs(a!.z-b!.z)<.05&&Math.abs(a!.y-b!.y)<.05&&Math.abs(f.edgeMismatch??0)<.004;
 const depthState=!purchase?'pending':f.closure<.75?'not seated':[(f.deepGap??.012)>.025?'residual gap':'approximated',...(Math.abs(f.edgeMismatch??0)>.004?['uneven levels']:[])].join(' · ');
 const tied=f.knot&&f.seated&&f.closure>.75;
 const finished=tied&&f.released&&f.trimmed===2;
 const complete=!f.lab&&f.pass&&f.extracted&&purchase&&finished;
 const stage=f.lab?(finished?'Tying lab finished':'Free tying lab · Preplaced stitch'):!f.pass?'1 / 6 · Evert and pass the needle':!f.extracted?'2 / 6 · Transfer and extract the needle':!tied?'3 / 6 · Tie and seat the knot':!f.released?'4 / 6 · Release and check the knot':f.trimmed<2?'5 / 6 · Trim both free tails':complete?'6 / 6 · Stitch exercise complete':'Review the stitch';
 const feedback=[
  `Bites: ${purchase?(symmetric?'symmetric':'unequal widths'):'purchase incomplete'}${purchase?(f.planned?' (planned)':' (assisted)'):''}`,
  `Edge alignment: ${!purchase?'pending':aligned?'aligned':'uneven bites'}`,
  `Knot placement: ${f.seated?'at tissue':'not seated'}`,
  `Edges: ${f.closure>.9?'approximated':f.closure>.05?'drawing together':'open'}`,
  ...(f.skin?[`Deep dermal closure: ${depthState}`,`Eversion: ${f.eversion>.004?'maintained':'pending'}`,`Puckering: ${f.pucker>.008?'ease tension':'minimal'}`,`Tissue compression: ${(f.compression??0)>.003?'ease tension':'minimal'}`]:[]),
  `Tails trimmed: ${f.trimmed}/2`,
  ...(f.skin&&(f.skinTractionPeak??0)>.6?['High skin traction observed']:[]),
  ...(f.skin&&(f.skinGraspSlips??0)>0?[`Skin grasp slips: ${f.skinGraspSlips}`]:[]),
  ...(f.peakPull>.6?['High pull observed · Review tension control']:[]),
 ];
 return {stage,feedback,complete,labFinished:f.lab&&finished};
}
