import {readFile} from 'node:fs/promises';
// SUTURE_CAMERA_PRESET=ov9281 rehearses the OV9281 cameras: 1280×800 monochrome at 120 fps
// (the 960×540 scene is scaled to the frame height and centred), and the app's camera type is set to match.
const PRESETS={ov9281:{width:1280,height:800,frameRate:120,monochrome:true,cameraMode:'ov9281'}};
export async function installSyntheticCamera(page,options={}){
 const preset=PRESETS[process.env.SUTURE_CAMERA_PRESET]??{};
 options={...preset,...options,frameRate:options.frameRate??preset.frameRate,secondFrameRate:options.secondFrameRate??preset.frameRate};
 await page.context().route('**/scripts/fixtures/aruco-4x4-50.png',async route=>route.fulfill({contentType:'image/png',body:await readFile(new URL('./fixtures/aruco-4x4-50.png',import.meta.url))}));
 await page.addInitScript(({muted,resolutionScale,jawEngine,frameRate,secondFrameRate,frameWidth,frameHeight,monochrome,cameraMode,frameDriven})=>{
  try{if(cameraMode&&window===window.top)localStorage.setItem('suturehero.cameraMode.v1',cameraMode);}catch{}
  try{if(frameDriven&&window===window.top)localStorage.setItem('suturehero.frameDrivenCapture.v1',frameDriven);}catch{}
  // These 2D scenes exercise the classic colored/striped jaw tracker.
  try{if(window===window.top&&!localStorage.getItem('suturehero.jawEngine.v1'))localStorage.setItem('suturehero.jawEngine.v1',jawEngine);}catch{}
  window.__ballScene={shift:0,open:false,distractor:false,marker:true,muted};window.__jawEvents=[];
  window.addEventListener('message',e=>{if(e.data?.type==='suturehero:jaw-opening')window.__jawEvents.push(e.data);});
  navigator.mediaDevices.enumerateDevices=async()=>[{kind:'videoinput',deviceId:'synthetic',label:'Synthetic ball pair camera',groupId:'test',toJSON(){return {};}},{kind:'videoinput',deviceId:'synthetic-secondary',label:'Synthetic second camera',groupId:'test-2',toJSON(){return {};}}];
  navigator.mediaDevices.getUserMedia=async constraints=>{
   const secondary=constraints?.video?.deviceId?.exact==='synthetic-secondary';
   const image=new Image();image.src='/scripts/fixtures/aruco-4x4-50.png';await image.decode();
   const canvas=document.createElement('canvas');canvas.width=frameWidth??960*resolutionScale;canvas.height=frameHeight??540*resolutionScale;const c=canvas.getContext('2d');const sceneScale=frameHeight?frameHeight/540:resolutionScale,offsetX=frameWidth?(frameWidth-960*sceneScale)/2:0;c.setTransform(sceneScale,0,0,sceneScale,offsetX,0);if(monochrome)c.filter='grayscale(1)';
   const draw=()=>{
    const s=secondary?{...window.__ballScene,...window.__ballScene.camera2}:window.__ballScene;c.fillStyle=s.background??'#eeeeee';c.fillRect(-offsetX/sceneScale,0,canvas.width/sceneScale,540);
    c.save();c.translate(480,270);c.scale(s.scale??1,s.scale??1);c.translate(-480,-270);
    if(s.marker){c.save();c.translate(398+s.shift,218+(s.yShift??0));c.rotate(s.angle??0);c.fillStyle='#eeeeee';c.fillRect(-24,-24,48,48);c.drawImage(image,320,20,60,60,-18,-18,36,36);c.restore();}
    if(s.extraMarker)c.drawImage(image,420,20,60,60,(s.extraMarkerX??424)+s.shift,200,36,36);
    if(s.striped){
     const ball=(x,y)=>{c.save();c.translate(x,y);c.rotate(s.bandAngle??0);c.beginPath();c.arc(0,0,10,0,2*Math.PI);c.clip();c.fillStyle='#f0f0f0';c.fillRect(-10,-10,20,20);c.fillStyle='#191919';if(!s.plainWhite)for(let band=-1;band<=1;band++)c.fillRect(band*4-.9,-10,1.8,20);c.restore();};
     if(!s.hideA)ball((s.distractor?310:400)+s.shift+(s.ballShift??0),340);ball((s.open?460:430)+(s.separationBias??0)+s.shift+(s.ballShift??0),340);
    }else{
    c.fillStyle=s.colorA??(s.muted?'rgb(120,95,90)':'rgb(225,50,60)');c.beginPath();c.arc((s.distractor?310:400)+s.shift,340,10,0,2*Math.PI);if(!s.hideA)c.fill();
    c.fillStyle=s.colorB??(s.muted?'rgb(90,100,130)':'rgb(30,100,235)');c.beginPath();c.arc((s.open?460:430)+(s.separationBias??0)+s.shift,340,10,0,2*Math.PI);c.fill();
    }
    c.restore();requestAnimationFrame(draw);
   };draw();const stream=canvas.captureStream(secondary?secondFrameRate:frameRate);const track=stream.getVideoTracks()[0],settings=track.getSettings.bind(track);track.getSettings=()=>({...settings(),deviceId:secondary?'synthetic-secondary':'synthetic'});return stream;
  };
 },{frameDriven:process.env.SUTURE_FRAME_DRIVEN,frameWidth:options.width,frameHeight:options.height,monochrome:!!options.monochrome,cameraMode:options.cameraMode,muted:!!options.muted,resolutionScale:options.resolutionScale??1,jawEngine:options.jawEngine??'classic',frameRate:options.frameRate??30,secondFrameRate:options.secondFrameRate??options.frameRate??30});
}
