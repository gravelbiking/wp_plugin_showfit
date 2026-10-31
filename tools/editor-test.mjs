import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const base = process.env.GTA_TEST_URL || 'http://127.0.0.1:9412';
const browser = await chromium.launch({ executablePath: process.env.GTA_CHROME_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const page = await browser.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
try {
  await page.goto(base + '/wp-admin/');
  if (await page.locator('#user_login').count()) {
    await page.locator('#user_login').fill('admin'); await page.locator('#user_pass').fill('password');
    await Promise.all([page.waitForURL('**/wp-admin/**'), page.locator('#wp-submit').click()]);
  }
  await page.goto(base + '/wp-admin/edit.php?post_type=gta_activity&page=gta-import');
  const activities = await page.evaluate(() => wp.apiFetch({ path: '/gta/v1/activities' }));
  assert.ok(activities.length); const id = activities[0].id;
  await page.goto(base + '/wp-admin/post-new.php?post_type=page');
  await page.waitForFunction(() => window.wp?.blocks?.getBlockType('graveltube/activity') && window.wp?.data?.select('core/editor')?.getCurrentPostType() === 'page');
  const close = page.locator('.components-modal__header button[aria-label="Close"]');
  if (await close.count()) await close.first().click();
  await page.evaluate(id => wp.data.dispatch('core/block-editor').insertBlocks(wp.blocks.createBlock('graveltube/activity', { activityId: id })), id);
  const editor = page.frameLocator('iframe[name="editor-canvas"]');
  const select = editor.getByLabel('Gespeicherte Aktivität', { exact: true }); await select.waitFor();
  assert.equal(await select.inputValue(), String(id)); console.log('PASS Gutenberg block renders and edits its activity reference inside the editor iframe');
  await editor.locator('input[type=file]').setInputFiles('.test-output/indoor.fit');
  await page.waitForFunction(id => { const block = wp.data.select('core/block-editor').getBlocks().find(b => b.name === 'graveltube/activity'); return block && block.attributes.activityId && block.attributes.activityId !== id; }, id);
  console.log('PASS Gutenberg file import saves a new activity and updates the block reference');
  const block = await page.evaluate(() => wp.data.select('core/block-editor').getBlocks().find(b => b.name === 'graveltube/activity'));
  assert.deepEqual(Object.keys(block.attributes).sort(), ['activityId', 'activityType', 'deviceVisibility', 'fields', 'privateMap', 'showAltitude', 'showCadence', 'showHeartRate', 'showMap', 'showPower'].sort());
  assert.deepEqual(errors, []); console.log('PASS block stores only its ID/display options, without JavaScript errors');
  await page.screenshot({ path: '.test-output/editor.png', fullPage: true });
} catch (e) { console.log({ frames: page.frames().map(f => f.name()), errors, body: (await page.frameLocator('iframe[name=editor-canvas]').locator('body').innerText()).slice(-3000) }); throw e; }
finally { await browser.close(); }
