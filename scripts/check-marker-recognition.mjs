import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {chromium} from 'playwright-core';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{
 const context=await browser.newContext();
 if(process.env.ARUCO_LIBRARY_DIR)await context.route('https://cdn.jsdelivr.net/npm/js-aruco2@2.0.0/src/*',async route=>route.fulfill({contentType:'application/javascript',body:await readFile(join(process.env.ARUCO_LIBRARY_DIR,new URL(route.request().url()).pathname.split('/').at(-1)))}));
 const page=await context.newPage();await page.route('**/recognition-check',r=>r.fulfill({contentType:'text/html',body:'<!doctype html>'}));
 await page.context().route('**/scripts/fixtures/aruco-4x4-50.png',async r=>r.fulfill({contentType:'image/png',body:await readFile(new URL('./fixtures/aruco-4x4-50.png',import.meta.url))}));
 await page.goto(new URL('recognition-check',process.env.SUTURE_TEST_URL??'http://127.0.0.1:5175/').href);
 const result=await page.evaluate(async path=>{
  const worker=new Worker(path);let sequence=0;
  const request=message=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>reject(Error('Worker timed out')),15000);worker.onmessage=({data})=>{if(data.type==='error'){clearTimeout(timer);reject(Error(data.message));}else if(data.type==='ready'||data.id===id){clearTimeout(timer);resolve(data);}};worker.onerror=e=>reject(Error(e.message));worker.postMessage({...message,id});});
  const image=new Image();image.src='/scripts/fixtures/aruco-4x4-50.png';await image.decode();
  const canvas=document.createElement('canvas');canvas.width=400;canvas.height=300;const ctx=canvas.getContext('2d',{willReadFrequently:true});let recognized=0,total=0;const wrong=[],missed=[];
  try{
   await request({type:'init'});
   for(const id of [7,17,27])for(const size of [24,36,60])for(const angle of [0,.4])for(const squeeze of [1,.55])for(const contrast of [1,.3])for(const blur of [0,.8]){
    ctx.fillStyle='white';ctx.fillRect(0,0,400,300);ctx.save();ctx.translate(200,150);ctx.rotate(angle);ctx.scale(squeeze,1);ctx.filter=`blur(${blur}px)`;ctx.drawImage(image,(id%7)*100+20,Math.floor(id/7)*100+20,60,60,-size/2,-size/2,size,size);ctx.restore();const frame=ctx.getImageData(0,0,400,300);
    if(contrast!==1)for(let k=0;k<frame.data.length;k+=4)for(let ch=0;ch<3;ch++)frame.data[k+ch]=90+frame.data[k+ch]*contrast;
    const response=await request({type:'detect',frame}),ids=[...new Set(response.found.map(m=>m.id))];total++;if(ids.includes(id))recognized++;else missed.push({id,size,angle,squeeze,contrast,blur});if(ids.some(found=>found!==id))wrong.push({id,ids});
   }
   // A clear face must not prevent a low-contrast second face being acquired.
   ctx.fillStyle='white';ctx.fillRect(0,0,400,300);
   for(const [id,x,size] of [[7,80,60],[17,250,36]])ctx.drawImage(image,(id%7)*100+20,Math.floor(id/7)*100+20,60,60,x,120,size,size);
   const mixed=ctx.getImageData(0,0,400,300);
   for(let y=110;y<170;y++)for(let x=240;x<300;x++)for(let ch=0;ch<3;ch++){const k=(y*400+x)*4+ch;mixed.data[k]=90+mixed.data[k]*.3;}
   let mixedIds=[];
   for(let retry=0;retry<4;retry++){const response=await request({type:'detect',frame:mixed});mixedIds=response.found.map(m=>m.id);if(mixedIds.includes(7)&&mixedIds.includes(17))break;await new Promise(r=>setTimeout(r,550));}
   if(!mixedIds.includes(7)||!mixedIds.includes(17))throw Error('Easy marker suppressed weak-marker recovery: '+mixedIds);
   for(let i=0;i<5;i++){ctx.fillStyle='white';ctx.fillRect(0,0,400,300);ctx.fillStyle='#444';ctx.fillRect(160,110,80,80);if(i%2){ctx.fillStyle='white';ctx.fillRect(165,115,70,70);}const response=await request({type:'detect',frame:ctx.getImageData(0,0,400,300)});if(response.found.length)wrong.push({background:i,ids:response.found.map(m=>m.id)});}
   return {recognized,total,wrong,missed};
  }finally{worker.terminate();}
 },process.env.SUTURE_WORKER_PATH??'/src/input/arucoWorker.ts?worker_file&type=classic');
 assert(result.recognized>=136,JSON.stringify(result));assert.deepEqual(result.wrong,[],'must not invent marker IDs');console.log('Passed: native-resolution recognition across contrast, blur, tilt and small printed markers; plain squares rejected.',JSON.stringify(result));
}finally{await browser.close();}
