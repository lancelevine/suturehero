import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/marker-motion-check',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Marker motion regression</title>'}));
 await page.goto(new URL('marker-motion-check',process.env.SUTURE_TEST_URL??'http://127.0.0.1:5175/').href,{waitUntil:'domcontentloaded'});
 const result=await page.evaluate(async path=>{
  const worker=new Worker(path,{type:'module'});let sequence=0;
  const request=message=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>reject(Error('Flow worker timed out')),10000);worker.onmessage=({data})=>{if(data.type==='error'){clearTimeout(timer);reject(Error(data.message));}else if(data.type==='ready'||data.id===id){clearTimeout(timer);resolve(data);}};worker.onerror=e=>reject(Error(e.message));worker.postMessage({...message,id});});
  const canvas=document.createElement('canvas');canvas.width=400;canvas.height=300;const ctx=canvas.getContext('2d');
  const frame=(x=170,y=140,angle=0,size=36,visible=true)=>{
   ctx.fillStyle='#e1e1e1';ctx.fillRect(0,0,400,300);ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.translate(-size/2,-size/2);
   if(visible)for(let row=0;row<6;row++)for(let col=0;col<6;col++){const bit=row===0||row===5||col===0||col===5?0:(0xb532>>((4-row)*4+4-col))&1;ctx.fillStyle=bit?'#ebebeb':'#0f0f0f';ctx.fillRect(col*size/6,row*size/6,size/6,size/6);}ctx.restore();
   const corners=[[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]].map(([a,b])=>({x:x+size*(Math.cos(angle)*a-Math.sin(angle)*b),y:y+size*(Math.sin(angle)*a+Math.cos(angle)*b)}));
   return {image:ctx.getImageData(0,0,400,300),marker:{id:0,corners}};
  };
  const errors=[];
  const check=(response,expected)=>{const marker=response.found.find(m=>m.id===0);if(!marker)throw Error('Visible marker lost');const error=Math.max(...marker.corners.map((p,i)=>Math.hypot(p.x-expected.corners[i].x,p.y-expected.corners[i].y)));errors.push(error);};
  try{
   await request({type:'init'});
   for(const size of [24,36,64]){
    const source=frame(170,140,0,size);worker.postMessage({type:'seed',markers:[source.marker],frame:source.image});
    for(const [x,y] of [[176,144],[188,151],[206,161],[190,149],[170,140]]){const next=frame(x,y,0,size);check(await request({type:'detect',frame:next.image}),next.marker);}
   }
   const source=frame();worker.postMessage({type:'seed',markers:[source.marker],frame:source.image});
   for(let n=1;n<=5;n++){const next=frame(170+n*3,140+n,n*.10);check(await request({type:'detect',frame:next.image}),next.marker);}
   // A delayed decoded seed must bring its source pixels, even when newer
   // flow images have already been processed before the decoder finishes.
   await request({type:'detect',frame:frame(210,160).image});
   worker.postMessage({type:'seed',markers:[source.marker],frame:source.image});
   const moved=frame(194,152);check(await request({type:'detect',frame:moved.image}),moved.marker);
   const blank=frame(170,140,0,36,false);const missing=await request({type:'detect',frame:blank.image});
   if(missing.found.length)throw Error('Blank frame incorrectly tracked');
   const recovered=frame(202,156);check(await request({type:'detect',frame:recovered.image}),recovered.marker);
   await new Promise(resolve=>setTimeout(resolve,500));
   const expired=await request({type:'detect',frame:blank.image});if(expired.found.length)throw Error('Lost marker retained indefinitely');
   return {frames:errors.length,maxCornerError:Math.max(...errors)};
  }finally{worker.terminate();}
 },process.env.SUTURE_FLOW_WORKER_PATH??'/src/input/arucoFlowWorker.ts?worker_file&type=module');
 assert(result.maxCornerError<4,JSON.stringify(result));assert.deepEqual(errors,[]);console.log('Passed: small-marker movement, reversals, rotation, delayed decoded seeds, missed-frame recovery and loss expiry.',result);
}finally{await browser.close();}
