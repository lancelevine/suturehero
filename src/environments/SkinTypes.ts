/**
 * Skin types. `tear` is when a forced Sandbox needle tears out (src/tissue/FreeNeedlePass.ts):
 * degrees off the curve, arc-centre push (scene units, 27 mm each), and how long. Fragile skin
 * tears sooner. Approximate practice values, not measured tissue properties.
 */
export const SKIN_TYPES=[
 {id:'thin',label:'Thin dermis',dermalBottom:.30,tear:{degrees:30,units:.22,seconds:.35}},
 {id:'standard',label:'Standard dermis',dermalBottom:.24,tear:{degrees:35,units:.26,seconds:.4}},
 {id:'thick',label:'Thick dermis',dermalBottom:.14,tear:{degrees:48,units:.34,seconds:.55}},
 {id:'fragile',label:'Fragile thin skin',dermalBottom:.30,tear:{degrees:22,units:.16,seconds:.25}},
] as const;
export type SkinType=typeof SKIN_TYPES[number]['id'];
