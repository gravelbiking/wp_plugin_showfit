import { chromium } from 'playwright';
import { writeFile, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const base = process.env.GTA_TEST_URL || 'http://127.0.0.1:9416';
const browser = await chromium.launch({ executablePath: process.env.GTA_CHROME_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const context = await browser.newContext(), page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
const api = (path, method = 'GET', data) => page.evaluate(args => wp.apiFetch(args), { path, method, data });
const notice = 'Der genaue Start und das Ziel sind aus Sicherheitsgründen hier ausgeblendet.';
let checks = 0; const pass = message => { checks++; console.log('PASS', message); };
const block = attributes => `<!-- wp:graveltube/activity ${JSON.stringify(attributes)} /-->`;
const gps = d => d.records.filter(r => r.latitude !== null && r.longitude !== null);
const distance = (a, b) => { const rad = Math.PI / 180, x = (b.latitude-a.latitude)*rad, y=(b.longitude-a.longitude)*rad; const h=Math.sin(x/2)**2+Math.cos(a.latitude*rad)*Math.cos(b.latitude*rad)*Math.sin(y/2)**2; return 12742000*Math.atan2(Math.sqrt(h),Math.sqrt(1-h)); };
async function defaultPrivacy(value) {
  await page.goto(base + '/wp-admin/edit.php?post_type=gta_activity&page=gta-display');
  await page.locator('input[type=checkbox][name=gta_private_outdoor_default]').setChecked(value);
  await Promise.all([page.waitForNavigation(), page.getByRole('button', {name:'Anzeige speichern'}).click()]);
}
async function dismiss() { await page.keyboard.press('Escape'); await page.locator('.components-modal__screen-overlay').waitFor({state:'hidden'}); }
try {
  await page.goto(base + '/wp-admin/');
  if (await page.locator('#user_login').count()) {
    await page.locator('#user_login').fill('admin'); await page.locator('#user_pass').fill('password');
    await Promise.all([page.waitForURL('**/wp-admin/**'), page.locator('#wp-submit').click()]);
  }
  await defaultPrivacy(false);
  const source = `<?xml version="1.0"?><gpx><trk><trkseg>${Array.from({length:31},(_,i)=>`<trkpt lat="${50+i*.001}" lon="7"><time>${new Date(Date.UTC(2026,9,1,8,0,i*10)).toISOString()}</time><ele>${100+i}</ele><extensions><power>210</power><hr>145</hr><cad>85</cad></extensions></trkpt>`).join('')}</trkseg></trk></gpx>`;
  await writeFile('.test-output/privacy-route.gpx',source);
  await page.goto(base + '/wp-admin/edit.php?post_type=gta_activity&page=gta-import');
  await page.locator('[data-gta-import] input[type=file]').setInputFiles('.test-output/privacy-route.gpx');
  const link=page.locator('[data-gta-import] a');await link.waitFor();
  const edit=await link.getAttribute('href'), id=Number(new URL(edit).searchParams.get('post'));
  await page.goto(edit);await Promise.all([page.waitForNavigation(),page.locator('#publish').click()]);
  const original=await api('/gta/v1/activities/'+id);assert.equal(gps(original).length,31);
  const download=await context.request.get(await page.getByRole('link',{name:'Originaldatei herunterladen',exact:true}).getAttribute('href'));
  assert.deepEqual(await download.body(),await readFile('.test-output/privacy-route.gpx'));
  const content=['inherit','on','off'].map(privateMap=>block({activityId:id,activityType:'outdoor',privateMap})).join('\n');
  const post=await api('/wp/v2/pages','POST',{title:'Privater Kartenmodus – Integrationstest',status:'publish',content});
  const anon=await browser.newContext({viewport:{width:1280,height:1000}}), view=await anon.newPage();view.on('pageerror',e=>errors.push(e.message));
  let tileCount=0;
  await view.route('**/*',route=>{
    if(new URL(route.request().url()).hostname.endsWith('openstreetmap.org')){tileCount++;return route.fulfill({status:200,contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jGxkAAAAASUVORK5CYII=','base64')});}
    return route.continue();
  });
  await view.goto(post.link);await view.waitForFunction(()=>document.querySelectorAll('.gta-activity canvas').length===12);
  const endpoints=await view.locator('.gta-activity').evaluateAll(rs=>rs.map(r=>r.dataset.gtaEndpoint));
  const fetchView=async index=>{const response=await anon.request.get(endpoints[index]);assert.equal(response.status(),200);return response.json();};
  let responses=await Promise.all(endpoints.map((_,i)=>fetchView(i)));
  assert.deepEqual(responses.map(d=>d.mapPrivacy.enabled),[false,true,false]);
  assert.equal(gps(responses[0]).length,31);assert.equal(gps(responses[2]).length,31);
  const redacted=responses[1];assert.equal(redacted.records.length,31);assert.ok(gps(redacted).length>0 && gps(redacted).length<31);
  assert.ok(gps(redacted).every(r=>distance(original.records[0],r)>=500 && distance(original.records.at(-1),r)>=500));
  assert.deepEqual(redacted.summary,original.summary);assert.equal(redacted.records[0].power,210);assert.equal(redacted.records.at(-1).heartRate,145);
  pass('a post can enable privacy with global default off; both 500m areas are redacted server-side without losing any training samples');
  assert.equal(await view.locator('.gta-map-privacy').count(),1);assert.equal(await view.locator('.gta-map-privacy').textContent(),notice);assert.equal(tileCount,0);
  pass('the exact privacy notice appears only for the protected map and no tiles load before consent');
  for(const suffix of ['', '?private_map=off&type=zwift','?private_map=off&_fields=records,laps']) {
    const d=await (await anon.request.get(base+'/wp-json/gta/v1/activities/'+id+suffix)).json();assert.equal(gps(d).length,0);
  }
  const tampered=new URL(endpoints[1]);tampered.searchParams.set('private_map','off');tampered.searchParams.set('type','zwift');
  assert.equal(gps(await (await anon.request.get(tampered.href)).json()).length,gps(redacted).length);
  const forged=new URL(endpoints[1]);forged.searchParams.set('view','0'.repeat(64));assert.equal((await anon.request.get(forged.href)).status(),404);
  pass('dropping context, forging it or changing type/privacy query parameters cannot reveal hidden GPS');
  await page.goto(base+'/wp-admin/edit.php?post_type=gta_activity&page=gta-services');
  await page.locator('input[type=checkbox][name=gta_osm_enabled]').check();
  await Promise.all([page.waitForNavigation(),page.getByRole('button',{name:'Freigabe speichern'}).click()]);
  await view.reload();await view.waitForFunction(()=>document.querySelectorAll('.gta-activity canvas').length===12);
  const privateRoot=view.locator('.gta-activity').nth(1);
  await view.evaluate(()=>{window.testMarkers=[];const L=window.GTALeaflet,original=L.circleMarker;L.circleMarker=(position,options)=>{window.testMarkers.push({position,options});return original(position,options);};});
  await privateRoot.getByRole('button',{name:'OpenStreetMap laden',exact:true}).click();
  await privateRoot.locator('.gta-map').waitFor();
  assert.equal(await view.evaluate(()=>window.testMarkers.length),1,'only a safe hover marker is created; Start/Ziel markers are omitted');
  const routePaths=await privateRoot.locator('.gta-map svg path').count();
  assert.ok(await privateRoot.evaluate(root=>!!(root.querySelector('.gta-map').compareDocumentPosition(root.querySelector('.gta-map-privacy')) & Node.DOCUMENT_POSITION_FOLLOWING)));
  await privateRoot.locator('.gta-map-area').screenshot({path:'.test-output/private-map.png'});
  pass('the protected map has no Start/Ziel markers and the requested notice is below the loaded map');
  const canvas=privateRoot.locator('canvas').nth(1);await canvas.scrollIntoViewIfNeeded();const bounds=await canvas.boundingBox();
  await view.mouse.move(bounds.x+55,bounds.y+bounds.height/2);
  assert.equal(await privateRoot.locator('.gta-map svg path').count(),routePaths);
  pass('hovering over the hidden start does not restore a map marker');
  await defaultPrivacy(true);
  responses=await Promise.all(endpoints.map((_,i)=>fetchView(i)));
  assert.deepEqual(responses.map(d=>d.mapPrivacy.enabled),[true,true,false]);assert.equal(gps(responses[2]).length,31);
  pass('a global setting change immediately updates inherited views while explicit per-post on/off choices persist');
  await defaultPrivacy(false);
  assert.equal(gps(await fetchView(0)).length,31);assert.ok(gps(await fetchView(1)).length<31);
  await page.goto(base+'/wp-admin/edit.php?post_type=gta_activity&page=gta-import');
  const extra=await api('/wp/v2/pages','POST',{title:'Privacy contexts',status:'publish',content:`[graveltube_activity id="${id}" type="outdoor" private_map="on"]\n[graveltube_activity id="${id}" type="outdoor" private_map="off"]\n${block({activityId:id,activityType:'rouvy',privateMap:'on'})}\n${block({activityId:id,activityType:'zwift',privateMap:'on'})}`});
  await view.goto(extra.link);await view.waitForFunction(()=>document.querySelectorAll('.gta-activity canvas').length===16);
  const extras=await view.locator('.gta-activity').evaluateAll(rs=>rs.map(r=>r.dataset.gtaEndpoint));
  const types=await Promise.all(extras.map(async url=>(await (await anon.request.get(url)).json()).mapPrivacy.enabled));assert.deepEqual(types,[true,false,false,false]);
  pass('shortcodes honor on/off and ROUVY/Zwift remain untrimmed even when the option is selected');
  const ref=await api('/wp/v2/blocks','POST',{title:'Protected synced activity',status:'publish',content:block({activityId:id,activityType:'outdoor',privateMap:'on'})});
  const nested=await api('/wp/v2/pages','POST',{title:'Nested privacy views',status:'publish',content:`<!-- wp:group --><div class="wp-block-group">${block({activityId:id,activityType:'outdoor',privateMap:'on'})}</div><!-- /wp:group -->\n<!-- wp:block {"ref":${ref.id}} /-->\n[[graveltube_activity id="${id}" type="outdoor" private_map="off"]]`});
  await view.goto(nested.link);await view.waitForFunction(()=>document.querySelectorAll('.gta-heading').length===2);
  for(const url of await view.locator('.gta-activity').evaluateAll(rs=>rs.map(r=>r.dataset.gtaEndpoint))) assert.ok(gps(await (await anon.request.get(url)).json()).length<31);
  const escapedKey=createHash('sha256').update(JSON.stringify({activityId:id,activityType:'outdoor',privateMap:'off'})).digest('hex');
  assert.equal((await anon.request.get(base+'/wp-json/gta/v1/activities/'+id+'?post='+nested.id+'&view='+escapedKey)).status(),404);
  pass('nested/synced blocks keep privacy, and an escaped shortcode cannot authorize an unprotected map');
  const other=await api('/wp/v2/users','POST',{username:'privacy_other_'+Date.now(),email:'privacy-other-'+Date.now()+'@example.test',password:'Local-test-password-4827',roles:['author']});
  const foreign=await api('/wp/v2/pages','POST',{title:'Foreign author view',author:other.id,status:'publish',content:block({activityId:id,privateMap:'off'})});
  await view.goto(foreign.link);await view.waitForFunction(()=>!!document.querySelector('.gta-heading'));
  const foreignUrl=await view.locator('.gta-activity').getAttribute('data-gta-endpoint');assert.equal(gps(await (await anon.request.get(foreignUrl)).json()).length,0);
  pass('an unrelated author cannot declassify an activity by publishing another off-mode embedding');
  const draft=await api('/wp/v2/pages','POST',{title:'Private context',status:'draft',content:block({activityId:id,privateMap:'off'})});
  const draftUrl=new URL(endpoints[2]);draftUrl.searchParams.set('post',draft.id);assert.equal((await anon.request.get(draftUrl.href)).status(),404);
  pass('unpublished containing posts cannot be used as public GPS contexts');
  const editorDraft=await api('/wp/v2/pages','POST',{title:'Privatmodus im Block',status:'draft',content:block({activityId:id})});
  await page.goto(base+'/wp-admin/post.php?post='+editorDraft.id+'&action=edit');
  await page.waitForFunction(()=>wp.blocks?.getBlockType('graveltube/activity') && wp.data?.select('core/editor')?.getCurrentPostType()==='page');
  await page.frameLocator('iframe[name=editor-canvas]').getByText(/Vorschlag: Outdoor\./).waitFor();await dismiss();
  await page.evaluate(()=>{const b=wp.data.select('core/block-editor').getBlocks().find(b=>b.name==='graveltube/activity');wp.data.dispatch('core/block-editor').selectBlock(b.clientId);wp.data.dispatch('core/edit-post').openGeneralSidebar('edit-post/block');});
  const control=page.getByLabel('Outdoor-Privatmodus',{exact:true});assert.equal(await control.inputValue(),'inherit');await control.selectOption('on');
  await page.evaluate(async()=>{wp.data.dispatch('core/editor').editPost({title:'Privatmodus im Block',status:'publish'});await wp.data.dispatch('core/editor').savePost();});
  await page.reload();await page.waitForFunction(()=>wp.data?.select('core/block-editor')?.getBlocks().some(b=>b.name==='graveltube/activity'));
  assert.equal(await page.evaluate(()=>wp.data.select('core/block-editor').getBlocks().find(b=>b.name==='graveltube/activity').attributes.privateMap),'on');
  pass('the Gutenberg per-post privacy choice persists after a real save and reload');
  await api('/wp/v2/pages/'+post.id,'POST',{content:block({activityId:id,activityType:'outdoor',privateMap:'off'})});
  assert.equal((await anon.request.get(endpoints[1])).status(),404);
  pass('a removed saved context cannot be replayed through a stale URL');
  assert.deepEqual(errors,[]);pass('no browser JavaScript errors');
  console.log(JSON.stringify({checks,id}));await anon.close();
}catch(error){console.error({url:page.url(),errors});await page.screenshot({path:'.test-output/map-privacy-failure.png',fullPage:true});throw error;}
finally{await browser.close();}
