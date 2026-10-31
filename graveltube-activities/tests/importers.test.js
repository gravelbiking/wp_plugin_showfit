import test from 'node:test';
import assert from 'node:assert/strict';
import { DOMParser } from '@xmldom/xmldom';
import { fitActivity, gpxActivity, tcxActivity, importFile } from '../src/importers.js';
import { fitFixture, gpx, tcx } from './fixtures.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';

test('FIT retains every record, raw messages, zeros and enhanced altitude', () => {
  const data = fitActivity(fitFixture({ points: 1200 }));
  assert.equal(data.records.length, 1200); assert.equal(data.decoded.records.length, 1200);
  assert.equal(data.records[0].altitude, 100); assert.equal(data.records[1].power, 0);
  assert.equal(data.records[0].speed, 10); assert.equal(data.records[0].heartRate, 140);
  assert.equal(data.records[0].cadence, 85); assert.equal(data.records[1].timestamp - data.records[0].timestamp, 1);
});
test('FIT accepts indoor files and preserves multiple sessions and laps', () => {
  const data = fitActivity(fitFixture({ indoor: true, sessions: 2 }));
  assert.equal(data.records.length, 8); assert.equal(data.sessions.length, 2); assert.equal(data.laps.length, 2);
  assert.equal(data.records[0].latitude, null); assert.equal(data.records[4].segment, 1);
});
test('FIT accepts ArrayBuffers from the Gutenberg iframe realm', () => {
  const bytes = fitFixture();
  const foreign = vm.runInNewContext('new Uint8Array(values).buffer', { values: [...bytes] });
  assert.equal(foreign instanceof ArrayBuffer, false);
  assert.equal(fitActivity(foreign).records.length, 4);
});
test('missing FIT sensors remain null rather than zero', () => {
  const data = fitActivity(fitFixture({ noHeartRate: true, noCadence: true }));
  assert.equal(data.records[0].heartRate, null); assert.equal(data.records[0].cadence, null);
});
test('FIT preserves app and creator-device metadata for origin suggestions', () => {
  const data = fitActivity(fitFixture({ manufacturer: 284, productName: 'Rouvy' }));
  assert.equal(data.decoded.file_ids[0].manufacturer, 'virtualtraining');
  assert.equal(data.decoded.file_ids[0].product_name, 'Rouvy');
  assert.equal(data.decoded.device_infos[0].device_index, 'creator');
  assert.equal(data.decoded.device_infos[0].product_name, 'Rouvy');
});
test('FIT refuses corrupt/truncated data', () => {
  const bytes = fitFixture(); bytes[bytes.length - 1] ^= 1;
  assert.throws(() => fitActivity(bytes), /CRC/); assert.throws(() => fitActivity(bytes.subarray(0, 14)));
});
test('GPX imports first point, all tracks and segments, extensions, and missing timestamps', () => {
  const data = gpxActivity(gpx, DOMParser);
  assert.equal(data.records.length, 5); assert.equal(data.sessions.length, 3);
  assert.equal(data.records[0].latitude, 50); assert.equal(data.records[0].timestamp, null);
  assert.equal(data.records[0].power, 210); assert.equal(data.records[0].heartRate, 141); assert.equal(data.records[0].cadence, 82);
  assert.notEqual(data.records[1].segment, data.records[2].segment);
});
test('TCX retains indoor sensors and all laps without requiring speed', () => {
  const data = tcxActivity(tcx, DOMParser);
  assert.equal(data.records.length, 4); assert.equal(data.laps.length, 2); assert.equal(data.records[0].speed, null);
  assert.equal(data.records[0].power, 205); assert.equal(data.records[0].heartRate, 142); assert.equal(data.records[0].cadence, 80);
  assert.equal(data.sessions[0].timerTime, 3);
});
test('XML rejects entities, wrong roots, empty activities and malformed XML', () => {
  assert.throws(() => gpxActivity('<!DOCTYPE gpx [<!ENTITY x SYSTEM "file:///etc/passwd">]><gpx/>', DOMParser), /DTD/);
  assert.throws(() => gpxActivity('<other/>', DOMParser)); assert.throws(() => tcxActivity('<TrainingCenterDatabase/>', DOMParser));
  assert.throws(() => gpxActivity('<gpx><trk></gpx>', DOMParser));
});
test('file import rejects oversized uploads and unsupported extensions', async () => {
  await assert.rejects(importFile({ size: 21 * 1024 * 1024 }), /20 MiB/);
  await assert.rejects(importFile({ name: 'activity.exe', size: 0, arrayBuffer: async () => new ArrayBuffer(0) }), /FIT-/);
});

// Exercise the real JS->PHP boundary with the same independent source fixtures.
mkdirSync('.test-output', { recursive: true });
for (const [name, data] of [['outdoor', fitActivity(fitFixture({ sessions: 2 }))], ['indoor', fitActivity(fitFixture({ indoor: true }))], ['gpx', gpxActivity(gpx, DOMParser)], ['tcx', tcxActivity(tcx, DOMParser)]]) writeFileSync(`.test-output/${name}.json`, JSON.stringify(data));
writeFileSync('.test-output/outdoor.fit', fitFixture({ sessions: 2 }));
writeFileSync('.test-output/indoor.fit', fitFixture({ indoor: true }));
writeFileSync('.test-output/named-workout.fit', fitFixture({ workoutName: 'Grundlagentraining & Ausdauer' }));
for (const [name, options] of [['rouvy', { manufacturer: 284, productName: 'Rouvy', indoor: true }], ['zwift', { manufacturer: 260, productName: 'Zwift', indoor: true }], ['ace', { manufacturer: 32, product: 57, productName: 'ELEMNT ACE' }]]) writeFileSync(`.test-output/${name}.fit`, fitFixture(options));
writeFileSync('.test-output/sample.gpx', gpx); writeFileSync('.test-output/sample.tcx', tcx);
