'use strict';

console.log('Bohrkernaufnahme v141 loaded');

const STORAGE_DRAFT = 'bohrkern-draft-v141';
const STORAGE_HISTORY = 'bohrkern-history-v141';
const STORAGE_PHOTO_META = 'bohrkern-photo-meta-v141';
const HISTORY_MAX = 40;

const PHOTO_DB_NAME = 'bohrkern-photo-db-v141';
const PHOTO_DB_STORE = 'files';
const PHOTO_MAX_EDGE = 1600;
const PHOTO_QUALITY = 0.78;

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

const photoDraft = {
  endDepth: '',
  selectedBox: '',
  boxFrom: null,
  boxTo: null,
  entries: []
};

let selectedHistoryId = '';
let currentBoxSavedItems = [];
let viewerItems = [];
let lightboxItems = [];
let lightboxIndex = 0;

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

function formatBytes(bytes) {
  const b = Number(bytes || 0);
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}

function revokeItemUrls(items) {
  (items || []).forEach(item => {
    try { URL.revokeObjectURL(item.url); } catch {}
  });
}

function clearCurrentBoxSavedItems() {
  revokeItemUrls(currentBoxSavedItems);
  currentBoxSavedItems = [];
}

function clearViewerItems() {
  revokeItemUrls(viewerItems);
  viewerItems = [];
}

/* =========================
   Bodenbeschreibung
========================= */
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

/* =========================
   Persistenz
========================= */
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
  selectedHistoryId = entry.id;
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
  syncMetaAccordionMeta();
  syncQuickModeUi();
  renderLayers();
  renderHistoryList();
  syncPhotoPanel(true);
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
        Diese Texte werden direkt für Bericht und Export verwendet.
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
      ${layersHtml || '<tr><td colspan="9">Keine Schichten vorhanden.</td></tr>'}
    </tbody>
  </table>
</body>
</html>`);
  w.document.close();
}

/* =========================
   Photo Storage
========================= */
function readPhotoMeta() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_PHOTO_META) || '[]');
  } catch {
    return [];
  }
}

function writePhotoMeta(list) {
  try {
    localStorage.setItem(STORAGE_PHOTO_META, JSON.stringify(list));
  } catch {}
}

function openPhotoDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(PHOTO_DB_NAME, 1);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(PHOTO_DB_STORE)) {
        const store = db.createObjectStore(PHOTO_DB_STORE, { keyPath: 'id' });
        store.createIndex('docId', 'docId', { unique: false });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function putPhotoFiles(docId, items) {
  const db = await openPhotoDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PHOTO_DB_STORE, 'readwrite');
    const store = tx.objectStore(PHOTO_DB_STORE);

    items.forEach(item => {
      store.put({
        id: item.id,
        docId,
        name: item.name,
        type: item.blob.type,
        size: item.blob.size,
        blob: item.blob,
        createdAt: Date.now()
      });
    });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getPhotoFiles(docId) {
  const db = await openPhotoDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PHOTO_DB_STORE, 'readonly');
    const store = tx.objectStore(PHOTO_DB_STORE);
    const idx = store.index('docId');
    const req = idx.getAll(docId);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function deletePhotoFiles(docId) {
  const db = await openPhotoDb();
  const files = await getPhotoFiles(docId);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PHOTO_DB_STORE, 'readwrite');
    const store = tx.objectStore(PHOTO_DB_STORE);
    files.forEach(f => store.delete(f.id));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function sanitizeName(s) {
  return String(s || '')
    .trim()
    .replace(/[^\w\-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '') || 'foto';
}

function getMaxEndDepth() {
  const vals = state.layers.map(l => Number(l.to)).filter(n => Number.isFinite(n));
  return vals.length ? Math.max(...vals) : 0;
}

function generateCoreBoxes(endDepth, borehole) {
  const end = Number(endDepth);
  if (!Number.isFinite(end) || end <= 0 || !String(borehole || '').trim()) return [];

  const boxes = [];
  let from = 0;
  while (from < end - 1e-9) {
    const to = Math.min(from + 2, end);
    const label = `${String(borehole).trim()}_${compactDepth(from)}-${compactDepth(to)}m`;
    boxes.push({ from, to, label });
    from = to;
  }
  return boxes;
}

function getUsedBoxLabels(borehole) {
  return new Set(
    readPhotoMeta()
      .filter(x => String(x.borehole || '') === String(borehole || ''))
      .map(x => x.boxLabel)
  );
}

function getSuggestedBox(boxes, borehole) {
  const used = getUsedBoxLabels(borehole);
  return boxes.find(b => !used.has(b.label)) || boxes[0] || null;
}

function getDraftEntry(label) {
  return photoDraft.entries.find(e => e.boxLabel === label);
}

function ensureDraftEntry(box) {
  let entry = getDraftEntry(box.label);
  if (!entry) {
    entry = {
      boxLabel: box.label,
      boxFrom: box.from,
      boxTo: box.to,
      note: '',
      files: []
    };
    photoDraft.entries.push(entry);
  } else {
    entry.boxFrom = box.from;
    entry.boxTo = box.to;
  }
  return entry;
}

function getCurrentDraftEntry() {
  return getDraftEntry(photoDraft.selectedBox);
}

function setSelectedPhotoBox(box) {
  if (!box) {
    photoDraft.selectedBox = '';
    photoDraft.boxFrom = null;
    photoDraft.boxTo = null;
    return;
  }
  photoDraft.selectedBox = box.label;
  photoDraft.boxFrom = box.from;
  photoDraft.boxTo = box.to;
}

/* =========================
   Photo Viewer / Lightbox
========================= */
function openLightbox(items, index = 0) {
  if (!items.length) return;
  lightboxItems = items;
  lightboxIndex = Math.max(0, Math.min(index, items.length - 1));
  updateLightbox();
  $('photoLightbox').hidden = false;
}

function updateLightbox() {
  if (!lightboxItems.length) return;
  const current = lightboxItems[lightboxIndex];
  $('lightboxImg').src = current.url;
  $('lightboxImg').alt = current.name || '';
  $('lightboxCounter').textContent = `${lightboxIndex + 1} / ${lightboxItems.length}`;
}

function closeLightbox() {
  $('photoLightbox').hidden = true;
  $('lightboxImg').src = '';
  lightboxItems = [];
  lightboxIndex = 0;
}

function prevLightbox() {
  if (!lightboxItems.length) return;
  lightboxIndex = (lightboxIndex - 1 + lightboxItems.length) % lightboxItems.length;
  updateLightbox();
}

function nextLightbox() {
  if (!lightboxItems.length) return;
  lightboxIndex = (lightboxIndex + 1) % lightboxItems.length;
  updateLightbox();
}

async function openPhotoViewer(docId) {
  const docs = readPhotoMeta();
  const entry = docs.find(d => d.id === docId);
  if (!entry) return;

  clearViewerItems();

  const files = await getPhotoFiles(docId);
  files.sort((a, b) => String(a.name).localeCompare(String(b.name), 'de'));

  viewerItems = files.map(file => ({
    url: URL.createObjectURL(file.blob),
    name: file.name
  }));

  $('photoViewerTitle').textContent = `${entry.boxLabel} · ${compactDepth(entry.boxFrom)}–${compactDepth(entry.boxTo)} m`;
  $('photoViewerGrid').innerHTML = viewerItems.length
    ? viewerItems.map((item, idx) => `
        <div class="photo-modal__item" data-viewer-photo="${idx}">
          <img src="${item.url}" alt="${h(item.name)}">
          <span>${h(item.name)}</span>
        </div>
      `).join('')
    : `<div class="text"><p>Keine Fotos vorhanden.</p></div>`;

  $('photoViewerModal').hidden = false;
}

function closePhotoViewer() {
  $('photoViewerModal').hidden = true;
  $('photoViewerGrid').innerHTML = '';
  $('photoViewerTitle').textContent = '';
  clearViewerItems();
}

/* =========================
   Fotodoku UI
========================= */
function renderPhotoSelectedBox() {
  const el = $('photoSelectedBox');
  if (!el) return;

  if (!photoDraft.selectedBox) {
    el.innerHTML = 'Noch keine Kernkiste gewählt.';
    return;
  }

  const entry = getCurrentDraftEntry();
  el.innerHTML = `
    <b>Ausgewählte Kernkiste:</b> ${h(photoDraft.selectedBox)}<br>
    <b>Tiefenbereich:</b> ${h(compactDepth(photoDraft.boxFrom))} – ${h(compactDepth(photoDraft.boxTo))} m<br>
    <b>Ungespeicherte Fotos dieser Kiste:</b> ${entry?.files?.length || 0}
  `;
}

function renderPhotoPreviews() {
  const host = $('photoPreviewList');
  if (!host) return;

  const entry = getCurrentDraftEntry();
  const files = entry?.files || [];

  if (!files.length) {
    host.innerHTML = `<div class="text"><p>Für die aktuell gewählte Kernkiste sind noch keine neuen Fotos ausgewählt.</p></div>`;
    return;
  }

  host.innerHTML = files.map((item, idx) => `
    <div class="photoPreviewItem">
      <img src="${item.url}" alt="${h(item.name)}">
      <div class="photoPreviewMeta">
        <b>${h(item.name)}</b>
        <span>${h(formatBytes(item.size))}</span>
      </div>
      <div class="photoPreviewActions">
        <button class="photoMiniDel" type="button" data-photo-remove="${idx}">Entfernen</button>
      </div>
    </div>
  `).join('');
}

async function renderCurrentBoxExistingPhotos() {
  const host = $('photoExistingList');
  if (!host) return;

  clearCurrentBoxSavedItems();

  const borehole = String(($('photo-borehole')?.value || state.meta.borehole || '')).trim();
  const label = photoDraft.selectedBox;

  if (!borehole || !label) {
    host.innerHTML = '';
    return;
  }

  const docs = readPhotoMeta();
  const entry = docs.find(d => d.borehole === borehole && d.boxLabel === label);

  if (!entry) {
    host.innerHTML = `
      <div class="photoExistingWrap">
        <div class="section-title">Gespeicherte Fotos dieser Kernkiste</div>
        <div class="text"><p>Für diese Kernkiste sind noch keine gespeicherten Fotos vorhanden.</p></div>
      </div>
    `;
    return;
  }

  const files = await getPhotoFiles(entry.id);
  files.sort((a, b) => String(a.name).localeCompare(String(b.name), 'de'));

  currentBoxSavedItems = files.map(file => ({
    url: URL.createObjectURL(file.blob),
    name: file.name
  }));

  host.innerHTML = `
    <div class="photoExistingWrap">
      <div class="section-title">Gespeicherte Fotos dieser Kernkiste</div>
      <div class="photoExistingGrid">
        ${currentBoxSavedItems.map((item, idx) => `
          <div class="photoExistingItem" data-current-photo="${idx}">
            <img src="${item.url}" alt="${h(item.name)}">
            <span>${h(item.name)}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderPhotoBoxes() {
  const host = $('photoBoxList');
  if (!host) return;

  const borehole = String(($('photo-borehole')?.value || state.meta.borehole || '')).trim();
  const rawEnd = String(photoDraft.endDepth ?? $('photo-end-depth')?.value ?? '').trim().replace(',', '.');
  const endDepth = rawEnd === '' ? NaN : Number(rawEnd);

  const endInput = $('photo-end-depth');
  if (endInput && document.activeElement !== endInput) {
    endInput.value = photoDraft.endDepth || '';
  }

  const boxes = generateCoreBoxes(endDepth, borehole);

  if (!boxes.length) {
    host.innerHTML = `<div class="text"><p>Bitte Aufschluss und Kernende eingeben.</p></div>`;
    setSelectedPhotoBox(null);
    if ($('photo-note') && document.activeElement !== $('photo-note')) $('photo-note').value = '';
    renderPhotoSelectedBox();
    renderPhotoPreviews();
    clearCurrentBoxSavedItems();
    $('photoExistingList').innerHTML = '';
    return;
  }

  const used = getUsedBoxLabels(borehole);
  const drafted = new Set(photoDraft.entries.filter(e => e.files.length > 0 || e.note).map(e => e.boxLabel));

  if (!boxes.find(b => b.label === photoDraft.selectedBox)) {
    setSelectedPhotoBox(getSuggestedBox(boxes, borehole));
  }

  host.innerHTML = boxes.map(box => {
    const markers = `${drafted.has(box.label) ? ' •' : ''}${used.has(box.label) ? ' ✓' : ''}`;
    return `
      <button
        class="photoBoxBtn ${used.has(box.label) ? 'is-used' : ''} ${photoDraft.selectedBox === box.label ? 'is-active' : ''}"
        type="button"
        data-photo-box="${h(box.label)}"
        data-from="${h(box.from)}"
        data-to="${h(box.to)}"
      >
        ${h(box.label)}${markers}
      </button>
    `;
  }).join('');

  const noteInput = $('photo-note');
  const currentEntry = getCurrentDraftEntry();
  if (noteInput && document.activeElement !== noteInput) {
    noteInput.value = currentEntry?.note || '';
  }

  renderPhotoSelectedBox();
  renderPhotoPreviews();
  void renderCurrentBoxExistingPhotos();
}

function getCurrentBoxList() {
  const borehole = String(($('photo-borehole')?.value || state.meta.borehole || '')).trim();
  const rawEnd = String(photoDraft.endDepth ?? $('photo-end-depth')?.value ?? '').trim().replace(',', '.');
  const endDepth = rawEnd === '' ? NaN : Number(rawEnd);
  return generateCoreBoxes(endDepth, borehole);
}

function autoAdvancePhotoBox() {
  const boxes = getCurrentBoxList();
  if (!boxes.length || !photoDraft.selectedBox) {
    renderPhotoBoxes();
    return;
  }

  const idx = boxes.findIndex(b => b.label === photoDraft.selectedBox);
  if (idx >= 0 && idx < boxes.length - 1) {
    setSelectedPhotoBox(boxes[idx + 1]);
  }
  renderPhotoBoxes();
}

function syncPhotoPanel(forceDepth = false) {
  const projectInput = $('photo-project');
  const boreholeInput = $('photo-borehole');
  const depthInput = $('photo-end-depth');
  const noteInput = $('photo-note');
  const maxDepth = getMaxEndDepth();

  if (projectInput && document.activeElement !== projectInput) {
    projectInput.value = state.meta.project || '';
  }

  if (boreholeInput && document.activeElement !== boreholeInput) {
    boreholeInput.value = state.meta.borehole || '';
  }

  if (forceDepth && !String(photoDraft.endDepth || '').trim()) {
    photoDraft.endDepth = maxDepth > 0 ? compactDepth(maxDepth) : '';
  }

  if (depthInput && document.activeElement !== depthInput) {
    depthInput.value = photoDraft.endDepth || '';
  }

  if (noteInput && document.activeElement !== noteInput) {
    noteInput.value = getCurrentDraftEntry()?.note || '';
  }

  renderPhotoBoxes();
}

function clearAllDraftPhotoFiles() {
  photoDraft.entries.forEach(entry => {
    (entry.files || []).forEach(item => {
      try { URL.revokeObjectURL(item.url); } catch {}
    });
  });
}

function clearPhotoDraft(keepSelection = true) {
  clearAllDraftPhotoFiles();
  photoDraft.entries = [];
  if (!keepSelection) {
    setSelectedPhotoBox(null);
  }
  if ($('photo-note')) $('photo-note').value = '';
  if ($('photo-files')) $('photo-files').value = '';
  renderPhotoBoxes();
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

async function compressImageFile(file, prefix, order) {
  const img = await loadImage(file);
  const w = img.naturalWidth || img.width;
  const hgt = img.naturalHeight || img.height;
  const scale = Math.min(1, PHOTO_MAX_EDGE / Math.max(w, hgt));
  const tw = Math.max(1, Math.round(w * scale));
  const th = Math.max(1, Math.round(hgt * scale));

  const canvas = document.createElement('canvas');
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, tw, th);

  const blob = await new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b || file), 'image/jpeg', PHOTO_QUALITY);
  });

  const safePrefix = sanitizeName(prefix);
  return {
    id: uid(),
    name: `${safePrefix}_${String(order).padStart(2, '0')}.jpg`,
    blob,
    size: blob.size,
    url: URL.createObjectURL(blob)
  };
}

async function handlePhotoFiles(files) {
  if (!photoDraft.selectedBox) {
    alert('Bitte zuerst eine Kernkiste wählen.');
    return;
  }

  const currentBox = {
    label: photoDraft.selectedBox,
    from: photoDraft.boxFrom,
    to: photoDraft.boxTo
  };

  const entry = ensureDraftEntry(currentBox);
  const startOrder = entry.files.length + 1;

  for (let i = 0; i < files.length; i++) {
    const item = await compressImageFile(files[i], currentBox.label, startOrder + i);
    entry.files.push(item);
  }

  renderPhotoBoxes();
  autoAdvancePhotoBox();
}

async function savePhotoDoc() {
  collectMetaFromUi();

  const project = String($('photo-project')?.value || state.meta.project || '').trim();
  const borehole = String($('photo-borehole')?.value || state.meta.borehole || '').trim();

  state.meta.project = project;
  state.meta.borehole = borehole;

  if ($('meta-project')) $('meta-project').value = project;
  if ($('meta-borehole')) $('meta-borehole').value = borehole;
  syncMetaAccordionMeta();

  const entriesToSave = photoDraft.entries.filter(e => Array.isArray(e.files) && e.files.length);

  if (!borehole) {
    alert('Bitte zuerst eine Aufschlussbezeichnung eingeben.');
    return;
  }

  if (!entriesToSave.length) {
    alert('Es sind keine neuen Fotos zum Speichern vorhanden.');
    return;
  }

  let docs = readPhotoMeta();

  for (const draftEntry of entriesToSave) {
    const existing = docs.find(d => d.borehole === borehole && d.boxLabel === draftEntry.boxLabel);

    if (existing) {
      await putPhotoFiles(existing.id, draftEntry.files);
      existing.fileCount = Number(existing.fileCount || 0) + draftEntry.files.length;
      if (draftEntry.note) {
        existing.note = existing.note
          ? `${existing.note} | ${draftEntry.note}`
          : draftEntry.note;
      }
      existing.updatedAt = Date.now();
    } else {
      const docId = uid();
      const title = `${project || '—'} · ${borehole || '—'}`;
      const newEntry = {
        id: docId,
        title,
        project,
        borehole,
        boxLabel: draftEntry.boxLabel,
        boxFrom: draftEntry.boxFrom,
        boxTo: draftEntry.boxTo,
        createdAt: Date.now(),
        note: draftEntry.note || '',
        fileCount: draftEntry.files.length
      };

      await putPhotoFiles(docId, draftEntry.files);
      docs.unshift(newEntry);
    }
  }

  writePhotoMeta(docs);
  clearPhotoDraft(true);
  renderPhotoHistoryLists();
  renderPhotoBoxes();
  saveDraftDebounced();
  alert('Fotodoku gespeichert.');
}

async function downloadPhotoZip(docId) {
  const docs = readPhotoMeta();
  const entry = docs.find(d => d.id === docId);
  if (!entry) return;

  if (!window.JSZip) {
    alert('ZIP-Library noch nicht geladen. Bitte kurz warten und erneut versuchen.');
    return;
  }

  const files = await getPhotoFiles(docId);
  const zip = new window.JSZip();
  const folder = zip.folder(entry.boxLabel);

  files.sort((a, b) => String(a.name).localeCompare(String(b.name), 'de'));
  files.forEach(file => {
    folder.file(file.name, file.blob);
  });

  folder.file('meta.json', JSON.stringify({
    title: entry.title,
    project: entry.project,
    borehole: entry.borehole,
    boxLabel: entry.boxLabel,
    boxFrom: entry.boxFrom,
    boxTo: entry.boxTo,
    createdAt: new Date(entry.createdAt).toISOString(),
    updatedAt: entry.updatedAt ? new Date(entry.updatedAt).toISOString() : null,
    note: entry.note,
    fileCount: entry.fileCount
  }, null, 2));

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  downloadBlob(`${entry.boxLabel}.zip`, blob);
}

async function deletePhotoDoc(docId) {
  const docs = readPhotoMeta();
  const entry = docs.find(d => d.id === docId);
  if (!entry) return;
  if (!confirm(`Fotodoku ${entry.boxLabel} wirklich löschen?`)) return;

  await deletePhotoFiles(docId);
  writePhotoMeta(docs.filter(d => d.id !== docId));
  renderPhotoHistoryLists();
  renderPhotoBoxes();
}

function renderPhotoHistoryInto(host) {
  if (!host) return;
  const docs = readPhotoMeta();

  if (!docs.length) {
    host.innerHTML = `<div class="text"><p>Noch keine Fotodoku gespeichert.</p></div>`;
    return;
  }

  host.innerHTML = docs.map(entry => `
    <div class="photoHistoryItem" data-photo-doc="${h(entry.id)}">
      <div class="photoHistoryTop">
        <span>${h(entry.title)}</span>
        <span style="color:var(--muted);font-size:.82em">${h(new Date(entry.updatedAt || entry.createdAt).toLocaleString('de-DE'))}</span>
      </div>
      <div class="photoHistorySub">
        Kernkiste: <b>${h(entry.boxLabel)}</b> ·
        Bereich: <b>${h(compactDepth(entry.boxFrom))}–${h(compactDepth(entry.boxTo))} m</b> ·
        Fotos: <b>${h(entry.fileCount)}</b>
        ${entry.note ? `<br>Notiz: <b>${h(entry.note)}</b>` : ''}
      </div>
      <div class="photoHistoryBtns">
        <button type="button" data-phact="zip" data-id="${h(entry.id)}">ZIP</button>
        <button type="button" data-phact="del" data-id="${h(entry.id)}">Löschen</button>
      </div>
    </div>
  `).join('');
}

function renderPhotoHistoryLists() {
  renderPhotoHistoryInto($('photoHistoryList'));
  renderPhotoHistoryInto($('photoHistoryListMirror'));
}

/* =========================
   Events
========================= */
function syncPhotoFloatVisibility() {
  const btn = $('btnPhotoFloat');
  if (!btn) return;
  const isPhotoOpen = $('tab-photo')?.classList.contains('is-active');
  btn.classList.toggle('is-hidden', !!isPhotoOpen);
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

      if (btn.dataset.tab === 'verlauf') {
        renderHistoryList();
        renderPhotoHistoryLists();
      }

      if (btn.dataset.tab === 'photo') {
        syncPhotoPanel(true);
        renderPhotoHistoryLists();
      }

      syncPhotoFloatVisibility();
    });
  });
}

function hookMetaEvents() {
  ['meta-date', 'meta-user', 'meta-project', 'meta-borehole', 'meta-location', 'meta-device', 'meta-note'].forEach(id => {
    $(id)?.addEventListener('input', () => {
      collectMetaFromUi();
      syncMetaAccordionMeta();
      saveDraftDebounced();
      syncPhotoPanel();
    });

    $(id)?.addEventListener('change', () => {
      collectMetaFromUi();
      syncMetaAccordionMeta();
      saveDraftDebounced();
      syncPhotoPanel();
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
      syncPhotoPanel();
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
      syncPhotoPanel(true);
      saveDraftDebounced();
      return;
    }

    if (act.dataset.act === 'dup') {
      const copy = hydrateLayer(clone(layer), state.layers.length);
      copy.id = uid();
      state.layers.splice(state.layers.findIndex(x => x.id === id) + 1, 0, copy);
      renderLayers([copy.id]);
      syncPhotoPanel(true);
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
    syncPhotoPanel();
    saveDraftDebounced();
  });

  host.addEventListener('change', (e) => {
    const inp = e.target.closest('[data-field]');
    if (!inp) return;
    const layer = getLayer(inp.dataset.id);
    if (!layer) return;
    layer[inp.dataset.field] = inp.value;
    refreshLayerComputed(inp.dataset.id);
    syncPhotoPanel();
    saveDraftDebounced();
  });
}

function hookHistoryEvents() {
  $('historyList')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-hact]');
    const card = e.target.closest('[data-history-entry]');
    const list = readHistory();

    if (btn) {
      const id = btn.dataset.id;
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

function hookPhotoEvents() {
  $('btnPhotoFloat')?.addEventListener('click', () => {
    document.querySelector('.tab[data-tab="photo"]')?.click();
  });

  $('btnTakePhoto')?.addEventListener('click', () => {
    $('photo-files')?.click();
  });

  $('photo-project')?.addEventListener('input', () => {
    state.meta.project = $('photo-project')?.value || '';
    if ($('meta-project')) $('meta-project').value = state.meta.project;
    syncMetaAccordionMeta();
    saveDraftDebounced();
  });

  $('photo-borehole')?.addEventListener('input', () => {
    state.meta.borehole = $('photo-borehole')?.value || '';
    if ($('meta-borehole')) $('meta-borehole').value = state.meta.borehole;
    syncMetaAccordionMeta();
    renderPhotoBoxes();
    saveDraftDebounced();
  });

  $('btnGenerateBoxes')?.addEventListener('click', () => {
    photoDraft.endDepth = $('photo-end-depth')?.value || '';
    renderPhotoBoxes();
  });

  $('photo-end-depth')?.addEventListener('input', () => {
    photoDraft.endDepth = $('photo-end-depth')?.value || '';
  });

  $('photo-end-depth')?.addEventListener('change', () => {
    photoDraft.endDepth = $('photo-end-depth')?.value || '';
    renderPhotoBoxes();
  });

  $('photo-note')?.addEventListener('input', () => {
    if (!photoDraft.selectedBox) return;
    const entry = ensureDraftEntry({
      label: photoDraft.selectedBox,
      from: photoDraft.boxFrom,
      to: photoDraft.boxTo
    });
    entry.note = $('photo-note')?.value || '';
    renderPhotoBoxes();
  });

  $('photoBoxList')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-photo-box]');
    if (!btn) return;
    setSelectedPhotoBox({
      label: btn.dataset.photoBox,
      from: Number(btn.dataset.from),
      to: Number(btn.dataset.to)
    });
    renderPhotoBoxes();
  });

  $('photo-files')?.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    try {
      await handlePhotoFiles(files);
    } catch (err) {
      console.error(err);
      alert('Fehler beim Verarbeiten der Bilder.');
    }
    e.target.value = '';
  });

  $('photoPreviewList')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-photo-remove]');
    if (!btn) return;
    const idx = Number(btn.dataset.photoRemove);
    const entry = getCurrentDraftEntry();
    const item = entry?.files?.[idx];
    if (!item) return;
    try { URL.revokeObjectURL(item.url); } catch {}
    entry.files.splice(idx, 1);
    renderPhotoBoxes();
  });

  $('photoExistingList')?.addEventListener('click', (e) => {
    const item = e.target.closest('[data-current-photo]');
    if (!item) return;
    const idx = Number(item.dataset.currentPhoto);
    openLightbox(currentBoxSavedItems, idx);
  });

  $('btnPhotoClear')?.addEventListener('click', () => {
    clearPhotoDraft(true);
  });

  $('btnPhotoSave')?.addEventListener('click', async () => {
    try {
      await savePhotoDoc();
    } catch (err) {
      console.error(err);
      alert('Fotodoku konnte nicht gespeichert werden.');
    }
  });

  [$('photoHistoryList'), $('photoHistoryListMirror')].forEach(host => {
    host?.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-phact]');
      const card = e.target.closest('[data-photo-doc]');

      if (btn) {
        const id = btn.dataset.id;
        const act = btn.dataset.phact;

        if (act === 'zip') {
          try {
            await downloadPhotoZip(id);
          } catch (err) {
            console.error(err);
            alert('ZIP konnte nicht erstellt werden.');
          }
        }

        if (act === 'del') {
          try {
            await deletePhotoDoc(id);
          } catch (err) {
            console.error(err);
            alert('Fotodoku konnte nicht gelöscht werden.');
          }
        }
        return;
      }

      if (card) {
        try {
          await openPhotoViewer(card.dataset.photoDoc);
        } catch (err) {
          console.error(err);
          alert('Fotos konnten nicht geöffnet werden.');
        }
      }
    });
  });

  $('photoViewerGrid')?.addEventListener('click', (e) => {
    const item = e.target.closest('[data-viewer-photo]');
    if (!item) return;
    const idx = Number(item.dataset.viewerPhoto);
    openLightbox(viewerItems, idx);
  });

  $('btnClosePhotoViewer')?.addEventListener('click', closePhotoViewer);
  $('photoModalOverlay')?.addEventListener('click', closePhotoViewer);

  $('btnCloseLightbox')?.addEventListener('click', closeLightbox);
  $('btnLightboxPrev')?.addEventListener('click', prevLightbox);
  $('btnLightboxNext')?.addEventListener('click', nextLightbox);

  document.addEventListener('keydown', (e) => {
    if (!$('photoLightbox').hidden) {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') prevLightbox();
      if (e.key === 'ArrowRight') nextLightbox();
      return;
    }

    if (!$('photoViewerModal').hidden && e.key === 'Escape') {
      closePhotoViewer();
    }
  });
}

/* =========================
   Init
========================= */
window.addEventListener('DOMContentLoaded', () => {
  state.meta.date = new Date().toISOString().slice(0, 10);
  state.layers = [defaultLayer(0)];

  loadDraft();

  if (!state.meta.date) state.meta.date = new Date().toISOString().slice(0, 10);
  if (!state.layers.length) state.layers = [defaultLayer(0)];

  initTabs();
  syncMetaToUi();
  syncMetaAccordionMeta();
  syncQuickModeUi();
  renderLayers();
  renderHistoryList();
  renderPhotoHistoryLists();
  syncPhotoPanel(true);
  syncPhotoFloatVisibility();

  hookMetaEvents();
  hookLayerEvents();
  hookHistoryEvents();
  hookPhotoEvents();

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
    syncPhotoPanel(true);
    saveDraftDebounced();
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
      const swUrl = new URL('sw.js?v=141', window.location.href);
      navigator.serviceWorker.register(swUrl.href).catch((err) => {
        console.error('SW registration failed:', err);
      });
    });
  }
});
