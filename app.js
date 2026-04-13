'use strict';

console.log('HTB Bohrkernaufnahme v80 loaded');

const STORAGE_DRAFT = 'htb-bohrkern-14688-draft-v80';
const STORAGE_HISTORY = 'htb-bohrkern-14688-history-v80';
const HISTORY_MAX = 40;

const $ = (id) => document.getElementById(id);

const MAIN_OPTIONS = [
  { value: 'BLÖCKE', family: 'block' },
  { value: 'STEINE', family: 'stone' },
  { value: 'KIES', family: 'gravel' },
  { value: 'SAND', family: 'sand' },
  { value: 'SCHLUFF', family: 'silt' },
  { value: 'TON', family: 'clay' },
  { value: 'TORF', family: 'peat' },
  { value: 'HUMUS', family: 'humus' },
  { value: 'ANSCHÜTTUNG', family: 'fill' }
];

const SECONDARY_OPTIONS = [
  'schwach blockig', 'blockig', 'stark blockig',
  'schwach steinig', 'steinig', 'stark steinig',
  'schwach kiesig', 'kiesig', 'stark kiesig',
  'schwach sandig', 'sandig', 'stark sandig',
  'schwach schluffig', 'schluffig', 'stark schluffig',
  'schwach tonig', 'tonig', 'stark tonig',
  'schwach humos', 'humos', 'stark humos',
  'schwach torfig', 'torfig', 'stark torfig',
  'schwach organisch', 'organisch', 'stark organisch'
];

const GRAIN_OPTIONS = [
  { value: 'Feinkies', family: 'gravel' },
  { value: 'Mittelkies', family: 'gravel' },
  { value: 'Grobkies', family: 'gravel' },
  { value: 'Feinsand', family: 'sand' },
  { value: 'Mittelsand', family: 'sand' },
  { value: 'Grobsand', family: 'sand' },
  { value: 'Feinschluff', family: 'silt' },
  { value: 'Mittelschluff', family: 'silt' },
  { value: 'Grobschluff', family: 'silt' }
];

const COARSE_STATE_OPTIONS = ['sehr locker', 'locker', 'mitteldicht', 'dicht', 'sehr dicht'];
const FINE_STATE_OPTIONS = ['flüssig', 'breiig', 'sehr weich', 'weich', 'steif', 'halbfest', 'fest (hart)'];
const COLOR_OPTIONS = ['gelb', 'gelblich', 'braun', 'bräunlich', 'grau', 'gräulich', 'schwarz', 'rot', 'rötlich', 'grünlich', 'bläulich', 'weiß'];
const CALC_OPTIONS = ['', 'nicht kalkhaltig', 'leicht kalkhaltig', 'kalkhaltig', 'sehr kalkhaltig'];
const ORGANIC_OPTIONS = ['', 'leicht organisch', 'organisch', 'stark organisch'];
const WATER_OPTIONS = ['', 'trocken', 'erdfeucht', 'feucht', 'nass', 'wasserführend'];
const TOOL_OPTIONS = ['', 'RKS', 'Kernbohrung', 'Spülbohrung', 'Bohrstock', 'Bagger', 'Schurf', 'DPH', 'DPSH', 'CPT'];

const state = {
  meta: {
    date: '',
    user: '',
    project: '',
    borehole: '',
    location: '',
    device: '',
    note: ''
  },
  ui: {
    quickMode: true
  },
  layers: []
};

function uid() {
  return crypto?.randomUUID?.() || ('id_' + Date.now() + '_' + Math.random().toString(16).slice(2));
}

function clone(v) {
  return JSON.parse(JSON.stringify(v));
}

function h(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtDepth(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(2) : '';
}

function escCsv(v) {
  const s = String(v ?? '');
  if (/[;"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function getFamilyByMain(main) {
  return MAIN_OPTIONS.find(x => x.value === main)?.family || '';
}

function decorateMain(main, grain) {
  if (!main) return '';
  const famMain = getFamilyByMain(main);
  const famGrain = GRAIN_OPTIONS.find(x => x.value === grain)?.family || '';
  if (grain && famMain && famMain === famGrain) return grain.toUpperCase();
  return main;
}

function shortDescription(layer) {
  const adj = Array.isArray(layer.secondary) ? layer.secondary : [];
  const main1 = decorateMain(layer.main1, layer.grain);
  const main2 = decorateMain(layer.main2, layer.grain);
  const base = main2 ? `${main1}/${main2}` : main1;
  if (!base) return '';
  return adj.length ? `${adj.join(', ')} ${base}` : base;
}

function fullDescription(layer) {
  const parts = [];
  const s = shortDescription(layer);
  if (s) parts.push(s);
  if (layer.state) parts.push(layer.state);
  if (layer.colors?.length) parts.push(layer.colors.join(', '));
  if (layer.organic) parts.push(layer.organic);
  if (layer.calc && layer.calc !== 'nicht kalkhaltig') parts.push(layer.calc);
  if (layer.water) parts.push(layer.water);
  return parts.join(' · ');
}

function defaultLayer(index = 0) {
  return {
    id: uid(),
    from: fmtDepth(index),
    to: fmtDepth(index + 1),
    main1: '',
    main2: '',
    secondary: [],
    grain: '',
    state: '',
    colors: [],
    organic: '',
    calc: '',
    water: '',
    tool: '',
    sampleNo: '',
    coreRun: '',
    recovery: '',
    note: '',
    ui: {
      grpBase: true,
      grpName: true,
      grpState: false,
      grpReport: true
    }
  };
}

function hydrateLayer(layer, idx) {
  const base = defaultLayer(idx);
  return {
    ...base,
    ...layer,
    secondary: Array.isArray(layer?.secondary) ? layer.secondary : [],
    colors: Array.isArray(layer?.colors) ? layer.colors : [],
    ui: {
      ...base.ui,
      ...(layer?.ui || {})
    }
  };
}

function getLayer(id) {
  return state.layers.find(x => x.id === id);
}

function getOpenIds() {
  return Array.from(document.querySelectorAll('.layerCard[open]')).map(x => x.dataset.id);
}

function saveDraft() {
  try {
    localStorage.setItem(STORAGE_DRAFT, JSON.stringify(state));
  } catch {}
}

let saveTimer = null;
function saveDraftDebounced() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveDraft, 250);
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_DRAFT);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed?.meta) state.meta = { ...state.meta, ...parsed.meta };
    if (parsed?.ui) state.ui = { ...state.ui, ...parsed.ui };
    if (Array.isArray(parsed?.layers) && parsed.layers.length) {
      state.layers = parsed.layers.map((l, i) => hydrateLayer(l, i));
    }
  } catch {}
}

function readHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_HISTORY) || '[]');
  } catch {
    return [];
  }
}

function writeHistory(list) {
  try {
    localStorage.setItem(STORAGE_HISTORY, JSON.stringify(list.slice(0, HISTORY_MAX)));
  } catch {}
}

function saveCurrentToHistory() {
  const title = `${state.meta.project || '—'} · ${state.meta.borehole || '—'}`;
  const entry = {
    id: uid(),
    savedAt: Date.now(),
    title,
    snapshot: clone(state)
  };
  const list = readHistory();
  list.unshift(entry);
  writeHistory(list);
  renderHistoryList();
}

function applyState(snapshot) {
  if (!snapshot) return;
  state.meta = { ...state.meta, ...(snapshot.meta || {}) };
  state.ui = { ...state.ui, ...(snapshot.ui || {}) };
  state.layers = Array.isArray(snapshot.layers) && snapshot.layers.length
    ? snapshot.layers.map((l, i) => hydrateLayer(l, i))
    : [defaultLayer(0)];
  syncMetaToUi();
  syncQuickModeUi();
  renderLayers();
  renderHistoryList();
  saveDraftDebounced();
}

function syncMetaToUi() {
  $('meta-date').value = state.meta.date || '';
  $('meta-user').value = state.meta.user || '';
  $('meta-project').value = state.meta.project || '';
  $('meta-borehole').value = state.meta.borehole || '';
  $('meta-location').value = state.meta.location || '';
  $('meta-device').value = state.meta.device || '';
  $('meta-note').value = state.meta.note || '';
}

function collectMetaFromUi() {
  state.meta.date = $('meta-date').value || '';
  state.meta.user = $('meta-user').value || '';
  state.meta.project = $('meta-project').value || '';
  state.meta.borehole = $('meta-borehole').value || '';
  state.meta.location = $('meta-location').value || '';
  state.meta.device = $('meta-device').value || '';
  state.meta.note = $('meta-note').value || '';
}

function syncQuickModeUi() {
  const btn = $('btnQuickMode');
  const hint = $('quickModeHint');
  if (!btn) return;

  const on = !!state.ui.quickMode;
  btn.textContent = on ? 'Schnellmodus: EIN' : 'Schnellmodus: AUS';
  btn.setAttribute('aria-pressed', String(on));
  btn.classList.toggle('btn--accent', on);
  btn.classList.toggle('btn--ghost', !on);

  if (hint) {
    hint.textContent = on
      ? 'Schnellmodus aktiv: sichtbar sind nur die wichtigsten Felder. Für Proben-Nr., Kernlauf, Kalk, Wasser etc. den Schnellmodus ausschalten.'
      : 'Schnellmodus aus: alle Detailfelder einer Schicht sind sichtbar.';
  }
}

function basisSummary(layer) {
  const parts = [];
  if (layer.from || layer.to) parts.push(`${fmtDepth(layer.from) || '—'}–${fmtDepth(layer.to) || '—'} m`);
  if (layer.tool) parts.push(layer.tool);
  if (layer.sampleNo) parts.push(`Probe ${layer.sampleNo}`);
  if (layer.recovery) parts.push(`${layer.recovery} %`);
  return parts.join(' · ') || 'Tiefe und Kerndaten';
}

function namingSummary(layer) {
  return shortDescription(layer) || 'Bodenbenennung wählen';
}

function stateSummary(layer) {
  const parts = [];
  if (layer.state) parts.push(layer.state);
  if (layer.colors?.length) parts.push(layer.colors.join(', '));
  if (layer.organic) parts.push(layer.organic);
  if (layer.calc && layer.calc !== 'nicht kalkhaltig') parts.push(layer.calc);
  if (layer.water) parts.push(layer.water);
  return parts.join(' · ') || 'Zustand und Zusatzangaben';
}

function reportSummary(layer) {
  return layer.note || fullDescription(layer) || 'Beschreibung und Notiz';
}

function getStateMode(layer) {
  const fam = getFamilyByMain(layer.main1);

  if (['gravel', 'sand', 'stone', 'block'].includes(fam)) {
    return { label: 'Lagerungsdichte', options: COARSE_STATE_OPTIONS };
  }
  if (['silt', 'clay', 'peat', 'humus'].includes(fam)) {
    return { label: 'Konsistenz', options: FINE_STATE_OPTIONS };
  }
  return { label: 'Lagerungsdichte / Konsistenz', options: [...COARSE_STATE_OPTIONS, ...FINE_STATE_OPTIONS] };
}

function chipHtml({ layerId, field, value, active, soft = false }) {
  return `
    <button
      class="chip ${active ? 'is-active' : ''} ${soft ? 'chip--soft' : ''}"
      type="button"
      data-chip-field="${h(field)}"
      data-id="${h(layerId)}"
      data-value="${h(value)}"
    >${h(value || '—')}</button>
  `;
}

function selectHtml({ layerId, field, options, value, label }) {
  return `
    <label class="field">
      <span class="field__label">${h(label)}</span>
      <select class="field__select" data-field="${h(field)}" data-id="${h(layerId)}">
        ${options.map(opt => `<option value="${h(opt)}" ${opt === value ? 'selected' : ''}>${h(opt || '—')}</option>`).join('')}
      </select>
    </label>
  `;
}

function subAccHtml({ layer, group, title, meta, body }) {
  const isOpen = !!layer.ui?.[group];
  return `
    <details class="subAcc" data-id="${h(layer.id)}" data-group="${h(group)}" ${isOpen ? 'open' : ''}>
      <summary>
        <div class="subAcc__head">
          <span class="subAcc__title">${h(title)}</span>
          <span class="subAcc__meta">${h(meta || '')}</span>
        </div>
      </summary>
      <div class="subAcc__body">
        ${body}
      </div>
    </details>
  `;
}

function baseGroupHtml(layer, quick) {
  return `
    <div class="form-grid">
      <label class="field">
        <span class="field__label">Von [m]</span>
        <input class="field__input" type="number" step="0.01" data-field="from" data-id="${h(layer.id)}" value="${h(layer.from || '')}" />
      </label>

      <label class="field">
        <span class="field__label">Bis [m]</span>
        <input class="field__input" type="number" step="0.01" data-field="to" data-id="${h(layer.id)}" value="${h(layer.to || '')}" />
      </label>

      ${selectHtml({
        layerId: layer.id,
        field: 'tool',
        options: TOOL_OPTIONS,
        value: layer.tool || '',
        label: 'Werkzeug / Verfahren'
      })}

      ${quick ? '' : `
        <label class="field">
          <span class="field__label">Proben-Nr.</span>
          <input class="field__input" type="text" data-field="sampleNo" data-id="${h(layer.id)}" value="${h(layer.sampleNo || '')}" />
        </label>

        <label class="field">
          <span class="field__label">Kernlauf</span>
          <input class="field__input" type="text" data-field="coreRun" data-id="${h(layer.id)}" value="${h(layer.coreRun || '')}" />
        </label>

        <label class="field">
          <span class="field__label">Kerngewinnung [%]</span>
          <input class="field__input" type="number" step="1" min="0" max="100" data-field="recovery" data-id="${h(layer.id)}" value="${h(layer.recovery || '')}" />
        </label>
      `}
    </div>
  `;
}

function namingGroupHtml(layer, quick) {
  return `
    <div class="choiceBlock">
      <div class="choiceLabel">Hauptanteil</div>
      <div class="chips">
        ${MAIN_OPTIONS.map(x => chipHtml({
          layerId: layer.id,
          field: 'main1',
          value: x.value,
          active: layer.main1 === x.value
        })).join('')}
      </div>
    </div>

    ${quick ? '' : `
      <div class="choiceBlock">
        <div class="choiceLabel">2. Hauptanteil optional</div>
        <div class="chips">
          ${MAIN_OPTIONS.map(x => chipHtml({
            layerId: layer.id,
            field: 'main2',
            value: x.value,
            active: layer.main2 === x.value,
            soft: true
          })).join('')}
        </div>
      </div>
    `}

    <div class="choiceBlock">
      <div class="choiceLabel">Nebenanteile</div>
      <div class="chips">
        ${SECONDARY_OPTIONS.map(v => chipHtml({
          layerId: layer.id,
          field: 'secondary',
          value: v,
          active: (layer.secondary || []).includes(v),
          soft: true
        })).join('')}
      </div>
    </div>

    <div class="choiceBlock">
      <div class="choiceLabel">Kornklasse optional</div>
      <div class="chips">
        ${GRAIN_OPTIONS.map(v => chipHtml({
          layerId: layer.id,
          field: 'grain',
          value: v.value,
          active: layer.grain === v.value
        })).join('')}
      </div>
    </div>

    <div class="smartHint">
      Bei annähernd gleichen Hauptanteilen kann ein Schrägstrich verwendet werden, z. B. KIES/SAND.
    </div>
  `;
}

function stateGroupHtml(layer, quick) {
  const mode = getStateMode(layer);

  return `
    <div class="choiceBlock">
      <div class="choiceLabel">${h(mode.label)}</div>
      <div class="chips">
        ${mode.options.map(v => chipHtml({
          layerId: layer.id,
          field: 'state',
          value: v,
          active: layer.state === v,
          soft: FINE_STATE_OPTIONS.includes(v)
        })).join('')}
      </div>
    </div>

    <div class="choiceBlock">
      <div class="choiceLabel">Farbe</div>
      <div class="chips">
        ${COLOR_OPTIONS.map(v => chipHtml({
          layerId: layer.id,
          field: 'colors',
          value: v,
          active: (layer.colors || []).includes(v),
          soft: true
        })).join('')}
      </div>
    </div>

    ${quick ? '' : `
      <div class="groupDivider"></div>

      <div class="choiceBlock">
        <div class="choiceLabel">Organischer Anteil</div>
        <div class="chips">
          ${ORGANIC_OPTIONS.filter(Boolean).map(v => chipHtml({
            layerId: layer.id,
            field: 'organic',
            value: v,
            active: layer.organic === v
          })).join('')}
        </div>
      </div>

      <div class="choiceBlock">
        <div class="choiceLabel">Kalkgehalt</div>
        <div class="chips">
          ${CALC_OPTIONS.filter(Boolean).map(v => chipHtml({
            layerId: layer.id,
            field: 'calc',
            value: v,
            active: layer.calc === v
          })).join('')}
        </div>
      </div>

      <div class="choiceBlock">
        <div class="choiceLabel">Wasserzustand</div>
        <div class="chips">
          ${WATER_OPTIONS.filter(Boolean).map(v => chipHtml({
            layerId: layer.id,
            field: 'water',
            value: v,
            active: layer.water === v
          })).join('')}
        </div>
      </div>
    `}
  `;
}

function reportGroupHtml(layer, quick) {
  const full = fullDescription(layer) || 'Noch keine normnahe Beschreibung ausgewählt.';
  const short = shortDescription(layer) || 'Beschreibung wählen';

  return `
    <div class="choiceBlock">
      <div class="choiceLabel">Kurzbeschreibung nach Norm</div>
      <div class="readonly js-short-desc">${h(short)}</div>
    </div>

    <div class="choiceBlock">
      <div class="choiceLabel">Detailbeschreibung</div>
      <div class="readonly js-full-desc">${h(full)}</div>
    </div>

    <div class="choiceBlock">
      <label class="field">
        <span class="field__label">Bemerkung</span>
        <textarea class="field__textarea" data-field="note" data-id="${h(layer.id)}">${h(layer.note || '')}</textarea>
      </label>
    </div>

    ${quick ? '' : `
      <div class="smartHint">
        Diese Texte werden direkt für PDF und GeODin-CSV verwendet.
      </div>
    `}
  `;
}

function layerCardHtml(layer, idx, isOpen = false) {
  const quick = !!state.ui.quickMode;
  const descShort = shortDescription(layer) || 'Beschreibung wählen';
  const summaryRange = `${fmtDepth(layer.from) || '—'} – ${fmtDepth(layer.to) || '—'} m`;

  return `
    <details class="layerCard" data-id="${h(layer.id)}" ${isOpen ? 'open' : ''}>
      <summary>
        <div class="layerCard__title">
          <span>Schicht ${idx + 1}</span>
          <span class="layerCard__sub js-summary-range">${h(summaryRange)}</span>
          <span class="layerCard__sub js-summary-desc">${h(descShort)}</span>
          ${quick ? `<span class="quickPill">Schnellmodus</span>` : ''}
        </div>
      </summary>

      <div class="layerBody">
        ${quick ? `
          <div class="layerQuickNote">
            Schnellmodus aktiv: nur die wichtigsten Felder sind sichtbar. Für alle Zusatzangaben oben den Schnellmodus ausschalten.
          </div>
        ` : ''}

        ${subAccHtml({
          layer,
          group: 'grpBase',
          title: '1. Tiefe & Kerndaten',
          meta: basisSummary(layer),
          body: baseGroupHtml(layer, quick)
        })}

        ${subAccHtml({
          layer,
          group: 'grpName',
          title: '2. Bodenbenennung',
          meta: namingSummary(layer),
          body: namingGroupHtml(layer, quick)
        })}

        ${subAccHtml({
          layer,
          group: 'grpState',
          title: '3. Zustand & Zusatz',
          meta: stateSummary(layer),
          body: stateGroupHtml(layer, quick)
        })}

        ${subAccHtml({
          layer,
          group: 'grpReport',
          title: '4. Beschreibung & Notiz',
          meta: reportSummary(layer),
          body: reportGroupHtml(layer, quick)
        })}

        <div class="layerActions">
          <button class="miniBtn" type="button" data-act="dup" data-id="${h(layer.id)}">Duplizieren</button>
          <button class="miniBtn" type="button" data-act="del" data-id="${h(layer.id)}">Löschen</button>
        </div>
      </div>
    </details>
  `;
}

function renderLayers(openIds = null) {
  const host = $('layerList');
  if (!host) return;

  const opened = Array.isArray(openIds) ? [...openIds] : getOpenIds();
  if (!opened.length && state.layers.length) opened.push(state.layers[state.layers.length - 1].id);

  host.innerHTML = state.layers
    .map((layer, idx) => layerCardHtml(layer, idx, opened.includes(layer.id)))
    .join('');
}

function refreshLayerComputed(id) {
  const layer = getLayer(id);
  if (!layer) return;

  const card = document.querySelector(`.layerCard[data-id="${id}"]`);
  if (!card) return;

  const range = `${fmtDepth(layer.from) || '—'} – ${fmtDepth(layer.to) || '—'} m`;
  const s = shortDescription(layer) || 'Beschreibung wählen';
  const f = fullDescription(layer) || 'Noch keine normnahe Beschreibung ausgewählt.';

  const rangeEl = card.querySelector('.js-summary-range');
  const sumEl = card.querySelector('.js-summary-desc');
  const shortEl = card.querySelector('.js-short-desc');
  const fullEl = card.querySelector('.js-full-desc');

  if (rangeEl) rangeEl.textContent = range;
  if (sumEl) sumEl.textContent = s;
  if (shortEl) shortEl.textContent = s;
  if (fullEl) fullEl.textContent = f;

  card.querySelectorAll('.subAcc').forEach(det => {
    const group = det.dataset.group;
    const metaEl = det.querySelector('.subAcc__meta');
    if (!metaEl) return;
    if (group === 'grpBase') metaEl.textContent = basisSummary(layer);
    if (group === 'grpName') metaEl.textContent = namingSummary(layer);
    if (group === 'grpState') metaEl.textContent = stateSummary(layer);
    if (group === 'grpReport') metaEl.textContent = reportSummary(layer);
  });
}

function renderHistoryList() {
  const host = $('historyList');
  if (!host) return;
  const list = readHistory();

  if (!list.length) {
    host.innerHTML = `<div class="text"><p>Noch keine Dokumentationen gespeichert.</p></div>`;
    return;
  }

  host.innerHTML = list.map(entry => {
    const snap = entry.snapshot || {};
    const project = snap.meta?.project || '—';
    const borehole = snap.meta?.borehole || '—';
    const count = snap.layers?.length || 0;
    return `
      <div class="historyItem">
        <div class="historyTop">
          <span>${h(entry.title)}</span>
          <span style="color:var(--muted);font-size:.82em">${h(new Date(entry.savedAt).toLocaleString('de-DE'))}</span>
        </div>
        <div class="historySub">
          Projekt: <b>${h(project)}</b> · Aufschluss: <b>${h(borehole)}</b> · Schichten: <b>${h(count)}</b>
        </div>
        <div class="historyBtns">
          <button type="button" data-hact="load" data-id="${h(entry.id)}">Laden</button>
          <button type="button" data-hact="csv" data-id="${h(entry.id)}">CSV</button>
          <button type="button" data-hact="pdf" data-id="${h(entry.id)}">PDF</button>
          <button type="button" data-hact="del" data-id="${h(entry.id)}">Löschen</button>
        </div>
      </div>
    `;
  }).join('');
}

function downloadText(filename, text, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob(['\uFEFF' + text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

function buildCsv(snapshot = state) {
  const rows = [];
  rows.push([
    'PROJEKT',
    'AUFSCHLUSS',
    'DATUM',
    'BEARBEITER',
    'ORT',
    'GERAET',
    'SCHICHT_NR',
    'VON_M',
    'BIS_M',
    'MAECHTIGKEIT_M',
    'HAUPTANTEIL',
    'HAUPTANTEIL_2',
    'NEBENANTEILE',
    'KORNGRUPPE',
    'BESCHREIBUNG_NORM',
    'ZUSTAND',
    'FARBE',
    'ORGANIK',
    'KALK',
    'WASSER',
    'WERKZEUG',
    'PROBEN_NR',
    'KERNLAUF',
    'KERNGEWINNUNG_PROZENT',
    'BEMERKUNG'
  ].join(';'));

  (snapshot.layers || []).forEach((layer, i) => {
    const from = Number(layer.from || 0);
    const to = Number(layer.to || 0);
    const thickness = Number.isFinite(from) && Number.isFinite(to) ? (to - from).toFixed(2) : '';

    rows.push([
      escCsv(snapshot.meta?.project || ''),
      escCsv(snapshot.meta?.borehole || ''),
      escCsv(snapshot.meta?.date || ''),
      escCsv(snapshot.meta?.user || ''),
      escCsv(snapshot.meta?.location || ''),
      escCsv(snapshot.meta?.device || ''),
      escCsv(i + 1),
      escCsv(layer.from || ''),
      escCsv(layer.to || ''),
      escCsv(thickness),
      escCsv(layer.main1 || ''),
      escCsv(layer.main2 || ''),
      escCsv((layer.secondary || []).join(', ')),
      escCsv(layer.grain || ''),
      escCsv(fullDescription(layer)),
      escCsv(layer.state || ''),
      escCsv((layer.colors || []).join(', ')),
      escCsv(layer.organic || ''),
      escCsv(layer.calc || ''),
      escCsv(layer.water || ''),
      escCsv(layer.tool || ''),
      escCsv(layer.sampleNo || ''),
      escCsv(layer.coreRun || ''),
      escCsv(layer.recovery || ''),
      escCsv(layer.note || '')
    ].join(';'));
  });

  return rows.join('\r\n');
}

function exportCsv(snapshot = state) {
  const name = `${(snapshot.meta?.date || 'datum').replaceAll('-', '')}_HTB_GeODin_Bohrkern.csv`;
  downloadText(name, buildCsv(snapshot), 'text/csv;charset=utf-8');
}

function exportJson(snapshot = state) {
  const name = `${(snapshot.meta?.date || 'datum').replaceAll('-', '')}_HTB_Bohrkern.json`;
  downloadText(name, JSON.stringify(snapshot, null, 2), 'application/json;charset=utf-8');
}

function wrapText(text, font, size, maxWidth) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';

  words.forEach(word => {
    const test = line ? `${line} ${word}` : word;
    const width = font.widthOfTextAtSize(test, size);
    if (width <= maxWidth) {
      line = test;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  });

  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

function openHtmlReport(snapshot = state) {
  const rows = (snapshot.layers || []).map((layer, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${h(fmtDepth(layer.from))}</td>
      <td>${h(fmtDepth(layer.to))}</td>
      <td>${h(fullDescription(layer) || '—')}</td>
      <td>${h(layer.tool || '—')}</td>
      <td>${h(layer.sampleNo || '—')}</td>
      <td>${h(layer.coreRun || '—')}</td>
      <td>${h(layer.recovery || '—')}</td>
      <td>${h(layer.note || '—')}</td>
    </tr>
  `).join('');

  const html = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<title>HTB Bohrkernaufnahme Bericht</title>
<style>
body{font-family:Arial,sans-serif;margin:24px;color:#111}
.head{display:flex;align-items:center;gap:16px;border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:18px}
.logo{width:120px}
.title{font-size:22px;font-weight:700}
.sub{color:#444;font-size:13px;margin-top:4px}
.meta{margin:0 0 18px 0;font-size:13px;line-height:1.7}
table{width:100%;border-collapse:collapse;font-size:12px}
th,td{border:1px solid #bbb;padding:8px;vertical-align:top;text-align:left}
th{background:#f3f3f3}
.bar{margin:0 0 14px}
.pdfbtn{display:inline-block;background:#111;color:#fff;border:none;border-radius:999px;padding:10px 16px;cursor:pointer;font-weight:700}
@media print {.bar{display:none} body{margin:10mm}}
</style>
</head>
<body>
  <div class="bar">
    <button class="pdfbtn" onclick="window.print()">Als PDF speichern / drucken</button>
  </div>

  <div class="head">
    <div class="logo">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 637.8 496.06">
        <rect width="637.8" height="496.06" fill="#ffed00"/>
        <path fill="#111111" d="M531.5,177.12H148.73l43.08-28.73c6.57-4.38,14.29-6.72,22.18-6.72h285.8s-140.7-93.84-140.7-93.84c-.7-.48-1.44-.95-2.15-1.42-21.73-14.64-54.36-14.64-76.09,0-.72.48-1.44.94-2.15,1.42L66.6,189.29h0c-4.68,3.2-8.98,6.93-12.8,11.12-41.01,45.63-8.95,118.29,52.5,118.53h382.77l-43.08,28.73c-6.57,4.38-14.29,6.72-22.19,6.72H138.01s140.71,93.84,140.71,93.84c.7.49,1.44.95,2.15,1.43,21.73,14.64,54.36,14.64,76.09,0,.72-.48,1.44-.94,2.14-1.42l212.1-141.45h0c4.69-3.21,9.01-6.96,12.84-11.16,11.73-12.89,18.35-30.15,18.33-47.58,0-39.16-31.73-70.9-70.87-70.9Z"/>
        <path fill="#ffed00" d="M438.32,263.5c.08-5.32-1.27-9.39-4.05-12.22-2.79-2.82-7.04-4.81-12.77-5.96,4.83-.9,8.43-2.8,10.81-5.71,2.37-2.91,3.56-6.61,3.56-11.11v-3.44c0-4.83-.94-8.72-2.82-11.67-1.88-2.95-4.75-5.08-8.6-6.39-3.85-1.31-8.72-1.96-14.61-1.96h-157.8v33.77h-30.21v-33.77h-22.59v85.96h22.59v-35.73h30.21v35.73h22.72v-69.26h33.52v69.26h22.84v-69.26h33.4v69.26h45.31c6.38,0,11.69-.78,15.9-2.33,4.21-1.55,7.41-3.99,9.58-7.31,2.17-3.32,3.25-7.55,3.25-12.71l-.25-5.16ZM386.87,220.77h18.42c2.78,0,4.81.57,6.08,1.72,1.27,1.15,1.9,3.11,1.9,5.89v3.19c0,1.96-.29,3.54-.86,4.73-.57,1.19-1.43,2.05-2.58,2.58-1.15.53-2.7.8-4.67.8h-18.3v-18.91ZM414.99,266.82c0,1.96-.31,3.58-.92,4.85-.61,1.27-1.56,2.17-2.82,2.7-1.27.53-2.93.8-4.97.8h-19.4v-21h19.4c2.13,0,3.83.25,5.1.74,1.27.49,2.19,1.35,2.76,2.58s.86,2.87.86,4.91v4.42Z"/>
      </svg>
    </div>
    <div>
      <div class="title">HTB Bohrkernaufnahme</div>
      <div class="sub">ÖNORM EN ISO 14688 · Bericht / Kerndokumentation</div>
    </div>
  </div>

  <div class="meta">
    <b>Projekt:</b> ${h(snapshot.meta?.project || '—')}<br>
    <b>Aufschluss / Bohrung:</b> ${h(snapshot.meta?.borehole || '—')}<br>
    <b>Datum:</b> ${h(snapshot.meta?.date || '—')}<br>
    <b>Bearbeiter:</b> ${h(snapshot.meta?.user || '—')}<br>
    <b>Ort / Abschnitt:</b> ${h(snapshot.meta?.location || '—')}<br>
    <b>Bohrgerät / Verfahren:</b> ${h(snapshot.meta?.device || '—')}<br>
    <b>Gesamtbemerkung:</b> ${h(snapshot.meta?.note || '—')}
  </div>

  <table>
    <thead>
      <tr>
        <th>Schicht</th>
        <th>Von [m]</th>
        <th>Bis [m]</th>
        <th>Beschreibung nach Norm</th>
        <th>Werkzeug</th>
        <th>Probe</th>
        <th>Kernlauf</th>
        <th>Kerngew. [%]</th>
        <th>Bemerkung</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="9">Keine Schichten vorhanden.</td></tr>'}
    </tbody>
  </table>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank');
  if (!w) alert('Popup blockiert – bitte Popups erlauben.');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

async function exportPdf(snapshot = state) {
  if (!window.PDFLib) {
    openHtmlReport(snapshot);
    return;
  }

  const { PDFDocument, StandardFonts, rgb } = window.PDFLib;
  const pdf = await PDFDocument.create();
  const reg = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const PAGE_W = 595.28;
  const PAGE_H = 841.89;
  const mm = (v) => v * 72 / 25.4;
  const margin = mm(10);

  let page;
  let y;

  function newPage() {
    page = pdf.addPage([PAGE_W, PAGE_H]);
    page.drawRectangle({ x: 0, y: PAGE_H - mm(18), width: PAGE_W, height: mm(18), color: rgb(0, 0, 0) });
    page.drawRectangle({ x: margin, y: PAGE_H - mm(14), width: mm(28), height: mm(10), color: rgb(1, 0.93, 0) });
    page.drawText('HTB', { x: margin + mm(8), y: PAGE_H - mm(10.7), size: 16, font: bold, color: rgb(0, 0, 0) });
    page.drawText('Bohrkernaufnahme · ÖNORM EN ISO 14688', {
      x: margin + mm(34),
      y: PAGE_H - mm(10.5),
      size: 13,
      font: bold,
      color: rgb(1, 1, 1)
    });
    y = PAGE_H - mm(24);
  }

  function ensureSpace(hh) {
    if (!page || y - hh < margin) newPage();
  }

  newPage();

  const metaLines = [
    `Projekt: ${snapshot.meta?.project || '—'}`,
    `Aufschluss: ${snapshot.meta?.borehole || '—'}`,
    `Datum: ${snapshot.meta?.date || '—'}`,
    `Bearbeiter: ${snapshot.meta?.user || '—'}`,
    `Ort: ${snapshot.meta?.location || '—'}`,
    `Gerät/Verfahren: ${snapshot.meta?.device || '—'}`,
    `Allgemeine Notiz: ${snapshot.meta?.note || '—'}`
  ];

  metaLines.forEach(line => {
    ensureSpace(mm(6));
    page.drawText(line, { x: margin, y, size: 10, font: reg, color: rgb(0, 0, 0) });
    y -= mm(5.4);
  });

  y -= mm(3);

  (snapshot.layers || []).forEach((layer, idx) => {
    const title = `Schicht ${idx + 1}: ${layer.from || '—'} m bis ${layer.to || '—'} m`;
    const desc = `Beschreibung nach Norm: ${fullDescription(layer) || '—'}`;
    const tool = `Werkzeug / Verfahren: ${layer.tool || '—'}`;
    const core = `Proben-Nr.: ${layer.sampleNo || '—'} · Kernlauf: ${layer.coreRun || '—'} · Kerngewinnung: ${layer.recovery || '—'} %`;
    const note = `Bemerkung: ${layer.note || '—'}`;

    const lines = [
      ...wrapText(desc, reg, 10, PAGE_W - 2 * margin - mm(4)),
      ...wrapText(tool, reg, 10, PAGE_W - 2 * margin - mm(4)),
      ...wrapText(core, reg, 10, PAGE_W - 2 * margin - mm(4)),
      ...wrapText(note, reg, 10, PAGE_W - 2 * margin - mm(4))
    ];

    const blockH = mm(10) + lines.length * mm(4.5) + mm(4);
    ensureSpace(blockH);

    page.drawRectangle({
      x: margin,
      y: y - blockH + mm(2),
      width: PAGE_W - 2 * margin,
      height: blockH,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1
    });

    page.drawText(title, { x: margin + mm(2), y: y - mm(4), size: 11, font: bold, color: rgb(0, 0, 0) });

    let yy = y - mm(9);
    lines.forEach(line => {
      page.drawText(line, { x: margin + mm(2), y: yy, size: 10, font: reg, color: rgb(0, 0, 0) });
      yy -= mm(4.5);
    });

    y -= (blockH + mm(3));
  });

  const bytes = await pdf.save();
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank');

  if (!w) {
    const a = document.createElement('a');
    a.href = url;
    a.download = 'HTB_Bohrkernaufnahme.pdf';
    a.click();
  }

  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function initTabs() {
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(b => b.classList.toggle('is-active', b === btn));
      document.querySelectorAll('.pane').forEach(p => {
        const on = p.id === `tab-${btn.dataset.tab}`;
        p.classList.toggle('is-active', on);
        p.hidden = !on;
      });
      if (btn.dataset.tab === 'verlauf') renderHistoryList();
    });
  });
}

function hookMetaEvents() {
  ['meta-date','meta-user','meta-project','meta-borehole','meta-location','meta-device','meta-note'].forEach(id => {
    $(id)?.addEventListener('input', () => {
      collectMetaFromUi();
      saveDraftDebounced();
    });
    $(id)?.addEventListener('change', () => {
      collectMetaFromUi();
      saveDraftDebounced();
    });
  });
}

function hookLayerEvents() {
  const host = $('layerList');
  if (!host) return;

  host.addEventListener('toggle', (e) => {
    const det = e.target;
    if (!(det instanceof HTMLDetailsElement)) return;
    if (!det.classList.contains('subAcc')) return;

    const layer = getLayer(det.dataset.id);
    if (!layer) return;
    if (!layer.ui) layer.ui = {};
    layer.ui[det.dataset.group] = det.open;
    saveDraftDebounced();
  }, true);

  host.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-chip-field]');
    if (chip) {
      const id = chip.dataset.id;
      const field = chip.dataset.chipField;
      const value = chip.dataset.value;
      const layer = getLayer(id);
      if (!layer) return;

      if (field === 'secondary' || field === 'colors') {
        const arr = Array.isArray(layer[field]) ? [...layer[field]] : [];
        const idx = arr.indexOf(value);
        if (idx >= 0) arr.splice(idx, 1);
        else arr.push(value);
        layer[field] = arr;
      } else {
        layer[field] = layer[field] === value ? '' : value;
      }

      if (field === 'main1') {
        const allowed = getStateMode(layer).options;
        if (layer.state && !allowed.includes(layer.state)) {
          layer.state = '';
        }
      }

      const openIds = getOpenIds();
      if (!openIds.includes(id)) openIds.push(id);
      renderLayers(openIds);
      saveDraftDebounced();
      return;
    }

    const act = e.target.closest('[data-act]');
    if (!act) return;

    const id = act.dataset.id;
    const layer = getLayer(id);
    if (!layer) return;

    if (act.dataset.act === 'del') {
      if (!confirm('Schicht wirklich löschen?')) return;
      if (state.layers.length === 1) {
        state.layers = [defaultLayer(0)];
      } else {
        state.layers = state.layers.filter(x => x.id !== id);
      }
      renderLayers();
      saveDraftDebounced();
      return;
    }

    if (act.dataset.act === 'dup') {
      const copy = hydrateLayer(clone(layer), state.layers.length);
      copy.id = uid();
      state.layers.splice(state.layers.findIndex(x => x.id === id) + 1, 0, copy);
      renderLayers([copy.id]);
      saveDraftDebounced();
    }
  });

  host.addEventListener('input', (e) => {
    const inp = e.target.closest('[data-field]');
    if (!inp) return;
    const layer = getLayer(inp.dataset.id);
    if (!layer) return;
    layer[inp.dataset.field] = inp.value;
    refreshLayerComputed(inp.dataset.id);
    saveDraftDebounced();
  });

  host.addEventListener('change', (e) => {
    const inp = e.target.closest('[data-field]');
    if (!inp) return;
    const layer = getLayer(inp.dataset.id);
    if (!layer) return;
    layer[inp.dataset.field] = inp.value;
    refreshLayerComputed(inp.dataset.id);
    saveDraftDebounced();
  });
}

function hookHistoryEvents() {
  $('historyList')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-hact]');
    if (!btn) return;

    const id = btn.dataset.id;
    const act = btn.dataset.hact;
    const list = readHistory();
    const entry = list.find(x => x.id === id);

    if (act === 'del') {
      writeHistory(list.filter(x => x.id !== id));
      renderHistoryList();
      return;
    }

    if (!entry) return;

    if (act === 'load') {
      applyState(entry.snapshot);
      document.querySelector('.tab[data-tab="doku"]')?.click();
    }

    if (act === 'csv') exportCsv(entry.snapshot);
    if (act === 'pdf') await exportPdf(entry.snapshot);
  });
}

function initInstallButton() {
  let installPrompt = null;
  const btn = $('btnInstall');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installPrompt = e;
    if (btn) btn.hidden = false;
  });

  btn?.addEventListener('click', async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    btn.hidden = true;
  });

  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    if (btn) btn.hidden = true;
  });
}

window.addEventListener('DOMContentLoaded', () => {
  state.meta.date = new Date().toISOString().slice(0, 10);
  state.layers = [defaultLayer(0)];

  loadDraft();

  if (!state.meta.date) state.meta.date = new Date().toISOString().slice(0, 10);
  if (!state.layers.length) state.layers = [defaultLayer(0)];

  initTabs();
  syncMetaToUi();
  syncQuickModeUi();
  renderLayers();
  renderHistoryList();
  hookMetaEvents();
  hookLayerEvents();
  hookHistoryEvents();
  initInstallButton();

  $('btnQuickMode')?.addEventListener('click', () => {
    state.ui.quickMode = !state.ui.quickMode;
    syncQuickModeUi();
    renderLayers(getOpenIds());
    saveDraftDebounced();
  });

  $('btnAddLayer')?.addEventListener('click', () => {
    const lastTo = state.layers.length ? state.layers[state.layers.length - 1].to : 0;
    const next = defaultLayer(Number(lastTo || 0));
    next.from = fmtDepth(lastTo || 0);
    next.to = fmtDepth(Number(lastTo || 0) + 1);
    state.layers.push(next);
    renderLayers([next.id]);
    saveDraftDebounced();
  });

  $('btnSave')?.addEventListener('click', () => {
    collectMetaFromUi();
    saveCurrentToHistory();
    saveDraftDebounced();
    alert('Dokumentation im Verlauf gespeichert.');
  });

  $('btnCsv')?.addEventListener('click', () => {
    collectMetaFromUi();
    exportCsv(state);
  });

  $('btnJson')?.addEventListener('click', () => {
    collectMetaFromUi();
    exportJson(state);
  });

  $('btnPdf')?.addEventListener('click', async () => {
    collectMetaFromUi();
    try {
      await exportPdf(state);
    } catch (err) {
      console.error(err);
      openHtmlReport(state);
    }
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/Bohrkernaufnahme/sw.js?v=81').catch((err) => {
  console.error('SW registration failed:', err);
    });
  }
});
