import { chromium } from 'playwright';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { basename } from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fitActivity } from '../graveltube-activities/src/importers.js';

const file = process.argv[2];
if (!file) throw new Error('Usage: node tools/real-fit-preview.mjs /path/to/activity.fit');
const base = process.env.GTA_TEST_URL || 'http://127.0.0.1:9412';
const original = await readFile(file), expected = fitActivity(original);
const browser = await chromium.launch({ executablePath: process.env.GTA_CHROME_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const context = await browser.newContext(), page = await context.newPage();
page.setDefaultTimeout(30000); page.setDefaultNavigationTimeout(30000);
const errors = [], tiles = { loaded: 0, failed: 0 };
page.on('pageerror', e => errors.push(e.message));
await mkdir('.test-output/real-fit', { recursive: true });
try {
  console.log('Checking local WordPress login');
  await page.goto(base + '/wp-admin/');
  if (await page.locator('#user_login').count()) {
    await page.locator('#user_login').fill('admin'); await page.locator('#user_pass').fill('password');
    await Promise.all([page.waitForURL('**/wp-admin/**'), page.locator('#wp-submit').click()]);
  }
  console.log('Checking plugin activation');
  await page.goto(base + '/wp-admin/plugins.php');
  const plugin = page.locator('[data-plugin="graveltube-activities/graveltube-activities.php"]');
  if (await plugin.locator('.activate a').count()) await Promise.all([page.waitForNavigation(), plugin.locator('.activate a').click()]);
  assert.equal(await plugin.locator('.deactivate a').count(), 1);
  await page.goto(base + '/wp-admin/edit.php?post_type=gta_activity&page=gta-services');
  await page.locator('input[type=checkbox][name=gta_osm_enabled]').check();
  await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), page.getByRole('button', { name: 'Freigabe speichern' }).click()]);
  console.log('Importing real FIT file');
  await page.goto(base + '/wp-admin/edit.php?post_type=gta_activity&page=gta-import');
  await page.locator('[data-gta-import] input[type=file]').setInputFiles(file);
  const link = page.locator('[data-gta-import] a'); await link.waitFor({ timeout: 60000 });
  const editUrl = await link.getAttribute('href'), id = Number(new URL(editUrl).searchParams.get('post'));
  console.log('Opening imported activity', id);
  await page.goto(editUrl);
  await page.waitForFunction(() => document.querySelectorAll('.gta-activity canvas').length === 4, { timeout: 30000 });
  const download = await context.request.get(await page.getByRole('link', { name: 'Originaldatei herunterladen' }).getAttribute('href'));
  assert.deepEqual(await download.body(), original);
  console.log('PASS original FIT download is byte-identical');
  const archiveResponse = await context.request.get(await page.getByRole('link', { name: 'Vollständiges Datenarchiv (JSON) herunterladen' }).getAttribute('href'));
  const stored = await archiveResponse.json();
  assert.equal(stored.records.length, expected.records.length);
  for (let i = 0; i < expected.records.length; i++) {
    for (const key of ['timestamp', 'latitude', 'longitude', 'altitude', 'power', 'heartRate', 'cadence']) assert.equal(stored.records[i][key], expected.records[i][key], `record ${i}: ${key}`);
    assert.equal(stored.records[i].deviceDistance, expected.records[i].distance);
  }
  assert.equal(stored.decoded.raw_messages.length, expected.decoded.raw_messages.length);
  console.log(`PASS all ${stored.records.length} records and raw FIT messages survived storage`);
  const timing = { elapsedFromDevice: expected.sessions[0].elapsedTime, elapsedStored: stored.summary.elapsedTime, timerFromDevice: expected.sessions[0].timerTime, timerStored: stored.summary.timerTime };
  console.log('Timing comparison:', JSON.stringify(timing));
  assert.equal(stored.summary.timerTime, expected.sessions[0].timerTime);
  assert.equal(stored.summary.elapsedTime, expected.sessions[0].elapsedTime);
  const weighted = {};
  for (const key of ['power', 'heartRate', 'cadence']) {
    let total = 0, seconds = 0;
    for (let i = 1; i < expected.records.length; i++) {
      const p = expected.records[i - 1], r = expected.records[i], dt = r.timestamp - p.timestamp;
      if (dt > 0 && dt <= 30 && r.segment === p.segment && p[key] !== null) { total += p[key] * dt; seconds += dt; }
    }
    weighted[key] = total / seconds;
    assert.ok(Math.abs(stored.summary.averages[key] - weighted[key]) < 1e-8);
  }
  console.log('PASS sensor averages independently verified against all original time intervals');
  await page.evaluate(() => wp.apiFetch({ path: '/wp/v2/settings', method: 'POST', data: { timezone: 'Europe/Berlin' } }));
  await page.locator('#title').fill('Felanitx – Sant Salvador · ROUVY');
  await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), page.locator('#publish').click()]);
  const preview = await page.evaluate(id => wp.apiFetch({ path: '/wp/v2/pages', method: 'POST', data: {
    title: 'Trainingsvorschau · Mallorca', status: 'publish', content: `<!-- wp:graveltube/activity {"activityId":${id}} /-->`
  } }), id);
  const anonymous = await browser.newContext({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 1 });
  const view = await anonymous.newPage(); view.on('pageerror', e => errors.push(e.message));
  view.on('response', response => { if (/tile\.openstreetmap\.org\//.test(response.url())) { if (response.ok()) tiles.loaded++; else tiles.failed++; } });
  view.on('requestfailed', request => { if (/tile\.openstreetmap\.org\//.test(request.url())) tiles.failed++; });
  await view.goto(preview.link, { waitUntil: 'networkidle', timeout: 60000 });
  await view.waitForFunction(() => document.querySelectorAll('.gta-activity canvas').length === 4);
  assert.equal(tiles.loaded, 0);
  await view.getByRole('button', { name: 'OpenStreetMap laden', exact: true }).click();
  await view.waitForFunction(() => Array.from(document.querySelectorAll('img.leaflet-tile')).filter(i => i.complete && i.naturalWidth > 0).length >= 2, { timeout: 30000 });
  assert.equal(await view.locator('.gta-map').count(), 1);
  assert.ok(tiles.loaded > 0); assert.deepEqual(errors, []);
  const canvas = view.locator('canvas').nth(1); await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox(); await view.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5);
  await view.waitForFunction(() => document.querySelector('.gta-cursor').textContent.includes('Leistung:'));
  console.log('PASS actual map tiles and synchronized power/heart-rate/cadence charts render without browser errors');
  await view.mouse.move(0, 0); await view.locator('.gta-activity').screenshot({ path: '.test-output/real-fit/preview.png' });
  await view.locator('.gta-map').screenshot({ path: '.test-output/real-fit/map.png' });
  const chartBounds = await view.evaluate(() => {
    const root = document.querySelector('.gta-activity'), start = Array.from(root.querySelectorAll('h4')).find(h => h.textContent.startsWith('Leistung'));
    const end = Array.from(root.querySelectorAll('h4')).find(h => h.textContent === 'Runden') || root.querySelector('.gta-note');
    const r = root.getBoundingClientRect(), a = start.getBoundingClientRect(), b = end.getBoundingClientRect();
    return { x: r.x + 20, y: a.y + window.scrollY, width: r.width - 40, height: b.y - a.y };
  });
  await view.screenshot({ path: '.test-output/real-fit/training.png', clip: chartBounds, fullPage: true });
  const api = await (await anonymous.request.get(base + '/wp-json/gta/v1/activities/' + id)).json();
  const report = { file: basename(file), activityId: id, previewUrl: preview.link, sourceSha256: createHash('sha256').update(original).digest('hex'),
    records: stored.records.length, rawMessages: stored.decoded.raw_messages.length, timing, weightedAverages: weighted, summary: api.summary,
    tileRequests: tiles, browserErrors: errors };
  await writeFile('.test-output/real-fit/report.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await anonymous.close();
} catch (error) {
  await page.screenshot({ path: '.test-output/real-fit/error.png', fullPage: true }).catch(() => {});
  console.log({ url: page.url(), errors, status: await page.locator('[data-gta-import]').innerText().catch(() => '') }); throw error;
} finally { await browser.close(); }
