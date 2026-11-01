import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(new URL('?graphics=low',process.env.SUTURE_TEST_URL??'http://127.0.0.1:5176/').href);await page.locator('#tracker-type').waitFor({state:'attached'});
 await page.locator('.tracking-advanced').evaluate(e=>e.open=true);
 for(const [type,spacing,size,count] of [['ring6','60','16','6'],['prism','120','12','3'],['ring8','60','16','8'],['ring6','60','16','6']]){
  await page.locator('#tracker-type').selectOption(type);
  assert.match(await page.locator('#tracker-type-status').textContent(),new RegExp(count+'-face.*'+spacing+'° side spacing for all instruments'));
  assert.match(await page.locator('#tracker-geometry-description').textContent(),new RegExp(size+' mm marker squares'));
 }
 assert.match(await page.locator('#tracker-type-status').textContent(),/Needle driver IDs 0–5.*Forceps IDs 10–15.*Scissors IDs 20–25/);
 await page.reload();await page.locator('#tracker-type').waitFor({state:'attached'});assert.equal(await page.locator('#tracker-type').inputValue(),'ring6');assert.match(await page.locator('#tracker-type-status').textContent(),/60°/);assert.deepEqual(errors,[]);
 console.log('Passed: active geometry/size for all three tracker models, all hexagonal instrument ID ranges, saved ring6 restoration and no stale prism text.');
}finally{await browser.close();}
