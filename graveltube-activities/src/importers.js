/* Derived from Show Fit File's import design. Rewritten for lossless activity storage, 2026-10-31. */
import FitParser from 'fit-file-parser';

export const MAX_BYTES = 20 * 1024 * 1024;
const number = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? Number(value) : null;
const fitTime = value => value instanceof Date ? value.getTime() / 1000 : dateTime(value);
const dateTime = value => value && Number.isFinite(Date.parse(value)) ? Date.parse(value) / 1000 : null;
const children = (node, name) => Array.from(node.childNodes || []).filter(n => n.nodeType === 1 && n.localName === name);
const descendants = (node, name) => Array.from(node.getElementsByTagName('*')).filter(n => n.localName === name);
const text = (node, name) => children(node, name)[0]?.textContent?.trim() ?? null;
const field = (node, name) => number(text(node, name));
const extension = (node, names) => {
  for (const name of names) {
    const value = number(descendants(node, name)[0]?.textContent?.trim());
    if (value !== null) return value;
  }
  return null;
};

export function fitActivity(bytes) {
  let messages, failure;
  const parser = new FitParser({ force: false, strict: true, mode: 'list', speedUnit: 'm/s', lengthUnit: 'm', includeRawMessages: true, includeUnmappedMessages: true, includeRawDeveloperFields: true });
  // Gutenberg v3 renders the file input in an iframe: ArrayBuffers may come from a different realm.
  const input = ArrayBuffer.isView(bytes) ? new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength) : new Uint8Array(bytes);
  try { parser.parse(input, (error, result) => { failure = error; messages = result; }); }
  catch (error) { failure = error; }
  if (failure || !messages) throw new Error('FIT konnte nicht vollständig gelesen werden (Header/CRC): ' + String(failure || 'Keine Daten'));
  const sessions = (messages.sessions || []).map(s => ({
    start: fitTime(s.start_time), end: fitTime(s.timestamp), timerTime: number(s.total_timer_time),
    elapsedTime: number(s.total_elapsed_time), distance: number(s.total_distance),
    ascent: number(s.total_ascent), descent: number(s.total_descent), sport: String(s.sport || ''),
    subSport: String(s.sub_sport || '')
  }));
  const records = (messages.records || []).map(r => {
    const timestamp = fitTime(r.timestamp);
    let segment = -1;
    for (let i = sessions.length - 1; i >= 0; i--) {
      const s = sessions[i];
      if (timestamp !== null && s.start !== null && timestamp >= s.start && (s.end === null || timestamp <= s.end)) { segment = i; break; }
    }
    if (segment < 0) segment = 0;
    return {
      timestamp, distance: number(r.distance), latitude: number(r.position_lat), longitude: number(r.position_long),
      altitude: number(r.enhanced_altitude ?? r.altitude), speed: number(r.enhanced_speed ?? r.speed),
      power: number(r.power), heartRate: number(r.heart_rate), cadence: number(r.cadence), segment
    };
  });
  const laps = (messages.laps || []).map(l => ({
    start: fitTime(l.start_time), end: fitTime(l.timestamp), timerTime: number(l.total_timer_time),
    elapsedTime: number(l.total_elapsed_time), distance: number(l.total_distance),
    avgPower: number(l.avg_power), avgHeartRate: number(l.avg_heart_rate), avgCadence: number(l.avg_cadence),
    latitude: number(l.end_position_lat), longitude: number(l.end_position_long)
  }));
  const events = (messages.events || []).filter(e => e.event === 'timer').map(e => ({ timestamp: fitTime(e.timestamp), type: String(e.event_type).replace(/_([a-z])/g, (_, c) => c.toUpperCase()) }));
  return { format: 'fit', records, sessions, laps, events, decoded: messages };
}

function xmlDocument(xml, root, Parser) {
  if (/<!\s*(?:DOCTYPE|ENTITY)/i.test(xml)) throw new Error('XML mit DTD oder Entitäten wird nicht unterstützt.');
  const doc = new Parser().parseFromString(xml, 'application/xml');
  if (!doc.documentElement || doc.documentElement.localName !== root || descendants(doc, 'parsererror').length) throw new Error('Ungültige XML-Datei.');
  return doc;
}

export function gpxActivity(xml, Parser = globalThis.DOMParser) {
  const doc = xmlDocument(xml, 'gpx', Parser);
  const records = [], sessions = [];
  // Each track segment / route remains separate: no invented connections across gaps.
  const groups = Array.from(doc.getElementsByTagName('*')).filter(n => n.localName === 'trkseg' || n.localName === 'rte');
  for (const group of groups) {
    const segment = sessions.length;
    const points = children(group, group.localName === 'rte' ? 'rtept' : 'trkpt');
    if (!points.length) continue;
    const track = group.parentNode;
    for (const p of points) records.push({
      timestamp: dateTime(text(p, 'time')), distance: null,
      latitude: number(p.getAttribute('lat')), longitude: number(p.getAttribute('lon')),
      altitude: field(p, 'ele'), speed: extension(p, ['speed', 'Speed']),
      power: extension(p, ['power', 'Power', 'watts', 'Watts']),
      heartRate: extension(p, ['hr', 'HeartRate']), cadence: extension(p, ['cad', 'cadence', 'Cadence']), segment
    });
    sessions.push({ start: dateTime(text(points[0], 'time')), end: dateTime(text(points.at(-1), 'time')),
      timerTime: null, elapsedTime: null, distance: null, ascent: null, descent: null,
      sport: text(track, 'type') || '', subSport: '' });
  }
  if (!records.length) throw new Error('GPX enthält keine Track- oder Routenpunkte.');
  return { format: 'gpx', records, sessions, laps: [], events: [], decoded: null };
}

export function tcxActivity(xml, Parser = globalThis.DOMParser) {
  const doc = xmlDocument(xml, 'TrainingCenterDatabase', Parser);
  const records = [], sessions = [], laps = [];
  let segment = 0;
  for (const activity of descendants(doc, 'Activity')) {
    const activityRecords = [];
    let timerTime = 0, distance = 0, hasTimer = false, hasDistance = false;
    for (const lap of children(activity, 'Lap')) {
      const lapRecords = [];
      const lapTimer = field(lap, 'TotalTimeSeconds'), lapDistance = field(lap, 'DistanceMeters');
      if (lapTimer !== null) { timerTime += lapTimer; hasTimer = true; }
      if (lapDistance !== null) { distance += lapDistance; hasDistance = true; }
      for (const track of children(lap, 'Track')) {
        for (const p of children(track, 'Trackpoint')) {
          const position = children(p, 'Position')[0];
          const hr = children(p, 'HeartRateBpm')[0];
          const record = {
            timestamp: dateTime(text(p, 'Time')), distance: field(p, 'DistanceMeters'),
            latitude: position ? field(position, 'LatitudeDegrees') : null,
            longitude: position ? field(position, 'LongitudeDegrees') : null,
            altitude: field(p, 'AltitudeMeters'), speed: extension(p, ['Speed']),
            power: extension(p, ['Watts']), heartRate: hr ? field(hr, 'Value') : null,
            cadence: field(p, 'Cadence') ?? extension(p, ['RunCadence']), segment
          };
          records.push(record); lapRecords.push(record); activityRecords.push(record);
        }
        segment++;
      }
      laps.push({ start: dateTime(lap.getAttribute('StartTime')), end: lapRecords.at(-1)?.timestamp ?? null,
        timerTime: lapTimer, elapsedTime: null, distance: lapDistance,
        avgPower: null, avgHeartRate: null, avgCadence: null,
        latitude: lapRecords.at(-1)?.latitude ?? null, longitude: lapRecords.at(-1)?.longitude ?? null });
    }
    sessions.push({ start: activityRecords[0]?.timestamp ?? null, end: activityRecords.at(-1)?.timestamp ?? null,
      timerTime: hasTimer ? timerTime : null, elapsedTime: null, distance: hasDistance ? distance : null,
      ascent: null, descent: null, sport: activity.getAttribute('Sport') || '', subSport: '' });
  }
  if (!records.length) throw new Error('TCX enthält keine Aktivitätsmesspunkte.');
  return { format: 'tcx', records, sessions, laps, events: [], decoded: null };
}

export async function importFile(file) {
  if (file.size > MAX_BYTES) throw new Error('Die Datei darf höchstens 20 MiB groß sein.');
  const format = file.name.split('.').pop().toLowerCase();
  const bytes = await file.arrayBuffer();
  if (format === 'fit') return fitActivity(bytes);
  const xml = new TextDecoder().decode(bytes);
  if (format === 'gpx') return gpxActivity(xml);
  if (format === 'tcx') return tcxActivity(xml);
  throw new Error('Bitte eine FIT-, GPX- oder TCX-Datei auswählen.');
}
