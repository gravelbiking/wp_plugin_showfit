// End-to-end display settings, metadata detection and per-post choices in real WordPress.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const base = process.env.GTA_TEST_URL || 'http://127.0.0.1:9413';
const browser = await chromium.launch({ executablePath: process.env.GTA_CHROME_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const context = await browser.newContext();
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
let count = 0;
const pass = s => { count++; console.log('PASS', s); };
const api = (path, method = 'GET', data) => page.evaluate(({ path, method, data }) => wp.apiFetch({ path, method, data }), { path, method, data });
async function defaults(disabled = []) {
  await page.goto(base + '/wp-admin/edit.php?post_type=gta_activity&page=gta-display');
  const boxes = page.locator('input[type=checkbox][name^=gta_default_fields]');
  // Names are read explicitly so the form is exercised just as in the backend.
  for (const box of await boxes.all()) await box.setChecked(!disabled.includes((await box.getAttribute('name')).match(/\[(.+)\]/)[1]));
  await Promise.all([page.waitForNavigation(), page.getByRole('button', { name: 'Anzeige speichern' }).click()]);
}
async function importFit(file) {
  await page.goto(base + '/wp-admin/edit.php?post_type=gta_activity&page=gta-import');
  await page.locator('[data-gta-import] input[type=file]').setInputFiles(file);
  const link = page.locator('[data-gta-import] a'); await link.waitFor({ timeout: 30000 });
  const edit = await link.getAttribute('href'); const id = Number(new URL(edit).searchParams.get('post'));
  return { id, edit, data: await api('/gta/v1/activities/' + id) };
}
try {
  await page.goto(base + '/wp-admin/');
  if (await page.locator('#user_login').count()) {
    await page.locator('#user_login').fill('admin'); await page.locator('#user_pass').fill('password');
    await Promise.all([page.waitForURL('**/wp-admin/**'), page.locator('#wp-submit').click()]);
  }
  await page.goto(base + '/wp-admin/plugins.php');
  const plugin = page.locator('[data-plugin="graveltube-activities/graveltube-activities.php"]');
  if (await plugin.locator('.activate a').count()) await Promise.all([page.waitForNavigation(), plugin.locator('.activate a').click()]);
  await defaults();
  assert.equal(await page.locator('input[type=checkbox]:checked').count(), 13); pass('all thirteen data fields are initially enabled in plugin settings');
  const ids = {};
  for (const [file, type, device] of [['rouvy', 'rouvy', 'Rouvy'], ['zwift', 'zwift', 'Zwift'], ['ace', 'outdoor', 'Wahoo ELEMNT ACE']]) {
    const imported = await importFit('.test-output/' + file + '.fit'); ids[file] = imported;
    assert.equal(imported.data.presentation.suggestedType, type); assert.equal(imported.data.presentation.device, device);
    assert.match(imported.data.startLabel, /^\d{2}\.\d{2}\.\d{4}$/);
    await page.goto(imported.edit);
    await Promise.all([page.waitForNavigation(), page.locator('#publish').click()]);
    pass(file + ' metadata survives the full FIT upload and is suggested correctly');
  }
  const site = await api('/wp/v2/settings', 'POST', { timezone: 'Europe/Berlin' });
  assert.equal(site.timezone, 'Europe/Berlin');
  const dated = await api('/gta/v1/activities/' + ids.ace.id);
  const date = new Date(dated.summary.start * 1000);
  const parts = Object.fromEntries(new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date).map(p => [p.type, p.value]));
  assert.equal(dated.startLabel, `${parts.day}.${parts.month}.${parts.year}`);
  pass('Start displays only dd.mm.yyyy in the WordPress site timezone while record timestamps remain complete');
  await page.goto(ids.ace.edit); await page.getByLabel('Aktivitätsart', { exact: true }).selectOption('indoor');
  await Promise.all([page.waitForNavigation(), page.locator('#publish').click()]);
  assert.equal((await api('/gta/v1/activities/' + ids.ace.id)).presentation.type, 'indoor');
  await page.locator('[data-gta-import] input[type=file]').setInputFiles('.test-output/ace.fit'); await page.locator('[data-gta-import] a').waitFor();
  assert.equal((await api('/gta/v1/activities/' + ids.ace.id)).presentation.type, 'indoor');
  pass('activity-level manual classification persists through saving and reimport');
  await defaults(['device', 'distance', 'avgPower']);
  assert.equal(await page.locator('input[type=checkbox]:checked').count(), 10);
  await page.goto(base + '/wp-admin/post-new.php?post_type=page');
  await page.waitForFunction(() => window.wp?.blocks?.getBlockType('graveltube/activity') && window.wp?.data?.select('core/editor')?.getCurrentPostType() === 'page');
  const close = page.locator('.components-modal__header button[aria-label="Close"]'); if (await close.count()) await close.first().click();
  await page.evaluate(id => wp.data.dispatch('core/block-editor').insertBlocks(wp.blocks.createBlock('graveltube/activity', { activityId: id })), ids.ace.id);
  const editor = page.frameLocator('iframe[name=editor-canvas]');
  await editor.getByLabel('Aktivitätsart', { exact: true }).waitFor();
  await page.waitForFunction(() => wp.data.select('core/block-editor').getBlocks().find(b => b.name === 'graveltube/activity')?.attributes.fields?.device === false);
  pass('new Gutenberg blocks snapshot the global field defaults');
  await editor.getByLabel('Aktivitätsart', { exact: true }).selectOption('rouvy');
  await page.evaluate(() => wp.data.dispatch('core/edit-post').openGeneralSidebar('edit-post/block'));
  await page.getByLabel('Distanz', { exact: true }).check();
  await page.getByLabel('Start', { exact: true }).uncheck();
  const block = await page.evaluate(() => wp.data.select('core/block-editor').getBlocks().find(b => b.name === 'graveltube/activity'));
  assert.equal(block.attributes.activityType, 'rouvy'); assert.equal(block.attributes.fields.distance, true); assert.equal(block.attributes.fields.start, false);
  await page.evaluate(async () => { wp.data.dispatch('core/editor').editPost({ title: 'Darstellung im Beitragsblock', status: 'publish' }); await wp.data.dispatch('core/editor').savePost(); });
  const postId = await page.evaluate(() => wp.data.select('core/editor').getCurrentPostId());
  await page.reload();
  await page.waitForFunction(() => wp.data?.select('core/block-editor')?.getBlocks().some(b => b.name === 'graveltube/activity'));
  const restored = await page.evaluate(() => wp.data.select('core/block-editor').getBlocks().find(b => b.name === 'graveltube/activity').attributes);
  assert.deepEqual(restored, block.attributes); pass('dropdown and individual field switches persist after saving and reloading the post');
  await defaults();
  await page.goto(base + '/wp-admin/post.php?post=' + postId + '&action=edit');
  await page.waitForFunction(() => wp.data?.select('core/block-editor')?.getBlocks().some(b => b.name === 'graveltube/activity'));
  assert.deepEqual(await page.evaluate(() => wp.data.select('core/block-editor').getBlocks().find(b => b.name === 'graveltube/activity').attributes.fields), block.attributes.fields);
  pass('later global changes preserve saved per-post field choices');
  const stored = await api('/wp/v2/pages/' + postId + '?context=edit');
  const allOff = Object.fromEntries(Object.keys(block.attributes.fields).map(k => [k, false]));
  const display = await api('/wp/v2/pages', 'POST', { title: 'Farben und Datenfelder', status: 'publish', content: stored.content.raw + `\n<!-- wp:graveltube/activity ${JSON.stringify({ activityId: ids.zwift.id })} /-->\n<!-- wp:graveltube/activity ${JSON.stringify({ activityId: ids.ace.id, activityType: 'outdoor' })} /-->\n<!-- wp:graveltube/activity ${JSON.stringify({ activityId: ids.ace.id, fields: allOff })} /-->` });
  const anonymous = await browser.newContext(); const view = await anonymous.newPage(); view.on('pageerror', e => errors.push(e.message));
  const tileRequests = []; await view.route('**/*', route => { if (new URL(route.request().url()).hostname.endsWith('openstreetmap.org')) { tileRequests.push(route.request().url()); return route.abort(); } return route.continue(); });
  await view.goto(display.link); await view.waitForFunction(() => document.querySelectorAll('.gta-activity canvas').length === 16);
  const roots = view.locator('.gta-activity');
  assert.deepEqual(await roots.evaluateAll(rs => rs.map(r => r.dataset.gtaType)), ['rouvy', 'zwift', 'outdoor', 'indoor']);
  assert.equal(await roots.nth(0).locator('[data-gta-field=start]').count(), 0); assert.equal(await roots.nth(0).locator('[data-gta-field=distance]').count(), 1);
  assert.equal(await roots.nth(0).locator('[data-gta-field=device]').count(), 0); assert.equal(await roots.nth(1).locator('[data-gta-field=device]').count(), 0);
  assert.equal(await roots.nth(3).locator('.gta-stats').count(), 0);
  pass('frontend honors each block override, hides individual or all data cards, and preserves legacy defaults');
  const colors = await roots.evaluateAll(rs => rs.slice(0, 3).map(r => getComputedStyle(r.querySelector('.gta-stat')).backgroundColor));
  assert.deepEqual(colors, ['rgb(241, 233, 252)', 'rgb(255, 240, 229)', 'rgb(237, 247, 233)']);
  assert.equal(tileRequests.length, 0); assert.equal(await roots.locator('.gta-map').count(), 0);
  pass('ROUVY purple, Zwift orange and outdoor green tint data cards without loading a map');
  await view.screenshot({ path: '.test-output/presentation-desktop.png', fullPage: true });
  await view.setViewportSize({ width: 390, height: 844 });
  assert.ok(await view.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await view.screenshot({ path: '.test-output/presentation-mobile.png', fullPage: true });
  pass('new data cards fit the mobile viewport');
  assert.deepEqual(errors, []); pass('no JavaScript errors in editor or frontend');
  console.log(JSON.stringify({ checks: count, pageUrl: display.link })); await anonymous.close();
} catch (e) {
  console.error({ url: page.url(), errors, body: (await page.locator('body').innerText()).slice(-1800) });
  await page.screenshot({ path: '.test-output/presentation-failure.png', fullPage: true }); throw e;
} finally { await browser.close(); }
