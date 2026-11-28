import * as THREE from 'three';
import type { SkinLook } from '../environments/bodySites';
type SkinMaps = {color: THREE.DataTexture; height: THREE.DataTexture; roughness: THREE.DataTexture};
/** Default (forearm-like) look; body sites (src/environments/bodySites.ts) pass their own. */
const DEFAULT_LOOK: SkinLook = { tone: [202, 150, 133], pores: 1500, creases: 16, hair: 0, freckles: 0 };
const cache = new Map<string, SkinMaps>();
/** Separate skin color and height maps keep pores visible without painted-on dark dots. */
export function skinSurface(look: SkinLook = DEFAULT_LOOK) {
  const key=JSON.stringify(look);
  const cached=cache.get(key);
  if(cached) return cached;
  const size=512,heights=new Float32Array(size*size);
  let seed=9713;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
    heights[y*size+x]=0.52+(random()-0.5)*0.035+0.025*Math.sin(x*0.19+Math.sin(y*0.07));
  }
  // Irregular follicle depressions with a soft raised edge; wrap to avoid seams.
  for(let pore=0;pore<look.pores;pore++) {
    const cx=Math.floor(random()*size),cy=Math.floor(random()*size),radius=2+random()*2.5;
    for(let dy=-5;dy<=5;dy++)for(let dx=-5;dx<=5;dx++) {
      const d=Math.hypot(dx,dy)/radius;
      const index=((cy+dy+size)%size)*size+(cx+dx+size)%size;
      heights[index]-=0.32*Math.exp(-d*d*2);
      heights[index]+=0.035*Math.exp(-(((d-1.1)*4)**2));
    }
  }
  // Faint natural creases rather than a regular noise-only surface.
  for(let line=0;line<look.creases;line++) {
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
    const tone=mottling*1.3+(heights[i]-0.5)*36;
    color[j]=look.tone[0]+tone; color[j+1]=look.tone[1]+tone; color[j+2]=look.tone[2]+tone; color[j+3]=255;
    const h=Math.round(THREE.MathUtils.clamp(heights[i],0,1)*255);
    const r=Math.round(THREE.MathUtils.clamp(0.72+(0.52-heights[i])*0.35,0,1)*255);
    for(let channel=0;channel<3;channel++) {height[j+channel]=h;roughness[j+channel]=r;}
    height[j+3]=roughness[j+3]=255;
  }
  // Body-site details: freckles (small darker spots) and short dark hair stubs (scalp).
  const darken=(x:number,y:number,amount:number)=>{const j=(((y+size)%size)*size+(x+size)%size)*4;for(let c=0;c<3;c++)color[j+c]=Math.max(0,color[j+c]-amount);};
  for(let spot=0;spot<look.freckles;spot++){const cx=Math.floor(random()*size),cy=Math.floor(random()*size),r=1+random()*2.2,depth=18+random()*22;for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){const d=Math.hypot(dx,dy)/r;if(d<1)darken(cx+dx,cy+dy,depth*(1-d*d));}}
  for(let stub=0;stub<look.hair;stub++){const cx=Math.floor(random()*size),cy=Math.floor(random()*size),angle=random()*Math.PI,length=3+random()*4;for(let t=0;t<length;t++){const j=(((Math.round(cy+Math.sin(angle)*t)+size)%size)*size+(Math.round(cx+Math.cos(angle)*t)+size)%size)*4;color[j]=52;color[j+1]=38;color[j+2]=32;}}
  const make=(data: Uint8Array,colorSpace: THREE.ColorSpace=THREE.NoColorSpace)=>{
    const texture=new THREE.DataTexture(data,size,size); texture.colorSpace=colorSpace;
    texture.wrapS=texture.wrapT=THREE.RepeatWrapping; texture.magFilter=THREE.LinearFilter;
    texture.minFilter=THREE.LinearMipmapLinearFilter; texture.generateMipmaps=true; texture.anisotropy=4; texture.needsUpdate=true;
    return texture;
  };
  const maps={color:make(color,THREE.SRGBColorSpace),height:make(height),roughness:make(roughness)};
  cache.set(key,maps);
  return maps;
}
