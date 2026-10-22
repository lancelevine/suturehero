import {THREAD_RADIUS} from './threadMaterial';
import * as THREE from 'three';

/** Observes a live material opening. This is passage feedback, not knot topology. */
export class TailPassage {
  state='Form a wrap around the driver';
  private indices:number[]=[];
  private previous?:{tip:THREE.Vector3;center:THREE.Vector3;side:number};
  private crossed=false;
  private crossing?:{first:number;last:number;normal:THREE.Vector3;side:number;wraps:number;direction:number;via:'tip'|'strand'};
  private wraps=0;
  private direction=0;
  get passage(){return this.crossing;}
  get hasOpening(){return this.indices.length>0;}
  reset(){this.indices=[];this.previous=undefined;this.crossed=false;this.crossing=undefined;this.state='Form a wrap around the driver';}
  update(points:readonly THREE.Vector3[],tip:THREE.Vector3,driver:THREE.Matrix4,holdingTail:boolean,minimumIndex=0,requiredWraps=1,shortPoints?:readonly THREE.Vector3[]){
    if(this.crossed&&requiredWraps!==0){this.state='Short tip passed through the opening · Knot not assessed';return;}
    if(!this.indices.length||requiredWraps===0){
      const inverse=driver.clone().invert();let run:number[]=[],angle=0,last=0;
      let best:number[]=[],bestAngle=0;
      const consider=()=>{if(Math.abs(angle)>Math.abs(bestAngle)&&Math.abs(angle)>=Math.PI*2*(Math.max(1,requiredWraps)-.2)){best=run.slice();bestAngle=angle;}};
      for(let i=minimumIndex;i<points.length;i++){
        const p=points[i].clone().applyMatrix4(inverse),r=Math.hypot(p.x,p.y),a=Math.atan2(p.y,p.x);
        // The working jaws extend forward of the shaft. Fine jaw wraps
        // and loose loops around that metal are still valid openings.
        if(r>0.4||r<0.025||p.z<-.07||p.z>2.9){consider();run=[];angle=0;continue;}
        if(run.length)angle+=Math.atan2(Math.sin(a-last),Math.cos(a-last));
        run.push(i);last=a;
      }
      consider();
      const observedWraps=Math.max(1,Math.floor(Math.abs(bestAngle)/(Math.PI*2)+.2));
      if(best.length&&(!this.indices.length||observedWraps>this.wraps)){
        const angularStep=(a:number,b:number)=>{
          const p=points[a].clone().applyMatrix4(inverse),q=points[b].clone().applyMatrix4(inverse);
          const delta=Math.atan2(q.y,q.x)-Math.atan2(p.y,p.x);
          return Math.abs(Math.atan2(Math.sin(delta),Math.cos(delta)));
        };
        // Straight radial arms can now lie inside the jaw/loose-wrap search
        // volume. They do not wind around the driver or define its opening.
        while(best.length>3&&angularStep(best[0],best[1])<.015)best.shift();
        while(best.length>3&&angularStep(best.at(-2)!,best.at(-1)!)<.015)best.pop();
        // Trim the exterior arms: their radial spread does not describe the
        // opening supported by the shaft and can swamp its fitted geometry.
        const radial=(i:number)=>{const p=points[i].clone().applyMatrix4(inverse);return Math.hypot(p.x,p.y);};
        const radii=best.map(radial).sort((a,b)=>a-b),limit=radii[Math.floor(radii.length/2)]*1.25;
        while(best.length>3&&radial(best[0])>limit)best.shift();
        while(best.length>3&&radial(best.at(-1)!)>limit)best.pop();
        if(best[0]!==this.indices[0]||best.at(-1)!==this.indices.at(-1))this.previous=undefined;
        this.indices=best;this.wraps=observedWraps;this.direction=Math.sign(bestAngle);
        if(this.crossing)this.crossing={...this.crossing,first:best[0],last:best.at(-1)!,wraps:this.wraps,direction:this.direction,normal:new THREE.Vector3(0,0,1).transformDirection(driver).multiplyScalar(this.direction)};
      }
    }
    if(this.crossed){this.state='Short tip passed through the opening · Knot not assessed';return;}
    if(!this.indices.length){this.previous=undefined;this.state='Form a wrap around the driver';return;}
    const loop=this.indices.map(i=>points[i]);
    const center=new THREE.Vector3();loop.forEach(p=>center.add(p));center.divideScalar(loop.length);
    const normal=new THREE.Vector3();for(let i=0;i<loop.length;i++)normal.add(loop[i].clone().sub(center).cross(loop[(i+1)%loop.length].clone().sub(center)));
    // A shaft-supported wrap is helical, not a planar ring. Its opening
    // is the winding projected perpendicular to the shaft, not a fitted plane
    // tilted by the outgoing arms.
    const axis=new THREE.Vector3(0,0,1).transformDirection(driver);
    const area=Math.abs(normal.dot(axis))/2;
    // In a double wrap the distal turn reaches the held tip first. Remember
    // that passage while the remaining turn is still supported by the shaft.
    if(this.wraps>1){const leading=Math.min(...loop.map(p=>p.dot(axis)));center.addScaledVector(axis,leading-center.dot(axis));}
    if(area<Math.PI*(THREAD_RADIUS*2)**2){this.reset();return;}
    normal.copy(axis).multiplyScalar(this.direction);
    // The observed material bight can flatten or become elliptical while
    // leaving the jaws. Its projected winding still defines the live opening;
    // a circular-diameter test discards valid wraps just before tail passage.
    const side=tip.clone().sub(center).dot(normal);
    const openingAxis=loop[0].clone().sub(center).projectOnPlane(normal).normalize(),other=normal.clone().cross(openingAxis);
    const polygon=loop.map(p=>{const v=p.clone().sub(center);return new THREE.Vector2(v.dot(openingAxis),v.dot(other));});
    const insideOpening=(relative:THREE.Vector3)=>{
      const x=relative.dot(openingAxis),y=relative.dot(other);let winding=0,clearance=Infinity;
      for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
        const a=polygon[j],b=polygon[i];
        if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)winding+=b.y>a.y?1:-1;
        const delta=b.clone().sub(a),t=THREE.MathUtils.clamp(new THREE.Vector2(x,y).sub(a).dot(delta)/Math.max(delta.lengthSq(),1e-10),0,1);
        // The closure of an open material bight is a geometric construction,
        // not an additional strand that should block a held tail.
        if(i!==0)clearance=Math.min(clearance,new THREE.Vector2(x,y).distanceTo(a.clone().addScaledVector(delta,t)));
      }
      return winding!==0&&clearance>THREAD_RADIUS*2;
    };
    const cross=(via:'tip'|'strand')=>{this.crossed=true;this.crossing={first:this.indices[0],last:this.indices.at(-1)!,normal:normal.clone(),side:Math.sign(side)||1,wraps:this.wraps,direction:this.direction,via};};
    const old=this.previous;
    if(holdingTail&&old&&old.side*side<0&&Math.abs(side)>=0.012){
      const fraction=old.side/(old.side-side);
      const relative=old.tip.clone().sub(old.center).lerp(tip.clone().sub(center),fraction);
      if(insideOpening(relative))cross('tip');
    }
    // Grasp-before-wrap can put the short strand through the opening without
    // its endpoint ever crossing a newly observed plane. Test actual material.
    if(holdingTail&&!this.crossed&&shortPoints)for(let i=shortPoints.length-2;i>=0;i--){
      const a=shortPoints[i].clone().sub(center),b=shortPoints[i+1].clone().sub(center),sa=a.dot(normal),sb=b.dot(normal);
      if(sa*sb>0||Math.abs(sa-sb)<.001)continue;
      if(insideOpening(a.lerp(b,sa/(sa-sb)))){cross('strand');break;}
    }
    if(!holdingTail)this.previous=undefined;
    else if(Math.abs(side)>=0.012)this.previous={tip:tip.clone(),center,side};
    this.state=this.crossed?'Short tip passed through the opening · Knot not assessed':holdingTail?'Short tail held · Move its gold tip through the live opening':'Wrap opening detected · Grasp the gold short tip';
  }
}
