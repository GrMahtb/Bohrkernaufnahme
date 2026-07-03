'use strict';

console.log('Bohrgutansprache v159 loaded');

const STORAGE_DRAFT = 'bohrkern-draft-v158';
const STORAGE_HISTORY = 'bohrkern-history-v158';
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

const SECONDARY_OPTIONS = ['blockig', 'steinig', 'kiesig', 'sandig', 'schluffig', 'tonig', 'humos', 'torfig', 'organisch'];
const INTENSITY_OPTIONS = ['schwach', 'mittel', 'stark'];
const INTENSITY_PREFIX = { schwach: 'schwach ', mittel: '', stark: 'stark ' };
const MAIN_GENDER = {
'BLÖCKE': 'e', 'STEINE': 'e',
'KIES': 'er', 'SAND': 'er', 'SCHLUFF': 'er', 'TON': 'er',
'TORF': 'er', 'HUMUS': 'er', 'ANSCHÜTTUNG': 'e'
};

const SOIL_VISUALS = {
'BLÖCKE':      { color: '#9ca3af', patternId: 'pat-stone',  strokeColor: '#000000' },
'STEINE':      { color: '#b0b6bd', patternId: 'pat-stone',  strokeColor: '#000000' },
'KIES':        { color: '#DBAB06', patternId: 'pat-gravel', strokeColor: '#000000' },
'SAND':        { color: '#C6542F', patternId: 'pat-sand',   strokeColor: '#000000' },
'SCHLUFF':     { color: '#69633E', patternId: 'pat-silt',   strokeColor: '#ffffff' },
'TON':         { color: '#675181', patternId: 'pat-clay',   strokeColor: '#ffffff' },
'TORF':        { color: '#5D4740', patternId: 'pat-peat',   strokeColor: '#ffffff' },
'HUMUS':       { color: '#5D4740', patternId: 'pat-peat',   strokeColor: '#ffffff' },
'ANSCHÜTTUNG': { color: '#e5e7eb', patternId: 'pat-fill',   strokeColor: '#ff0000' }
};
const SECONDARY_TO_MAIN = {
blockig: 'BLÖCKE', steinig: 'STEINE', kiesig: 'KIES', sandig: 'SAND',
schluffig: 'SCHLUFF', tonig: 'TON', humos: 'HUMUS', torfig: 'TORF'
};

const SIZE_OPTIONS = ['fein', 'mittel', 'grob'];
const SIZE_PREFIX = { fein: 'fein', mittel: 'mittel', grob: 'grob' };
const SIZE_MAIN_FAMILIES = ['gravel', 'sand', 'silt'];
const SIZE_SECONDARY_TYPES = ['kiesig', 'sandig', 'schluffig'];
const SIZE_MAIN_NAME = {
gravel: { fein: 'FEINKIES', mittel: 'MITTELKIES', grob: 'GROBKIES' },
sand:   { fein: 'FEINSAND', mittel: 'MITTELSAND', grob: 'GROBSAND' },
silt:   { fein: 'FEINSCHLUFF', mittel: 'MITTELSCHLUFF', grob: 'GROBSCHLUFF' }
};

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
const DRYSTRENGTH_OPTIONS = ['', 'keine bis niedrig', 'hoch bis sehr hoch'];
const PLASTICITY_OPTIONS = ['', 'nicht plastisch', 'gering', 'mittel', 'hoch'];
const GRAINSHAPE_OPTIONS = ['plattig', 'kubisch', 'stängelig'];
const ROUNDNESS_OPTIONS = ['scharfkantig', 'kantig', 'kantengerundet', 'angerundet', 'gerundet', 'gut gerundet'];
const ROUGHNESS_OPTIONS = ['rau', 'glatt'];
const TOOL_OPTIONS = ['', 'RKS', 'Kernbohrung', 'Spülbohrung', 'Bohrstock', 'Bagger', 'Schurf', 'DPH', 'DPSH', 'CPT'];

function emptyMeta() {
return { date: new Date().toISOString().slice(0,10), user: '', project: '', borehole: '', location: '', device: '', note: '' };
}
function defaultBorehole() {
return { id: uid(), meta: emptyMeta(), layers: [defaultLayer(0)] };
}
const state = {
boreholes: [],
activeBoreholeId: '',
meta: emptyMeta(),
ui: { theme: 'dark', view: 'list', activeLayerId: '' },
layers: []
};
function activeBorehole() {
return state.boreholes.find(b => b.id === state.activeBoreholeId) || null;
}
function setActiveBorehole(id) {
const bh = state.boreholes.find(b => b.id === id);
if (!bh) return;
state.activeBoreholeId = id;
state.meta = bh.meta;
state.layers = bh.layers;
}

let selectedHistoryId = '';

/* =========================
   Helpers
========================= */
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
  if (v === null || v === undefined) return '';
  const raw = typeof v === 'string' ? v.trim().replace(',', '.') : v;
  if (raw === '') return '';
  const n = Number(raw);
  return Number.isFinite(n) ? n.toFixed(2) : '';
}

function compactDepth(v) {
  if (v === null || v === undefined) return '';
  const raw = typeof v === 'string' ? v.trim().replace(',', '.') : v;
  if (raw === '') return '';
  const n = Number(raw);
  if (!Number.isFinite(n)) return '';
  if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n));
  if (Math.abs(n * 10 - Math.round(n * 10)) < 1e-9) return n.toFixed(1).replace(/\.0$/, '');
  return n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

function escCsv(v) {
  const s = String(v ?? '');
  if (/[;"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

function downloadText(filename, text, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob(['\uFEFF' + text], { type: mime });
  downloadBlob(filename, blob);
}

/* =========================
   Bodenbeschreibung
========================= */
function getFamilyByMain(main) {
  return MAIN_OPTIONS.find(x => x.value === main)?.family || '';
}

function decorateMain(main, size) {
if (!main) return '';
const fam = getFamilyByMain(main);
if (size && SIZE_MAIN_NAME[fam]) return SIZE_MAIN_NAME[fam][size] || main;
return main;
}

function normalizeSecondary(arr) {
if (!Array.isArray(arr)) return [];
return arr.map(s => {
if (s && typeof s === 'object' && s.type) return { type: s.type, level: s.level || 'mittel', size: s.size || '' };
const str = String(s || '').trim();
let level = 'mittel', type = str;
if (str.startsWith('schwach ')) { level = 'schwach'; type = str.slice(8); }
else if (str.startsWith('stark ')) { level = 'stark'; type = str.slice(6); }
return type ? { type, level, size: '' } : null;
}).filter(Boolean);
}

function secondaryPhrase(layer) {
const ending = MAIN_GENDER[layer.main1] || 'er';
return normalizeSecondary(layer.secondary).filter(s => s.type)
.map(s => `${INTENSITY_PREFIX[s.level] ?? ''}${s.size ? SIZE_PREFIX[s.size] : ''}${s.type}${ending}`);
}

function shortDescription(layer) {
const main1 = decorateMain(layer.main1, layer.main1Size);
const main2 = decorateMain(layer.main2, layer.main2Size);
const base = main2 ? `${main1}/${main2}` : main1;
if (!base) return '';
const adj = secondaryPhrase(layer);
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
    borehole: '',
    main1: '',
    main1Size: '',
    main2: '',
    main2Size: '',
    secondary: [],
    grain: '',
    state: '',
    colors: [],
    organic: '',
    calc: '',
    water: '',
    dryStrength: '',
    plasticity: '',
    grainShape: '',
    roundness: '',
    roughness: '',
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
secondary: normalizeSecondary(layer?.secondary),
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

/* =========================
   Persistenz
========================= */
function saveDraft() {
try {
const data = { boreholes: state.boreholes, activeBoreholeId: state.activeBoreholeId, ui: state.ui };
localStorage.setItem(STORAGE_DRAFT, JSON.stringify(data));
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
if (parsed?.ui) state.ui = { ...state.ui, ...parsed.ui };

if (Array.isArray(parsed?.boreholes) && parsed.boreholes.length) {
state.boreholes = parsed.boreholes.map(b => ({
id: b.id || uid(),
meta: { ...emptyMeta(), ...(b.meta || {}) },
layers: (Array.isArray(b.layers) && b.layers.length ? b.layers : [{}]).map((l, i) => hydrateLayer(l, i))
}));
} else if (parsed?.meta || Array.isArray(parsed?.layers)) {
state.boreholes = [{
id: uid(),
meta: { ...emptyMeta(), ...(parsed.meta || {}) },
layers: (Array.isArray(parsed.layers) && parsed.layers.length ? parsed.layers : [{}]).map((l, i) => hydrateLayer(l, i))
}];
}

if (!state.boreholes.length) state.boreholes = [defaultBorehole()];
if (!state.boreholes.some(b => b.id === parsed?.activeBoreholeId)) state.activeBoreholeId = state.boreholes[0].id;
else state.activeBoreholeId = parsed.activeBoreholeId;
setActiveBorehole(state.activeBoreholeId);
state.ui.view = 'list';
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
  selectedHistoryId = entry.id;
  renderHistoryList();
}

function applyState(snapshot) {
if (!snapshot) return;
if (Array.isArray(snapshot.boreholes) && snapshot.boreholes.length) {
state.boreholes = snapshot.boreholes.map(b => ({
id: b.id || uid(),
meta: { ...emptyMeta(), ...(b.meta || {}) },
layers: (b.layers?.length ? b.layers : [{}]).map((l, i) => hydrateLayer(l, i))
}));
} else {
state.boreholes = [{
id: uid(),
meta: { ...emptyMeta(), ...(snapshot.meta || {}) },
layers: (snapshot.layers?.length ? snapshot.layers : [{}]).map((l, i) => hydrateLayer(l, i))
}];
}
state.activeBoreholeId = state.boreholes[0].id;
setActiveBorehole(state.activeBoreholeId);
state.ui.view = 'list';
renderProtokoll();
renderHistoryList();
saveDraftDebounced();
}

/* =========================
   UI Sync
========================= */
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

function syncMetaAccordionMeta() {
  const el = $('metaAccMeta');
  if (!el) return;
  const parts = [];
  if (state.meta.project) parts.push(state.meta.project);
  if (state.meta.borehole) parts.push(state.meta.borehole);
  if (state.meta.date) parts.push(state.meta.date);
  el.textContent = parts.join(' · ') || 'Projekt, Bohrung, Datum';
}

function applyTheme(theme) {
const next = theme === 'light' ? 'light' : 'dark';
state.ui.theme = next;
document.body.classList.toggle('theme-light', next === 'light');
document.body.classList.toggle('theme-dark', next === 'dark');
document.documentElement.style.background = next === 'light' ? '#f8fafc' : '#111111';
const meta = document.querySelector('meta[name="theme-color"]');
if (meta) meta.setAttribute('content', next === 'light' ? '#f3f4f6' : '#111111');
const logo = $('appLogo');
if (logo) logo.src = next === 'light' ? 'logo_hell.svg' : 'logo.svg';
const sel = $('settings-theme');
if (sel && sel.value !== next) sel.value = next;
}

/* =========================
   Zusammenfassungen
========================= */
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
  if (layer.plasticity) parts.push(`Plastizität: ${layer.plasticity}`);
  if (layer.dryStrength) parts.push(`Trockenfestigkeit: ${layer.dryStrength}`);
  const form = [layer.grainShape, layer.roundness, layer.roughness].filter(Boolean).join(', ');
  if (form) parts.push(`Kornform: ${form}`);
  return parts.join(' · ');
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
  return {
    label: 'Lagerungsdichte / Konsistenz',
    options: [...COARSE_STATE_OPTIONS, ...FINE_STATE_OPTIONS]
  };
}

/* =========================
   HTML Builder
========================= */
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
          <span class="field__label">Kerngewinnung [%] <span class="rangeVal" id="recVal-${h(layer.id)}">${h(layer.recovery || 0)}</span></span>
          <input class="field__input" type="range" min="0" max="100" step="5" data-field="recovery" data-id="${h(layer.id)}" value="${h(layer.recovery || 0)}" oninput="document.getElementById('recVal-${h(layer.id)}').textContent=this.value" />
        </label>
      `}
    </div>
  `;
}

function namingGroupHtml(layer, quick) {
const secList = normalizeSecondary(layer.secondary);
const mainSizeRow = (mainField, sizeField, label) => {
if (!SIZE_MAIN_FAMILIES.includes(getFamilyByMain(layer[mainField]))) return '';
const cur = layer[sizeField] || '';
return `
<div class="choiceBlock">
<div class="choiceLabel">Korngröße ${h(label)}</div>
<div class="chips">
${SIZE_OPTIONS.map(sz => `
<button class="chip ${cur === sz ? 'is-active' : ''}" type="button" data-main-size="${h(sz)}" data-size-field="${h(sizeField)}" data-id="${h(layer.id)}">${h(sz)}</button>
`).join('')}
</div>
</div>
`;
};

return `
<div class="choiceBlock">
<div class="choiceLabel">Hauptanteil</div>
<div class="chips">
${MAIN_OPTIONS.map(x => chipHtml({ layerId: layer.id, field: 'main1', value: x.value, active: layer.main1 === x.value })).join('')}
</div>
</div>

${SIZE_MAIN_FAMILIES.includes(getFamilyByMain(layer.main1)) ? `
<div class="choiceBlock">
<div class="choiceLabel">Korngröße Hauptanteil</div>
<div class="chips">
${SIZE_OPTIONS.map(sz => `
<button class="chip ${(layer.main1Size || '') === sz ? 'is-active' : ''}" type="button" data-main-size="${h(sz)}" data-size-field="main1Size" data-id="${h(layer.id)}">${h(sz)}</button>
`).join('')}
</div>
</div>
` : ''}

${quick ? '' : `
<div class="choiceBlock">
<div class="choiceLabel">2. Hauptanteil optional</div>
<div class="chips">
${MAIN_OPTIONS.map(x => chipHtml({ layerId: layer.id, field: 'main2', value: x.value, active: layer.main2 === x.value, soft: true })).join('')}
</div>
</div>
${mainSizeRow('main2', 'main2Size', '2. Hauptanteil')}
`}

<div class="choiceBlock">
<div class="choiceLabel">Nebenanteil</div>
<div class="chips">
${SECONDARY_OPTIONS.map(v => `
<button class="chip chip--soft ${secList.some(s => s.type === v) ? 'is-active' : ''}" type="button" data-sec-toggle="${h(v)}" data-id="${h(layer.id)}">${h(v)}</button>
`).join('')}
</div>
</div>

${secList.length ? `
<div class="choiceBlock">
<div class="choiceLabel">Intensität</div>
${secList.map(s => `
<div class="secLevelRow">
<span class="secLevelRow__name">${h(s.type)}</span>
<div class="chips">
${INTENSITY_OPTIONS.map(lv => `
<button class="chip ${s.level === lv ? 'is-active' : ''}" type="button" data-sec-level="${h(lv)}" data-sec-type="${h(s.type)}" data-id="${h(layer.id)}">${h(lv)}</button>
`).join('')}
</div>
</div>
`).join('')}
</div>

<div class="choiceBlock">
<div class="choiceLabel">Live-Vorschau</div>
<div class="readonly js-short-desc">${h(shortDescription(layer) || 'Noch keine Benennung')}</div>
</div>
` : ''}

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

      <div class="choiceBlock">
        <div class="choiceLabel">Trockenfestigkeit</div>
        <div class="chips">
          ${DRYSTRENGTH_OPTIONS.filter(Boolean).map(v => chipHtml({
            layerId: layer.id, field: 'dryStrength', value: v, active: layer.dryStrength === v
          })).join('')}
        </div>
      </div>

      <div class="choiceBlock">
        <div class="choiceLabel">Plastizität</div>
        <div class="chips">
          ${PLASTICITY_OPTIONS.filter(Boolean).map(v => chipHtml({
            layerId: layer.id, field: 'plasticity', value: v, active: layer.plasticity === v
          })).join('')}
        </div>
      </div>

      <div class="choiceBlock">
        <div class="choiceLabel">Kornform</div>
        <div class="chips">
          ${GRAINSHAPE_OPTIONS.map(v => chipHtml({
            layerId: layer.id, field: 'grainShape', value: v, active: layer.grainShape === v
          })).join('')}
        </div>
      </div>

      <div class="choiceBlock">
        <div class="choiceLabel">Rundungsgrad</div>
        <div class="chips">
          ${ROUNDNESS_OPTIONS.map(v => chipHtml({
            layerId: layer.id, field: 'roundness', value: v, active: layer.roundness === v, soft: true
          })).join('')}
        </div>
      </div>

      <div class="choiceBlock">
        <div class="choiceLabel">Rauhigkeit</div>
        <div class="chips">
          ${ROUGHNESS_OPTIONS.map(v => chipHtml({
            layerId: layer.id, field: 'roughness', value: v, active: layer.roughness === v
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
        Diese Texte werden direkt für Bericht und Export verwendet.
      </div>
    `}
  `;
}

function layerFullHtml(layer, idx) {
return `
${subAccHtml({ layer, group: 'grpBase', title: '1. Tiefe & Kerndaten', meta: basisSummary(layer), body: baseGroupHtml(layer, false) })}
${subAccHtml({ layer, group: 'grpName', title: '2. Bodenbenennung', meta: namingSummary(layer), body: namingGroupHtml(layer, false) })}
${subAccHtml({ layer, group: 'grpState', title: '3. Zustand & Zusatz', meta: stateSummary(layer), body: stateGroupHtml(layer, false) })}
${subAccHtml({ layer, group: 'grpReport', title: '4. Beschreibung & Notiz', meta: reportSummary(layer), body: reportGroupHtml(layer, false) })}
<div class="layerActions">
<button class="miniBtn" type="button" data-act="dup" data-id="${h(layer.id)}">Duplizieren</button>
<button class="miniBtn" type="button" data-act="del" data-id="${h(layer.id)}">Löschen</button>
</div>
`;
}

function layerCardHtml(layer, idx, isOpen = false) {
  const descShort = shortDescription(layer) || 'Beschreibung wählen';
  const summaryRange = `${fmtDepth(layer.from) || '—'} – ${fmtDepth(layer.to) || '—'} m`;

  return `
    <details class="layerCard" data-id="${h(layer.id)}" ${isOpen ? 'open' : ''}>
      <summary>
        <div class="layerCard__title">
          <span>Schicht ${idx + 1}</span>
          <span class="layerCard__sub js-summary-range">${h(summaryRange)}</span>
          <span class="layerCard__sub js-summary-desc">${h(descShort)}</span>
        </div>
      </summary>

      <div class="layerBody">
        ${subAccHtml({
          layer,
          group: 'grpBase',
          title: '1. Tiefe & Kerndaten',
          meta: basisSummary(layer),
          body: baseGroupHtml(layer, false)
        })}

        ${subAccHtml({
          layer,
          group: 'grpName',
          title: '2. Bodenbenennung',
          meta: namingSummary(layer),
          body: namingGroupHtml(layer, false)
        })}

        ${subAccHtml({
          layer,
          group: 'grpState',
          title: '3. Zustand & Zusatz',
          meta: stateSummary(layer),
          body: stateGroupHtml(layer, false)
        })}

        ${subAccHtml({
          layer,
          group: 'grpReport',
          title: '4. Beschreibung & Notiz',
          meta: reportSummary(layer),
          body: reportGroupHtml(layer, false)
        })}

        <div class="layerActions">
          <button class="miniBtn" type="button" data-act="dup" data-id="${h(layer.id)}">Duplizieren</button>
          <button class="miniBtn" type="button" data-act="del" data-id="${h(layer.id)}">Löschen</button>
        </div>
      </div>
    </details>
  `;
}

function getBoreholeList() {
return String(state.meta.borehole || '').split('\n').map(s => s.trim()).filter(Boolean);
}

function syncBoreholeDropdown() {
const sel = $('meta-borehole-active');
if (!sel) return;
const list = getBoreholeList();
let cur = state.meta.activeBorehole || list[0] || '';
if (!list.includes(cur)) cur = list[0] || '';
state.meta.activeBorehole = cur;
sel.innerHTML = list.length
? list.map(b => `<option value="${h(b)}" ${b === cur ? 'selected' : ''}>${h(b)}</option>`).join('')
: '<option value="">—</option>';
}

/* ===== Aufschluss / Ansichten ===== */
function setView(view, layerId = '') {
state.ui.view = view;
state.ui.activeLayerId = layerId;
document.body.classList.toggle('view-layer', view === 'layer');
document.body.classList.toggle('view-borehole', view === 'borehole');
renderProtokoll();
saveDraftDebounced();
}

function renderProtokoll() {
const list = $('boreholeListView');
const detail = $('boreholeDetailView');
const layerV = $('layerFullView');
if (!list || !detail || !layerV) return;

list.hidden = state.ui.view !== 'list';
detail.hidden = state.ui.view !== 'borehole';
layerV.hidden = state.ui.view !== 'layer';

if (state.ui.view === 'list') renderBoreholeList();
if (state.ui.view === 'borehole') { syncMetaToUi(); syncMetaAccordionMeta(); renderLayers(); }
document.body.classList.toggle('view-borehole', state.ui.view === 'borehole');
if (state.ui.view === 'layer') renderLayerFull();
}

function renderBoreholeList() {
const host = $('boreholeList');
if (!host) return;
host.innerHTML = state.boreholes.map(b => {
const name = b.meta.borehole || 'Neuer Bodenaufschluss';
const sub = [b.meta.project, b.meta.date].filter(Boolean).join(' · ');
return `
<div class="bhItem" data-bh-open="${h(b.id)}">
<div class="bhItem__main">
<div class="bhItem__title">${h(name)}</div>
<div class="bhItem__sub">${h(sub || '—')} · ${b.layers.length} Schicht(en)</div>
</div>
<div class="bhItem__btns">
<button class="miniBtn" type="button" data-bh-copy="${h(b.id)}">Kopieren</button>
<button class="miniBtn" type="button" data-bh-del="${h(b.id)}">Löschen</button>
</div>
</div>
`;
}).join('') || `<div class="text"><p>Noch kein Aufschluss angelegt.</p></div>`;
}

function newBorehole(copyFromId = '') {
const bh = defaultBorehole();
const src = copyFromId ? state.boreholes.find(b => b.id === copyFromId) : null;
if (src) { bh.meta = { ...clone(src.meta), borehole: (src.meta.borehole || '') + ' Kopie' }; }
state.boreholes.push(bh);
setActiveBorehole(bh.id);
setView('borehole');
}

function renderLayerFull() {
const host = $('layerFullBody');
if (!host) return;
const idx = state.layers.findIndex(l => l.id === state.ui.activeLayerId);
if (idx < 0) { setView('borehole'); return; }
const layer = state.layers[idx];
$('layerFullTitle').textContent = `Schicht ${idx + 1}`;
host.innerHTML = layerFullHtml(layer, idx);
}

function renderLayers(openIds = null) {
  const host = $('layerList');
  if (!host) return;

  const opened = Array.isArray(openIds) ? [...openIds] : getOpenIds();
  if (!opened.length && state.layers.length) opened.push(state.layers[state.layers.length - 1].id);

  host.innerHTML = state.layers.map((layer, idx) => {
    const range = `${fmtDepth(layer.from) || '—'} – ${fmtDepth(layer.to) || '—'} m`;
    const desc = shortDescription(layer) || 'Beschreibung wählen';
    return `
<div class="layerRow" data-layer-open="${h(layer.id)}">
<div class="layerRow__main">
<div class="layerRow__title">Schicht ${idx + 1}</div>
<div class="layerRow__sub">${h(range)} · ${h(desc)}</div>
</div>
<span class="layerRow__chev">›</span>
</div>
`;
  }).join('');

  renderBohrprofil();
}

function bohrprofilSecondaryVisual(layer) {
const sec = normalizeSecondary(layer.secondary)[0];
if (!sec) return null;
const key = SECONDARY_TO_MAIN[sec.type];
return key ? SOIL_VISUALS[key] : null;
}

function layerProfileCellSvg(layer, heightPx) {
const main = SOIL_VISUALS[layer.main1] || { color: '#e5e7eb', patternId: '', strokeColor: '#000000' };
const sec = bohrprofilSecondaryVisual(layer);
return `
<svg width="100%" height="${heightPx}" style="display:block">
<rect width="100%" height="100%" fill="${main.color}" />
${main.patternId ? `<rect width="100%" height="100%" fill="url(#${main.patternId})" style="color:${main.strokeColor}" />` : ''}
${sec && sec.patternId ? `
<line x1="50%" y1="0" x2="50%" y2="100%" stroke="${main.strokeColor}" stroke-width="0.8" stroke-dasharray="2,2" />
<rect x="50%" width="50%" height="100%" fill="url(#${sec.patternId})" style="color:${sec.strokeColor}" />
` : ''}
</svg>
`;
}

function renderBohrprofil() {
const host = $('bohrprofilContent');
if (!host) return;
const layers = state.layers.filter(l => l.main1);
if (!layers.length) {
host.innerHTML = `<div class="text"><p>Noch keine Schichten mit Hauptanteil erfasst.</p></div>`;
return;
}
const PX_PER_M = 80;
const MIN_H = 48;
host.innerHTML = `<div class="bp">${layers.map(layer => {
const from = Number(layer.from);
const to = Number(layer.to);
const thick = (Number.isFinite(from) && Number.isFinite(to) && to > from) ? to - from : 0;
const hPx = Math.max(MIN_H, Math.round(thick * PX_PER_M));
const desc = shortDescription(layer) || layer.main1;
return `
<div class="bpRow" style="height:${hPx}px">
<div class="bpDepth">
<span>${h(fmtDepth(layer.from) || '—')}</span>
<span>${h(fmtDepth(layer.to) || '—')}</span>
</div>
<div class="bpCol">${layerProfileCellSvg(layer, hPx)}</div>
<div class="bpDesc">
<span class="bpDesc__name">${h(desc)}</span>
${layer.state ? `<span class="bpDesc__sub">${h(layer.state)}</span>` : ''}
</div>
</div>
`;
}).join('')}</div>`;
}

function refreshLayerComputed(id) {
const layer = getLayer(id);
if (!layer) return;

  const card = document.querySelector(`.layerCard[data-id="${id}"]`) || document.getElementById('layerFullBody');
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

  renderBohrprofil();
}

/* =========================
   Verlauf / Exporte
========================= */
function renderHistoryList() {
  const host = $('historyList');
  if (!host) return;
  const list = readHistory();

  if (!list.length) {
    selectedHistoryId = '';
    host.innerHTML = `<div class="text"><p>Noch keine Dokumentationen gespeichert.</p></div>`;
    return;
  }

  if (selectedHistoryId && !list.some(x => x.id === selectedHistoryId)) {
    selectedHistoryId = '';
  }

  host.innerHTML = list.map(entry => {
    const snap = entry.snapshot || {};
    const project = snap.meta?.project || '—';
    const borehole = snap.meta?.borehole || '—';
    const count = snap.layers?.length || 0;
    const isSelected = selectedHistoryId === entry.id;

    return `
      <div class="historyItem ${isSelected ? 'is-selected' : ''}" data-history-entry="${h(entry.id)}">
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
          <button type="button" data-hact="json" data-id="${h(entry.id)}">JSON</button>
          <button type="button" data-hact="pdf" data-id="${h(entry.id)}">PDF</button>
          <button type="button" data-hact="del" data-id="${h(entry.id)}">Löschen</button>
        </div>
      </div>
    `;
  }).join('');
}

function buildCsv(snapshot = state) {
  const rows = [];
  rows.push([
    'PROJEKT', 'AUFSCHLUSS', 'DATUM', 'BEARBEITER', 'ORT', 'GERAET',
    'SCHICHT_NR', 'VON_M', 'BIS_M', 'MAECHTIGKEIT_M',
    'HAUPTANTEIL', 'HAUPTANTEIL_2', 'NEBENANTEILE', 'KORNGRUPPE',
    'BESCHREIBUNG_NORM', 'ZUSTAND', 'FARBE', 'ORGANIK', 'KALK', 'WASSER',
    'WERKZEUG', 'PROBEN_NR', 'KERNLAUF', 'KERNGEWINNUNG_PROZENT', 'BEMERKUNG'
  ].join(';'));

  (snapshot.layers || []).forEach((layer, i) => {
    const from = Number(layer.from);
    const to = Number(layer.to);
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
      escCsv(decorateMain(layer.main1, layer.main1Size)),
      escCsv(decorateMain(layer.main2, layer.main2Size)),
      escCsv(normalizeSecondary(layer.secondary).map(s => `${INTENSITY_PREFIX[s.level] || ''}${s.size ? SIZE_PREFIX[s.size] : ''}${s.type}`.trim()).join(', ')),
      escCsv([layer.main1Size, layer.main2Size].filter(Boolean).join(', ')),
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
  const name = `${(snapshot.meta?.date || 'datum').replaceAll('-', '')}_Bohrkern.csv`;
  downloadText(name, buildCsv(snapshot), 'text/csv;charset=utf-8');
}

function exportJson(snapshot = state) {
  const name = `${(snapshot.meta?.date || 'datum').replaceAll('-', '')}_Bohrkern.json`;
  downloadText(name, JSON.stringify(snapshot, null, 2), 'application/json;charset=utf-8');
}

function openHtmlReport(snapshot = state) {
  const layersHtml = (snapshot.layers || []).map((layer, idx) => `
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

  const logoSrc = new URL('logo.svg', window.location.href).href;
  const w = window.open('', '_blank');
  if (!w) {
    alert('Popup blockiert – bitte Popups erlauben.');
    return;
  }

  w.document.open();
  w.document.write(`<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<title>Bohrkernaufnahme Bericht</title>
<style>
body{font-family:Arial,sans-serif;background:#fff;color:#111;margin:0;padding:20px}
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
      <img src="${logoSrc}" style="width:100%;display:block" alt="Logo"/>
    </div>
    <div>
      <div class="title">Bohrkernaufnahme</div>
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
        <th>Schicht</th><th>Von [m]</th><th>Bis [m]</th>
        <th>Beschreibung nach Norm</th><th>Werkzeug</th><th>Probe</th>
        <th>Kernlauf</th><th>Kerngew. [%]</th><th>Bemerkung</th>
      </tr>
    </thead>
    <tbody>
      ${layersHtml || '<tr><td colspan="9">Keine Schichten vorhanden.</td></tr>'}
    </tbody>
  </table>
</body>
</html>`);
  w.document.close();
}

/* =========================
   Events
========================= */
function initTabs() {
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(b => b.classList.toggle('is-active', b === btn));

      document.querySelectorAll('.pane').forEach(p => {
        const on = p.id === `tab-${btn.dataset.tab}`;
        p.classList.toggle('is-active', on);
        p.hidden = !on;
      });

      if (btn.dataset.tab === 'verlauf') {
        renderHistoryList();
      }

      if (btn.dataset.tab === 'bohrprofil') {
        renderBohrprofil();
      }
    });
  });
}

function hookMetaEvents() {
  ['meta-date', 'meta-user', 'meta-project', 'meta-borehole', 'meta-location', 'meta-device', 'meta-note'].forEach(id => {
    $(id)?.addEventListener('input', () => {
      collectMetaFromUi();
      syncMetaAccordionMeta();
      saveDraftDebounced();
    });

    $(id)?.addEventListener('change', () => {
      collectMetaFromUi();
      syncMetaAccordionMeta();
      saveDraftDebounced();
    });
  });
}

function hookLayerEvents() {
$('boreholeList')?.addEventListener('click', (e) => {
const open = e.target.closest('[data-bh-open]');
const copy = e.target.closest('[data-bh-copy]');
const del  = e.target.closest('[data-bh-del]');
if (copy) { newBorehole(copy.dataset.bhCopy); return; }
if (del) {
const id = del.dataset.bhDel;
if (!confirm('Aufschluss wirklich löschen?')) return;
state.boreholes = state.boreholes.filter(b => b.id !== id);
if (!state.boreholes.length) state.boreholes = [defaultBorehole()];
if (state.activeBoreholeId === id) setActiveBorehole(state.boreholes[0].id);
renderBoreholeList();
saveDraftDebounced();
return;
}
if (open) { setActiveBorehole(open.dataset.bhOpen); setView('borehole'); }
});

$('layerList')?.addEventListener('click', (e) => {
const row = e.target.closest('[data-layer-open]');
if (row) setView('layer', row.dataset.layerOpen);
});

const hosts = [$('layerList'), $('layerFullBody')].filter(Boolean);
hosts.forEach(host => bindLayerHost(host));
}

function rerenderActiveLayer() {
if (state.ui.view === 'layer') renderLayerFull();
else renderLayers(getOpenIds());
}

function bindLayerHost(host) {
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
    const secToggle = e.target.closest('[data-sec-toggle]');
    if (secToggle) {
      const layer = getLayer(secToggle.dataset.id);
      if (!layer) return;
      const type = secToggle.dataset.secToggle;
      const list = normalizeSecondary(layer.secondary);
      const idx = list.findIndex(s => s.type === type);
      if (idx >= 0) list.splice(idx, 1);
      else list.push({ type, level: 'mittel' });
      layer.secondary = list;
      rerenderActiveLayer();
      saveDraftDebounced();
      return;
    }

    const secLevel = e.target.closest('[data-sec-level]');
    if (secLevel) {
      const layer = getLayer(secLevel.dataset.id);
      if (!layer) return;
      const list = normalizeSecondary(layer.secondary);
      const item = list.find(s => s.type === secLevel.dataset.secType);
      if (item) item.level = secLevel.dataset.secLevel;
      layer.secondary = list;
      rerenderActiveLayer();
      saveDraftDebounced();
      return;
    }

    const mainSize = e.target.closest('[data-main-size]');
    if (mainSize) {
      const layer = getLayer(mainSize.dataset.id);
      if (!layer) return;
      const f = mainSize.dataset.sizeField;
      const v = mainSize.dataset.mainSize;
      layer[f] = layer[f] === v ? '' : v;
      rerenderActiveLayer();
      saveDraftDebounced();
      return;
    }

    const secSize = e.target.closest('[data-sec-size]');
    if (secSize) {
      const layer = getLayer(secSize.dataset.id);
      if (!layer) return;
      const list = normalizeSecondary(layer.secondary);
      const item = list.find(s => s.type === secSize.dataset.secType);
      if (item) item.size = item.size === secSize.dataset.secSize ? '' : secSize.dataset.secSize;
      layer.secondary = list;
      rerenderActiveLayer();
      saveDraftDebounced();
      return;
    }

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
        if (!SIZE_MAIN_FAMILIES.includes(getFamilyByMain(layer.main1))) layer.main1Size = '';
      }
      if (field === 'main2' && !SIZE_MAIN_FAMILIES.includes(getFamilyByMain(layer.main2))) {
        layer.main2Size = '';
      }

      rerenderActiveLayer();
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
    if (inp.dataset.field === 'borehole') {
      const openIds = getOpenIds();
      if (!openIds.includes(layer.id)) openIds.push(layer.id);
      renderLayers(openIds);
    } else {
      refreshLayerComputed(inp.dataset.id);
    }
    saveDraftDebounced();
  });
}

function hookHistoryEvents() {
  $('historyList')?.addEventListener('click', (e) => {
    const btn  = e.target.closest('[data-hact]');
    const card = e.target.closest('[data-history-entry]');
    const list = readHistory();

    if (btn) {
      const id  = btn.dataset.id;
      const act = btn.dataset.hact;
      const entry = list.find(x => x.id === id);

      if (act === 'del') {
        writeHistory(list.filter(x => x.id !== id));
        if (selectedHistoryId === id) selectedHistoryId = '';
        renderHistoryList();
        return;
      }

      if (!entry) return;

      if (act === 'load') {
        applyState(entry.snapshot);
        document.querySelector('.tab[data-tab="doku"]')?.click();
      }

      if (act === 'csv') exportCsv(entry.snapshot);
      if (act === 'json') exportJson(entry.snapshot);
      if (act === 'pdf') openHtmlReport(entry.snapshot);
      return;
    }

    if (card) {
      selectedHistoryId = card.dataset.historyEntry;
      renderHistoryList();
    }
  });
}

function resetAll() {
if (!confirm('Wirklich alles zurücksetzen? Alle aktuellen Eingaben gehen unwiderruflich verloren.')) return;
const bh = defaultBorehole();
state.boreholes = [bh];
state.activeBoreholeId = bh.id;
setActiveBorehole(bh.id);
syncMetaToUi();
syncMetaAccordionMeta();
syncBoreholeDropdown();
setView('list');
saveDraftDebounced();
}

/* =========================
   Init
========================= */
window.addEventListener('DOMContentLoaded', () => {
  state.boreholes = [defaultBorehole()];
  state.activeBoreholeId = state.boreholes[0].id;
  setActiveBorehole(state.activeBoreholeId);

  loadDraft();

  initTabs();
  applyTheme(state.ui.theme);
  renderProtokoll();
  renderHistoryList();

  hookMetaEvents();
  hookLayerEvents();
  hookHistoryEvents();

  $('settings-theme')?.addEventListener('change', () => {
    applyTheme($('settings-theme')?.value || 'dark');
    saveDraftDebounced();
  });

  $('btnNewBorehole')?.addEventListener('click', () => newBorehole());
  $('btnBackToList')?.addEventListener('click', () => setView('list'));
  $('btnBackFromLayer')?.addEventListener('click', () => setView('borehole'));
  $('btnCopyBorehole')?.addEventListener('click', () => newBorehole(state.activeBoreholeId));

  $('meta-borehole')?.addEventListener('input', () => {
    syncBoreholeDropdown();
    renderLayers(getOpenIds());
  });

  $('meta-borehole-active')?.addEventListener('change', () => {
    state.meta.activeBorehole = $('meta-borehole-active')?.value || '';
    saveDraftDebounced();
  });

  $('btnReset')?.addEventListener('click', resetAll);

  $('btnAddLayer')?.addEventListener('click', () => {
    const lastTo = state.layers.length ? state.layers[state.layers.length - 1].to : 0;
    const next = defaultLayer(Number(lastTo || 0));
    next.from = fmtDepth(lastTo || 0);
    next.to   = fmtDepth(Number(lastTo || 0) + 1);
    next.borehole = state.meta.activeBorehole || '';
    state.layers.push(next);
    saveDraftDebounced();
    setView('layer', next.id);
  });

  $('btnSave')?.addEventListener('click', () => {
    collectMetaFromUi();
    syncMetaAccordionMeta();
    saveCurrentToHistory();
    saveDraftDebounced();
    alert('Dokumentation im Verlauf gespeichert.');
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const swUrl = new URL('sw.js?v=159', window.location.href);
      navigator.serviceWorker.register(swUrl.href).catch((err) => {
        console.error('SW registration failed:', err);
      });
    });
  }
});
