import * as THREE from 'three';
import {TISSUE_LAYERS} from '../tissue/anatomy';
import {fieldShift,fieldLift,DEEP_DERMIS_Y,type TissueSite} from '../tissue/StitchField';
import type {NeedlePass} from '../tissue/NeedlePass';
import type {EdgeEversion} from '../tissue/EdgeEversion';
/** Optional 2D slice of the same geometric tissue field used by the 3D pad. */
export class CrossSectionView {
 private sites?:readonly TissueSite[];private revision=-1;private plan='';
 constructor(private canvas:HTMLCanvasElement,private readout:HTMLElement){}
 update(sites:readonly TissueSite[],siteZ:number,pass:NeedlePass,edge:EdgeEversion){
  const key=[siteZ,pass.center.x,pass.center.y,pass.radius,pass.startAngle].join('/');
  if(this.sites===sites&&this.revision===edge.revision&&this.plan===key)return;
  this.sites=sites;this.revision=edge.revision;this.plan=key;
  const ctx=this.canvas.getContext('2d');if(!ctx)return;
  ctx.clearRect(0,0,600,260);ctx.fillStyle='#12252c';ctx.fillRect(0,0,600,260);
  const point=new THREE.Vector3(),screen=(x:number,y:number)=>{
   // Interpolate the planned path through the empty incision without folding it across the midline.
   const shift=fieldShift(Math.max(.05,Math.abs(x)),siteZ,sites,y)*Math.min(1,Math.abs(x)/.05);
   point.set(x-Math.sign(x)*shift,y+fieldLift(x,y,siteZ,sites),0);
   edge.deformPoint(point,point);return [300+point.x*480,245-point.y*470] as const;
  };
  for(const [layer,color] of [[TISSUE_LAYERS.fat,'#d9b55b'],[TISSUE_LAYERS.dermis,'#c88479'],[TISSUE_LAYERS.epidermis,'#edb9a2']] as const){
   for(const side of [-1,1]){
    ctx.beginPath();
    for(let i=0;i<=32;i++){const [x,y]=screen(side*(.05+i*.5/32),layer.top);i?ctx.lineTo(x,y):ctx.moveTo(x,y);}
    for(let i=32;i>=0;i--){const [x,y]=screen(side*(.05+i*.5/32),layer.bottom);ctx.lineTo(x,y);}
    ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.strokeStyle='#102129';ctx.lineWidth=1;ctx.stroke();
   }
  }
  ctx.beginPath();ctx.setLineDash([5,4]);ctx.strokeStyle='#8ce3ee';ctx.lineWidth=2;
  const sweep=Math.PI-2*pass.startAngle;
  for(let i=0;i<=48;i++){
   const a=pass.startAngle+sweep*i/48,[x,y]=screen(pass.center.x+pass.radius*Math.cos(a),pass.center.y-pass.radius*Math.sin(a));
   i?ctx.lineTo(x,y):ctx.moveTo(x,y);
  }
  ctx.stroke();ctx.setLineDash([]);
  const surface=.1-2*fieldShift(.05,siteZ,sites),deep=.1-2*fieldShift(.05,siteZ,sites,DEEP_DERMIS_Y);
  this.readout.textContent=`Surface gap ${surface.toFixed(3)} · Deep dermal gap ${deep.toFixed(3)} practice units. ${deep-surface>.01?'Surface closure can hide a deeper opening.':'Compare the dermal edges beneath the surface.'}`;
 }
}
