/** The initial guided click now opens tissue handling rather than loading a needle. */
export async function prepareEversion(page){
  await page.getByRole('button',{name:'Position forceps at skin edge',exact:true}).click();
  await page.keyboard.down('z');
  await page.waitForFunction(()=>document.querySelector('#exercise-title').textContent.includes('Skin edge held'),{},{timeout:15000});
  await page.keyboard.up('z');await page.keyboard.down('Shift');await page.keyboard.down('e');
  await page.waitForFunction(()=>document.querySelector('#exercise-title').textContent.includes('Skin edge everted'),{},{timeout:15000});
  await page.keyboard.up('e');await page.keyboard.up('Shift');
  if(process.env.SUTURE_EVERSION_SCREENSHOT)await page.screenshot({path:process.env.SUTURE_EVERSION_SCREENSHOT});
  await page.getByRole('button',{name:'Begin needle pass',exact:true}).click();
}
