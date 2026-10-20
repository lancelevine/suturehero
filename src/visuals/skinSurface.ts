import * as THREE from 'three';
let cached: {color: THREE.DataTexture; height: THREE.DataTexture; roughness: THREE.DataTexture} | undefined;
/** Separate skin color and height maps keep pores visible without painted-on dark dots. */
export function skinSurface() {
  if(cached) return cached;
  const size=512,heights=new Float32Array(size*size);
  let seed=9713;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
    heights[y*size+x]=0.52+(random()-0.5)*0.035+0.025*Math.sin(x*0.19+Math.sin(y*0.07));
  }
  // Irregular follicle depressions with a soft raised edge; wrap to avoid seams.
  for(let pore=0;pore<1000;pore++) {
    const cx=Math.floor(random()*size),cy=Math.floor(random()*size),radius=2+random()*2.5;
    for(let dy=-5;dy<=5;dy++)for(let dx=-5;dx<=5;dx++) {
      const d=Math.hypot(dx,dy)/radius;
      const index=((cy+dy+size)%size)*size+(cx+dx+size)%size;
      heights[index]-=0.32*Math.exp(-d*d*2);
      heights[index]+=0.035*Math.exp(-(((d-1.1)*4)**2));
    }
  }
  // Faint natural creases rather than a regular noise-only surface.
  for(let line=0;line<10;line++) {
    const base=random()*size,phase=random()*Math.PI*2;
    for(let x=0;x<size;x++) {
      const y=Math.round(base+7*Math.sin(x/size*Math.PI*2+phase)+3*Math.sin(x/size*Math.PI*6));
      for(let offset=-1;offset<=1;offset++)heights[((y+offset+size)%size)*size+x]-=offset===0?0.1:0.04;
    }
  }
  const color=new Uint8Array(size*size*4),height=new Uint8Array(size*size*4),roughness=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
    const i=y*size+x,j=i*4;
    const mottling=5*Math.sin(x/size*Math.PI*4)*Math.sin(y/size*Math.PI*6)+3*Math.cos((x+y)/size*Math.PI*2);
    const tone=mottling+(heights[i]-0.5)*48;
    color[j]=211+tone; color[j+1]=163+tone; color[j+2]=147+tone; color[j+3]=255;
    const h=Math.round(THREE.MathUtils.clamp(heights[i],0,1)*255);
    const r=Math.round(THREE.MathUtils.clamp(0.72+(0.52-heights[i])*0.35,0,1)*255);
    for(let channel=0;channel<3;channel++) {height[j+channel]=h;roughness[j+channel]=r;}
    height[j+3]=roughness[j+3]=255;
  }
  const make=(data: Uint8Array,colorSpace: THREE.ColorSpace=THREE.NoColorSpace)=>{
    const texture=new THREE.DataTexture(data,size,size); texture.colorSpace=colorSpace;
    texture.wrapS=texture.wrapT=THREE.RepeatWrapping; texture.magFilter=THREE.LinearFilter;
    texture.minFilter=THREE.LinearMipmapLinearFilter; texture.generateMipmaps=true; texture.anisotropy=4; texture.needsUpdate=true;
    return texture;
  };
  cached={color:make(color,THREE.SRGBColorSpace),height:make(height),roughness:make(roughness)};
  return cached;
}
