// Compare against the unmodified pinned library, then time complete worker scans.
// Run alone against a Vite dev server; no concurrent browser benchmarks.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {chromium} from 'playwright-core';
import ts from 'typescript';
assert(process.env.ARUCO_LIBRARY_DIR,'Set ARUCO_LIBRARY_DIR to local js-aruco2 2.0.0 src copies.');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox']});
try{
 const context=await browser.newContext();
 await context.route('https://cdn.jsdelivr.net/npm/js-aruco2@2.0.0/src/*',async r=>r.fulfill({contentType:'application/javascript',body:await readFile(join(process.env.ARUCO_LIBRARY_DIR,new URL(r.request().url()).pathname.split('/').at(-1)))}));
 const page=await context.newPage();
 await page.route('**/full-scan-check',r=>r.fulfill({contentType:'text/html',body:'<!doctype html>'}));
 await page.goto(new URL('full-scan-check',process.env.SUTURE_TEST_URL??'http://127.0.0.1:5173/').href);
 await page.addScriptTag({content:await readFile(join(process.env.ARUCO_LIBRARY_DIR,'cv.js'),'utf8')});
 const workerSource=await readFile(new URL('../src/input/arucoWorker.ts',import.meta.url),'utf8');
 const blurSource=workerSource.split('// Full-scan blur implementation (also compared with the pinned library by check-full-scan.mjs).')[1].split('// End full-scan blur implementation.')[0];
 await page.addScriptTag({content:ts.transpile(blurSource)});
 const equivalence=await page.evaluate(async()=>{
  const fast=createFastThreshold(CV.stackBoxBlurMult,CV.stackBoxBlurShift,CV.adaptiveThreshold);
  let state=42,cases=0;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state>>>24;};
  for(const [w,h] of [[1,1],[3,5],[17,19],[64,47],[1920,1080],[37,41]]){
   const input={width:w,height:h,data:Array.from({length:w*h},random)};
   for(const radius of [0,1,2,5,9,15]){
    for(const bias of [3,5,7]){
     const a={data:[]},b={data:[]};CV.adaptiveThreshold(input,a,radius,bias);fast(input,b,radius,bias);
     if(a.data.some((v,i)=>v!==b.data[i]))throw Error(`Threshold mismatch at ${w}x${h}, radius ${radius}, bias ${bias}`);
     cases++;
    }
   }
  }
  return cases;
 });
 // Disable only the two optimizations in baseline workers.
 await page.route('**/arucoWorker.ts?*',async r=>{
  const response=await r.fetch();let body=await response.text();
  body=body.replace('cv.adaptiveThreshold = createFastThreshold', 'if (!self.location.search.includes("baseline=1")) cv.adaptiveThreshold = createFastThreshold');
  body=body.replace('if (frame === grayscaleFrame', 'if (!self.location.search.includes("baseline=1") && frame === grayscaleFrame');
  assert(body.includes('baseline=1'),'Locate optimized installation for the baseline comparison');
  await r.fulfill({response,body});
 });
 const results=await page.evaluate(async()=>{
  const image=new Image();image.src='/scripts/fixtures/aruco-4x4-50.png';await image.decode();
  const canvas=document.createElement('canvas');canvas.width=1920;canvas.height=1080;const c=canvas.getContext('2d',{willReadFrequently:true});
  c.fillStyle='#ddd';c.fillRect(0,0,1920,1080);c.drawImage(image,0,0);
  const frame=c.getImageData(0,0,1920,1080),results=[];
  for(const baseline of [true,false,false,true]){
   const worker=new Worker('/src/input/arucoWorker.ts?worker_file&type=classic'+(baseline?'&baseline=1':''));let sequence=0;
   const request=message=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>reject(Error('Worker timeout')),30000);worker.onmessage=({data})=>{if(data.type==='error'){clearTimeout(timer);reject(Error(data.message));}else if(data.type==='ready'||data.id===id){clearTimeout(timer);resolve(data);}};worker.onerror=e=>reject(Error(e.message));worker.postMessage({...message,id});});
   try{
    await request({type:'init'});const samples=[];
    for(let i=0;i<20;i++){
     const r=await request({type:'detect',frame});
     if(r.found.length!==50)throw Error('Full scan lost fixture IDs: '+r.found.length);
     if(i>=5)samples.push({total:r.diagnostics.durationMs,threshold:r.diagnostics.timings.thresholding});
    }
    results.push({baseline,samples});
   }finally{worker.terminate();}
  }
  return results;
 });
 console.log(JSON.stringify({equivalenceCases:equivalence,results},null,2));
}finally{await browser.close();}
