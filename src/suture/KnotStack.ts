import type {FreeThrow} from './FreeThrow';
import type {ThreadStrand} from './ThreadStrand';

/** Material continuity and proximity, rather than throw count, establish a stack.
 * This is a geometric approximation, not a knot-security assessment. */
type StackThrow=Pick<FreeThrow,'phase'|'first'|'last'|'shortMaterialCoordinate'>;
export function throwsAreStacked(lower:StackThrow,upper:StackThrow,long:ThreadStrand,short:ThreadStrand){
  if(lower.phase!=='seated'||upper.phase!=='seated'||upper.first<=lower.last)return false;
  const gap=long.points[upper.first].distanceTo(long.points[lower.last]);
  const postGap=short.pointAt(upper.shortMaterialCoordinate).distanceTo(short.pointAt(lower.shortMaterialCoordinate));
  const longBridge=long.materialLengthBetween(lower.last,upper.first);
  const shortBridge=short.materialLengthBetween(lower.shortMaterialCoordinate,upper.shortMaterialCoordinate);
  return upper.shortMaterialCoordinate>=lower.shortMaterialCoordinate&&gap<.1&&postGap<.1&&
    longBridge-gap<long.restLength*2.5&&shortBridge-postGap<short.restLength*2.5;
}
