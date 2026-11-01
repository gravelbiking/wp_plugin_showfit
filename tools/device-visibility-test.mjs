// Verify conditional recorder defaults and explicit user choices across real editor saves.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const base = process.env.GTA_TEST_URL || 'http://127.0.0.1:9415';
const browser = await chromium.launch({ executablePath: process.env.GTA_CHROME_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const page = await browser.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
let checks = 0;
const pass = message => { checks++; console.log('PASS', message); };
const api = (path, method = 'GET', data) => page.evaluate(args => wp.apiFetch(args), {path, method, data});
const attributes = () => page.evaluate(() => wp.data.select('core/block-editor').getBlocks().find(b => b.name === 'graveltube/activity').attributes);
async function save() {
  await page.evaluate(async () => { wp.data.dispatch('core/editor').editPost({ title: 'Device – Schaltertest', status: 'publish' }); await wp.data.dispatch('core/editor').savePost(); });
}
async function reloadEditor() {
  await page.reload(); await page.waitForFunction(() => wp.data?.select('core/block-editor')?.getBlocks().some(b => b.name === 'graveltube/activity'));
  await page.evaluate(() => { const block = wp.data.select('core/block-editor').getBlocks().find(b => b.name === 'graveltube/activity'); wp.data.dispatch('core/block-editor').selectBlock(block.clientId); wp.data.dispatch('core/edit-post').openGeneralSidebar('edit-post/block'); });
}
try {
  await page.goto(base + '/wp-admin/');
  if (await page.locator('#user_login').count()) {
    await page.locator('#user_login').fill('admin'); await page.locator('#user_pass').fill('password');
    await Promise.all([page.waitForURL('**/wp-admin/**'), page.locator('#wp-submit').click()]);
  }
  await page.goto(base + '/wp-admin/edit.php?post_type=gta_activity&page=gta-display');
  for (const box of await page.locator('input[type=checkbox][name^=gta_default_fields]').all()) await box.check();
  await Promise.all([page.waitForNavigation(), page.getByRole('button', { name: 'Anzeige speichern' }).click()]);
  await page.goto(base + '/wp-admin/edit.php?post_type=gta_activity&page=gta-import');
  const list = await api('/gta/v1/activities');
  const ids = {};
  for (const name of ['rouvy', 'zwift', 'ace']) {
    const item = list.find(p => p.title === name && p.status === 'publish'); assert.ok(item, 'run presentation-test.mjs first'); ids[name] = item.id;
  }
  const block = attr => `<!-- wp:graveltube/activity ${JSON.stringify({showMap:false,...attr})} /-->`;
  const content = [
    block({activityId:ids.rouvy,fields:{device:true}}), block({activityId:ids.zwift}),
    block({activityId:ids.ace,activityType:'outdoor'}),
    block({activityId:ids.rouvy,fields:{device:false},deviceVisibility:'show'}),
    block({activityId:ids.ace,activityType:'outdoor',deviceVisibility:'hide'}),
    block({activityId:ids.rouvy,deviceVisibility:'invalid'}),
    `[graveltube_activity id="${ids.rouvy}" map="no"]`,
    `[graveltube_activity id="${ids.rouvy}" map="no" device="show"]`,
    `[graveltube_activity id="${ids.rouvy}" map="no" fields="activityType,device,start"]`
  ].join('\n');
  const testPage = await api('/wp/v2/pages','POST',{title:'Device – Standard und Override',status:'publish',content});
  const anonymous = await browser.newContext(), view = await anonymous.newPage(); view.on('pageerror',e=>errors.push(e.message));
  await view.goto(testPage.link);
  await view.waitForFunction(()=>document.querySelectorAll('.gta-heading').length===9);
  const visible = await view.locator('.gta-activity').evaluateAll(rs=>rs.map(r=>!!r.querySelector('[data-gta-field=device]')));
  assert.deepEqual(visible,[false,false,true,true,false,false,false,true,true]);
  pass('ROUVY and Zwift hide the recorder automatically, including existing blocks; Outdoor follows its field default');
  pass('explicit show/hide beats automatic and global field choices; unknown modes safely use automatic');
  pass('shortcodes support automatic display and explicit device or field-list selection');
  await page.goto(base + '/wp-admin/post-new.php?post_type=page');
  await page.waitForFunction(()=>wp.blocks?.getBlockType('graveltube/activity') && wp.data?.select('core/editor')?.getCurrentPostType()==='page');
  const close = page.locator('.components-modal__header button[aria-label="Close"]'); if(await close.count()) await close.first().click();
  await page.evaluate(id=>wp.data.dispatch('core/block-editor').insertBlocks(wp.blocks.createBlock('graveltube/activity',{activityId:id})),ids.rouvy);
  const editor = page.frameLocator('iframe[name=editor-canvas]'), type = editor.getByLabel('Aktivitätsart',{exact:true});
  await type.waitFor();
  await editor.getByText(/Vorschlag: ROUVY\./).waitFor();
  // WordPress can open its page-pattern picker after the welcome dialog has closed.
  await page.keyboard.press('Escape');
  await page.locator('.components-modal__screen-overlay').waitFor({state:'hidden'});
  await page.evaluate(()=>wp.data.dispatch('core/edit-post').openGeneralSidebar('edit-post/block'));
  const device = page.getByLabel('Device',{exact:true});
  assert.equal(await device.isChecked(),false); assert.equal((await attributes()).deviceVisibility,'auto');
  await page.getByLabel('Datum',{exact:true}).uncheck(); assert.equal(await device.isChecked(),false);
  await type.selectOption('outdoor'); assert.equal(await device.isChecked(),true);
  await type.selectOption('zwift'); assert.equal(await device.isChecked(),false);
  pass('editor follows detected and manually selected activity types without changing unrelated field choices');
  await device.check(); assert.equal((await attributes()).deviceVisibility,'show');
  await type.selectOption('rouvy'); assert.equal(await device.isChecked(),true);
  await save(); const postId=await page.evaluate(()=>wp.data.select('core/editor').getCurrentPostId());
  await reloadEditor(); assert.equal(await device.isChecked(),true); assert.equal((await attributes()).deviceVisibility,'show');
  const saved=await api('/wp/v2/pages/'+postId);
  await view.goto(saved.link);await view.waitForFunction(()=>!!document.querySelector('[data-gta-field=device]'));
  pass('manually enabled recorder persists across type changes, save/reload and public rendering');
  await device.uncheck(); await save(); await reloadEditor();
  assert.equal(await device.isChecked(),false);assert.equal((await attributes()).deviceVisibility,'hide');
  await view.reload();await view.waitForFunction(()=>!!document.querySelector('.gta-heading'));
  assert.equal(await view.locator('[data-gta-field=device]').count(),0);
  pass('manual hiding also persists after save/reload and is honored by the frontend');
  await page.getByRole('button',{name:'Device automatisch steuern',exact:true}).click();
  assert.equal((await attributes()).deviceVisibility,'auto');assert.equal(await device.isChecked(),false);
  await type.selectOption('outdoor');assert.equal(await device.isChecked(),true);
  await type.selectOption('auto');assert.equal(await device.isChecked(),false);
  pass('reset returns to automatic and restores the correct default when switching between Outdoor and ROUVY');
  await page.screenshot({path:'.test-output/device-visibility-editor.png',fullPage:true});
  assert.deepEqual(errors,[]);pass('editor and frontend have no JavaScript errors');
  console.log(JSON.stringify({checks}));await anonymous.close();
}catch(error){await page.screenshot({path:'.test-output/device-visibility-failure.png',fullPage:true});throw error;}
finally{await browser.close();}
