import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const base = process.env.GTA_TEST_URL || 'http://127.0.0.1:19444';
const browser = await chromium.launch({ executablePath: process.env.GTA_CHROME_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const context = await browser.newContext(), page = await context.newPage();
page.setDefaultTimeout(60000); page.setDefaultNavigationTimeout(60000);
const errors = [], checks = [];
page.on('pageerror', e => errors.push(e.message));
const pass = text => { checks.push(text); console.log('PASS', text); };
const status = () => page.evaluate(() => wp.apiFetch({ path: '/gta-updater-test/v1/status' }));
await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
async function login(target, user, password) {
  await target.goto(base + '/wp-admin/');
  if (await target.locator('#user_login').count()) {
    await target.locator('#user_login').fill(user); await target.locator('#user_pass').fill(password);
    await Promise.all([target.waitForURL('**/wp-admin/**'), target.locator('#wp-submit').click()]);
  }
}
try {
  await login(page, 'admin', 'password');
  await page.goto(base + '/wp-admin/plugins.php');
  const check = page.getByRole('link', { name: 'GitHub-Update prüfen', exact: true });
  assert.equal(await check.count(), 1);
  const href = await check.getAttribute('href'); assert.ok(new URL(href).searchParams.has('_wpnonce'));
  pass('plugin row offers an authenticated update check');
  await Promise.all([page.waitForNavigation(), check.click()]);
  await page.getByText('GitHub-Version 2.0.0 ist verfügbar.', { exact: true }).waitFor();
  const row = page.locator('.plugin-update-tr[data-plugin="graveltube-activities/graveltube-activities.php"]');
  await row.locator('.update-link').waitFor();
  const before = await status(); assert.equal(before.version, JSON.parse(await readFile(new URL('../graveltube-activities/package.json',import.meta.url),'utf8')).version);
  pass('explicit check shows the native WordPress update for the local 2.0.0 fixture');
  await page.reload(); const cached = await status(); assert.equal(cached.requests.length, before.requests.length);
  pass('ordinary plugin-page reload reuses cached metadata');
  const rejected = await context.request.get(base + '/wp-admin/admin-post.php?action=gta_check_updates');
  assert.equal(rejected.status(), 403); assert.equal((await status()).requests.length, cached.requests.length);
  pass('missing nonce cannot trigger a fresh update check');
  await row.locator('.thickbox').click();
  const details = page.frameLocator('#TB_iframeContent');
  await details.getByText('GravelTube Activities', { exact: true }).first().waitFor();
  assert.equal(await details.locator('pre img').count(), 0);
  assert.ok((await details.locator('pre').innerText()).includes('<img'));
  await page.locator('#TB_closeWindowButton').click();
  pass('native details modal presents escaped release notes');
  const editorContext = await browser.newContext(), editor = await editorContext.newPage();
  await login(editor, 'updater-editor', 'fixture-password');
  const forbidden = await editorContext.request.get(href);
  assert.equal(forbidden.status(), 403); await editorContext.close();
  pass('an editor cannot invoke the administrator update action');
  await page.screenshot({ path: '.test-output/updater/before-update.png', fullPage: true });
  await row.locator('.update-link').click();
  await page.waitForFunction(() => [...document.querySelectorAll('.plugin-update-tr')].some(row => /Updated!|Aktualisiert!/i.test(row.innerText)));
  await page.reload(); const after = await status();
  assert.equal(after.version, '2.0.0'); assert.equal(after.constant, '2.0.0'); assert.equal(after.active, true);
  assert.deepEqual(after.auto_updates, before.auto_updates);
  pass('native AJAX/bulk installer updates and reloads the active plugin without changing automatic-update preferences');
  assert.deepEqual(errors, []); pass('no browser JavaScript errors');
  await page.screenshot({ path: '.test-output/updater/after-update.png', fullPage: true });
  await writeFile('.test-output/updater/browser-report.json', JSON.stringify({ checks, before, after, errors }, null, 2));
} catch (e) {
  await page.screenshot({ path: '.test-output/updater/browser-failure.png', fullPage: true }).catch(() => {});
  console.log({ url: page.url(), body: (await page.locator('body').innerText()).slice(-5000), errors }); throw e;
} finally { await browser.close(); }
