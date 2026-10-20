import * as THREE from 'three';
/** Local visual approximation around one stitch; not an elastic material model. */
export class WoundApproximation {
  closure=0;
  readonly initialGap=0.1;
  readonly minimumGap=0.012;
  update(target: number,dt: number) {
    const clamped=THREE.MathUtils.clamp(target,0,1);
    this.closure=THREE.MathUtils.lerp(this.closure,clamped,1-Math.exp(-10*Math.max(0,Math.min(dt,0.05))));
    if(Math.abs(this.closure-clamped)<0.0001)this.closure=clamped;
  }
  private influence(z: number) {return Math.exp(-((z/0.6)**2));}
  gapAt(z: number) {return this.initialGap-(this.initialGap-this.minimumGap)*this.closure*this.influence(z);}
  deformPoint(point: THREE.Vector3,target=point.clone()) {
    const support=Math.max(0,1-Math.max(0,Math.abs(point.x)-this.initialGap/2)/1.4);
    const shift=(this.initialGap-this.minimumGap)/2*this.closure*this.influence(point.z)*support;
    return target.set(point.x-Math.sign(point.x)*shift,point.y,point.z);
  }
  reset() {this.closure=0;}
}
