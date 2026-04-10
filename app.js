'use strict';

console.log('HTB Bohrkernaufnahme loaded');

const STORAGE_DRAFT = 'htb-bohrkern-draft-v2';
const STORAGE_HISTORY = 'htb-bohrkern-history-v2';
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
  layers: []
};

function uid() {
  return crypto?.randomUUID?.() || ('id_' + Date.now() + '_' + Math.random().toString(16).slice(2));
}

function clone(v) {
  return JSON.parse(JSON.stringify(v));
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
    note: ''
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

let _saveT = null;
function saveDraftDebounced() {
  clearTimeout(_saveT);
  _saveT = setTimeout(saveDraft, 250);
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_DRAFT);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed?.meta) state.meta = parsed.meta;
    if (Array.isArray(parsed?.layers) && parsed.layers.length) state.layers = parsed.layers;
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
  state.meta = clone(snapshot.meta || state.meta);
  state.layers = clone(snapshot.layers || []);
  if (!state.layers.length) state.layers.push(defaultLayer(0));
  syncMetaToUi();
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

function chipHtml({ layerId, field, value, active, soft = false }) {
  return `
    <button
      class="chip ${active ? 'is-active' : ''} ${soft ? 'chip--soft' : ''}"
      type="button"
      data-chip-field="${field}"
      data-id="${layerId}"
      data-value="${value}"
    >${value || '—'}</button>
  `;
}

function selectHtml({ layerId, field, options, value, label }) {
  return `
    <label class="field">
      <span class="field__label">${label}</span>
      <select class="field__select" data-field="${field}" data-id="${layerId}">
        ${options.map(opt => `<option value="${opt}" ${opt === value ? 'selected' : ''}>${opt || '—'}</option>`).join('')}
      </select>
    </label>
  `;
}

function layerCardHtml(layer, idx, isOpen = false) {
  const descShort = shortDescription(layer) || 'Beschreibung wählen';
  const descFull = fullDescription(layer) || 'Noch keine normnahe Beschreibung ausgewählt.';
  const summaryRange = `${fmtDepth(layer.from) || '—'} – ${fmtDepth(layer.to) || '—'} m`;

  return `
    <details class="layerCard" data-id="${layer.id}" ${isOpen ? 'open' : ''}>
      <summary>
        <div class="layerCard__title">
          <span>Schicht ${idx + 1}</span>
          <span class="layerCard__sub js-summary-range">${summaryRange}</span>
          <span class="layerCard__sub js-summary-desc">${descShort}</span>
        </div>
      </summary>

      <div class="layerBody">
        <div class="form-grid">
          <label class="field">
            <span class="field__label">Von [m]</span>
            <input class="field__input" type="number" step="0.01" data-field="from" data-id="${layer.id}" value="${layer.from || ''}" />
          </label>

          <label class="field">
            <span class="field__label">Bis [m]</span>
            <input class="field__input" type="number" step="0.01" data-field="to" data-id="${layer.id}" value="${layer.to || ''}" />
          </label>

          <label class="field">
            <span class="field__label">Proben-Nr.</span>
            <input class="field__input" type="text" data-field="sampleNo" data-id="${layer.id}" value="${layer.sampleNo || ''}" />
          </label>

          <label class="field">
            <span class="field__label">Kernlauf</span>
            <input class="field__input" type="text" data-field="coreRun" data-id="${layer.id}" value="${layer.coreRun || ''}" />
          </label>

          <label class="field">
            <span class="field__label">Kerngewinnung [%]</span>
            <input class="field__input" type="number" step="1" min="0" max="100" data-field="recovery" data-id="${layer.id}" value="${layer.recovery || ''}" />
          </label>

          ${selectHtml({
            layerId: layer.id,
            field: 'tool',
            options: TOOL_OPTIONS,
            value: layer.tool || '',
            label: 'Werkzeug / Verfahren'
          })}
        </div>

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

        <div class="choiceBlock">
          <div class="choiceLabel">Lagerungsdichte / Konsistenz</div>
          <div class="chips">
            ${COARSE_STATE_OPTIONS.map(v => chipHtml({
              layerId: layer.id,
              field: 'state',
              value: v,
              active: layer.state === v
            })).join('')}
            ${FINE_STATE_OPTIONS.map(v => chipHtml({
              layerId: layer.id,
              field: 'state',
              value: v,
              active: layer.state === v,
              soft: true
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
          <div class="choiceLabel">Kurzbeschreibung nach Norm</div>
          <div class="readonly js-short-desc">${descShort}</div>
        </div>

        <div class="choiceBlock">
          <div class="choiceLabel">Detailbeschreibung</div>
          <div class="readonly js-full-desc">${descFull}</div>
        </div>

        <div class="choiceBlock">
          <label class="field">
            <span class="field__label">Bemerkung</span>
            <textarea class="field__textarea" data-field="note" data-id="${layer.id}">${layer.note || ''}</textarea>
          </label>
        </div>

        <div class="layerActions">
          <button class="miniBtn" type="button" data-act="dup" data-id="${layer.id}">Duplizieren</button>
          <button class="miniBtn" type="button" data-act="del" data-id="${layer.id}">Löschen</button>
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
          <span>${entry.title}</span>
          <span style="color:var(--muted);font-size:.82em">${new Date(entry.savedAt).toLocaleString('de-DE')}</span>
        </div>
        <div class="historySub">
          Projekt: <b>${project}</b> · Aufschluss: <b>${borehole}</b> · Schichten: <b>${count}</b>
        </div>
        <div class="historyBtns">
          <button type="button" data-hact="load" data-id="${entry.id}">Laden</button>
          <button type="button" data-hact="csv" data-id="${entry.id}">CSV</button>
          <button type="button" data-hact="pdf" data-id="${entry.id}">PDF</button>
          <button type="button" data-hact="del" data-id="${entry.id}">Löschen</button>
        </div>
      </div>
    `;
  }).join('');
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

async function exportPdf(snapshot = state) {
  if (!window.PDFLib) {
    alert('PDF-Library noch nicht geladen.');
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

  function ensureSpace(h) {
    if (!page || y - h < margin) newPage();
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

  host.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-chip-field]');
    if (chip) {
      const id = chip.dataset.id;
      const field = chip.dataset.chipField;
      const value = chip.dataset.value;
      const layer = getLayer(id);
      if (!layer) return;

      if (field === 'secondary' || field === 'colors') {
        const arr = Array.isArray(layer[field]) ? layer[field] : [];
        const idx = arr.indexOf(value);
        if (idx >= 0) arr.splice(idx, 1);
        else arr.push(value);
        layer[field] = arr;
      } else {
        layer[field] = layer[field] === value ? '' : value;
      }

      const openIds = getOpenIds();
      if (!openIds.includes(id)) openIds.push(id);
      renderLayers(openIds);
      saveDraftDebounced();
      return;
    }

    const act = e.target.closest('[data-act]');
    if (act) {
      const id = act.dataset.id;
      const layer = getLayer(id);
      if (!layer) return;

      if (act.dataset.act === 'del') {
        if (state.layers.length === 1) {
          state.layers[0] = defaultLayer(0);
        } else {
          state.layers = state.layers.filter(x => x.id !== id);
        }
        renderLayers();
      }

      if (act.dataset.act === 'dup') {
        const copy = clone(layer);
        copy.id = uid();
        state.layers.splice(state.layers.findIndex(x => x.id === id) + 1, 0, copy);
        renderLayers([copy.id]);
      }

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

window.addEventListener('DOMContentLoaded', () => {
  if (!state.layers.length) state.layers.push(defaultLayer(0));
  if (!state.meta.date) state.meta.date = new Date().toISOString().slice(0, 10);

  loadDraft();

  if (!state.layers.length) state.layers.push(defaultLayer(0));
  if (!state.meta.date) state.meta.date = new Date().toISOString().slice(0, 10);

  initTabs();
  syncMetaToUi();
  renderLayers();
  renderHistoryList();
  hookMetaEvents();
  hookLayerEvents();
  hookHistoryEvents();

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
      alert('PDF-Fehler: ' + (err?.message || String(err)));
    }
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
});

/* PWA Install */
let _installPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  _installPrompt = e;
  const btn = $('btnInstall');
  if (btn) btn.hidden = false;
});

$('btnInstall')?.addEventListener('click', async () => {
  if (!_installPrompt) return;
  _installPrompt.prompt();
  const { outcome } = await _installPrompt.userChoice;
  if (outcome === 'accepted') {
    const btn = $('btnInstall');
    if (btn) btn.hidden = true;
  }
  _installPrompt = null;
});

window.addEventListener('appinstalled', () => {
  const btn = $('btnInstall');
  if (btn) btn.hidden = true;
  _installPrompt = null;
});
