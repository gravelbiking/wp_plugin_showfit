// Local real-file regression test. Personal inputs and results stay in .test-output.
import { chromium } from 'playwright';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { fitActivity } from '../graveltube-activities/src/importers.js';

const files = process.argv.slice(2);
if (!files.length) throw new Error('Usage: node tools/dependency-update-test.mjs file.fit [other.fit]');
const base = process.env.GTA_TEST_URL || 'http://127.0.0.1:9412';
const out = '.test-output/dependency-update/real-files';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.GTA_CHROME_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const context = await browser.newContext();
const page = await context.newPage();
page.setDefaultTimeout(60000);
page.setDefaultNavigationTimeout(60000);
const errors = [], reports = [];
page.on('pageerror', error => errors.push(error.message));
try {
  await page.goto(base + '/wp-admin/');
  if (await page.locator('#user_login').count()) {
    await page.locator('#user_login').fill('admin');
    await page.locator('#user_pass').fill('password');
    await Promise.all([page.waitForURL('**/wp-admin/**'), page.locator('#wp-submit').click()]);
  }
  await page.goto(base + '/wp-admin/plugins.php');
  const plugin = page.locator('[data-plugin="graveltube-activities/graveltube-activities.php"]');
  if (await plugin.locator('.activate a').count()) await Promise.all([page.waitForNavigation(), plugin.locator('.activate a').click()]);
  await page.goto(base + '/wp-admin/edit.php?post_type=gta_activity&page=gta-services');
  await page.locator('input[type=checkbox][name=gta_osm_enabled]').check();
  await Promise.all([page.waitForNavigation(), page.getByRole('button', { name: 'Freigabe speichern' }).click()]);
  for (const [index, file] of files.entries()) {
    const source = await readFile(file), expected = fitActivity(source);
    await page.goto(base + '/wp-admin/edit.php?post_type=gta_activity&page=gta-import');
    await page.locator('[data-gta-import] input[type=file]').setInputFiles(file);
    const editLink = page.locator('[data-gta-import] a');
    await editLink.waitFor();
    const editUrl = await editLink.getAttribute('href');
    await page.goto(editUrl);
    const download = await context.request.get(await page.getByRole('link', { name: 'Originaldatei herunterladen' }).getAttribute('href'));
    assert.deepEqual(await download.body(), source);
    const archive = await (await context.request.get(await page.getByRole('link', { name: 'Vollständiges Datenarchiv (JSON) herunterladen' }).getAttribute('href'))).json();
    assert.equal(archive.records.length, expected.records.length);
    assert.deepEqual(archive.decoded, JSON.parse(JSON.stringify(expected.decoded)));
    for (const [i, record] of expected.records.entries()) {
      for (const key of ['timestamp', 'latitude', 'longitude', 'power', 'heartRate', 'cadence', 'altitude']) assert.equal(archive.records[i][key], record[key], `${i}:${key}`);
      assert.equal(archive.records[i].deviceDistance, record.distance);
    }
    await Promise.all([page.waitForNavigation(), page.locator('#publish').click()]);
    const id = Number(new URL(editUrl).searchParams.get('post'));
    const post = await page.evaluate(id => wp.apiFetch({ path: '/wp/v2/pages', method: 'POST', data: {
      title: 'Bibliotheksprüfung', status: 'publish', content: `<!-- wp:graveltube/activity {"activityId":${id},"privateMap":"off"} /-->`
    } }), id);
    const anonymous = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const view = await anonymous.newPage();
    view.on('pageerror', error => errors.push(error.message));
    const tiles = { requested: 0, loaded: 0, failed: 0 };
    view.on('request', request => { if (new URL(request.url()).hostname === 'tile.openstreetmap.org') tiles.requested++; });
    view.on('response', response => { if (new URL(response.url()).hostname === 'tile.openstreetmap.org') response.ok() ? tiles.loaded++ : tiles.failed++; });
    await view.goto(post.link);
    const supported = ['altitude', 'power', 'heartRate', 'cadence'].filter(channel => archive.summary.channels.includes(channel));
    await view.waitForFunction(count => document.querySelectorAll('.gta-activity canvas').length === count, supported.length);
    assert.equal(tiles.requested, 0, 'no map request before consent');
    assert.deepEqual(await view.evaluate(() => Object.values(window.GTAChart.instances).map(chart => chart.$gtaChannel)), supported);
    assert.equal(await view.evaluate(() => window.GTAChart.version), '4.6.1');
    assert.equal(await view.evaluate(() => window.GTALeaflet.version), '1.9.4');
    const rendered = await view.evaluate(() => Object.values(window.GTAChart.instances).map(chart => ({
      channel: chart.$gtaChannel, points: chart.data.datasets[0].data.length,
      painted: chart.getDatasetMeta(0).data.some(point => Number.isFinite(point.x) && Number.isFinite(point.y) && !point.skip),
      color: chart.data.datasets[0].borderColor
    })));
    assert.ok(rendered.every(chart => chart.points > 0 && chart.painted));
    await view.getByRole('button', { name: 'OpenStreetMap laden', exact: true }).click();
    await view.waitForFunction(() => [...document.querySelectorAll('.leaflet-tile')].some(img => img.complete && img.naturalWidth === 256), null, { timeout: 60000 });
    assert.ok(tiles.loaded > 0);
    assert.ok(await view.locator('.leaflet-overlay-pane svg path.leaflet-interactive').count());
    const stats = await view.locator('.gta-stats').innerText();
    assert.match(await view.locator('[data-gta-field=start] dd').innerText(), /^\d{2}\.\d{2}\.\d{4}$/);
    const canvas = view.locator('canvas').first();
    await canvas.scrollIntoViewIfNeeded();
    const box = await canvas.boundingBox();
    await view.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5);
    await view.waitForFunction(() => document.querySelector('.gta-cursor').textContent.includes('Kadenz:'));
    const cursor = await view.locator('.gta-cursor').innerText();
    if (supported.includes('power')) assert.ok(cursor.includes('Leistung:'));
    if (supported.includes('heartRate')) assert.ok(cursor.includes('Herzfrequenz:'));
    await view.locator('.gta-controls select').selectOption('distance');
    assert.equal(await view.evaluate(() => Object.values(window.GTAChart.instances).every(chart => chart.options.scales.x.title.text === 'Distanz (km)')), true);
    await view.locator('.gta-controls select').selectOption('time');
    assert.equal(await view.evaluate(() => Object.values(window.GTAChart.instances).every(chart => chart.options.scales.x.title.text.startsWith('Zeit'))), true);
    await view.mouse.move(0, 0);
    await view.locator('.gta-activity').screenshot({ path: `${out}/activity-${index + 1}.png` });
    await view.setViewportSize({ width: 390, height: 844 });
    await view.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth + 1);
    await view.locator('.gta-activity').screenshot({ path: `${out}/activity-${index + 1}-mobile.png` });
    assert.deepEqual(errors, []);
    reports.push({ records: archive.records.length, channels: supported, rendered, type: await view.locator('.gta-activity').getAttribute('data-gta-type'), tiles, stats, cursor, originalRoundtrip: true, completeDataRoundtrip: true });
    console.log(`PASS real FIT ${index + 1}: ${archive.records.length} records, ${supported.join('/')}, real map tiles, chart hover/axes and mobile view`);
    await anonymous.close();
  }
  await writeFile(`${out}/report.json`, JSON.stringify({ version: JSON.parse(await readFile(new URL('../graveltube-activities/block.json', import.meta.url), 'utf8')).version, chart: '4.6.1', color: '0.6.5', leaflet: '1.9.4', activities: reports, browserErrors: errors }, null, 2));
} catch (error) {
  await page.screenshot({ path: `${out}/failure.png`, fullPage: true }).catch(() => {});
  console.log({ importStatus: await page.locator('[data-gta-import]').innerText().catch(() => ''), browserErrors: errors });
  throw error;
} finally {
  await browser.close();
}
