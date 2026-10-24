import {expect,it} from 'vitest';
import {planBites,DEFAULT_BITE_WIDTH} from './BitePlan';
import * as THREE from 'three';
import {NEEDLE_ARC,NEEDLE_EXPOSURE,NEEDLE_RADIUS} from '../suture/needleGeometry';
import {DERMAL_MIDPOINT,TISSUE_LAYERS,isDermalBite} from './anatomy';
import {NeedlePass} from './NeedlePass';
import {tissueTractPoints} from './sutureTract';
it('fits symmetric and asymmetric bites to the original needle circle and dermal layer',()=>{
 for(const [right,left] of [[1,1],[1.4,.6],[.6,1.4],[.5,.5],[1.5,1.5]]){
  const pass=new NeedlePass(),plan=pass.setBites(right*DEFAULT_BITE_WIDTH,left*DEFAULT_BITE_WIDTH)!;expect(plan).not.toBeNull();
  const needleTip=new THREE.Vector3(Math.cos(NEEDLE_ARC)*NEEDLE_RADIUS,0,Math.sin(NEEDLE_ARC)*NEEDLE_RADIUS);
  expect(needleTip.clone().applyMatrix4(pass.pose).distanceTo(pass.entry)).toBeLessThan(1e-8);
  pass.angle=pass.totalAngle-NEEDLE_EXPOSURE;expect(needleTip.clone().applyMatrix4(pass.pose).distanceTo(pass.exit)).toBeLessThan(1e-8);pass.angle=0;
  expect(pass.entry.distanceTo(pass.center)).toBeCloseTo(NEEDLE_RADIUS,10);expect(pass.exit.distanceTo(pass.center)).toBeCloseTo(NEEDLE_RADIUS,10);
  expect(pass.center.y-NEEDLE_RADIUS).toBeGreaterThanOrEqual(TISSUE_LAYERS.dermis.bottom+.0099);
  expect(pass.center.y-NEEDLE_RADIUS).toBeLessThan(DERMAL_MIDPOINT);
  expect(pass.purchaseSites.every(isDermalBite)).toBe(true);
  const path=tissueTractPoints(pass.entry,pass.exit,33,pass.halfWidth);
  for(const point of path)expect(point.distanceTo(pass.center)).toBeCloseTo(NEEDLE_RADIUS,8);
  pass.begin();for(let i=0;i<120;i++)pass.update(1,true,.05);expect(pass.dermalBites.every(isDermalBite)).toBe(true);
 }
});
it('rejects invalid requests and locks a configured plan once the pass begins',()=>{
 expect(planBites(NaN,.2)).toBeNull();expect(planBites(-.1,.2)).toBeNull();
 const pass=new NeedlePass();pass.setBites(DEFAULT_BITE_WIDTH*1.3,DEFAULT_BITE_WIDTH*.7);const entry=pass.entry.clone();pass.begin();expect(pass.setBites(.2,.2)).toBeNull();expect(pass.entry.equals(entry)).toBe(true);
 pass.reset();pass.resetBites();expect(pass.customBites).toBe(false);expect(pass.center.x).toBe(0);
});
