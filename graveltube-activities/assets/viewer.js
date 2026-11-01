/* Shared block/shortcode renderer. GPL-2.0-or-later. Rewritten 2026-10-31. */
(function () {
  'use strict';
  const views = new Map();
  const channels = [
    ['altitude', 'Höhe', 'm', '#658a4b', 'showAltitude'],
    ['power', 'Leistung', 'W', '#a14bc4', 'showPower'],
    ['heartRate', 'Herzfrequenz', 'bpm', '#d95850', 'showHeartRate'],
    ['cadence', 'Kadenz', 'rpm', '#d18c24', 'showCadence']
  ];
  const finite = v => typeof v === 'number' && Number.isFinite(v);
  const format = (v, digits = 0) => finite(v) ? v.toLocaleString('de-DE', { maximumFractionDigits: digits }) : '–';
  const duration = value => finite(value) ? [Math.floor(value / 3600), Math.floor(value / 60) % 60, Math.floor(value) % 60].map(v => String(v).padStart(2, '0')).join(':') : '–';
  function element(tag, className, text, parent) {
    const el = document.createElement(tag); if (className) el.className = className; if (text !== undefined) el.textContent = text; if (parent) parent.append(el); return el;
  }
  // Carry only the requested channels across documented pauses / stationary gaps, for display only.
  function pauseSeries(records, key, pauses = []) {
    if (!['altitude', 'heartRate', 'cadence'].includes(key)) return records;
    const output = []; let pauseIndex = 0, lastKnown = null;
    for (const r of records) {
      const p = output.at(-1), same = p && p.segment === r.segment && finite(p.elapsed) && finite(r.elapsed) && r.elapsed > p.elapsed;
      if (p && p.segment !== r.segment) lastKnown = null;
      while (pauseIndex < pauses.length && pauses[pauseIndex].end < (p?.elapsed ?? r.elapsed)) pauseIndex++;
      const pause = pauses[pauseIndex];
      const paused = same && pause && pause.start <= p.elapsed + 1 && pause.end >= r.elapsed - (finite(r[key]) ? 1 : 0) && pause.start < r.elapsed && pause.end > p.elapsed;
      const stationary = same && finite(p.speed) && finite(r.speed) && p.speed <= 0.5 && r.speed <= 0.5 && finite(p.distance) && finite(r.distance) && Math.abs(r.distance - p.distance) <= 0.01;
      const value = p && finite(p[key]) ? p[key] : lastKnown?.[key];
      if (same && finite(value) && (paused || stationary) && (r.elapsed - p.elapsed > 1 || !finite(r[key]) || p.held)) {
        const from = finite(p[key]) ? p.elapsed : Math.max(p.elapsed, paused ? pause.start : p.elapsed);
        const sourceIndex = finite(p[key]) ? p.heldIndex ?? p.index : lastKnown.index;
        if (!finite(p[key])) output.push({ ...p, elapsed: from, [key]: value, held: true, heldFrom: from, heldUntil: from, heldIndex: sourceIndex });
        const held = { ...r, [key]: value, held: true, heldFrom: from, heldUntil: r.elapsed, heldIndex: sourceIndex };
        output.push(held);
        if (finite(r[key])) output.push(r);
      } else output.push(r);
      if (finite(r[key])) lastKnown = r;
    }
    const last = output.at(-1), tail = pauses.find(p => last && finite(last.elapsed) && p.start <= last.elapsed + 1 && p.end > last.elapsed);
    if (tail && finite(last[key])) output.push({ ...last, elapsed: tail.end, [key]: last[key], held: true, heldFrom: last.elapsed, heldUntil: tail.end, heldIndex: last.heldIndex ?? last.index });
    return output;
  }
  // Preserve endpoints, peaks and missing-data boundaries for display only. Stored records remain untouched.
  function displaySeries(source, key, x, limit = 2000, pauses = []) {
    const records = pauseSeries(source, key, pauses);
    const output = [], width = Math.max(1, Math.ceil(records.length / limit));
    let lastSegment = null;
    for (let i = 0; i < records.length; i += width) {
      const bucket = records.slice(i, i + width), indexes = new Set([0, bucket.length - 1]);
      let min = -1, max = -1;
      bucket.forEach((r, n) => {
        if (finite(r[key])) { if (min < 0 || r[key] < bucket[min][key]) min = n; if (max < 0 || r[key] > bucket[max][key]) max = n; }
        const p = records[i + n - 1];
        if (p && (r.segment !== p.segment || finite(r[key]) !== finite(p[key]) || !!r.held !== !!p.held || (r.elapsed !== null && p.elapsed !== null && r.elapsed - p.elapsed > 30))) { indexes.add(n); if (n) indexes.add(n - 1); }
      });
      if (min >= 0) { indexes.add(min); indexes.add(max); }
      [...indexes].sort((a, b) => a - b).forEach(n => {
        const r = bucket[n], p = records[i + n - 1];
        if (lastSegment !== null && (r.segment !== lastSegment || (p && r.elapsed !== null && p.elapsed !== null && r.elapsed - p.elapsed > 30 && !r.held))) output.push({ x: x(r), y: null });
        output.push({ x: x(r), y: r[key], ...(r.held ? { held: true, heldFrom: r.heldFrom, heldUntil: r.heldUntil, heldIndex: r.heldIndex } : {}) }); lastSegment = r.segment;
      });
    }
    return output;
  }
  // Geometry alone is reduced, with original record references kept for hover synchronization.
  function routeSegments(records) {
    const segments = []; let current = [], previous = null;
    const flush = () => { if (current.length) segments.push(current); current = []; };
    for (const r of records) {
      if (!finite(r.latitude) || !finite(r.longitude)) { flush(); previous = null; continue; }
      if (previous && (r.segment !== previous.segment || (r.elapsed !== null && previous.elapsed !== null && r.elapsed - previous.elapsed > 30))) flush();
      current.push(r); previous = r;
    }
    flush();
    return segments.map(points => {
      if (points.length <= 2) return points;
      const keep = new Set([0, points.length - 1]), stack = [[0, points.length - 1]], epsilon = 0.00003 ** 2;
      while (stack.length) {
        const [a, b] = stack.pop(), start = points[a], end = points[b];
        const dx = end.latitude - start.latitude, dy = end.longitude - start.longitude, length = dx * dx + dy * dy;
        let maximum = epsilon, index = -1;
        for (let i = a + 1; i < b; i++) {
          const p = points[i], t = length ? Math.max(0, Math.min(1, ((p.latitude - start.latitude) * dx + (p.longitude - start.longitude) * dy) / length)) : 0;
          const d = (p.latitude - start.latitude - dx * t) ** 2 + (p.longitude - start.longitude - dy * t) ** 2;
          if (d > maximum) { maximum = d; index = i; }
        }
        if (index >= 0) { keep.add(index); stack.push([a, index], [index, b]); }
      }
      return [...keep].sort((a, b) => a - b).map(i => points[i]);
    });
  }

  async function mount(root) {
    if (views.has(root)) return;
    const state = { charts: [], map: null, observer: null, abort: new AbortController() }; views.set(root, state);
    try {
      const response = await fetch(root.dataset.gtaEndpoint, { credentials: 'same-origin', cache: 'no-store', signal: state.abort.signal,
        headers: window.GTAViewNonce ? { 'X-WP-Nonce': window.GTAViewNonce } : {} });
      const data = await response.json(); if (!response.ok) throw new Error(data.message || 'Aktivität nicht verfügbar.');
      if (!views.has(root)) return;
      const options = JSON.parse(root.dataset.gtaOptions || '{}'), records = data.records, s = data.summary;
      const gearing = data.gearing?.available ? data.gearing : null;
      root.replaceChildren(); element('h3', 'gta-heading', data.title, root);
      const typeLabels = { rouvy: 'ROUVY', zwift: 'Zwift', outdoor: 'Outdoor', indoor: 'Indoor / andere App', unknown: 'Nicht zugeordnet' };
      const type = Object.hasOwn(typeLabels, options.activityType) ? options.activityType : (data.presentation?.type || 'unknown');
      root.dataset.gtaType = Object.hasOwn(typeLabels, type) ? type : 'unknown';
      const stats = element('dl', 'gta-stats', undefined, root);
      const deviceVisible = options.deviceVisibility === 'show' || (options.deviceVisibility !== 'hide' && options.fields?.device !== false && !['rouvy', 'zwift'].includes(root.dataset.gtaType));
      const frontShiftsVisible = options.frontShiftsVisibility === 'show' || (options.frontShiftsVisibility !== 'hide' && options.fields?.frontShifts !== false && gearing?.singleChainring !== true);
      const frontGearVisible = options.frontGearVisibility === 'show' || (options.frontGearVisibility !== 'hide' && gearing?.singleChainring !== true);
      const stat = (key, name, value, parent = stats) => {
        if (key === 'device' ? !deviceVisible : key === 'frontShifts' ? !frontShiftsVisible : key === 'timerTime' ? options.fields?.timerTime !== true : options.fields?.[key] === false) return;
        const box = element('div', 'gta-stat', undefined, parent); box.dataset.gtaField = key;
        element('dt', '', name, box); element('dd', '', value, box);
      };
      stat('activityType', 'Aktivitätsart', typeLabels[root.dataset.gtaType]);
      stat('device', 'Device', data.presentation?.device || 'Nicht angegeben');
      if (data.startLabel) stat('start', 'Datum', data.startLabel);
      stat('distance', 'Distanz', finite(s.distance) ? format(s.distance / 1000, 2) + ' km' : '–');
      stat('elapsedTime', 'Gesamtdauer inkl. Pausen', duration(s.elapsedTime));
      stat('timerTime', 'Timerzeit' + (s.timerTimeSource === 'records' ? ' (aus Messpunkten)' : ''), duration(s.timerTime));
      stat('movingTime', 'Bewegungszeit', duration(s.movingTime));
      if (finite(s.ascent)) stat('ascent', 'Höhenmeter/hm', format(s.ascent));
      const averageFields = { power: 'avgPower', heartRate: 'avgHeartRate', cadence: 'avgCadence' };
      for (const [key, title, unit] of channels.filter(c => c[0] !== 'altitude')) if (s.channels.includes(key)) stat(averageFields[key], 'Ø ' + title, format(s.averages[key]) + ' ' + unit);
      if (finite(s.workKj)) stat('workKj', 'Erfasste mechanische Arbeit', format(s.workKj) + ' kJ');
      if (gearing) {
        const group = element('section', 'gta-gearing-stats', undefined, root);
        element('h4', 'gta-stats-separator', 'Schaltungsdaten', group);
        const gearStats = element('dl', 'gta-stats gta-gearing-fields', undefined, group);
        stat('shiftCount', 'Schaltvorgänge', format(gearing.summary.shiftCount), gearStats);
        stat('frontShifts', 'Schaltvorgänge vorne', format(gearing.summary.frontShifts), gearStats);
        stat('rearShifts', 'Schaltvorgänge hinten', format(gearing.summary.rearShifts), gearStats);
        stat('shiftsPerMinute', 'Ø Schaltvorgänge/min', format(gearing.summary.shiftsPerMinute, 2), gearStats);
        if (!gearStats.children.length) group.remove();
      }
      if (!stats.children.length) stats.remove();
      let map = null, marker = null;
      if (options.showMap !== false) {
        const privateMap = data.mapPrivacy?.applied === true;
        const privacyNote = privateMap ? element('p', 'gta-map-privacy', 'Der genaue Start und das Ziel sind aus Sicherheitsgründen hier ausgeblendet.') : null;
        const segments = routeSegments(records);
        if (segments.length && window.GTALeaflet) {
          const area = element('div', 'gta-map-area', undefined, root);
          if (data.services?.osmEnabled !== true) {
            element('p', 'gta-note', 'Externe Karten sind auf dieser Website deaktiviert.', area);
          } else {
            const choice = element('div', 'gta-map-choice', undefined, area);
            element('h4', 'gta-chart-title', 'OpenStreetMap-Karte', choice);
            const detail = element('div', '', undefined, choice);
            element('p', '', 'Beim Laden erhält die OpenStreetMap Foundation deine IP-Adresse, Browserinformationen, den Website-Ursprung und die angefragten Kartenausschnitte. Die FIT-Datei und Trainingswerte werden nicht übertragen. Die Freigabe gilt nur für diese Ansicht.', detail);
            const privacy = element('a', '', 'Datenschutzerklärung des Kartenanbieters', detail);
            privacy.href = 'https://osmfoundation.org/wiki/Privacy_Policy'; privacy.target = '_blank'; privacy.rel = 'noopener noreferrer';
            const load = element('button', 'gta-map-load', 'OpenStreetMap laden', choice); load.type = 'button';
            const decline = element('button', 'gta-map-decline', 'Ohne Karte fortfahren', choice); decline.type = 'button';
            decline.addEventListener('click', () => {
              detail.hidden = !detail.hidden; load.hidden = detail.hidden;
              decline.textContent = detail.hidden ? 'Kartenfreigabe anzeigen' : 'Ohne Karte fortfahren';
            });
            load.addEventListener('click', () => {
              if (map || !views.has(root)) return;
              choice.hidden = true;
              const bar = element('div', 'gta-map-actions', undefined, area);
              const close = element('button', '', 'Karte schließen', bar); close.type = 'button';
              const message = element('span', 'gta-note', '', bar); message.setAttribute('role', 'status');
              const L = window.GTALeaflet, box = element('div', 'gta-map', undefined, area);
              if (privacyNote) area.append(privacyNote);
              box.setAttribute('aria-label', 'Tourenkarte'); map = L.map(box, { scrollWheelZoom: false }); state.map = map;
              L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, referrerPolicy: 'strict-origin-when-cross-origin',
                attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).on('tileerror', () => { message.textContent = 'Einige Kartenkacheln konnten nicht geladen werden.'; }).addTo(map);
              const bounds = L.latLngBounds([]);
              for (const segment of segments) { const coords = segment.map(r => [r.latitude, r.longitude]); L.polyline(coords, { color: '#177e69', weight: 4 }).addTo(map); coords.forEach(p => bounds.extend(p)); }
              map.fitBounds(bounds, { padding: [16, 16], maxZoom: 15 });
              const first = segments[0][0], last = segments.at(-1).at(-1);
              if (!privateMap) {
                L.circleMarker([first.latitude, first.longitude], { color: '#177e69', fillOpacity: 1, radius: 6 }).bindTooltip('Start').addTo(map);
                L.circleMarker([last.latitude, last.longitude], { color: '#b34b42', fillOpacity: 1, radius: 6 }).bindTooltip('Ziel').addTo(map);
              }
              data.laps.forEach((lap, i) => { if (finite(lap.latitude) && finite(lap.longitude)) L.circleMarker([lap.latitude, lap.longitude], { color: '#2858a0', radius: 4 }).bindTooltip('Runde ' + (i + 1)).addTo(map); });
              marker = L.circleMarker([first.latitude, first.longitude], { color: '#142f35', radius: 5 });
              state.observer = new ResizeObserver(() => map?.invalidateSize()); state.observer.observe(box);
              close.addEventListener('click', () => {
                state.observer?.disconnect(); state.observer = null;
                map.remove(); map = null; marker = null; state.map = null;
                box.remove(); bar.remove(); choice.hidden = false; load.focus();
              });
            });
          }
          if (privacyNote) area.append(privacyNote);
        } else {
          element('p', 'gta-note', privateMap ? 'Nach dem Ausblenden von Start und Ziel ist keine sichtbare GPS-Strecke übrig. Trainingsdiagramme bleiben verfügbar.' : 'Keine freigegebene GPS-Strecke vorhanden – Trainingsdaten sind auch ohne Karte verfügbar.', root);
          if (privacyNote) root.append(privacyNote);
        }
      }
      const gearChannels = gearing ? [
        ['rearGear', 'Gangverlauf', 'Gang', '#177e69', 'showGears'],
        ['gearRatio', 'Übersetzung', 'Kettenblatt / Ritzel', '#5c75b8', 'showRatio'],
        ['shiftFrequency', 'Schalthäufigkeit', `Wechsel je ${gearing.windowSeconds || 60} s`, '#cc7a27', 'showShifting']
      ].filter(([key, , , , option]) => options[option] !== false && (key === 'shiftFrequency' || gearing.timeline.some(p => finite(p[key]) || (key === 'rearGear' && frontGearVisible && finite(p.frontGear))))) : [];
      const available = [...channels.filter(([key, , , , option]) => s.channels.includes(key) && options[option] !== false), ...gearChannels];
      if (!available.length) element('p', 'gta-note', 'Keine Messdaten für die ausgewählten Diagramme vorhanden.', root);
      if (available.length && window.GTAChart) {
        const controls = element('label', 'gta-controls', 'Diagrammachse: ', root), select = element('select', '', undefined, controls);
        const timeAxis = records.length > 0 ? records.every((r, i) => finite(r.elapsed) && (!i || r.elapsed >= records[i - 1].elapsed)) : !!gearing;
        if (timeAxis) { const o = element('option', '', 'Verstrichene Zeit', select); o.value = 'time'; }
        if (records.some(r => r.distance > 0)) { const o = element('option', '', 'Distanz', select); o.value = 'distance'; }
        if (!select.options.length) { const o = element('option', '', 'Messpunkt (keine Zeit-/Distanzdaten)', select); o.value = 'index'; }
        const cursor = element('p', 'gta-cursor', 'Zeige auf ein Diagramm, um Messwerte und Position gemeinsam zu verfolgen.', root);
        const x = r => select.value === 'time' ? r.elapsed / 60 : select.value === 'distance' ? r.distance / 1000 : r.index;
        const axisLabel = () => select.value === 'time' ? 'Zeit (min, einschließlich Pausen)' : select.value === 'distance' ? 'Distanz (km)' : 'Messpunkt';
        const axisMaximum = () => Math.max(0.01, select.value === 'time' && finite(s.elapsedTime) ? s.elapsedTime / 60 : 0, ...[records.at(-1), gearing?.timeline.at(-1)].filter(Boolean).filter(p => finite(select.value === 'time' ? p.elapsed : select.value === 'distance' ? p.distance : p.index)).map(x));
        const gearSeries = key => (key === 'shiftFrequency' ? gearing.bins : gearing.timeline).filter(p => finite(select.value === 'time' ? p.elapsed : select.value === 'distance' ? p.distance : p.index)).map(p => ({ x: x(p), y: p[key], ...p }));
        const series = key => ['rearGear', 'frontGear', 'gearRatio', 'shiftFrequency'].includes(key) ? gearSeries(key) : displaySeries(records, key, x, 2000, data.pauses || []);
        const gearAt = elapsed => {
          if (!gearing || !finite(elapsed)) return null;
          let lo = 0, hi = gearing.timeline.length - 1, found = -1;
          while (lo <= hi) { const mid = Math.floor((lo + hi) / 2); if (gearing.timeline[mid].elapsed <= elapsed) { found = mid; lo = mid + 1; } else hi = mid - 1; }
          return found >= 0 ? gearing.timeline[found] : null;
        };
        const hover = (event, chart) => {
          if (event.type === 'mouseout') { state.charts.forEach(c => { c.$gtaCursor = null; c.draw(); }); if (marker && map.hasLayer(marker)) map.removeLayer(marker); return; }
          if (!event.native || !finite(event.x)) return;
          const value = chart.scales.x.getValueForPixel(event.x);
          let lo = 0, hi = records.length - 1;
          while (lo < hi) { const mid = Math.floor((lo + hi) / 2); if (x(records[mid]) < value) lo = mid + 1; else hi = mid; }
          let index = lo; if (index && Math.abs(x(records[index - 1]) - value) < Math.abs(x(records[index]) - value)) index--;
          const r = records[index]; if (!r) return;
          const elapsed = select.value === 'time' ? Math.max(0, value * 60) : r.elapsed;
          const held = new Map();
          if (select.value === 'time') state.charts.forEach(c => { const p = c.data.datasets[0].data.find(p => p.held && elapsed >= p.heldFrom && elapsed < p.heldUntil); if (p) held.set(c.$gtaChannel, p); });
          const pausedRecord = held.size ? records[held.values().next().value.heldIndex] || r : r;
          const activeElapsed = held.size ? elapsed : r.elapsed;
          const gear = gearAt(activeElapsed), gearDetails = [];
          if (gear && gearChannels.length) {
            if (gearChannels.some(c => c[0] === 'rearGear')) gearDetails.push(`Gang hinten: ${format(gear.rearGear)}` + (frontGearVisible ? ` · vorne: ${format(gear.frontGear)}` : ''));
            if (gearChannels.some(c => c[0] === 'gearRatio')) gearDetails.push(`Übersetzung: ${format(gear.gearRatio, 2)} (${format(gear.frontTeeth)}/${format(gear.rearTeeth)} Zähne)`);
            if (gearChannels.some(c => c[0] === 'shiftFrequency')) { const bin = gearing.bins.find(b => activeElapsed >= b.from && activeElapsed < b.to); if (bin) gearDetails.push(`Schaltvorgänge im Zeitfenster: ${bin.shiftFrequency}`); }
          }
          cursor.textContent = [r.elapsed !== null ? duration(held.size ? elapsed : r.elapsed) : 'Messpunkt ' + (index + 1), format(pausedRecord.distance / 1000, 2) + ' km', ...available.filter(c => s.channels.includes(c[0])).map(([key, title, unit]) => `${title}: ${format(held.has(key) ? held.get(key).y : r[key])} ${unit}` + (held.has(key) ? ' (fortgeführt)' : '')), ...gearDetails].join(' · ');
          state.charts.forEach(c => { c.$gtaCursor = held.size ? value : x(r); c.draw(); });
          if (marker) { if (finite(pausedRecord.latitude) && finite(pausedRecord.longitude)) marker.setLatLng([pausedRecord.latitude, pausedRecord.longitude]).addTo(map); else if (map.hasLayer(marker)) map.removeLayer(marker); }
        };
        const crosshair = { id: 'gtaCrosshair', afterDraw(chart) {
          if (chart.$gtaCursor === undefined || chart.$gtaCursor === null) return;
          const px = chart.scales.x.getPixelForValue(chart.$gtaCursor), { ctx, chartArea } = chart;
          ctx.save(); ctx.beginPath(); ctx.strokeStyle = '#70857b'; ctx.moveTo(px, chartArea.top); ctx.lineTo(px, chartArea.bottom); ctx.stroke(); ctx.restore();
        } };
        for (const [key, title, unit, color] of available) {
          const isGear = gearChannels.some(c => c[0] === key);
          if (isGear && gearChannels[0][0] === key) {
            element('h4', 'gta-gearing-heading', 'Elektronische Schaltung', root);
            element('p', 'gta-note gta-gearing-note', `Gangnummern entsprechen der Meldung des Geräts. Gang und Übersetzung zeigen den zuletzt gemeldeten Zustand. Übersetzung = Zähne vorne ÷ Zähne hinten. Die erste Gangmeldung und identische Wiederholungen zählen nicht als Schaltvorgang. Die Schalthäufigkeit zeigt erfasste Wechsel je ${gearing.windowSeconds || 60}-Sekunden-Fenster; das letzte Fenster kann kürzer sein. Der Durchschnitt bezieht sich auf die gesamte verstrichene Zeit einschließlich Pausen.`, root);
          }
          const chartTitle = element('h4', 'gta-chart-title', title + ' (' + unit + ')', root); chartTitle.dataset.gtaChartTitle = key;
          const box = element('div', 'gta-chart', undefined, root), canvas = element('canvas', '', undefined, box);
          box.dataset.gtaChart = key;
          canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', title + ' über Zeit oder Distanz');
          canvas.textContent = isGear ? `${title}: ${gearing.summary.shiftCount} erfasste Schaltvorgänge` + (frontShiftsVisible || frontGearVisible ? `, vorne ${gearing.summary.frontShifts}` : '') + `, hinten ${gearing.summary.rearShifts}.` : `${title}: Maximum ${format(s.maxima[key])} ${unit}.`;
          const datasets = [{ label: key === 'rearGear' ? 'Hinten' : title, data: series(key), borderColor: color, backgroundColor: key === 'shiftFrequency' ? '#cc7a2799' : color, borderWidth: isGear ? 2 : 1.5, pointRadius: 0, spanGaps: false, stepped: isGear && key !== 'shiftFrequency' ? 'before' : false, maxBarThickness: 12,
            segment: { borderDash: context => context.p1.raw?.held ? [4, 3] : undefined } }];
          if (key === 'rearGear' && frontGearVisible && gearing.timeline.some(p => finite(p.frontGear))) datasets.push({ label: 'Vorne', data: series('frontGear'), borderColor: '#9c579c', borderWidth: 1.5, borderDash: [5, 4], pointRadius: 0, stepped: 'before', spanGaps: false });
          const chart = new window.GTAChart(canvas, { type: key === 'shiftFrequency' ? 'bar' : 'line', plugins: [crosshair], data: { datasets },
            options: { animation: false, responsive: true, maintainAspectRatio: false, parsing: false,
              interaction: { mode: 'nearest', intersect: false }, onHover: (event, elements, chart) => hover(event, chart),
              plugins: { legend: { display: key === 'rearGear' }, tooltip: { enabled: isGear, callbacks: { title: items => {
                const point = items[0]?.raw;
                return point && key === 'shiftFrequency' ? `${duration(point.from)} – ${duration(point.to)}` : point ? duration(point.elapsed) : '';
              }, label: item => key === 'gearRatio' ? `Übersetzung: ${format(item.raw.gearRatio, 2)} (${format(item.raw.frontTeeth)}/${format(item.raw.rearTeeth)} Zähne)` : `${item.dataset.label}: ${format(item.parsed.y)}` } } },
              scales: { x: { type: 'linear', title: { display: true, text: axisLabel() }, min: 0, max: axisMaximum() }, y: { title: { display: true, text: unit }, ...(isGear ? { beginAtZero: true, ticks: { precision: key === 'gearRatio' ? 2 : 0 } } : {}) } } } });
          chart.$gtaChannel = key; state.charts.push(chart);
        }
        select.addEventListener('change', () => state.charts.forEach(chart => {
          chart.data.datasets[0].data = series(chart.$gtaChannel);
          if (chart.$gtaChannel === 'rearGear' && chart.data.datasets[1]) chart.data.datasets[1].data = series('frontGear');
          chart.options.scales.x.title.text = axisLabel();
          chart.options.scales.x.min = 0; chart.options.scales.x.max = axisMaximum();
          chart.$gtaCursor = null; chart.update('none');
        }));
      }
      if (state.charts.some(chart => chart.data.datasets.some(dataset => dataset.data.some(point => point.held)))) element('p', 'gta-note gta-pause-note', 'Gestrichelte waagerechte Abschnitte bei Höhe, Herzfrequenz und Kadenz führen bei Aufzeichnungspausen oder erkanntem Stillstand den letzten Messwert fort. Sie sind keine zusätzlichen Messungen und ändern die Mittelwerte nicht.', root);
      if (options.showLaps === true && data.laps.length) {
        element('h4', 'gta-chart-title', 'Runden', root);
        const wrap = element('div', 'gta-lap-wrap', undefined, root), table = element('table', 'gta-laps', undefined, wrap);
        const head = element('tr', '', undefined, element('thead', '', undefined, table));
        const columns = [['Runde', null], ['Distanz', 'distance'], ['Bewegungszeit', 'movingTime'], ...[['Leistung', 'avgPower', 'power'], ['Puls', 'avgHeartRate', 'heartRate'], ['Kadenz', 'avgCadence', 'cadence']].filter(c => s.channels.includes(c[2]))];
        columns.forEach(([title]) => { const th = element('th', '', title, head); th.scope = 'col'; });
        const body = element('tbody', '', undefined, table);
        data.laps.forEach((lap, index) => { const row = element('tr', '', undefined, body); columns.forEach(([, key]) => element('td', '', !key ? String(index + 1) : key === 'movingTime' ? duration(lap[key]) : key === 'distance' ? (finite(lap[key]) ? format(lap[key] / 1000, 2) + ' km' : '–') : format(lap[key]), row)); });
      }
      element('p', 'gta-note', `${format(s.recordCount)} vollständig gespeicherte Messpunkte · ${data.sessions.length} Sessions. Diagramme und Karten können für die Anzeige vereinfacht sein. Mittelwerte sind zeitgewichtet; Lücken über 30 Sekunden und erkannte Timerpausen werden ausgeschlossen.`, root);
    } catch (error) {
      if (error.name === 'AbortError') return;
      root.replaceChildren(); element('p', 'gta-error', error.message || 'Aktivität konnte nicht geladen werden.', root);
      const button = element('button', '', 'Erneut laden', root); button.type = 'button'; button.addEventListener('click', () => refresh(root));
    }
  }
  function destroy(root) { const view = views.get(root); if (!view) return; view.abort.abort(); view.charts.forEach(c => c.destroy()); view.observer?.disconnect(); view.map?.remove(); views.delete(root); }
  function refresh(root) { destroy(root); root.replaceChildren(); element('p', 'gta-status', 'Aktivität wird geladen …', root); mount(root); }
  function scan() {
    document.querySelectorAll('[data-gta-endpoint]').forEach(root => { if (!root.dataset.gtaBound) { root.dataset.gtaBound = 'true'; root.addEventListener('gta:refresh', () => refresh(root)); } mount(root); });
    views.forEach((view, root) => { if (!root.isConnected) destroy(root); });
  }
  window.GTAViewer = { refresh, displaySeries, pauseSeries, routeSegments };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan); else scan();
  new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
})();
