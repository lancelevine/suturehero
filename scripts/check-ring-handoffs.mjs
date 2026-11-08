import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {chromium} from 'playwright-core';
import {installSyntheticCamera} from './synthetic-camera.mjs';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 await context.route('https://cdn.jsdelivr.net/npm/js-aruco2@2.0.0/src/*',async r=>r.fulfill({contentType:'application/javascript',body:await readFile(join(process.env.ARUCO_LIBRARY_DIR??'/tmp/suturehero-aruco',new URL(r.request().url()).pathname.split('/').at(-1)))}));
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await installSyntheticCamera(page);
 await page.addInitScript(()=>localStorage.setItem('suturehero.trackerType','ring8'));
 // Inject decoded quadrilaterals to test pose application and the stationary
 // latch independently of optical recognition (covered by decoder regressions).
 await page.route('**/src/tracking.ts*',async r=>{
  const response=await r.fetch(),body=await response.text();// Both detect() and the flow-bitmap detectBitmap() (0.111) return the fixture; flow frames have no crop origin.
  let patched=body.replaceAll('const id = ++this.sequence;',"if(window.__ringFixture){const o=typeof origin==='object'&&origin?origin:{x:0,y:0};if(typeof bitmap!=='undefined')bitmap.close();return Promise.resolve(window.__ringFixture.map(m=>({...m,corners:m.corners.map(p=>({x:p.x-o.x,y:p.y-o.y}))})));}\nconst id = ++this.sequence;");
  assert.notEqual(patched,body);await r.fulfill({response,body:patched});
 });
 await page.goto('http://127.0.0.1:5173/tracking.html');
 const scene=async(faces,tilt=0)=>page.evaluate(async({faces,tilt})=>{
  const {faceGeometry,localCorners}=await import('/src/input/prismPose.ts');
  const base=faceGeometry(0,'ring8'),axis=base.center.clone().set(0,1,0),q=base.rotation.clone().setFromAxisAngle(axis,Math.PI);
  q.multiply(base.rotation.clone().setFromAxisAngle(axis.clone().set(1,0,0),tilt));
  const t=axis.clone().set(8,-6,240),w=960,h=540,f=w/(2*Math.tan(70*Math.PI/360/2));
  window.__ringFixture=faces.map(face=>{
   const g=faceGeometry(face,'ring8');return {id:face,corners:localCorners(face,'ring8').map(p=>{
    if(face===6)p.sub(g.center).applyQuaternion(g.rotation.clone().invert()).applyQuaternion(base.rotation.clone().setFromAxisAngle(axis.clone().set(0,0,1),Math.PI/2)).applyQuaternion(g.rotation).add(g.center);
    p.applyQuaternion(q).add(t);return {x:w/2+f*p.x/p.z,y:h/2+f*p.y/p.z};
   })};
  });
 },{faces,tilt});
 await scene([0]);await page.locator('#start-camera').click();
 await page.evaluate(async()=>window.__cal=(await import('/src/input/InstrumentCalibration.ts')).instrumentCalibration);
 await page.waitForFunction(()=>!!window.__cal.preview('needleDriver'),{},{timeout:20000});
 const rotation=()=>page.evaluate(async()=>{const {instrumentCalibration:c}=await import('/src/input/InstrumentCalibration.ts');return c.preview('needleDriver')?.quaternion.toArray();});
 const start=await rotation();await scene([0,6]);
 await page.waitForFunction(()=>document.querySelector('#rotation-solver-status').textContent.includes('ID 6 aligned'),{},{timeout:10000});
 await page.waitForTimeout(300);const overlap=await rotation();
 assert(Math.abs(start.reduce((s,v,i)=>s+v*overlap[i],0))>.999,'Angled marker must not rotate a visible side-face pose');
 await scene([6]);await page.waitForTimeout(500);const handoff=await rotation();
 assert(Math.abs(start.reduce((s,v,i)=>s+v*handoff[i],0))>.999,'Angled-only handoff must retain axes');
 await scene([6],.25);await page.waitForTimeout(1200);const moved=await rotation();

 const angle=2*Math.acos(Math.min(1,Math.abs(start.reduce((s,v,i)=>s+v*moved[i],0))));assert(angle>.15&&angle<.35,'Aligned angled-only pose must follow real tilt: '+angle);
 assert.deepEqual(errors,[]);console.log('Passed: stationary overlap alignment, authoritative side pose, continuous angled-only handoff and subsequent tilt.');
}finally{await browser.close();}
