'use strict';

console.log('HTB Bohrkernaufnahme v134 loaded');

const STORAGE_DRAFT      = 'htb-bohrkern-14688-draft-v132';
const STORAGE_HISTORY    = 'htb-bohrkern-14688-history-v132';
const STORAGE_PHOTO_META = 'htb-bohrkern-photo-meta-v132';
const HISTORY_MAX        = 40;

const PHOTO_DB_NAME  = 'htb-bohrkern-photo-db-v132';
const PHOTO_DB_STORE = 'files';
const PHOTO_MAX_EDGE = 1600;
const PHOTO_QUALITY  = 0.78;

const $ = (id) => document.getElementById(id);

const MAIN_OPTIONS = [
  { value: 'BLÖCKE',      family: 'block'  },
  { value: 'STEINE',      family: 'stone'  },
  { value: 'KIES',        family: 'gravel' },
  { value: 'SAND',        family: 'sand'   },
  { value: 'SCHLUFF',     family: 'silt'   },
  { value: 'TON',         family: 'clay'   },
  { value: 'TORF',        family: 'peat'   },
  { value: 'HUMUS',       family: 'humus'  },
  { value: 'ANSCHÜTTUNG', family: 'fill'   }
];

const SECONDARY_OPTIONS = [
  'schwach blockig',   'blockig',   'stark blockig',
  'schwach steinig',   'steinig',   'stark steinig',
  'schwach kiesig',    'kiesig',    'stark kiesig',
  'schwach sandig',    'sandig',    'stark sandig',
  'schwach schluffig', 'schluffig', 'stark schluffig',
  'schwach tonig',     'tonig',     'stark tonig',
  'schwach humos',     'humos',     'stark humos',
  'schwach torfig',    'torfig',    'stark torfig',
  'schwach organisch', 'organisch', 'stark organisch'
];

const GRAIN_OPTIONS = [
  { value: 'Feinkies',      family: 'gravel' },
  { value: 'Mittelkies',    family: 'gravel' },
  { value: 'Grobkies',      family: 'gravel' },
  { value: 'Feinsand',      family: 'sand'   },
  { value: 'Mittelsand',    family: 'sand'   },
  { value: 'Grobsand',      family: 'sand'   },
  { value: 'Feinschluff',   family: 'silt'   },
  { value: 'Mittelschluff', family: 'silt'   },
  { value: 'Grobschluff',   family: 'silt'   }
];

const COARSE_STATE_OPTIONS = ['sehr locker', 'locker', 'mitteldicht', 'dicht', 'sehr dicht'];
const FINE_STATE_OPTIONS   = ['flüssig', 'breiig', 'sehr weich', 'weich', 'steif', 'halbfest', 'fest (hart)'];
const COLOR_OPTIONS   = ['gelb', 'gelblich', 'braun', 'bräunlich', 'grau', 'gräulich', 'schwarz', 'rot', 'rötlich', 'grünlich', 'bläulich', 'weiß'];
const CALC_OPTIONS    = ['', 'nicht kalkhaltig', 'leicht kalkhaltig', 'kalkhaltig', 'sehr kalkhaltig'];
const ORGANIC_OPTIONS = ['', 'leicht organisch', 'organisch', 'stark organisch'];
const WATER_OPTIONS   = ['', 'trocken', 'erdfeucht', 'feucht', 'nass', 'wasserführend'];
const TOOL_OPTIONS    = ['', 'RKS', 'Kernbohrung', 'Spülbohrung', 'Bohrstock', 'Bagger', 'Schurf', 'DPH', 'DPSH', 'CPT'];

const state = {
  meta: {
    date: '', user: '', project: '', borehole: '',
    location: '', device: '', note: ''
  },
  ui: { quickMode: true },
  layers: []
};

const photoDraft = {
  endDepth: '',
  selectedBox: '',
  boxFrom: null,
  boxTo: null,
  entries: []
};

/* ─── Hilfsfunktionen ─────────────────────────── */

function uid() {
  return crypto?.randomUUID?.() ||
    ('id_' + Date.now() + '_' + Math.random().toString(16).slice(2));
}

function clone(v) {
  return JSON.parse(JSON.stringify(v));
}

// BUGFIX: & muss zu &amp; escaped werden
function h(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// BUGFIX: leerer String darf nicht zu '0.00' werden
function fmtDepth(v) {
  if (v === null || v === undefined || v === '') return '';
  const raw = typeof v === 'string' ? v.trim().replace(',', '.') : String(v);
  if (raw === '') return '';
  const n = Number(raw);
  return Number.isFinite(n) ? n.toFixed(2) : '';
}

// BUGFIX: leerer String guard
function compactDepth(v) {
  if (v === null || v === undefined || v === '') return '';
  const raw = typeof v === 'string' ? v.trim().replace(',', '.') : String(v);
  if (raw === '') return '';
  const n = Number(raw);
  if (!Number.isFinite(n)) return '';
  if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n));
  if (Math.abs(n * 10 - Math.round(n * 10)) < 1e-9)
    return n.toFixed(1).replace(/\.0$/, '');
  return n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

function escCsv(v) {
  const s = String(v ?? '');
  if (/[;"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

function downloadText(filename, text, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob(['\uFEFF' + text], { type: mime });
  downloadBlob(filename, blob);
}

function formatBytes(bytes) {
  const b = Number(bytes || 0);
  if (b < 1024)        return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}

/* ─── Bodenbeschreibung ────────────────────────── */

function getFamilyByMain(main) {
  return MAIN_OPTIONS.find(x => x.value === main)?.family || '';
}

function decorateMain(main, grain) {
  if (!main) return '';
  const famMain  = getFamilyByMain(main);
  const famGrain = GRAIN_OPTIONS.find(x => x.value === grain)?.family || '';
  if (grain && famMain && famMain === famGrain) return grain.toUpperCase();
  return main;
}

function shortDescription(layer) {
  const adj   = Array.isArray(layer.secondary) ? layer.secondary : [];
  const main1 = decorateMain(layer.main1, layer.grain);
  const main2 = decorateMain(layer.main2, layer.grain);
  const base  = main2 ? `${main1}/${main2}` : main1;
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
    to:   fmtDepth(index + 1),
    main1: '', main2: '', secondary: [], grain: '',
    state: '', colors: [], organic: '', calc: '', water: '',
    tool: '', sampleNo: '', coreRun: '', recovery: '', note: '',
    ui: { grpBase: true, grpName: true, grpState: false, grpReport: true }
  };
}

function hydrateLayer(layer, idx) {
  const base = defaultLayer(idx);
  return {
    ...base,
    ...layer,
    secondary: Array.isArray(layer?.secondary) ? layer.secondary : [],
    colors:    Array.isArray(layer?.colors)    ? layer.colors    : [],
    ui: { ...base.ui, ...(layer?.ui || {}) }
  };
}

function getLayer(id) {
  return state.layers.find(x => x.id === id);
}

function getOpenIds() {
  return Array.from(document.querySelectorAll('.layerCard[open]'))
    .map(x => x.dataset.id);
}

/* ─── Persistenz ───────────────────────────────── */

function saveDraft() {
  try { localStorage.setItem(STORAGE_DRAFT, JSON.stringify(state)); } catch {}
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
    if (parsed?.meta)   state.meta = { ...state.meta, ...parsed.meta };
    if (parsed?.ui)     state.ui   = { ...state.ui,   ...parsed.ui   };
    if (Array.isArray(parsed?.layers) && parsed.layers.length) {
      state.layers = parsed.layers.map((l, i) => hydrateLayer(l, i));
    }
  } catch {}
}

function readHistory() {
  try { return JSON.parse(localStorage.getItem(STORAGE_HISTORY) || '[]'); }
  catch { return []; }
}

function writeHistory(list) {
  try {
    localStorage.setItem(STORAGE_HISTORY, JSON.stringify(list.slice(0, HISTORY_MAX)));
  } catch {}
}

function saveCurrentToHistory() {
  const title = `${state.meta.project || '—'} · ${state.meta.borehole || '—'}`;
  const entry = { id: uid(), savedAt: Date.now(), title, snapshot: clone(state) };
  const list  = readHistory();
  list.unshift(entry);
  writeHistory(list);
  renderHistoryList();
}

function applyState(snapshot) {
  if (!snapshot) return;
  state.meta   = { ...state.meta, ...(snapshot.meta || {}) };
  state.ui     = { ...state.ui,   ...(snapshot.ui   || {}) };
  state.layers = Array.isArray(snapshot.layers) && snapshot.layers.length
    ? snapshot.layers.map((l, i) => hydrateLayer(l, i))
    : [defaultLayer(0)];
  syncMetaToUi();
  syncQuickModeUi();
  renderLayers();
  renderHistoryList();
  syncPhotoPanel();
  saveDraftDebounced();
}

/* ─── UI Sync ──────────────────────────────────── */

function syncMetaToUi() {
  $('meta-date').value     = state.meta.date     || '';
  $('meta-user').value     = state.meta.user     || '';
  $('meta-project').value  = state.meta.project  || '';
  $('meta-borehole').value = state.meta.borehole || '';
  $('meta-location').value = state.meta.location || '';
  $('meta-device').value   = state.meta.device   || '';
  $('meta-note').value     = state.meta.note     || '';
}

function collectMetaFromUi() {
  state.meta.date     = $('meta-date').value     || '';
  state.meta.user     = $('meta-user').value     || '';
  state.meta.project  = $('meta-project').value  || '';
  state.meta.borehole = $('meta-borehole').value || '';
  state.meta.location = $('meta-location').value || '';
  state.meta.device   = $('meta-device').value   || '';
  state.meta.note     = $('meta-note').value     || '';
}

function syncQuickModeUi() {
  const btn  = $('btnQuickMode');
  const hint = $('quickModeHint');
  if (!btn) return;

  const on = !!state.ui.quickMode;
  btn.textContent = on ? 'Schnellmodus: EIN' : 'Schnellmodus: AUS';
  btn.setAttribute('aria-pressed', String(on));
  btn.classList.toggle('btn--accent', on);
  btn.classList.toggle('btn--ghost',  !on);

  if (hint) {
    hint.textContent = on
      ? 'Schnellmodus aktiv: sichtbar sind nur die wichtigsten Felder. Für Proben-Nr., Kernlauf, Kalk, Wasser etc. den Schnellmodus ausschalten.'
      : 'Schnellmodus aus: alle Detailfelder einer Schicht sind sichtbar.';
  }
}

/* ─── Zusammenfassungen ────────────────────────── */

function basisSummary(layer) {
  const parts = [];
  if (layer.from || layer.to)
    parts.push(`${fmtDepth(layer.from) || '—'}–${fmtDepth(layer.to) || '—'} m`);
  if (layer.tool)     parts.push(layer.tool);
  if (layer.sampleNo) parts.push(`Probe ${layer.sampleNo}`);
  if (layer.recovery) parts.push(`${layer.recovery} %`);
  return parts.join(' · ') || 'Tiefe und Kerndaten';
}

function namingSummary(layer) {
  return shortDescription(layer) || 'Bodenbenennung wählen';
}

function stateSummary(layer) {
  const parts = [];
  if (layer.state)   parts.push(layer.state);
  if (layer.colors?.length) parts.push(layer.colors.join(', '));
  if (layer.organic) parts.push(layer.organic);
  if (layer.calc && layer.calc !== 'nicht kalkhaltig') parts.push(layer.calc);
  if (layer.water)   parts.push(layer.water);
  return parts.join(' · ') || 'Zustand und Zusatzangaben';
}

function reportSummary(layer) {
  return layer.note || fullDescription(layer) || 'Beschreibung und Notiz';
}

function getStateMode(layer) {
  const fam = getFamilyByMain(layer.main1);
  if (['gravel', 'sand', 'stone', 'block'].includes(fam))
    return { label: 'Lagerungsdichte', options: COARSE_STATE_OPTIONS };
  if (['silt', 'clay', 'peat', 'humus'].includes(fam))
    return { label: 'Konsistenz', options: FINE_STATE_OPTIONS };
  return { label: 'Lagerungsdichte / Konsistenz',
           options: [...COARSE_STATE_OPTIONS, ...FINE_STATE_OPTIONS] };
}

/* ─── HTML-Bausteine ───────────────────────────── */

function chipHtml({ layerId, field, value, active, soft = false }) {
  return `<button
    class="chip ${active ? 'is-active' : ''} ${soft ? 'chip--soft' : ''}"
    type="button"
    data-chip-field="${h(field)}"
    data-id="${h(layerId)}"
    data-value="${h(value)}"
  >${h(value || '—')}</button>`;
}

function selectHtml({ layerId, field, options, value, label }) {
  return `<label class="field">
    <span class="field__label">${h(label)}</span>
    <select class="field__select" data-field="${h(field)}" data-id="${h(layerId)}">
      ${options.map(opt =>
        `<option value="${h(opt)}" ${opt === value ? 'selected' : ''}>${h(opt || '—')}</option>`
      ).join('')}
    </select>
  </label>`;
}

function subAccHtml({ layer, group, title, meta, body }) {
  const isOpen = !!layer.ui?.[group];
  return `<details class="subAcc" data-id="${h(layer.id)}" data-group="${h(group)}" ${isOpen ? 'open' : ''}>
    <summary>
      <div class="subAcc__head">
        <span class="subAcc__title">${h(title)}</span>
        <span class="subAcc__meta">${h(meta || '')}</span>
      </div>
    </summary>
    <div class="subAcc__body">${body}</div>
  </details>`;
}

function baseGroupHtml(layer, quick) {
  return `<div class="form-grid">
    <label class="field">
      <span class="field__label">Von [m]</span>
      <input class="field__input" type="number" step="0.01"
             data-field="from" data-id="${h(layer.id)}" value="${h(layer.from || '')}" />
    </label>
    <label class="field">
      <span class="field__label">Bis [m]</span>
      <input class="field__input" type="number" step="0.01"
             data-field="to" data-id="${h(layer.id)}" value="${h(layer.to || '')}" />
    </label>
    ${selectHtml({ layerId: layer.id, field: 'tool', options: TOOL_OPTIONS,
                   value: layer.tool || '', label: 'Werkzeug / Verfahren' })}
    ${quick ? '' : `
      <label class="field">
        <span class="field__label">Proben-Nr.</span>
        <input class="field__input" type="text"
               data-field="sampleNo" data-id="${h(layer.id)}" value="${h(layer.sampleNo || '')}" />
      </label>
      <label class="field">
        <span class="field__label">Kernlauf</span>
        <input class="field__input" type="text"
               data-field="coreRun" data-id="${h(layer.id)}" value="${h(layer.coreRun || '')}" />
      </label>
      <label class="field">
        <span class="field__label">Kerngewinnung [%]</span>
        <input class="field__input" type="number" step="1" min="0" max="100"
               data-field="recovery" data-id="${h(layer.id)}" value="${h(layer.recovery || '')}" />
      </label>
    `}
  </div>`;
}

function namingGroupHtml(layer, quick) {
  return `
    <div class="choiceBlock">
      <div class="choiceLabel">Hauptanteil</div>
      <div class="chips">
        ${MAIN_OPTIONS.map(x => chipHtml({
          layerId: layer.id, field: 'main1', value: x.value,
          active: layer.main1 === x.value
        })).join('')}
      </div>
    </div>

    ${quick ? '' : `
      <div class="choiceBlock">
        <div class="choiceLabel">2. Hauptanteil optional</div>
        <div class="chips">
          ${MAIN_OPTIONS.map(x => chipHtml({
            layerId: layer.id, field: 'main2', value: x.value,
            active: layer.main2 === x.value, soft: true
          })).join('')}
        </div>
      </div>
    `}

    <div class="choiceBlock">
      <div class="choiceLabel">Nebenanteile</div>
      <div class="chips">
        ${SECONDARY_OPTIONS.map(v => chipHtml({
          layerId: layer.id, field: 'secondary', value: v,
          active: (layer.secondary || []).includes(v), soft: true
        })).join('')}
      </div>
    </div>

    <div class="choiceBlock">
      <div class="choiceLabel">Kornklasse optional</div>
      <div class="chips">
        ${GRAIN_OPTIONS.map(v => chipHtml({
          layerId: layer.id, field: 'grain', value: v.value,
          active: layer.grain === v.value
        })).join('')}
      </div>
    </div>

    <div class="smartHint">
      Bei annähernd gleichen Hauptanteilen kann ein Schrägstrich verwendet werden, z. B. KIES/SAND.
    </div>`;
}

function stateGroupHtml(layer, quick) {
  const mode = getStateMode(layer);
  return `
    <div class="choiceBlock">
      <div class="choiceLabel">${h(mode.label)}</div>
      <div class="chips">
        ${mode.options.map(v => chipHtml({
          layerId: layer.id, field: 'state', value: v,
          active: layer.state === v, soft: FINE_STATE_OPTIONS.includes(v)
        })).join('')}
      </div>
    </div>

    <div class="choiceBlock">
      <div class="choiceLabel">Farbe</div>
      <div class="chips">
        ${COLOR_OPTIONS.map(v => chipHtml
