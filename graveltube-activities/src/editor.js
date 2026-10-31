import { importFile } from './importers.js';

const { createElement: el, useState, useEffect } = wp.element;
const { Button, SelectControl, ToggleControl, Notice, Spinner, PanelBody } = wp.components;
const { InspectorControls, useBlockProps } = wp.blockEditor;
const config = window.GTAEditorConfig || { fields: {}, defaultFields: {}, types: {} };

async function upload(file, title, id = 0) {
  // Let the pending/loading UI paint before synchronous FIT decoding.
  await new Promise(resolve => setTimeout(resolve, 30));
  const activity = await importFile(file);
  const body = new FormData(); body.append('source', file); body.append('activity', JSON.stringify(activity, (_, value) => typeof value === 'bigint' ? value.toString() : value));
  if (title) body.append('title', title);
  return wp.apiFetch({ path: '/gta/v1/activities' + (id ? '/' + id : ''), method: 'POST', body });
}

function ActivityBlock({ attributes, setAttributes }) {
  const [activities, setActivities] = useState([]), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [summary, setSummary] = useState(null), [offset, setOffset] = useState(0);
  const load = (page = offset) => wp.apiFetch({ path: '/gta/v1/activities?offset=' + page }).then(setActivities).catch(e => setError(e.message));
  useEffect(() => {
    if (attributes.fields === undefined) setAttributes({ fields: { ...config.defaultFields } });
  }, [attributes.fields]);
  useEffect(() => { let active = true;
    wp.apiFetch({ path: '/gta/v1/activities?offset=' + offset }).then(rows => { if (active) setActivities(rows); }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [offset]);
  useEffect(() => { let active = true; setSummary(null);
    if (attributes.activityId) wp.apiFetch({ path: '/gta/v1/activities/' + attributes.activityId }).then(data => { if (active) setSummary(data); }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [attributes.activityId]);
  const onFile = async event => {
    const file = event.target.files?.[0]; if (!file) return;
    setBusy(true); setError('');
    try { const result = await upload(file); setAttributes({ activityId: result.id }); await load(); }
    catch (e) { setError(e.message || 'Import fehlgeschlagen.'); }
    finally { setBusy(false); event.target.value = ''; }
  };
  const options = [{ label: 'Aktivität auswählen …', value: 0 }, ...activities.map(a => ({ label: `${a.title} · ${a.status} (#${a.id})`, value: a.id }))];
  if (attributes.activityId && !activities.some(a => a.id === attributes.activityId)) options.push({ label: summary?.title || `Aktivität #${attributes.activityId}`, value: attributes.activityId });
  const toggles = [['showMap', 'Karte'], ['showAltitude', 'Höhenprofil'], ['showPower', 'Leistung'], ['showHeartRate', 'Herzfrequenz'], ['showCadence', 'Kadenz']];
  const fields = attributes.fields || config.defaultFields;
  const activityType = attributes.activityType !== 'auto' ? attributes.activityType : summary?.presentation?.type;
  const deviceMode = attributes.deviceVisibility || 'auto';
  const deviceVisible = deviceMode === 'show' || (deviceMode !== 'hide' && fields.device !== false && !['rouvy', 'zwift'].includes(activityType));
  const typeOptions = Object.entries(config.types).map(([value, label]) => ({ value, label }));
  if (summary?.presentation) typeOptions[0] = { value: 'auto', label: `Automatisch · ${summary.presentation.label}` };
  return el('div', useBlockProps({ className: 'gta-editor-block' }),
    el('strong', null, 'GravelTube Aktivität'),
    error && el(Notice, { status: 'error', onRemove: () => setError('') }, error),
    busy && el(Spinner),
    el(SelectControl, { label: 'Gespeicherte Aktivität', value: attributes.activityId, options, disabled: busy, onChange: id => setAttributes({ activityId: Number(id) }) }),
    el('div', { style: { display: 'flex', gap: '8px', marginBottom: '16px' } },
      el(Button, { disabled: !offset, onClick: () => setOffset(Math.max(0, offset - 100)) }, 'Vorherige'),
      el(Button, { disabled: activities.length < 100, onClick: () => setOffset(offset + 100) }, 'Weitere Aktivitäten')),
    el('label', null, 'Neue Datei importieren ', el('input', { type: 'file', accept: '.fit,.gpx,.tcx', disabled: busy, onChange: onFile })),
    summary && el('p', null, `${summary.summary.recordCount.toLocaleString('de-DE')} Messpunkte · ${summary.sessions.length} Sessions · ${summary.summary.channels.join(', ') || 'keine Sensordaten'}`),
    el(SelectControl, { label: 'Aktivitätsart', value: attributes.activityType, options: typeOptions, onChange: activityType => setAttributes({ activityType }) }),
    summary?.presentation && el('p', null, `Vorschlag: ${summary.presentation.suggestedLabel}. ${summary.presentation.reason} Device: ${summary.presentation.device}.`),
    summary?.status !== 'publish' && attributes.activityId > 0 && el(Notice, { status: 'warning', isDismissible: false }, 'Die Aktivität ist noch nicht veröffentlicht. Unter „Aktivitäten“ freigeben, damit Besucher sie sehen.'),
    el('p', null, 'Karte und Diagramme erscheinen in der Beitragsvorschau. Öffentlich freigegebene Messwerte werden an der Aktivität eingestellt.'),
    el(InspectorControls, null,
      el(PanelBody, { title: 'Datenfelder', initialOpen: true },
        el('p', null, 'Die Auswahl gilt für diesen Block. Ausgeblendete Felder bleiben gespeichert.'),
        Object.entries(config.fields).map(([key, label]) => el('div', { key },
          el(ToggleControl, { label, checked: key === 'device' ? deviceVisible : fields[key] !== false,
            help: key === 'device' ? (deviceMode === 'auto' ? 'Automatisch: bei ROUVY und Zwift ausgeblendet. Manuelles Einschalten ist möglich.' : 'Manuelle Auswahl; bleibt auch beim Wechsel der Aktivitätsart erhalten.') : undefined,
            onChange: value => setAttributes(key === 'device' ? { deviceVisibility: value ? 'show' : 'hide' } : { fields: { ...fields, [key]: value } }) }),
          key === 'device' && deviceMode !== 'auto' && el(Button, { variant: 'link', onClick: () => setAttributes({ deviceVisibility: 'auto' }) }, 'Device automatisch steuern'))),
        el(Button, { variant: 'secondary', onClick: () => setAttributes({ fields: { ...config.defaultFields }, deviceVisibility: 'auto' }) }, 'Plugin-Vorgaben übernehmen')),
      el(PanelBody, { title: 'Privater Kartenmodus', initialOpen: true },
        el(SelectControl, { label: 'Outdoor-Privatmodus', value: attributes.privateMap || 'inherit',
          options: [{ value: 'inherit', label: `Plugin-Vorgabe (${config.privateOutdoorDefault ? 'ein' : 'aus'})` }, { value: 'on', label: 'Ein – Start und Ziel ausblenden' }, { value: 'off', label: 'Aus – vollständige Strecke zeigen' }],
          onChange: privateMap => setAttributes({ privateMap }), help: 'Wirkt nur bei Outdoor-Aktivitäten. Die ersten und letzten 500 Meter sowie die Start-/Zielumgebung werden ausgeblendet. Trainingswerte bleiben erhalten.' })),
      el(PanelBody, { title: 'Karte und Diagramme', initialOpen: false }, toggles.map(([key, label]) => el(ToggleControl, { key, label, checked: attributes[key], onChange: value => setAttributes({ [key]: value }) }))))
  );
}

wp.blocks.registerBlockType('graveltube/activity', { apiVersion: 3, title: 'GravelTube Aktivität', category: 'widgets', icon: 'chart-line',
  attributes: { activityId: { type: 'integer', default: 0 }, activityType: { type: 'string', default: 'auto' }, fields: { type: 'object' }, privateMap: { type: 'string', enum: ['inherit', 'on', 'off'], default: 'inherit' }, deviceVisibility: { type: 'string', enum: ['auto', 'show', 'hide'], default: 'auto' }, ...Object.fromEntries(['showMap', 'showAltitude', 'showPower', 'showHeartRate', 'showCadence'].map(key => [key, { type: 'boolean', default: true }])) },
  edit: ActivityBlock, save: () => null });

function adminImports() {
  document.querySelectorAll('[data-gta-import]').forEach(root => {
    if (root.dataset.ready) return; root.dataset.ready = 'true';
    const id = Number(root.dataset.gtaImport), form = document.createElement('div'); let busy = false;
    const file = document.createElement('input'); file.type = 'file'; file.accept = '.fit,.gpx,.tcx'; file.setAttribute('aria-label', 'Aktivitätsdatei');
    const label = document.createElement('label'); label.append(document.createTextNode('Datei auswählen: '), file);
    const status = document.createElement('p'); status.setAttribute('role', 'status');
    form.append(label, status); root.append(form);
    const host = root.closest('.gta-import-area') || root.parentElement;
    const titleInput = id ? document.getElementById('title') : null;
    let proposal = host.querySelector('[data-gta-title-suggestion]'), currentSuggestion = null;
    if (!proposal) { proposal = document.createElement('div'); proposal.dataset.gtaTitleSuggestion = ''; root.before(proposal); }
    const showSuggestion = suggestion => {
      currentSuggestion = suggestion; proposal.replaceChildren();
      if (!suggestion?.title) return;
      const text = document.createElement('p'); text.textContent = `Titelvorschlag (${suggestion.label}): ${suggestion.title}`; proposal.append(text);
      if (titleInput && titleInput.value.trim() !== suggestion.title) {
        const accept = document.createElement('button'); accept.type = 'button'; accept.className = 'button'; accept.textContent = 'Titelvorschlag übernehmen'; accept.disabled = busy;
        accept.addEventListener('click', () => { titleInput.value = suggestion.title; titleInput.dispatchEvent(new Event('input', { bubbles: true })); titleInput.focus(); });
        proposal.append(accept, document.createTextNode(' Anschließend die Aktivität speichern.'));
      }
    };
    try { showSuggestion(JSON.parse(proposal.dataset.gtaSuggestion || 'null')); } catch { showSuggestion(null); }
    titleInput?.addEventListener('input', () => showSuggestion(currentSuggestion));
    let preview = host.querySelector('[data-gta-preview]');
    if (!preview) { preview = document.createElement('div'); preview.dataset.gtaPreview = ''; root.after(preview); }
    root.closest('form')?.addEventListener('submit', event => {
      if (busy) { event.preventDefault(); status.textContent = 'Die Datei wird noch eingelesen. Bitte kurz warten …'; }
    });
    file.addEventListener('change', async () => {
      const selected = file.files[0]; if (!selected || busy) return;
      const title = titleInput?.value.trim() || '';
      const buttons = id ? [...document.querySelectorAll('#publish, #save-post')].map(button => [button, button.disabled]) : [];
      busy = true; file.disabled = true; buttons.forEach(([button]) => { button.disabled = true; }); root.setAttribute('aria-busy', 'true');
      showSuggestion(currentSuggestion);
      status.textContent = 'Datei wird eingelesen und vollständig gespeichert …';
      try {
        const result = await upload(selected, title, id);
        status.textContent = `${result.records.toLocaleString('de-DE')} Messpunkte gespeichert. `;
        const link = document.createElement('a'); link.href = result.editUrl; link.textContent = 'Aktivität bearbeiten'; status.append(link);
        const view = document.createElement('section'); view.className = 'gta-activity';
        view.dataset.gtaEndpoint = result.previewEndpoint; view.dataset.gtaOptions = '{}'; view.setAttribute('aria-label', result.title);
        preview.replaceChildren(view); window.GTAViewer?.refresh(view);
        if (titleInput && !titleInput.value.trim()) { titleInput.value = result.title; titleInput.dispatchEvent(new Event('input', { bubbles: true })); }
        showSuggestion(result.titleSuggestion);
        if (id) {
          const downloads = document.querySelector('[data-gta-downloads]');
          if (downloads) downloads.replaceChildren(...result.downloads.map(item => {
            const p = document.createElement('p'), a = document.createElement('a'); a.href = item.url; a.textContent = item.label + ' herunterladen'; p.append(a, document.createTextNode(' (nur mit Bearbeitungsrecht)')); return p;
          }));
          const origin = document.querySelector('[data-gta-origin]');
          if (origin) {
            const suggestion = document.createElement('p'), device = document.createElement('p');
            suggestion.textContent = `Vorschlag: ${result.presentation.suggestedLabel}. ${result.presentation.reason}`;
            device.textContent = `Device: ${result.presentation.device}`; origin.replaceChildren(suggestion, device);
          }
          if (result.status === 'draft') {
            const previous = document.getElementById('original_post_status');
            if (previous?.value === 'auto-draft') {
              previous.value = 'draft';
              for (const key of ['hidden_post_status', 'post_status']) { const input = document.getElementById(key); if (input?.value === 'auto-draft') input.value = 'draft'; }
              const display = document.getElementById('post-status-display'); if (display) display.textContent = 'Entwurf';
            }
          }
        }
      } catch (e) { status.textContent = e.message || 'Import fehlgeschlagen. Bitte Server-Limits prüfen.'; }
      finally { busy = false; file.disabled = false; file.value = ''; buttons.forEach(([button, disabled]) => { button.disabled = disabled; }); root.setAttribute('aria-busy', 'false'); showSuggestion(currentSuggestion); }
    });
  });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', adminImports); else adminImports();
