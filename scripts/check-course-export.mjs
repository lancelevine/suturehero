// Guided course export (src/ui/courseExport.ts, 2026-11-26): hidden until a course stitch is saved,
// then exports the stitch CSV with the trainee (shared with the Sandbox panel). The stitch is
// recorded through the development hook (window.__sutureHeroSandbox) rather than tied by hand.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright-core';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(new URL('?graphics=low',process.env.SUTURE_TEST_URL??'http://127.0.0.1:5173/').href);
 await page.waitForFunction(()=>window.__sutureHeroSandbox?.session);
 const block=page.locator('.course-export');
 assert.equal(await block.evaluate(e=>e.hidden),true,'hidden outside a course');
 const recorded=await page.evaluate(()=>{
  const {session}=window.__sutureHeroSandbox;
  if(!session.startCourse())return 'course did not start';
  const points=session.freeKnot.long.points.slice(0,4);
  const meta={completedAt:'2026-11-26T09:00:00.000Z',secondsFromStart:95,secondsForStitch:95,knot:{technique:'surgeon',throws:[{wraps:2,direction:1},{wraps:1,direction:-1}],locked:true,security:'secure',engine:'claude'}};
  return session.course.record(true,{closure:.9,initialGap:.1,tractBottom:-.2,eversion:.5,pucker:0,compression:0,mismatch:0},['Bite 5.0 mm','Knot: secure'],[points,points],meta)?'ok':'not recorded';
 });
 assert.equal(recorded,'ok');
 // Shown in the Stitch plan section (collapsed by default) once a stitch is saved.
 await page.waitForFunction(()=>!document.querySelector('.course-export').hidden,null,{timeout:5000});
 // The trainee field may sit in a collapsed section: set it as its own change handler would.
 await block.locator('input').evaluate(e=>{e.value='Resident, B';e.dispatchEvent(new Event('change'));});
 assert.equal(await page.evaluate(()=>localStorage.getItem('suturehero.trainee.v1')),'Resident, B');
 const [download]=await Promise.all([page.waitForEvent('download'),block.locator('button').evaluate(b=>b.click())]);
 assert.match(download.suggestedFilename(),/^suturehero-course-Resident_B-.*\.csv$/);
 const rows=(await readFile(await download.path(),'utf8')).trim().split('\r\n');
 assert.equal(rows.length,2);
 assert.match(rows[1],/^"Resident, B",.*,1,2026-11-26T09:00:00\.000Z,95,95,surgeon,2\+ 1-,yes,secure,claude,Bite 5\.0 mm \| Knot: secure$/);
 assert.deepEqual(errors,[]);
 console.log('Course export: shown after a saved course stitch; CSV has the stitch, knot, timing and trainee.');
}finally{await browser.close();}
