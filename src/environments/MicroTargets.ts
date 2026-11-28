export const MICRO_TRAY_Y=-.52;
export const MICRO_FLOOR_Y=-.7;
export type MicroTarget='artery'|'small-artery'|'nerve'|'vein'|'diseased-artery';
export interface MicroTargetProfile {id:MicroTarget;label:string;outerRadius:number;innerRadius:number;centerY:number;gap:number;length:number;purchaseY:number;color:number;innerColor:number;cutColor:number}
export const MICRO_TARGETS:Record<MicroTarget,MicroTargetProfile>={
 artery:{id:'artery',label:'Artery',outerRadius:.4,innerRadius:.32,centerY:.01,gap:.3,length:2.6,purchaseY:.37,color:0xd98388,innerColor:0xb95161,cutColor:0xf0b5ac},
 'small-artery':{id:'small-artery',label:'Small artery',outerRadius:.25,innerRadius:.19,centerY:.16,gap:.3,length:2.6,purchaseY:.38,color:0xcf7780,innerColor:0xa94155,cutColor:0xeeaaa6},
 nerve:{id:'nerve',label:'Nerve · fascicle bundles',outerRadius:.4,innerRadius:.27,centerY:.01,gap:.3,length:2.6,purchaseY:.37,color:0xe7d6aa,innerColor:0xc7ac7c,cutColor:0xf0e2bd},
 // Vein (roadmap, 2026-11-28): thin wall that collapses unless held open with forceps counterpressure.
 vein:{id:'vein',label:'Vein · thin wall',outerRadius:.42,innerRadius:.38,centerY:.01,gap:.3,length:2.6,purchaseY:.4,color:0x9a7f9f,innerColor:0x7a4c6e,cutColor:0xd8b9cc},
 // Diseased artery (roadmap, 2026-11-28): stiff, plaque-lined; bites must pin plaque and intima to the wall.
 'diseased-artery':{id:'diseased-artery',label:'Diseased artery · plaque',outerRadius:.4,innerRadius:.3,centerY:.01,gap:.3,length:2.6,purchaseY:.36,color:0xc98a7c,innerColor:0xe0c27a,cutColor:0xead3a2},
};
export function resolveMicroTarget(value:string|null):MicroTarget{return value==='small-artery'||value==='nerve'||value==='vein'||value==='diseased-artery'?value:'artery';}

/**
 * Adjustable Acland double clamp (roadmap, 2026-11-27): pushing the clamp in brings the vessel ends
 * closer, spreading it moves them apart, which sets how much the stitch must pull to close the gap.
 * A factor on the target's gap; 1 is the default ("a little apart"). Changing it restarts the stitch.
 */
export const CLAMP_SPREAD = { min: 0.5, max: 1.5, default: 1 } as const;
let clampSpread: number = CLAMP_SPREAD.default;
export function setClampSpread(factor: number) {
  clampSpread = Math.min(CLAMP_SPREAD.max, Math.max(CLAMP_SPREAD.min, Number.isFinite(factor) ? factor : CLAMP_SPREAD.default));
  return clampSpread;
}
export function currentClampSpread() {
  return clampSpread;
}
/** The target's profile with the clamp's current gap. */
export function microProfile(target: MicroTarget): MicroTargetProfile {
  const base = MICRO_TARGETS[target];
  return { ...base, gap: base.gap * clampSpread };
}
