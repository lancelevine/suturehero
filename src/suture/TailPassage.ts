import * as THREE from 'three';

/** Observes a live material opening. This is passage feedback, not knot topology. */
export class TailPassage {
  state='Form a wrap around the driver';
  private indices:number[]=[];
  private previous?:{tip:THREE.Vector3;center:THREE.Vector3;side:number};
  private crossed=false;
  private crossing?:{first:number;last:number;normal:THREE.Vector3;side:number;wraps:number;direction:number};
  private wraps=0;
  private direction=0;
  get passage(){return this.crossing;}
  reset(){this.indices=[];this.previous=undefined;this.crossed=false;this.crossing=undefined;this.state='Form a wrap around the driver';}
  update(points:readonly THREE.Vector3[],tip:THREE.Vector3,driver:THREE.Matrix4,holdingTail:boolean,minimumIndex=0){
    if(this.crossed){this.state='Short tip passed through the opening · Knot not assessed';return;}
    if(!this.indices.length){
      const inverse=driver.clone().invert();let run:number[]=[],angle=0,last=0;
      let best:number[]=[],bestAngle=0;
      const consider=()=>{if(Math.abs(angle)>Math.abs(bestAngle)&&Math.abs(angle)>=Math.PI*1.6){best=run.slice();bestAngle=angle;}};
      for(let i=minimumIndex;i<points.length;i++){
        const p=points[i].clone().applyMatrix4(inverse),r=Math.hypot(p.x,p.y),a=Math.atan2(p.y,p.x);
        if(r>0.28||r<0.06||p.z<0.25||p.z>2.9){consider();run=[];angle=0;continue;}
        if(run.length)angle+=Math.atan2(Math.sin(a-last),Math.cos(a-last));
        run.push(i);last=a;
      }
      consider();
      if(best.length){
        // Trim the exterior arms: their radial spread does not describe the
        // opening supported by the shaft and can swamp its fitted geometry.
        const radial=(i:number)=>{const p=points[i].clone().applyMatrix4(inverse);return Math.hypot(p.x,p.y);};
        const radii=best.map(radial).sort((a,b)=>a-b),limit=radii[Math.floor(radii.length/2)]*1.25;
        while(best.length>3&&radial(best[0])>limit)best.shift();
        while(best.length>3&&radial(best.at(-1)!)>limit)best.pop();
        if(best[0]!==this.indices[0]||best.at(-1)!==this.indices.at(-1))this.previous=undefined;
        this.indices=best;this.wraps=Math.max(1,Math.floor(Math.abs(bestAngle)/(Math.PI*2)+0.2));this.direction=Math.sign(bestAngle);
      }
    }
    if(!this.indices.length){this.previous=undefined;this.state='Form a wrap around the driver';return;}
    const loop=this.indices.map(i=>points[i]);
    const center=new THREE.Vector3();loop.forEach(p=>center.add(p));center.divideScalar(loop.length);
    const normal=new THREE.Vector3();for(let i=0;i<loop.length;i++)normal.add(loop[i].clone().sub(center).cross(loop[(i+1)%loop.length].clone().sub(center)));
    // A shaft-supported wrap is helical, not a planar ring. Its opening
    // is the winding projected perpendicular to the shaft, not a fitted plane
    // tilted by the outgoing arms.
    const axis=new THREE.Vector3(0,0,1).transformDirection(driver);
    const area=Math.abs(normal.dot(axis))/2;
    if(area<0.008){this.reset();return;}
    normal.copy(axis).multiplyScalar(this.direction);
    // Reject an open radial path; axial spread is expected in a helical wrap.
    const radius=Math.sqrt(area/(Math.PI*Math.max(1,this.wraps)));
    if(loop[0].clone().sub(loop.at(-1)!).projectOnPlane(normal).length()>radius*2){
      this.indices=[];this.previous=undefined;this.state='Wrap opening distorted · Reform the wrap';return;
    }
    const side=tip.clone().sub(center).dot(normal);
    const old=this.previous;
    if(holdingTail&&old&&old.side*side<0&&Math.abs(side)>=0.012){
      const fraction=old.side/(old.side-side);
      const relative=old.tip.clone().sub(old.center).lerp(tip.clone().sub(center),fraction);
      const axis=loop[0].clone().sub(center).projectOnPlane(normal).normalize(),other=normal.clone().cross(axis);
      const x=relative.dot(axis),y=relative.dot(other);
      const polygon=loop.map(p=>{const v=p.clone().sub(center);return new THREE.Vector2(v.dot(axis),v.dot(other));});
      let winding=0,clearance=Infinity;
      for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
        const a=polygon[j],b=polygon[i];
        if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)winding+=b.y>a.y?1:-1;
        const delta=b.clone().sub(a),t=THREE.MathUtils.clamp(new THREE.Vector2(x,y).sub(a).dot(delta)/Math.max(delta.lengthSq(),1e-10),0,1);
        clearance=Math.min(clearance,new THREE.Vector2(x,y).distanceTo(a.clone().addScaledVector(delta,t)));
      }
      if(winding!==0&&clearance>0.019){this.crossed=true;this.crossing={first:this.indices[0],last:this.indices.at(-1)!,normal:normal.clone(),side:Math.sign(side),wraps:this.wraps,direction:this.direction};}
    }
    if(!holdingTail)this.previous=undefined;
    else if(Math.abs(side)>=0.012)this.previous={tip:tip.clone(),center,side};
    this.state=this.crossed?'Short tip passed through the opening · Knot not assessed':holdingTail?'Short tail held · Move its gold tip through the live opening':'Wrap opening detected · Grasp the gold short tip';
  }
}
