import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {chromium} from 'playwright-core';
const base=process.env.SUTURE_TEST_URL??'http://127.0.0.1:5173/';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{
 const context=await browser.newContext();
 // Optional local copies of the same pinned CDN library for restricted browser networks.
 if(process.env.ARUCO_LIBRARY_DIR)await context.route('https://cdn.jsdelivr.net/npm/js-aruco2@2.0.0/src/*',async route=>{
  const name=new URL(route.request().url()).pathname.split('/').at(-1);
  await route.fulfill({contentType:'application/javascript',body:await readFile(join(process.env.ARUCO_LIBRARY_DIR,name))});
 });
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/marker-decoder-check',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Marker decoder regression</title>'}));
 await page.goto(new URL('marker-decoder-check',base).href);
 const results=await page.evaluate(async(workerPath)=>{
  const {BrowserArucoDetector}=await import('/src/input/arucoDetector.ts');
  const decoder=new BrowserArucoDetector();await decoder.initialize();
  const image=new Image();image.src='/scripts/fixtures/aruco-4x4-50.png';await image.decode();
  const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
  const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
  const frame=()=>ctx.getImageData(0,0,canvas.width,canvas.height);
  const ids=markers=>[...new Set(markers.map(m=>m.id))].sort((a,b)=>a-b);
  const fallback=ids(await decoder.detect(frame()));
  const worker=new Worker(workerPath);
  let sequence=0;
  const request=message=>new Promise((resolve,reject)=>{
   const id=++sequence,timer=setTimeout(()=>reject(Error('Worker request timed out')),30000);
   worker.onmessage=({data})=>{if(data.type==='error'){clearTimeout(timer);reject(Error(data.message));}else if(data.type==='ready'||data.id===id){clearTimeout(timer);resolve(data);}};
   worker.onerror=e=>{clearTimeout(timer);reject(Error(e.message));};worker.postMessage({...message,id});
  });
  try{
   await request({type:'init'});
   const full=ids((await request({type:'detect',frame:frame()})).found);
   // Same image exercises the worker's tracked-region decode after acquisition.
   const roiResult=await request({type:'detect',frame:frame()});
   const roi=ids(roiResult.found),roiDecoded=roiResult.diagnostics.rawMarkerCount;
   const rotations=[];
   for(const id of [0,7,10,17,20,27,49])for(let turn=0;turn<4;turn++){
    const small=document.createElement('canvas');small.width=small.height=100;
    const c=small.getContext('2d');c.translate(50,50);c.rotate(turn*Math.PI/2);
    c.drawImage(image,(id%7)*100,Math.floor(id/7)*100,100,100,-50,-50,100,100);
    rotations.push({id,turn,found:ids(await decoder.detect(c.getImageData(0,0,100,100)))});
   }
   return {fallback,full,roi,roiDecoded,roiPass:roiResult.diagnostics.pass,rotations};
  }finally{worker.terminate();}
 },process.env.SUTURE_WORKER_PATH??'/src/input/arucoWorker.ts?worker_file&type=classic');
 const all=Array.from({length:50},(_,i)=>i);
 for(const path of ['fallback','full','roi'])assert.deepEqual(results[path],all,path+' must decode every OpenCV ID');
 assert.match(results.roiPass,/Full frame/,'repeat request must preserve full-frame reacquisition');
 assert.equal(results.roiDecoded,50,'Repeated full scan must decode all IDs rather than relying on optical flow');
 for(const {id,turn,found} of results.rotations)assert.deepEqual(found,[id],`ID ${id} at ${turn*90} degrees`);
 assert.deepEqual(errors,[]);console.log('Passed: both decoders recognize all 50 OpenCV IDs, repeated worker scans retain them, and prism/ring boundary IDs decode at all four rotations.');
}finally{await browser.close();}
