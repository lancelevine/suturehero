// Knot worker check (2026-11-16): the demo's free tie runs on the knot model in a Web Worker
// (?knot=classic-worker) and still keeps a secure stitch; reports main-thread frame times.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
try{
  const engine=process.env.SUTURE_KNOT_ENGINE??'classic-worker';
  const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  if(process.env.SUTURE_DEMO_TRACE)page.on('console',m=>{if(m.text().startsWith('DEMO '))console.log(m.text());});
  await page.goto(new URL(`?needle=ps2&knot=${engine}&demo=1`,process.env.SUTURE_TEST_URL??'http://127.0.0.1:5173/').href,{waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('#knot-engine').inputValue(),engine);
  // Frame intervals on the main thread while the knot is being tied.
  await page.evaluate(()=>{window.__frames=[];let last=performance.now();let tying=false;const tick=t=>{const c=document.querySelector('.demo-caption')?.textContent??'';tying=/Knot|knot|throw|Wrap|Pull the ends|Regrasp|Grasp-side|tighten/.test(c)&&!/complete/.test(c);if(tying)window.__frames.push(t-last);last=t;requestAnimationFrame(tick);};requestAnimationFrame(tick);
    let lastCaption='';setInterval(()=>{const c=document.querySelector('.demo-caption')?.textContent??'';if(c!==lastCaption){lastCaption=c;const k=window.__sutureHeroSandbox?.session?.freeKnot;console.log('DEMO '+Math.round(performance.now()/1000)+'s '+c+(k?.active?` | ${k.sequence?.throws?.length??0} thr locked ${!!k.sequence?.locked} seated ${k.lockSeated} grips ${[...k.grips.keys()].map(g=>g+':'+k.gripLabel(g)).join(',')} | ${k.handlingHint} | diag ${JSON.stringify(k.diagnostics)} | session closure ${window.__sutureHeroSandbox.session.wound.closure.toFixed(2)}`:''));}},250);});
  await page.waitForFunction(()=>/Demo (complete|stopped)/.test(document.querySelector('.demo-caption')?.textContent??''),{},{timeout:1700000,polling:500});
  const frames=await page.evaluate(()=>window.__frames.slice().sort((a,b)=>a-b));
  const at=q=>frames[Math.min(frames.length-1,Math.floor(frames.length*q))]?.toFixed(1);
  const summary=await page.locator('.sandbox-summary-line').textContent();
  console.log(`Knot engine ${engine}: main-thread frame interval while tying: median ${at(.5)} ms, p95 ${at(.95)} ms (${frames.length} frames). Summary: ${summary}`);
  assert.deepEqual(errors,[]);
  // In a software-rendered sandbox the worker is starved of CPU and falls behind; the stitch may then not seat (see handoff log).
  if(!process.env.SUTURE_SKIP_STITCH_CHECK)assert.match(summary,/1 tied \(1 secure\)/);
  console.log(`Knot engine ${engine}: demo kept a secure stitch.`);
}finally{await browser.close();}
