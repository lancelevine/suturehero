export const SKIN_TYPES=[
 {id:'thin',label:'Thin dermis',dermalBottom:.30},
 {id:'standard',label:'Standard dermis',dermalBottom:.24},
 {id:'thick',label:'Thick dermis',dermalBottom:.14},
] as const;
export type SkinType=typeof SKIN_TYPES[number]['id'];
