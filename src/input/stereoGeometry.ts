/** Calibrated stereo geometry. All 3D coordinates are millimeters in camera 1's frame. */
export type Point={x:number;y:number};
type Matrix=number[][];
export type StereoCalibration={
 format:string;imageSize:{width:number;height:number};
 camera1:{cameraMatrix:Matrix;distortionCoefficients:number[]};
 camera2:{cameraMatrix:Matrix;distortionCoefficients:number[]};
 stereo:{rotation:Matrix;translationMm:number[];baselineMm?:number;rmsPx?:number};
 cameraIds?:{first:string;second:string};
};
const dot=(a:number[],b:number[])=>a.reduce((s,v,i)=>s+v*b[i],0);
const norm=(v:number[])=>Math.hypot(...v);
const unit=(v:number[])=>v.map(x=>x/norm(v));
const cross=(a:number[],b:number[])=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const transpose=(m:Matrix)=>m[0].map((_,i)=>m.map(row=>row[i]));
const mv=(m:Matrix,v:number[])=>m.map(row=>dot(row,v));
const sub=(a:number[],b:number[])=>a.map((x,i)=>x-b[i]);
const add=(a:number[],b:number[])=>a.map((x,i)=>x+b[i]);
const mul=(v:number[],s:number)=>v.map(x=>x*s);
function validMatrix(m:unknown):m is Matrix{return Array.isArray(m)&&m.length===3&&m.every(row=>Array.isArray(row)&&row.length===3&&row.every(x=>typeof x==='number'&&Number.isFinite(x)));}
export function parseCalibration(raw:unknown):StereoCalibration{
 const c=raw as StereoCalibration;
 if(!c||c.format!=='suturehero-stereo-calibration-v1'||!Number.isInteger(c.imageSize?.width)||!Number.isInteger(c.imageSize?.height)||c.imageSize.width<=0||c.imageSize.height<=0||
 !validMatrix(c.camera1?.cameraMatrix)||!validMatrix(c.camera2?.cameraMatrix)||!validMatrix(c.stereo?.rotation)||
 !Array.isArray(c.stereo?.translationMm)||c.stereo.translationMm.length!==3||!c.stereo.translationMm.every(Number.isFinite)||
 !Array.isArray(c.camera1.distortionCoefficients)||!Array.isArray(c.camera2.distortionCoefficients)||
 ![...c.camera1.distortionCoefficients,...c.camera2.distortionCoefficients].every(Number.isFinite)||
 norm(c.stereo.translationMm)<10)throw Error('Invalid stereo calibration. Import a solved calibration JSON, not raw capture images.');
 return c;
}
function undistort(p:Point,k:Matrix,d:number[],size:{width:number;height:number},source:{width:number;height:number}){
 const sx=source.width/size.width,sy=source.height/size.height;
 const xd=(p.x-k[0][2]*sx)/(k[0][0]*sx),yd=(p.y-k[1][2]*sy)/(k[1][1]*sy);
 let x=xd,y=yd;
 const [k1=0,k2=0,p1=0,p2=0,k3=0]=d;
 for(let i=0;i<9;i++){
  const r2=x*x+y*y,radial=1+k1*r2+k2*r2*r2+k3*r2*r2*r2;
  if(Math.abs(radial)<1e-8)break;
  const dx=2*p1*x*y+p2*(r2+2*x*x),dy=p1*(r2+2*y*y)+2*p2*x*y;
  x=(xd-dx)/radial;y=(yd-dy)/radial;
 }
 return [x,y,1];
}
export type StereoPoint={xyzMm:[number,number,number];rectified:[Point,Point];epipolarErrorPx:number;rayGapMm:number;depthMm:number};
export function triangulate(c:StereoCalibration,p1:Point,p2:Point,size1:{width:number;height:number},size2:{width:number;height:number}):StereoPoint|null{
 const a=undistort(p1,c.camera1.cameraMatrix,c.camera1.distortionCoefficients,c.imageSize,size1);
 const b=undistort(p2,c.camera2.cameraMatrix,c.camera2.distortionCoefficients,c.imageSize,size2);
 const R=c.stereo.rotation,T=c.stereo.translationMm,rt=transpose(R);
 // X2 = R*X1 + T; camera 2 center expressed in camera 1 frame.
 const C=mul(mv(rt,T),-1),u=unit(a),v=unit(mv(rt,b));
 const w=mul(C,-1),uv=dot(u,v),den=1-uv*uv;
 if(den<1e-6)return null;
 const t=(-dot(u,w)+uv*dot(v,w))/den,s=(-uv*dot(u,w)+dot(v,w))/den;
 if(t<=0||s<=0)return null;
 const q1=mul(u,t),q2=add(C,mul(v,s)),mid=mul(add(q1,q2),.5);
 const gap=norm(sub(q1,q2));
 // Rectify both rays onto a common baseline-aligned image plane.
 const ex=unit(C),forward=unit(add([0,0,1],mv(rt,[0,0,1])));
 let ey=unit(cross(forward,ex));if(norm(ey)<1e-6)return null;
 const ez=unit(cross(ex,ey));
 const rect=(ray:number[]):Point=>({x:dot(ray,ex)/dot(ray,ez),y:dot(ray,ey)/dot(ray,ez)});
 const ra=rect(a),rb=rect(mv(rt,b));
 const f=(c.camera1.cameraMatrix[1][1]+c.camera2.cameraMatrix[1][1])/2;
 const epipolarErrorPx=Math.abs(ra.y-rb.y)*f;
 if(!mid.every(Number.isFinite)||!Number.isFinite(epipolarErrorPx)||dot(mid,ez)<=0)return null;
 return {xyzMm:mid as [number,number,number],rectified:[ra,rb],epipolarErrorPx,rayGapMm:gap,depthMm:mid[2]};
}
export function calibrationMatches(c:StereoCalibration,first:string,second:string,w1:number,h1:number,w2:number,h2:number):string|null{
 if(c.cameraIds&&((c.cameraIds.first&&c.cameraIds.first!==first)||(c.cameraIds.second&&c.cameraIds.second!==second)))return 'Camera IDs differ from saved calibration';
 if(!w1||!h1||!w2||!h2)return 'Start both cameras';
 if(Math.abs(w1/h1-c.imageSize.width/c.imageSize.height)>.015||Math.abs(w2/h2-c.imageSize.width/c.imageSize.height)>.015)return 'Camera aspect ratio differs from calibration';
 return null;
}
