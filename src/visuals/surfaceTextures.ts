import * as THREE from 'three';
/** Small deterministic textures generated locally; no downloaded assets or network requests. */
const cache=new Map<string,THREE.DataTexture>();
function texture(kind: 'skin'|'steel'|'cloth') {
  const cached=cache.get(kind); if(cached) return cached;
  const size=256,data=new Uint8Array(size*size*4); let seed=4217;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296;};
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
    const noise=random();
    const value=kind==='skin'?Math.round(205+noise*24+9*Math.sin(x*0.09)*Math.sin(y*0.11)-((x*17+y*31)%73===0?35:0))
      :kind==='steel'?Math.round(175+Math.sin(y*1.7)*12+noise*18)
      :Math.round(155+((x%8<2 || y%8<2)?30:0)+noise*10);
    const offset=(y*size+x)*4; data[offset]=data[offset+1]=data[offset+2]=value; data[offset+3]=255;
  }
  const result=new THREE.DataTexture(data,size,size); result.wrapS=result.wrapT=THREE.RepeatWrapping;
  result.magFilter=THREE.LinearFilter; result.minFilter=THREE.LinearMipmapLinearFilter; result.generateMipmaps=true;
  result.repeat.set(kind==='skin'?1.5:kind==='cloth'?8:2,kind==='steel'?5:kind==='skin'?1.5:3); result.needsUpdate=true;
  cache.set(kind,result); return result;
}
export const skinTexture=()=>texture('skin');
export const steelTexture=()=>texture('steel');
export const clothTexture=()=>texture('cloth');
