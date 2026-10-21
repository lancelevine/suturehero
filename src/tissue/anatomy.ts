import type {Vector3} from 'three';
/** Shared visual layer bounds in the pad's undeformed material coordinates. */
export const TISSUE_LAYERS={
  epidermis:{bottom:0.38,top:0.41},
  dermis:{bottom:0.24,top:0.38},
  fat:{bottom:0.04,top:0.24},
} as const;
export const DERMAL_MIDPOINT=(TISSUE_LAYERS.dermis.bottom+TISSUE_LAYERS.dermis.top)/2;
export function isDermalBite(point:Vector3|null):point is Vector3 {
  return !!point && point.y>TISSUE_LAYERS.dermis.bottom && point.y<TISSUE_LAYERS.dermis.top && Math.abs(point.x)>=0.05 && Math.abs(point.x)<=2.67 && Math.abs(point.z)<=1.675;
}
