import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { fitActivity } from '../graveltube-activities/src/importers.js';
import { fitFixture } from '../graveltube-activities/tests/fixtures.js';
const base=process.env.GTA_TEST_URL || 'http://127.0.0.1:9418';
const browser=await chromium.launch({executablePath:process.env.GTA_CHROME_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const context=await browser.newContext(),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const api=async(path,method='GET',data)=>{await page.waitForFunction(()=>typeof window.wp?.apiFetch==='function');return page.evaluate(args=>wp.apiFetch(args),{path,method,data});};
const input=()=>page.locator('[data-gta-import] input[type=file]');
let checks=0;const pass=message=>{checks++;console.log('PASS',message);};
async function importUi(file,title='',charts=4) {
  await page.goto(base+'/wp-admin/post-new.php?post_type=gta_activity');await input().waitFor();
  if(title)await page.locator('#title').fill(title);
  await input().setInputFiles(file);
  await page.waitForFunction(()=>document.querySelector('[data-gta-import]')?.getAttribute('aria-busy')==='false');
  await page.waitForFunction(charts=>document.querySelectorAll('[data-gta-preview] canvas').length===charts,charts);
  const id=Number(await page.locator('[data-gta-import]').getAttribute('data-gta-import'));
  return {id,data:await api('/gta/v1/activities/'+id)};
}
async function metadataCase(decoded,manual='') {
  const source=fitFixture(),data=fitActivity(source);data.decoded={...data.decoded,...decoded};
  const result=await page.evaluate(async({bytes,activity,title})=>{
    const body=new FormData();body.append('source',new File([new Uint8Array(bytes)],'metadata.fit'));body.append('activity',activity);if(title)body.append('title',title);
    return wp.apiFetch({path:'/gta/v1/activities',method:'POST',body});
  },{bytes:[...source],activity:JSON.stringify(data),title:manual});
  return result;
}
try{
  await page.goto(base+'/wp-admin/');
  if(await page.locator('#user_login').count()){
    await page.waitForFunction(()=>document.activeElement?.id==='user_login');
    await page.locator('#user_login').fill('admin');await page.locator('#user_pass').fill('password');
    await Promise.all([page.waitForURL('**/wp-admin/**'),page.locator('#wp-submit').click()]);
  }
  await page.goto(base+'/wp-admin/plugins.php');const plugin=page.locator('[data-plugin="graveltube-activities/graveltube-activities.php"]');
  if(await plugin.locator('.activate a').count())await Promise.all([page.waitForNavigation(),plugin.locator('.activate a').click()]);
  const named=await importUi('.test-output/named-workout.fit');
  assert.equal(named.data.title,'Grundlagentraining & Ausdauer');assert.equal(named.data.titleSuggestion.source,'fit_workout');
  assert.equal(await page.locator('#title').inputValue(),'Grundlagentraining & Ausdauer');
  assert.equal(await page.locator('[data-gta-preview] .gta-heading').textContent(),'Grundlagentraining & Ausdauer');
  pass('a workout name from the actual FIT messages becomes the editable title proposal, with ampersands displayed correctly');
  const custom=await importUi('.test-output/named-workout.fit','Meine eigene Ausfahrt');
  assert.equal(custom.data.title,'Meine eigene Ausfahrt');assert.equal(await page.locator('#title').inputValue(),'Meine eigene Ausfahrt');
  assert.equal(custom.data.titleSuggestion.title,'Grundlagentraining & Ausdauer');
  pass('a self-entered title takes precedence while the separate FIT proposal remains available');
  await page.getByRole('button',{name:'Titelvorschlag übernehmen',exact:true}).click();
  assert.equal(await page.locator('#title').inputValue(),'Grundlagentraining & Ausdauer');
  await page.locator('#title').fill('Nachträglich geändert & frei gewählt');
  await Promise.all([page.waitForNavigation(),page.locator('#publish').click()]);
  await input().waitFor();
  assert.equal((await api('/gta/v1/activities/'+custom.id)).title,'Nachträglich geändert & frei gewählt');
  assert.match(await page.locator('[data-gta-title-suggestion]').textContent(),/Grundlagentraining & Ausdauer/);
  pass('the proposal can be accepted or freely edited; saving/reloading keeps the user choice and the proposal');
  const anonymous=await browser.newContext();const publicData=await(await anonymous.request.get(base+'/wp-json/gta/v1/activities/'+custom.id)).json();
  assert.equal(publicData.title,'Nachträglich geändert & frei gewählt');assert.equal(publicData.titleSuggestion,undefined);assert.equal(publicData.provenance,undefined);
  pass('public responses show the chosen title without exposing private filename/workout proposals');
  await input().setInputFiles('.test-output/ace.fit');await page.waitForFunction(()=>document.querySelector('[data-gta-import]')?.getAttribute('aria-busy')==='false');
  const preserved=await api('/gta/v1/activities/'+custom.id);assert.equal(preserved.title,'Nachträglich geändert & frei gewählt');assert.equal(preserved.titleSuggestion.source,'filename');
  assert.equal(await page.locator('#title').inputValue(),'Nachträglich geändert & frei gewählt');
  pass('reimport updates the proposal and preserves the existing chosen title');
  const fallback=await importUi('.test-output/ace.fit');assert.equal(fallback.data.title,'ace');assert.equal(fallback.data.titleSuggestion.source,'filename');
  pass('FIT files without an activity/workout name fall back to the filename');
  const activity=await metadataCase({activity:{activity_name:'Gravelfahrt'},workout:{wkt_name:'Grundlagentraining'}});
  assert.equal(activity.title,'Gravelfahrt');assert.equal(activity.titleSuggestion.source,'fit_activity');
  pass('an explicit FIT activity name has priority over a workout name');
  const blank=await metadataCase({activity:{name:' \n <b></b> '},workout:{wkt_name:['', '  Grundlage   am Morgen  ']}});
  assert.equal(blank.title,'Grundlage am Morgen');assert.equal(blank.titleSuggestion.source,'fit_workout');
  pass('empty/markup-only activity names are skipped and decoded workout name arrays are handled');
  const incidental=await metadataCase({activity:{},workout:{wkt_name:' \t '},course:{name:'Streckenname'},sports:[{name:'Sportprofil'}],device_infos:[{device_index:'creator',product_name:'Gerätename'}]});
  assert.equal(incidental.title,'metadata');assert.equal(incidental.titleSuggestion.source,'filename');
  pass('route, sport-profile and device names never become an activity-title proposal');
  const manual=await metadataCase({activity:{name:'FIT-Aktivität'},workout:{wkt_name:'FIT-Workout'}},'Eigener Titel');
  assert.equal(manual.title,'Eigener Titel');assert.equal(manual.titleSuggestion.title,'FIT-Aktivität');
  pass('manual-title priority also applies to direct and Gutenberg-style imports');
  await page.goto(base+'/wp-admin/edit.php?post_type=gta_activity&page=gta-import');
  await input().setInputFiles('.test-output/named-workout.fit');await page.waitForFunction(()=>document.querySelector('[data-gta-import]')?.getAttribute('aria-busy')==='false');
  assert.equal(await page.locator('[data-gta-preview] .gta-heading').textContent(),'Grundlagentraining & Ausdauer');
  pass('the separate automatic import page uses the same FIT title proposal');
  if(process.argv[2]) {
    const expected=fitActivity(await readFile(process.argv[2]));const expectedName=expected.decoded.workout.wkt_name;assert.equal(typeof expectedName,'string');assert.ok(expectedName.trim());
    const charts=['altitude','power','heartRate','cadence'].filter(key=>expected.records.some(r=>r[key]!==null)).length;
    const real=await importUi(process.argv[2],'',charts);assert.equal(real.data.title,expectedName.trim());assert.equal(real.data.titleSuggestion.source,'fit_workout');assert.equal(real.data.records.length,expected.records.length);
    pass('the actual FIT file proposes its stored workout name and retains every record');
  }
  await page.screenshot({path:'.test-output/title-suggestion.png',fullPage:true});
  assert.deepEqual(errors,[]);pass('no browser JavaScript errors');
  console.log(JSON.stringify({checks}));await anonymous.close();
}catch(error){console.error({url:page.url(),errors,status:await page.locator('[data-gta-import]').innerText().catch(()=>null)});await page.screenshot({path:'.test-output/title-suggestion-failure.png',fullPage:true});throw error;}
finally{await browser.close();}
