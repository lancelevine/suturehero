// Demo button check (build 0.186): from the Sandbox, ▶ Demo reloads with the PS-2 and performs a
// simple interrupted suture by free physics (free pass, instrument tie), keeping a secure stitch.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
try{
  const page=await browser.newPage({viewport:{width:1440,height:950}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  if(process.env.SUTURE_DEMO_TRACE)page.on('console',m=>{if(m.text().startsWith('DEMO '))console.log(m.text());});
  await page.goto(process.env.SUTURE_TEST_URL??'http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
  await page.locator('#demo').click();
  await page.waitForURL(/needle=ps2/,{timeout:20000});
  // Watch for both tails being cut (the free-tying readout says "Tails trimmed: 2/2").
  await page.evaluate(()=>{window.__trimmed=false;let last='';setInterval(()=>{if(/Tails trimmed: 2\/2/.test(document.body.innerText))window.__trimmed=true;const c=document.querySelector('.demo-caption')?.textContent??'';if(c!==last){last=c;const k=window.__sutureHeroSandbox?.session?.freeKnot;console.log('DEMO '+Math.round(performance.now()/1000)+'s '+c+(k?.active?' | '+(k.sequence?.throws?.length??0)+' throws · locked '+!!k.sequence?.locked+' · lockSeated '+k.lockSeated:''));}},250);});
  await page.waitForFunction(()=>/Demo (complete|paused|stopped)/.test(document.querySelector('.demo-caption')?.textContent??''),{},{timeout:1500000,polling:500});
  assert.match(await page.locator('.demo-caption').textContent(),/Demo complete/);
  assert.match(await page.locator('.sandbox-summary-line').textContent(),/1 tied \(1 secure\)/);
  assert.equal(await page.evaluate(()=>window.__trimmed),true,'both tails cut');
  assert.equal(new URL(page.url()).searchParams.has('demo'),false,'demo parameter removed after the automatic start');
  assert.deepEqual(errors,[]);
  console.log('Demo: free pass, three-throw instrument tie by thread physics, both tails cut; secure stitch kept.');
}finally{await browser.close();}
