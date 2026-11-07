import type {BallBlob} from './ballPairTracking';
export function sphereSeeds(pixels:Uint8ClampedArray,w:number,h:number,radius:number,global=false){
 const gray=new Uint8Array(w*h);for(let i=0;i<gray.length;i++)gray[i]=Math.round(.299*pixels[i*4]+.587*pixels[i*4+1]+.114*pixels[i*4+2]);
 const bin=global?4:2,bw=Math.ceil(w/bin),bh=Math.ceil(h/bin),votes=new Float32Array(bw*bh),step=global?Math.max(2,Math.floor(radius/7)):1;
 for(let y=1;y<h-1;y+=step)for(let x=1;x<w-1;x+=step){
  const i=y*w+x,gx=gray[i+1]-gray[i-1],gy=gray[i+w]-gray[i-w],g=Math.hypot(gx,gy);if(g<28)continue;
  for(const factor of [.85,1,1.15])for(const sign of [-1,1]){
   const cx=Math.round((x+sign*gx/g*radius*factor)/bin),cy=Math.round((y+sign*gy/g*radius*factor)/bin);
   if(cx>=0&&cy>=0&&cx<bw&&cy<bh)votes[cy*bw+cx]+=Math.min(g,180)/60;
  }
 }
 const peaks:Array<{x:number;y:number;score:number}>=[];
 for(let i=0;i<votes.length;i++)if(votes[i]>=4)peaks.push({x:(i%bw)*bin,y:Math.floor(i/bw)*bin,score:votes[i]});
 peaks.sort((a,b)=>b.score-a.score);const seeds:typeof peaks=[];
 for(const p of peaks)if(!seeds.some(s=>Math.hypot(s.x-p.x,s.y-p.y)<radius*.65)){seeds.push(p);if(seeds.length>=(global?64:14))break;}
 return {gray,seeds};
}
/** Continuation only: a prior stripe identity is required by the caller. */
export function findSphereSilhouette(pixels:Uint8ClampedArray,w:number,h:number,center:{x:number;y:number},radius:number):BallBlob[]{
 if(radius<4)return [];
 const {gray,seeds}=sphereSeeds(pixels,w,h,radius),candidates=[{...center,score:0},...seeds],result:BallBlob[]=[];
 const sample=(x:number,y:number)=>gray[Math.round(y)*w+Math.round(x)];
 for(const c of candidates)for(const factor of [.85,.95,1,1.05,1.15]){
  const r=radius*factor;if(c.x-r*1.3<0||c.y-r*1.3<0||c.x+r*1.3>=w||c.y+r*1.3>=h)continue;
  let strength=0,white=0,edges=0;const sectors=new Set<number>();
  for(let i=0;i<32;i++){
   const angle=i*Math.PI/16,dx=Math.cos(angle),dy=Math.sin(angle);
   const inside=sample(c.x+dx*r*.85,c.y+dy*r*.85),outside=sample(c.x+dx*r*1.15,c.y+dy*r*1.15),gradient=Math.abs(inside-outside);
   if(gradient>32){edges++;strength+=Math.min(gradient,150);sectors.add(Math.floor(i/4));}
   if(sample(c.x+dx*r*.55,c.y+dy*r*.55)>125)white++;
  }
  if(edges<8||sectors.size<6||white<14)continue;
  result.push({x:c.x,y:c.y,count:Math.PI*r*r,score:strength/32-Math.hypot(c.x-center.x,c.y-center.y)*.18-Math.abs(factor-1)*8});
 }
 result.sort((a,b)=>b.score-a.score);const found:BallBlob[]=[];
 for(const p of result)if(!found.some(q=>Math.hypot(q.x-p.x,q.y-p.y)<radius*.8)){found.push(p);if(found.length===6)break;}
 return found;
}
