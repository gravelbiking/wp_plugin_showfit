// Small, independently generated FIT activities with a real header and CRC.
export function crc(bytes) {
  let value = 0;
  for (const byte of bytes) { value ^= byte; for (let bit = 0; bit < 8; bit++) value = (value & 1) ? (value >>> 1) ^ 0xa001 : value >>> 1; }
  return value;
}
const uint16 = value => { const b = Buffer.alloc(2); b.writeUInt16LE(value); return b; };
const uint32 = value => { const b = Buffer.alloc(4); b.writeUInt32LE(value >>> 0); return b; };
function definition(local, global, fields) {
  return Buffer.concat([Buffer.from([0x40 | local, 0, 0]), uint16(global), Buffer.from([fields.length]), Buffer.from(fields.flat())]);
}
export function fitFixture({ indoor = false, sessions = 1, points = 4, noHeartRate = false, noCadence = false, manufacturer, product = 1, productName = '', workoutName, gearEvents = [] } = {}) {
  const chunks = [], start = 1100000000;
  if (manufacturer !== undefined) {
    const name = Buffer.alloc(64); name.write(productName, 0, 63, 'utf8');
    chunks.push(definition(3, 0, [[0, 1, 0], [1, 2, 0x84], [2, 2, 0x84], [8, 64, 7]]));
    chunks.push(Buffer.concat([Buffer.from([3, 4]), uint16(manufacturer), uint16(product), name]));
    chunks.push(definition(4, 23, [[0, 1, 2], [2, 2, 0x84], [4, 2, 0x84], [27, 64, 7]]));
    chunks.push(Buffer.concat([Buffer.from([4, 0]), uint16(manufacturer), uint16(product), name]));
  }
  if (workoutName !== undefined) {
    const name = Buffer.alloc(128); name.write(workoutName, 0, 127, 'utf8');
    chunks.push(definition(5, 26, [[8, 128, 7]])); chunks.push(Buffer.concat([Buffer.from([5]), name]));
  }
  chunks.push(definition(0, 20, [[253, 4, 0x86], [0, 4, 0x85], [1, 4, 0x85], [78, 4, 0x86], [5, 4, 0x86], [7, 2, 0x84], [3, 1, 2], [4, 1, 2], [73, 4, 0x86]]));
  chunks.push(definition(1, 18, [[2, 4, 0x86], [253, 4, 0x86], [8, 4, 0x86], [7, 4, 0x86], [9, 4, 0x86], [5, 1, 0], [6, 1, 0]]));
  chunks.push(definition(2, 19, [[2, 4, 0x86], [253, 4, 0x86], [8, 4, 0x86], [9, 4, 0x86], [0, 4, 0x85], [1, 4, 0x85]]));
  for (let session = 0; session < sessions; session++) {
    const base = start + session * (points + 10);
    for (let i = 0; i < points; i++) chunks.push(Buffer.concat([Buffer.from([0]), uint32(base + i),
      uint32(indoor ? 0x7fffffff : Math.round((50 + i * .0001) / 180 * 2 ** 31)), uint32(indoor ? 0x7fffffff : Math.round(7 / 180 * 2 ** 31)),
      uint32((500 + 100 + i) * 5), uint32(i * 1000), uint16(i === 1 ? 0 : 200 + i), Buffer.from([noHeartRate ? 255 : 140 + i, noCadence ? 255 : 85]), uint32(10000)]));
    chunks.push(Buffer.concat([Buffer.from([2]), uint32(base), uint32(base + points - 1), uint32((points - 1) * 1000), uint32((points - 1) * 1000), uint32(0x7fffffff), uint32(0x7fffffff)]));
    chunks.push(Buffer.concat([Buffer.from([1]), uint32(base), uint32(base + points - 1), uint32((points - 1) * 1000), uint32((points - 1) * 1000), uint32((points - 1) * 1000), Buffer.from([2, indoor ? 6 : 0])]));
  }
  if (gearEvents.length) {
    chunks.push(definition(6, 21, [[253, 4, 0x86], [0, 1, 0], [1, 1, 0], [3, 4, 0x86]]));
    for (const gear of gearEvents) chunks.push(Buffer.concat([Buffer.from([6]), uint32(start + gear.seconds), Buffer.from([gear.event || 43, 3]), uint32((gear.rearPosition || 0) + (gear.rearTeeth || 0) * 256 + (gear.frontPosition || 0) * 65536 + (gear.frontTeeth || 0) * 16777216)]));
  }
  const payload = Buffer.concat(chunks), header = Buffer.concat([Buffer.from([14, 0x10]), uint16(21115), uint32(payload.length), Buffer.from('.FIT')]);
  const file = Buffer.concat([header, uint16(crc(header)), payload]);
  return Buffer.concat([file, uint16(crc(file))]);
}

export const gpx = `<?xml version="1.0"?><gpx xmlns="http://www.topografix.com/GPX/1/1" xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1"><trk><type>cycling</type><trkseg><trkpt lat="50" lon="7"><ele>100</ele><extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>141</gpxtpx:hr><gpxtpx:cad>82</gpxtpx:cad></gpxtpx:TrackPointExtension><power>210</power></extensions></trkpt><trkpt lat="50.001" lon="7"><ele>104</ele></trkpt></trkseg><trkseg><trkpt lat="51" lon="8"><ele>150</ele></trkpt><trkpt lat="51.001" lon="8"><ele>152</ele></trkpt></trkseg></trk><trk><trkseg><trkpt lat="52" lon="9"><ele>200</ele></trkpt></trkseg></trk></gpx>`;
export const tcx = `<?xml version="1.0"?><TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2" xmlns:ns3="http://www.garmin.com/xmlschemas/ActivityExtension/v2"><Activities><Activity Sport="Biking"><Lap StartTime="2026-01-01T12:00:00Z"><TotalTimeSeconds>2</TotalTimeSeconds><DistanceMeters>20</DistanceMeters><Track><Trackpoint><Time>2026-01-01T12:00:00Z</Time><DistanceMeters>0</DistanceMeters><Cadence>80</Cadence><HeartRateBpm><Value>142</Value></HeartRateBpm><Extensions><ns3:TPX><ns3:Watts>205</ns3:Watts></ns3:TPX></Extensions></Trackpoint><Trackpoint><Time>2026-01-01T12:00:02Z</Time><DistanceMeters>20</DistanceMeters></Trackpoint></Track></Lap><Lap StartTime="2026-01-01T12:01:00Z"><TotalTimeSeconds>1</TotalTimeSeconds><DistanceMeters>10</DistanceMeters><Track><Trackpoint><Time>2026-01-01T12:01:00Z</Time><DistanceMeters>20</DistanceMeters></Trackpoint><Trackpoint><Time>2026-01-01T12:01:01Z</Time><DistanceMeters>30</DistanceMeters></Trackpoint></Track></Lap></Activity></Activities></TrainingCenterDatabase>`;
