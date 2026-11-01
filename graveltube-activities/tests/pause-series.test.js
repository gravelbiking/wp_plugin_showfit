import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const window = {};
vm.runInNewContext(readFileSync(new URL('../assets/viewer.js',import.meta.url),'utf8'), {window, document:{readyState:'loading',addEventListener(){},documentElement:{}}, MutationObserver:class{observe(){}}});
const {displaySeries,pauseSeries,routeSegments} = window.GTAViewer;
const point = (elapsed, altitude=100, extra={}) => ({index:elapsed, elapsed, timestamp:1000+elapsed, distance:elapsed*2, speed:2, segment:0, altitude, heartRate:140, cadence:80, power:200, ...extra});
const copy = value => JSON.parse(JSON.stringify(value));
const x = p => p.elapsed;
test('height, pulse and cadence continue horizontally over a recorded pause, then resume at the measured value',()=>{
  const records=[point(0),point(60,110,{heartRate:120,cadence:0})], before=JSON.stringify(records);
  for(const key of ['altitude','heartRate','cadence']) {
    const data=copy(displaySeries(records,key,x,2000,[{start:1,end:60}]));
    assert.equal(data.some(p=>p.y===null),false);
    assert.deepEqual(data.map(p=>[p.x,p.y]),[[0,records[0][key]],[60,records[0][key]],[60,records[1][key]]]);
    assert.equal(data[1].held,true);
  }
  assert.equal(JSON.stringify(records),before,'stored samples must remain unchanged');
  assert.ok(displaySeries([point(0),point(10,110)],'altitude',x,2000,[{start:1,end:10}]).some(p=>p.held && p.x===10 && p.y===100));
});
test('unknown moving gaps and segment boundaries stay broken; power is never filled',()=>{
  const records=[point(0),point(60,110)];
  assert.ok(displaySeries(records,'altitude',x).some(p=>p.y===null));
  assert.ok(displaySeries(records,'power',x,2000,[{start:0,end:60}]).some(p=>p.y===null));
  assert.ok(displaySeries([point(0),point(60,110,{segment:1})],'altitude',x,2000,[{start:0,end:60}]).some(p=>p.y===null));
  assert.ok(displaySeries(records,'altitude',x,2000,[{start:30,end:40}]).some(p=>p.y===null));
});
test('stationary endpoints allow a horizontal display gap without timer events',()=>{
  const records=[point(0,100,{speed:0,distance:20}),point(60,101,{speed:0,distance:20})];
  assert.deepEqual(copy(displaySeries(records,'altitude',x)).map(p=>[p.x,p.y]),[[0,100],[60,100],[60,101]]);
  const unknown=[point(0,100,{speed:null,distance:0}),point(60,101,{speed:null,distance:0})];
  assert.ok(displaySeries(unknown,'altitude',x).some(p=>p.y===null),'missing movement data must not imply a stop');
});
test('real sensor changes during a stop remain intact and null values are filled only inside the pause',()=>{
  const measured=[point(0),point(1,101),point(2,102)];
  assert.deepEqual(copy(displaySeries(measured,'altitude',x,2000,[{start:0,end:2}])).map(p=>p.y),[100,101,102]);
  const missing=[point(0),point(1,null),point(2,102)];
  assert.ok(displaySeries(missing,'altitude',x,2000,[{start:0,end:2}]).some(p=>p.held && p.y===100));
  assert.equal(displaySeries(missing,'altitude',x).find(p=>p.x===1).y,null);
  assert.equal(pauseSeries([point(0,null),point(60,110)],'altitude',[{start:0,end:60}]).some(p=>p.held),false);
});
test('an unfinished pause extends the last value to its end without inventing a new reading',()=>{
  const data=copy(displaySeries([point(0),point(10)],'altitude',x,2000,[{start:11,end:90}]));
  assert.equal(data.at(-1).x,90); assert.equal(data.at(-1).y,100); assert.equal(data.at(-1).held,true);
});
test('a missing sensor just before a pause uses its last known value inside the pause while the moving gap stays open',()=>{
  const records=[point(0,100),point(8,null),point(68,null),point(69,null),point(70,110)];
  const data=copy(displaySeries(records,'altitude',x,2000,[{start:9,end:68}]));
  assert.equal(data.find(p=>p.x===8).y,null);
  assert.ok(data.some(p=>p.x===9 && p.held && p.y===100));
  assert.ok(data.some(p=>p.x===68 && p.held && p.y===100));
  assert.equal(data.find(p=>p.x===69).y,null);
});
test('display reduction retains held boundaries and real peaks, and the map retains recording gaps',()=>{
  const records=Array.from({length:100},(_,i)=>point(i, i===15?500:100));
  records.push(point(160,200));
  const data=displaySeries(records,'altitude',x,10,[{start:100,end:160}]);
  assert.ok(data.some(p=>p.y===500)); assert.ok(data.some(p=>p.held && p.x===160 && p.y===100));
  const gps=[point(0,100,{latitude:50,longitude:7}),point(60,100,{latitude:50,longitude:7})];
  assert.equal(routeSegments(gps).length,2);
});
