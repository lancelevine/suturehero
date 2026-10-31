import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';

const executablePath=process.env.CHROMIUM_PATH ?? [
  '/usr/bin/chromium','/usr/bin/chromium-browser','/usr/bin/google-chrome',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find(existsSync);
assert(executablePath,'Install Chrome/Chromium or set CHROMIUM_PATH to your browser executable.');
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4178','--strictPort'],{stdio:'ignore'});
let browser;
try {
  let ready=false;
  for(let i=0;i<100;i++) {
    assert(server.exitCode===null,'Preview server exited; port 4178 may already be occupied.');
    try { if((await fetch('http://127.0.0.1:4178/')).ok) { ready=true; break; } } catch {}
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  assert(ready,'Preview server did not start.');
  browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
  for(const scale of [1,1.25,2]) {
    const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:scale});
    const page=await context.newPage(); const errors=[]; page.on('pageerror',error=>errors.push(error.message));
    await page.goto('http://127.0.0.1:4178/',{waitUntil:'domcontentloaded'});
    await page.locator('#viewport > canvas').waitFor();
    await page.getByRole('button',{name:'Start guided pass',exact:true}).click();
    await page.getByRole('button',{name:'Close-up view',exact:true}).click();
    for(const width of [1440,900,768,1024,800,390,1920,980,1440]) {
      await page.setViewportSize({width,height:1000}); await page.waitForTimeout(200);
      const samples=[];
      for(let i=0;i<3;i++) {
        samples.push(await page.evaluate(()=>{
          const viewport=document.querySelector('#viewport').getBoundingClientRect();
          const canvas=document.querySelector('#viewport > canvas'),rect=canvas.getBoundingClientRect();
          return {pageWidth:document.documentElement.scrollWidth,pageHeight:document.documentElement.scrollHeight,viewportWidth:viewport.width,viewportHeight:viewport.height,canvasWidth:rect.width,canvasHeight:rect.height,inlineWidth:canvas.style.width,inlineHeight:canvas.style.height};
        }));
        await page.waitForTimeout(100);
      }
      for(const sample of samples) {
        assert(sample.pageWidth<=width+1,`Horizontal overflow at ${width}px / DPR ${scale}: ${JSON.stringify(sample)}`);
        assert(Math.abs(sample.canvasWidth-sample.viewportWidth)<1,'Canvas must fit the viewport width.');
        assert(Math.abs(sample.canvasHeight-sample.viewportHeight)<1,'Canvas must fit the viewport height.');
        assert.equal(sample.inlineWidth,'','Renderer must not set CSS width.');
        assert.equal(sample.inlineHeight,'','Renderer must not set CSS height.');
      }
      assert(samples.every(sample=>Math.abs(sample.pageHeight-samples[0].pageHeight)<=1),'Page keeps growing after resize.');
      assert(samples.every(sample=>Math.abs(sample.viewportWidth-samples[0].viewportWidth)<=1),'Viewport keeps growing after resize.');
    }
    assert.deepEqual(errors,[],'Browser runtime/ResizeObserver errors.');
    await context.close(); console.log(`Layout stable across 9 resize transitions at DPR ${scale}.`);
  }
} finally {await browser?.close(); server.kill();}
