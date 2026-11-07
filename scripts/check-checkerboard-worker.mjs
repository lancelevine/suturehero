import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox']});
try{
 const context=await browser.newContext(),page=await context.newPage();
 await context.route('**/mock-cv.js',r=>r.fulfill({contentType:'application/javascript',body:`
 self.cv={CV_8UC4:24,COLOR_RGBA2GRAY:1,CALIB_CB_ADAPTIVE_THRESH:1,CALIB_CB_NORMALIZE_IMAGE:2,
 Mat:class{constructor(rows=0,cols=0,type=0){this.rows=rows;this.cols=cols;this.data=new Uint8Array(rows*cols*(type===24?4:1));}delete(){}},Size:class{constructor(width,height){this.width=width;this.height=height;}},
 cvtColor(src,dst){dst.rows=src.rows;dst.cols=src.cols;dst.data=new Uint8Array(src.rows*src.cols);for(let i=0;i<dst.data.length;i++)dst.data[i]=src.data[i*4];},
 findChessboardCorners(gray,size,corners){corners.rows=48;corners.cols=1;corners.data32F=new Float32Array(Array.from({length:48},(_,i)=>[160+(i%8)*20,130+Math.floor(i/8)*20]).flat());return true;}};
 `}));
 await page.goto('http://127.0.0.1:5173/');
 const results=await page.evaluate(async()=>{
  const worker=new Worker('/src/input/checkerboardWorker.ts?worker_file&type=classic');let id=0;
  const request=(data,transfer=[])=>new Promise((resolve,reject)=>{const n=++id,timeout=setTimeout(()=>reject(Error('worker timeout')),15000);worker.onmessage=e=>{if(e.data.id===n){clearTimeout(timeout);if(e.data.error)reject(Error(e.data.error));else resolve(e.data);}};worker.onerror=e=>reject(Error(e.message));worker.postMessage({...data,id:n,url:new URL('/mock-cv.js',location.href).href},transfer);});
  await request({type:'init'});const result=[];
  for(const [blur,lowContrast] of [[false,false],[true,false],[false,true]]){
   const board=document.createElement('canvas');board.width=640;board.height=480;const b=board.getContext('2d');b.fillStyle='#777';b.fillRect(0,0,640,480);
   for(let y=0;y<7;y++)for(let x=0;x<9;x++){b.fillStyle=(x+y)%2?(lowContrast?'rgb(110,110,110)':'rgb(20,20,20)'):(lowContrast?'rgb(140,140,140)':'rgb(230,230,230)');b.fillRect(140+x*20,110+y*20,20,20);}
   const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;const c=canvas.getContext('2d');if(blur)c.filter='blur(3px)';c.drawImage(board,0,0);const frame=c.getImageData(0,0,640,480);
   const response=await request({type:'check',images:[frame]},[frame.data.buffer]);result.push(response.result[0]);
  }
  worker.terminate();return result;
 });
 assert.equal(results[0].corners.length,48);assert(results[0].focus>.08);assert(results[1].focus<.08);assert(results[2].contrast<60);
 console.log('Passed: checkerboard worker transport and actual pixel-based sharpness/contrast gates.',results.map(r=>({contrast:r.contrast,focus:r.focus})));
}finally{await browser.close();}
