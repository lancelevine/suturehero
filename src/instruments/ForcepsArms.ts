import * as THREE from 'three';
/** Continuous spring arms: each gripping face is the end of its arm, not an added jaw. */
export class ForcepsArms {
  readonly root=new THREE.Group();
  readonly arms: THREE.Mesh[]=[];
  private readonly sections=48;
  private lastOpenness=NaN;
  constructor(material: THREE.Material) {
    for(const side of [-1,1]) {
      const geometry=new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array((this.sections+1)*4*3),3));
      const indices:number[]=[];
      for(let i=0;i<this.sections;i++)for(let j=0;j<4;j++) {
        const a=i*4+j,b=i*4+(j+1)%4,c=(i+1)*4+j,d=(i+1)*4+(j+1)%4;
        indices.push(a,c,b,b,c,d);
      }
      indices.push(0,1,2,0,2,3);
      const end=this.sections*4; indices.push(end,end+2,end+1,end,end+3,end+2);
      if(side===1) for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
      geometry.setIndex(indices);
      const mesh=new THREE.Mesh(geometry,material); this.arms.push(mesh); this.root.add(mesh);
    }
    this.update(0.65);
  }
  update(openness: number) {
    if(openness===this.lastOpenness) return;
    this.lastOpenness=openness;
    this.arms.forEach((arm,index)=>{
      const side=index===0?-1:1; const position=arm.geometry.getAttribute('position');
      for(let i=0;i<=this.sections;i++) {
        const t=i/this.sections,z=t*3.1;
        const gap=openness*0.18*(1-t)+0.085*Math.sin(Math.PI*t);
        const width=0.045+0.05*Math.sin(Math.PI*t);
        // Shallow serrations are cut into the continuous inner gripping surface.
        const serration=z<0.28?0.003*Math.sin(z/0.028*Math.PI)**2:0;
        const inner=side*(gap+serration),outer=side*(gap+width);
        position.setXYZ(i*4,inner,-0.035,z); position.setXYZ(i*4+1,outer,-0.035,z);
        position.setXYZ(i*4+2,outer,0.035,z); position.setXYZ(i*4+3,inner,0.035,z);
      }
      position.needsUpdate=true; arm.geometry.computeVertexNormals(); arm.geometry.computeBoundingSphere();
    });
  }
}
