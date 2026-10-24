import * as THREE from 'three';
import {NEEDLE_RADIUS} from '../suture/needleGeometry';
import {DERMAL_MIDPOINT,TISSUE_LAYERS} from './anatomy';
import {TRACT_HALF_WIDTH,TRACT_SURFACE} from './sutureTract';
/** Feasible circular skin bites keep the chosen needle radius and dermal purchase. */
export function planBites(right:number,left:number){
 if(!Number.isFinite(right)||!Number.isFinite(left)||right<=0||left<=0)return null;
 const radius=NEEDLE_RADIUS;
 const halfForBottom=(bottom:number)=>Math.sqrt(Math.max(0,radius*radius-Math.max(0,radius+bottom-TRACT_SURFACE)**2));
 const minimum=halfForBottom(DERMAL_MIDPOINT-.012),maximum=halfForBottom(TISSUE_LAYERS.dermis.bottom+.01);
 const half=THREE.MathUtils.clamp((right+left)/2,minimum,maximum);
 const centerY=TRACT_SURFACE+Math.sqrt(Math.max(0,radius*radius-half*half));
 const purchaseHalf=Math.sqrt(Math.max(0,radius*radius-(centerY-DERMAL_MIDPOINT)**2));
 if(purchaseHalf<.055)return null;
 const offset=THREE.MathUtils.clamp(half*(right-left)/(right+left),-(purchaseHalf-.052),purchaseHalf-.052);
 const start=Math.asin((centerY-TRACT_SURFACE)/radius);
 return {right:half+offset,left:half-offset,half,center:new THREE.Vector3(offset,centerY,0),start,sweep:Math.PI-2*start,
  limited:Math.abs(right-half-offset)>.001||Math.abs(left-half+offset)>.001};
}
export const DEFAULT_BITE_WIDTH=TRACT_HALF_WIDTH;
