import * as THREE from 'three';
const cache=new Map<string,{color:THREE.DataTexture;height:THREE.DataTexture}>();
/** Deterministic cross-section detail: dermal fibers and irregular adipose lobules. */
export function tissueSurface(kind:'dermis'|'fat') {
  const existing=cache.get(kind);if(existing)return existing;
  const size=256,color=new Uint8Array(size*size*4),height=new Uint8Array(size*size*4);
  const centers=Array.from({length:64},(_,i)=>({x:(i%8+0.5+0.25*Math.sin(i*17))*32,y:(Math.floor(i/8)+0.5+0.25*Math.sin(i*23))*32}));
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const j=(y*size+x)*4;let detail:number;
    if(kind==='fat'){
      let first=Infinity,second=Infinity;
      for(const p of centers){const dx=Math.min(Math.abs(x-p.x),size-Math.abs(x-p.x)),dy=Math.min(Math.abs(y-p.y),size-Math.abs(y-p.y)),d=Math.hypot(dx,dy);if(d<first){second=first;first=d;}else second=Math.min(second,d);}
      detail=THREE.MathUtils.clamp((second-first)/9,0,1);
      color[j]=222+detail*19;color[j+1]=169+detail*30;color[j+2]=73+detail*44;
    }else{
      detail=0.5+0.22*Math.sin(y*0.55+Math.sin(x*0.08)*2)+0.12*Math.sin(x*0.4+y*0.7);
      color[j]=188+detail*23;color[j+1]=103+detail*30;color[j+2]=103+detail*25;
    }
    color[j+3]=255;for(let k=0;k<3;k++)height[j+k]=detail*255;height[j+3]=255;
  }
  const make=(data:Uint8Array,space:THREE.ColorSpace)=>{const t=new THREE.DataTexture(data,size,size);t.colorSpace=space;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;};
  const result={color:make(color,THREE.SRGBColorSpace),height:make(height,THREE.NoColorSpace)};cache.set(kind,result);return result;
}
