/** The initial guided click now opens tissue handling rather than loading a needle. */
export async function prepareEversion(page){
  await page.locator('#position-forceps').click();
  await page.keyboard.down('z');
  await page.waitForFunction(()=>/(?:Skin|Vessel) edge held/.test(document.querySelector('#exercise-title').textContent),{},{timeout:15000});
  await page.keyboard.up('z');await page.keyboard.down('Shift');await page.keyboard.down('e');
  await page.waitForFunction(()=>/(?:Skin|Vessel) edge everted/.test(document.querySelector('#exercise-title').textContent),{},{timeout:15000});
  await page.keyboard.up('e');await page.keyboard.up('Shift');
  if(process.env.SUTURE_EVERSION_SCREENSHOT)await page.screenshot({path:process.env.SUTURE_EVERSION_SCREENSHOT});
  await page.getByRole('button',{name:'Begin needle pass',exact:true}).click();
}
