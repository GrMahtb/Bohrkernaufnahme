/* ═══════════════════════════════════════════════════════════
   BOHRKERNANSPRACHE APP – Logik & Datenverwaltung
   Norm: ÖNORM EN ISO 14688-1 und -2 (inkl. Anhänge NA, NB)
   ═══════════════════════════════════════════════════════════ */

'use strict';

/* ──────────────────────────────────────────────────────────
   1. DATEN-OPTIONEN (gem. ISO 14688 Tabellen & nat. Anhänge)
   ────────────────────────────────────────────────────────── */
const LAYER_OPTIONS = {
    haupt: [
        "Blöcke (Bo)",
        "Steine (Co)",
        "Kies (Gr)",
        "Sand (Sa)",
        "Schluff (Si)",
        "Ton (Cl)"
    ],
    neben: [
        "blockig",
        "steinig",
        "kiesig",
        "sandig",
        "schluffig",
        "tonig"
    ],
    koernung: [
        "sehr eng gestuft (S)",
        "eng gestuft (E)",
        "mittel gestuft (M)",
        "weit gestuft (W)",
        "intermittierend gestuft (I)"
    ],
    feuchte: [
        "trocken",
        "feucht",
        "nass",
        "wassergesättigt"
    ],
    form: [
        "eckig",
        "kantengerundet",
        "gerundet",
        "wohlgerundet"
    ],
    konsistenz: [
        // gem. Anhang NB (normativ): breiig, sehr weich, weich, steif, halbfest, fest
        "flüssig",
        "breiig",
        "sehr weich",
        "weich",
        "steif",
        "halbfest",
        "fest"
    ],
    lagerung: [
        // gem. Anhang NB: für grobkörnige Böden
        "sehr locker",
        "locker",
        "mitteldicht",
        "dicht",
        "sehr dicht"
    ],
    plast: [
        "nicht plastisch",
        "niedrig",
        "mittel",
        "hoch"
    ],
    trocken: [
        "keine",
        "niedrig",
        "mittel",
        "hoch",
        "sehr hoch"
    ],
    org: [
        "nicht organisch",
        "schwach organisch",
        "mittel organisch",
        "stark organisch",
        "Torf"
    ],
    kalk: [
        "nicht kalkhaltig",
        "schwach kalkhaltig",
        "stark kalkhaltig",
        "sehr stark kalkhaltig"
    ]
};

/* Labels für die Anzeige in der UI */
const GROUP_LABELS = {
    haupt:     "Hauptanteil (Single-Select)",
    neben:     "Neben-/Drittanteil (Multi-Select)",
    koernung:  "Körnungslinie",
    feuchte:   "Wasser / Feuchte",
    form:      "Kornform",
    konsistenz:"Konsistenz (bindige Böden · Anhang NB)",
    lagerung:  "Lagerungsdichte (rollige Böden · Anhang NB)",
    plast:     "Plastizität",
    trocken:   "Trockenfestigkeit",
    org:       "Organischer Anteil",
    kalk:      "Kalkgehalt"
};

/* Reihenfolge der Chip-Gruppen in der Anzeige */
const GROUP_ORDER = [
    'haupt', 'neben', 'koernung', 'feuchte',
    'form', 'konsistenz', 'lagerung',
    'plast', 'trocken', 'org', 'kalk'
];

/* Multi-Select-Gruppen (alle anderen sind Single-Select) */
const MULTI_SELECT_GROUPS = new Set(['neben']);

/* ──────────────────────────────────────────────────────────
   2. GLOBALER ZUSTAND
   ────────────────────────────────────────────────────────── */
let layerCounter = 0;

/* ──────────────────────────────────────────────────────────
   3. HILFSFUNKTIONEN – CHIP-HTML erzeugen
   ────────────────────────────────────────────────────────── */

/**
 * Erzeugt den HTML-String für eine Chip-Gruppe.
 * @param {string[]} options  - Array der Optionswerte
 * @param {string}   group    - Gruppenname (data-group Attribut)
 * @returns {string} HTML-String
 */
function buildChipsHTML(options, group) {
    return options
        .map(opt => `<div class="chip" data-value="${opt}">${opt}</div>`)
        .join('');
}

/**
 * Erzeugt den gesamten HTML-Block aller Chip-Gruppen für eine Schicht.
 * @returns {string} HTML-String
 */
function buildAllGroupsHTML() {
    return GROUP_ORDER.map(group => {
        const isMulti = MULTI_SELECT_GROUPS.has(group);
        const selectClass = isMulti ? 'multi-select' : 'single-select';
        return `
            <div class="chip-group-label">${GROUP_LABELS[group]}</div>
            <div class="chip-group ${selectClass}" data-group="${group}">
                ${buildChipsHTML(LAYER_OPTIONS[group], group)}
            </div>
        `;
    }).join('');
}

/* ──────────────────────────────────────────────────────────
   4. SCHICHT HINZUFÜGEN
   ────────────────────────────────────────────────────────── */

/**
 * Fügt eine neue Schicht zum Container hinzu und registriert Events.
 */
function addLayer() {
    layerCounter++;
    const id = layerCounter;

    const layerHTML = `
        <details class="layer-card" data-id="${id}" open>
            <summary>
                <div class="summary-content">
                    <span class="depth-summary">
                        Schicht ${id}: <span class="d-von">0.00</span> – <span class="d-bis">0.00</span> m
                    </span>
                    <span class="type-summary generated-preview-short">
                        Bitte ansprechen …
                    </span>
                </div>
                <div class="layer-header-right">
                    <button class="btn-danger"
                            onclick="deleteLayer(event, ${id})">✕</button>
                    <div class="expand-icon">▼</div>
                </div>
            </summary>

            <div class="details-body">

                <!-- Tiefenangabe -->
                <div class="depth-inputs">
                    <div>
                        <label>Von (m)</label>
                        <input type="number" step="0.01" class="input-von"
                               value="0.00" oninput="updateLayer(${id})">
                    </div>
                    <span class="depth-separator">–</span>
                    <div>
                        <label>Bis (m)</label>
                        <input type="number" step="0.01" class="input-bis"
                               value="0.00" oninput="updateLayer(${id})">
                    </div>
                </div>

                <!-- Alle Chip-Gruppen (per Funktion generiert) -->
                ${buildAllGroupsHTML()}

                <!-- Freitext-Bemerkung -->
                <div class="chip-group-label">Bemerkungen</div>
                <input type="text" class="input-bemerkung"
                       placeholder="Zusätzliche Freitext-Notizen …"
                       oninput="updateLayer(${id})">

                <!-- Live ISO-Textvorschau -->
                <div class="preview-box generated-preview-long">
                    [Noch keine Eigenschaften ausgewählt]
                </div>

            </div>
        </details>
    `;

    const container = document.getElementById('layers-container');
    container.insertAdjacentHTML('beforeend', layerHTML);

    const newLayer = container.querySelector(`.layer-card[data-id="${id}"]`);

    // Events für Single-Select-Chips
    newLayer.querySelectorAll('.single-select .chip').forEach(chip => {
        chip.addEventListener('click', function () {
            Array.from(this.parentNode.children)
                 .forEach(c => c.classList.remove('selected'));
            this.classList.add('selected');
            updateLayer(id);
        });
    });

    // Events für Multi-Select-Chips
    newLayer.querySelectorAll('.multi-select .chip').forEach(chip => {
        chip.addEventListener('click', function () {
            this.classList.toggle('selected');
            updateLayer(id);
        });
    });

    // Auto-Fill: Von = Bis der vorherigen Schicht
    if (id > 1) {
        const prevLayer = container.querySelector(
            `.layer-card[data-id="${id - 1}"]`
        );
        if (prevLayer) {
            const prevBis = prevLayer.querySelector('.input-bis').value;
            newLayer.querySelector('.input-von').value = prevBis;
            newLayer.querySelector('.input-bis').value =
                (parseFloat(prevBis) + 1.0).toFixed(2);
            updateLayer(id);
        }
    }
}

/* ──────────────────────────────────────────────────────────
   5. SCHICHT LÖSCHEN
   ────────────────────────────────────────────────────────── */

/**
 * Löscht eine Schicht nach Bestätigung.
 * @param {Event}  event - Click-Event (stopPropagation)
 * @param {number} id    - Layer-ID
 */
function deleteLayer(event, id) {
    event.stopPropagation();
    if (confirm('Möchten Sie diese Schicht wirklich löschen?')) {
        const layer = document.querySelector(`.layer-card[data-id="${id}"]`);
        if (layer) layer.remove();
    }
}

/* ──────────────────────────────────────────────────────────
   6. SCHICHT AKTUALISIEREN – ISO-Text generieren
   ────────────────────────────────────────────────────────── */

/**
 * Liest Auswahl einer Single-Select-Gruppe aus.
 * @param {Element} layerEl - Das Layer-DOM-Element
 * @param {string}  group
 * @returns {string|null}
 */
function getSingleValue(layerEl, group) {
    const el = layerEl.querySelector(
        `.chip-group[data-group="${group}"] .chip.selected`
    );
    return el ? el.dataset.value : null;
}

/**
 * Liest alle Auswahlen einer Multi-Select-Gruppe aus.
 * @param {Element} layerEl
 * @param {string}  group
 * @returns {string[]}
 */
function getMultiValues(layerEl, group) {
    return Array.from(
        layerEl.querySelectorAll(
            `.chip-group[data-group="${group}"] .chip.selected`
        )
    ).map(el => el.dataset.value);
}

/**
 * Baut den normativen ISO-14688-Ansprache-String auf.
 * Reihenfolge: Nebenanteile · HAUPTANTEIL · Körnung · Feuchte · Kornform
 *              · Konsistenz · Lagerung · Plastizität · Trockenfestigkeit
 *              · Organisch · Kalk · Bemerkungen
 * @param {Element} layerEl
 * @returns {string}
 */
function generateISOText(layerEl) {
    const parts = [];

    // Nebenanteile (Multi, kleingeschrieben → vorangestellt)
    const neben = getMultiValues(layerEl, 'neben');
    if (neben.length > 0) parts.push(neben.join(', '));

    // Hauptanteil GROSSGESCHRIEBEN mit Symbol in Klammern
    let haupt = getSingleValue(layerEl, 'haupt');
    if (haupt) {
        haupt = haupt.replace(
            /^([^\(]+)(\s*\(.*\))?$/,
            (_, name, sym) => name.toUpperCase() + (sym || '')
        );
        parts.push(haupt);
    }

    // Körnungslinie
    const koernung = getSingleValue(layerEl, 'koernung');
    if (koernung) parts.push(koernung);

    // Feuchte
    const feuchte = getSingleValue(layerEl, 'feuchte');
    if (feuchte) parts.push(feuchte);

    // Kornform
    const form = getSingleValue(layerEl, 'form');
    if (form) parts.push(form);

    // Konsistenz (bindige Böden)
    const konsistenz = getSingleValue(layerEl, 'konsistenz');
    if (konsistenz) parts.push(konsistenz);

    // Lagerungsdichte (rollige Böden)
    const lagerung = getSingleValue(layerEl, 'lagerung');
    if (lagerung) parts.push(lagerung);

    // Plastizität – "nicht plastisch" bleibt, sonst + " plastisch"
    let plast = getSingleValue(layerEl, 'plast');
    if (plast) {
        if (plast !== 'nicht plastisch') plast += ' plastisch';
        parts.push(plast);
    }

    // Trockenfestigkeit
    const trocken = getSingleValue(layerEl, 'trocken');
    if (trocken) parts.push('Trockenfestigkeit ' + trocken);

    // Organischer Anteil
    const org = getSingleValue(layerEl, 'org');
    if (org) parts.push(org);

    // Kalkgehalt
    const kalk = getSingleValue(layerEl, 'kalk');
    if (kalk) parts.push(kalk);

    // Freitext-Bemerkung
    const bemerkung = layerEl.querySelector('.input-bemerkung').value.trim();
    if (bemerkung) parts.push(bemerkung);

    return parts.length > 0
        ? parts.join(' · ')
        : 'Bitte ansprechen …';
}

/**
 * Aktualisiert die Zusammenfassung und die Textvorschau einer Schicht.
 * @param {number} id
 */
function updateLayer(id) {
    const layer = document.querySelector(`.layer-card[data-id="${id}"]`);
    if (!layer) return;

    // Tiefenangaben aktualisieren
    const von = parseFloat(layer.querySelector('.input-von').value || 0);
    const bis = parseFloat(layer.querySelector('.input-bis').value || 0);
    layer.querySelector('.d-von').textContent = von.toFixed(2);
    layer.querySelector('.d-bis').textContent = bis.toFixed(2);

    // ISO-Text generieren
    const isoText = generateISOText(layer);

    // Kurzvorschau in der Summary-Zeile (wird gekürzt per CSS)
    layer.querySelector('.generated-preview-short').textContent = isoText;

    // Vollständige Vorschau im aufgeklappten Bereich
    layer.querySelector('.generated-preview-long').textContent = isoText;

    // Für Export zwischenspeichern
    layer.dataset.exportText = isoText;
}

/* ──────────────────────────────────────────────────────────
   7. PROJEKTDATEN AUSLESEN
   ────────────────────────────────────────────────────────── */

/**
 * Liest alle Projektfelder aus und gibt ein Objekt zurück.
 * @returns {Object}
 */
function getProjectInfo() {
    const fields = [
        'projekt', 'auftraggeber', 'kostenstelle', 'bohrloch',
        'maschine', 'meister', 'verfasser', 'datum', 'beginn', 'ende'
    ];
    const info = {};
    fields.forEach(f => {
        info[f] = document.getElementById('p-' + f).value || '–';
    });
    return info;
}

/* ──────────────────────────────────────────────────────────
   8. PROTOKOLL-TEXT ERZEUGEN
   ────────────────────────────────────────────────────────── */

/**
 * Generiert den vollständigen Protokoll-Text (für TXT & Clipboard).
 * @returns {string}
 */
function generateProtocol() {
    const i = getProjectInfo();
    const sep = '═'.repeat(50);
    const sep2 = '─'.repeat(50);

    let out = `${sep}\n`;
    out += `  BOHRPROTOKOLL – ÖNORM EN ISO 14688\n`;
    out += `${sep}\n`;
    out += `Projekt:       ${i.projekt}\n`;
    out += `Auftraggeber:  ${i.auftraggeber}\n`;
    out += `Kostenstelle:  ${i.kostenstelle}\n`;
    out += `Bohrloch:      ${i.bohrloch}\n`;
    out += `${sep2}\n`;
    out += `Datum:         ${i.datum}\n`;
    out += `Bohrbeginn:    ${i.beginn}  |  Bohrende: ${i.ende}\n`;
    out += `Maschinentyp:  ${i.maschine}\n`;
    out += `Bohrmeister:   ${i.meister}\n`;
    out += `Verfasser:     ${i.verfasser}\n`;
    out += `${sep}\n\n`;
    out += `SCHICHTENVERZEICHNIS\n${sep2}\n\n`;

    const layers = document.querySelectorAll('.layer-card');
    if (layers.length === 0) {
        out += 'Keine Schichten erfasst.\n';
    } else {
        layers.forEach(l => {
            const von = parseFloat(
                l.querySelector('.input-von').value || 0
            ).toFixed(2);
            const bis = parseFloat(
                l.querySelector('.input-bis').value || 0
            ).toFixed(2);
            const text = l.dataset.exportText || 'Keine Daten';
            out += `[${von} m – ${bis} m]\n${text}\n\n`;
        });
    }

    out += `${sep}\n`;
    out += `Erstellt mit Bohrkernansprache-App (ISO 14688)\n`;

    return out;
}

/* ──────────────────────────────────────────────────────────
   9. EXPORT-FUNKTIONEN
   ────────────────────────────────────────────────────────── */

/**
 * Hilfsfunktion: Datei-Download auslösen.
 * @param {string} content
 * @param {string} filename
 * @param {string} mimeType
 */
function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
}

/** Export als formatiertes TXT-Protokoll */
function exportTXT() {
    const bohrloch = document.getElementById('p-bohrloch').value || 'Unbenannt';
    downloadFile(
        generateProtocol(),
        `Bohrprotokoll_${bohrloch}.txt`,
        'text/plain;charset=utf-8'
    );
}

/** Export als CSV (Semikolon-getrennt) */
function exportCSV() {
    const i = getProjectInfo();
    const bohrloch = i.bohrloch !== '–' ? i.bohrloch : 'Unbenannt';

    // Header-Block
    let csv = `Projekt;Auftraggeber;Kostenstelle;Bohrloch;Maschine;`;
    csv += `Meister;Verfasser;Datum;Beginn;Ende\n`;
    csv += `${i.projekt};${i.auftraggeber};${i.kostenstelle};${i.bohrloch};`;
    csv += `${i.maschine};${i.meister};${i.verfasser};`;
    csv += `${i.datum};${i.beginn};${i.ende}\n\n`;

    // Schichten
    csv += `Tiefe_Von_m;Tiefe_Bis_m;Ansprache_ISO_14688\n`;
    document.querySelectorAll('.layer-card').forEach(l => {
        const von = parseFloat(
            l.querySelector('.input-von').value || 0
        ).toFixed(2);
        const bis = parseFloat(
            l.querySelector('.input-bis').value || 0
        ).toFixed(2);
        const text = (l.dataset.exportText || '').replace(/"/g, '""');
        csv += `${von};${bis};"${text}"\n`;
    });

    downloadFile(
        csv,
        `Bohrkern_${bohrloch}.csv`,
        'text/csv;charset=utf-8'
    );
}

/** Protokoll in die Zwischenablage kopieren */
function copyToClipboard() {
    navigator.clipboard.writeText(generateProtocol())
        .then(() => alert('Protokoll wurde in die Zwischenablage kopiert!'))
        .catch(err => alert('Fehler beim Kopieren:\n' + err));
}

/* ──────────────────────────────────────────────────────────
   10. INITIALISIERUNG
   ────────────────────────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', () => {
    // Heutiges Datum als Standard setzen
    document.getElementById('p-datum').valueAsDate = new Date();
    // Erste leere Schicht anlegen
    addLayer();
});