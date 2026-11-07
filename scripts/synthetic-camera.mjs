import {readFile} from 'node:fs/promises';
export async function installSyntheticCamera(page,options={}){
 await page.context().route('**/scripts/fixtures/aruco-4x4-50.png',async route=>route.fulfill({contentType:'image/png',body:await readFile(new URL('./fixtures/aruco-4x4-50.png',import.meta.url))}));
 await page.addInitScript(({muted,resolutionScale})=>{
  window.__ballScene={shift:0,open:false,distractor:false,marker:true,muted};window.__jawEvents=[];
  window.addEventListener('message',e=>{if(e.data?.type==='suturehero:jaw-opening')window.__jawEvents.push(e.data);});
  navigator.mediaDevices.enumerateDevices=async()=>[{kind:'videoinput',deviceId:'synthetic',label:'Synthetic ball pair camera',groupId:'test',toJSON(){return {};}},{kind:'videoinput',deviceId:'synthetic-secondary',label:'Synthetic second camera',groupId:'test-2',toJSON(){return {};}}];
  navigator.mediaDevices.getUserMedia=async constraints=>{
   const secondary=constraints?.video?.deviceId?.exact==='synthetic-secondary';
   const image=new Image();image.src='/scripts/fixtures/aruco-4x4-50.png';await image.decode();
   const canvas=document.createElement('canvas');canvas.width=960*resolutionScale;canvas.height=540*resolutionScale;const c=canvas.getContext('2d');c.setTransform(resolutionScale,0,0,resolutionScale,0,0);
   const draw=()=>{
    const s=secondary?{...window.__ballScene,...window.__ballScene.camera2}:window.__ballScene;c.fillStyle='#eeeeee';c.fillRect(0,0,960,540);
    c.save();c.translate(480,270);c.scale(s.scale??1,s.scale??1);c.translate(-480,-270);
    if(s.marker){c.save();c.translate(398+s.shift,218);c.rotate(s.angle??0);c.drawImage(image,320,20,60,60,-18,-18,36,36);c.restore();}
    if(s.extraMarker)c.drawImage(image,420,20,60,60,(s.extraMarkerX??424)+s.shift,200,36,36);
    c.fillStyle=s.colorA??(s.muted?'rgb(120,95,90)':'rgb(225,50,60)');c.beginPath();c.arc((s.distractor?310:400)+s.shift,340,10,0,2*Math.PI);if(!s.hideA)c.fill();
    c.fillStyle=s.colorB??(s.muted?'rgb(90,100,130)':'rgb(30,100,235)');c.beginPath();c.arc((s.open?460:430)+(s.separationBias??0)+s.shift,340,10,0,2*Math.PI);c.fill();
    c.restore();requestAnimationFrame(draw);
   };draw();return canvas.captureStream(30);
  };
 },{muted:!!options.muted,resolutionScale:options.resolutionScale??1});
}
