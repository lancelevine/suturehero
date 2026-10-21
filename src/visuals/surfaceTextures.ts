import * as THREE from 'three';
/** Small deterministic textures generated locally; no downloaded assets or network requests. */
const cache=new Map<string,THREE.DataTexture>();
function texture(kind: 'steel'|'cloth') {
  const cached=cache.get(kind); if(cached) return cached;
  const size=256,data=new Uint8Array(size*size*4); let seed=4217;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296;};
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
    const noise=random();
    const value=kind==='steel'?Math.round(175+Math.sin(y*1.7)*12+noise*18)
      :Math.round(155+((x%8<2 || y%8<2)?30:0)+noise*10);
    const offset=(y*size+x)*4; data[offset]=data[offset+1]=data[offset+2]=value; data[offset+3]=255;
  }
  const result=new THREE.DataTexture(data,size,size); result.wrapS=result.wrapT=THREE.RepeatWrapping;
  result.magFilter=THREE.LinearFilter; result.minFilter=THREE.LinearMipmapLinearFilter; result.generateMipmaps=true;
  result.repeat.set(kind==='cloth'?8:2,kind==='steel'?5:3); result.needsUpdate=true;
  cache.set(kind,result); return result;
}
export const steelTexture=()=>texture('steel');
export const clothTexture=()=>texture('cloth');

let steelMaps:{color:THREE.DataTexture;height:THREE.DataTexture;roughness:THREE.DataTexture}|undefined;
/** Separate steel pigment, machining height and roughness; linear data maps. */
export function steelSurface(){
  if(steelMaps)return steelMaps;
  const size=256,color=new Uint8Array(size*size*4),height=new Uint8Array(size*size*4),roughness=new Uint8Array(size*size*4);
  let seed=8137;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let x=0;x<size;x++){
    const grain=random(),scratch=random()<0.035?0.22:0;
    for(let y=0;y<size;y++){
      const j=(y*size+x)*4,detail=grain*0.75+random()*0.25;
      const tone=180+detail*24-scratch*20;
      color[j]=tone;color[j+1]=tone+4;color[j+2]=tone+7;color[j+3]=255;
      for(let k=0;k<3;k++){height[j+k]=100+detail*40-scratch*100;roughness[j+k]=135+detail*55+scratch*70;}
      height[j+3]=roughness[j+3]=255;
    }
  }
  const make=(data:Uint8Array,space:THREE.ColorSpace=THREE.NoColorSpace)=>{const t=new THREE.DataTexture(data,size,size);t.colorSpace=space;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(2,4);t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=4;t.needsUpdate=true;return t;};
  steelMaps={color:make(color,THREE.SRGBColorSpace),height:make(height),roughness:make(roughness)};return steelMaps;
}
