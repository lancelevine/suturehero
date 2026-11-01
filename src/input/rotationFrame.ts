import type {Axis} from './InstrumentCalibration';
/** Rotation-vector mappings must describe a proper coordinate rotation.
 * A reflection reverses composition order and can reverse tilt after shaft roll. */
export function rotationFrameHandedness(axes:readonly Axis[],invert:readonly boolean[]){
 let sign=1;
 for(let i=0;i<3;i++){if(invert[i])sign=-sign;for(let j=i+1;j<3;j++)if(axes[i]>axes[j])sign=-sign;}
 return sign;
}
export function coherentRotationInvert(axes:readonly Axis[],invert:readonly boolean[],companion:Axis=1):[boolean,boolean,boolean]{
 const result=[...invert] as [boolean,boolean,boolean];
 if(rotationFrameHandedness(axes,result)<0)result[companion]=!result[companion];
 return result;
}
