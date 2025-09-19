import { saveLastWorkbook } from './storage.js'

/**
 * @typedef {Object} RowItem
 * @property {string} english
 * @property {string} translation
 * @property {string} pronunciationUrl
 */

/**
 * @typedef {Object} WorkbookPayload
 * @property {string[]} sheets
 * @property {Record<string, RowItem[]>} dataBySheet
 * @property {number} savedAt
 * @property {string} filename
 */

/**
 * Column header aliases (case-insensitive, whitespace removed).
 * @type {{english:string[], translation:string[], pronunciationUrl:string[]}}
 */

/** Column header aliases (case-insensitive, whitespace removed). */
const HEADER_ALIASES = {
  english: ['english', 'word', 'en'],
  translation: ['translation', 'cz', 'cs', 'czech', 'česky'],
  pronunciationUrl: ['pronunciationurl', 'pronunciation', 'url', 'audio']
}

/**
 * Normalize a header cell to compare against aliases.
 * @param {string} h
 * @returns {string}
 */
/**
 * Normalize a header cell to compare against aliases.
 * @param {string} h
 * @returns {string}
 */
function normalizeHeader(h) {
  return String(h || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
}

/**
 * Map headers to indices using aliases.
 * @param {any[]} headers
 * @returns {{english:number, translation:number, pronunciationUrl:number}}
 */
/**
 * Map headers to indices using aliases.
 * @param {any[]} headers
 * @returns {{english:number, translation:number, pronunciationUrl:number}}
 */
function mapHeaders(headers) {
  const norm = headers.map(normalizeHeader)
  const map = { english: -1, translation: -1, pronunciationUrl: -1 }
  for (let i = 0; i < norm.length; i++) {
    const h = norm[i]
    for (const key of Object.keys(HEADER_ALIASES)) {
      if (HEADER_ALIASES[key].includes(h)) {
        if (map[key] === -1) map[key] = i
      }
    }
  }
  // Also allow exact names
  for (let i = 0; i < norm.length; i++) {
    const h = norm[i]
    if (map.english === -1 && h === 'english') map.english = i
    if (map.translation === -1 && h === 'translation') map.translation = i
    if (map.pronunciationUrl === -1 && h === 'pronunciationurl') map.pronunciationUrl = i
  }
  return map
}

/**
 * Parse an uploaded .xlsx file via SheetJS (global `XLSX`).
 * Returns normalized workbook payload and persists it as last workbook.
 * @param {File} file
 * @returns {Promise<{sheets:string[], dataBySheet:Record<string,Array<{english:string,translation:string,pronunciationUrl:string}>>, savedAt:number, filename:string}>}
 */
/**
 * Parse an uploaded .xlsx file via SheetJS (global `XLSX`).
 * Returns normalized workbook payload and persists it as last workbook.
 * @param {File} file
 * @returns {Promise<WorkbookPayload>}
 */
export async function parseFile(file) {
  const buf = await file.arrayBuffer()
  // XLSX is provided by CDN global
  const wb = window.XLSX.read(buf, { type: 'array' })
  const sheets = wb.SheetNames || []
  const dataBySheet = {}
  for (const name of sheets) {
    const ws = wb.Sheets[name]
    const rows = window.XLSX.utils.sheet_to_json(ws, { header: 1, raw: false })
    if (!rows || rows.length === 0) {
      dataBySheet[name] = []
      continue
    }
    const headers = rows[0]
    const map = mapHeaders(headers)
    const items = []
    const allMissing = map.english === -1 && map.translation === -1 && map.pronunciationUrl === -1
    let startRow = 1
    if (allMissing) {
      const r0 = rows[0] || []
      const e0 = (r0[0] || '').toString().trim()
      const t0 = (r0[1] || '').toString().trim()
      // Pokud první řádek nemá ani english ani translation, bereme ho jako šum a přeskočíme.
      startRow = e0 || t0 ? 0 : 1
    }
    for (let r = startRow; r < rows.length; r++) {
      const row = rows[r] || []
      let english, translation, pronunciationUrl
      if (allMissing) {
        english = row[0] || ''
        translation = row[1] || ''
        pronunciationUrl = row[2] || ''
      } else {
        english = row[map.english] || ''
        translation = row[map.translation] || ''
        pronunciationUrl = row[map.pronunciationUrl] || ''
      }
      if (!english && !translation) continue
      items.push({ english, translation, pronunciationUrl })
    }
    dataBySheet[name] = items
  }
  const payload = { sheets, dataBySheet, savedAt: Date.now(), filename: file.name }
  saveLastWorkbook(payload)
  return payload
}

/**
 * Fetch `/data/sample.xlsx` read-only if present and parse it.
 * @returns {Promise<{sheets:string[], dataBySheet:Record<string,Array<{english:string,translation:string,pronunciationUrl:string}>>, savedAt:number, filename:string}|null>}
 */
/**
 * Fetch `/data/sample.xlsx` read-only if present and parse it.
 * @returns {Promise<WorkbookPayload|null>}
 */
export async function loadSampleWorkbookIfAvailable() {
  try {
    const res = await fetch('/data/sample.xlsx', { cache: 'no-store' })
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    const wb = window.XLSX.read(buf, { type: 'array' })
    const sheets = wb.SheetNames || []
    const dataBySheet = {}
    for (const name of sheets) {
    const ws = wb.Sheets[name]
    const rows = window.XLSX.utils.sheet_to_json(ws, { header: 1, raw: false })
      if (!rows || rows.length === 0) { dataBySheet[name] = []; continue }
    const headers = rows[0]
    const map = mapHeaders(headers)
    const items = []
    const allMissing = map.english === -1 && map.translation === -1 && map.pronunciationUrl === -1
    let startRow = 1
    if (allMissing) {
      const r0 = rows[0] || []
      const e0 = (r0[0] || '').toString().trim()
      const t0 = (r0[1] || '').toString().trim()
      startRow = e0 || t0 ? 0 : 1
    }
    for (let r = startRow; r < rows.length; r++) {
      const row = rows[r] || []
      let english, translation, pronunciationUrl
      if (allMissing) {
        english = row[0] || ''
        translation = row[1] || ''
        pronunciationUrl = row[2] || ''
      } else {
        english = row[map.english] || ''
        translation = row[map.translation] || ''
        pronunciationUrl = row[map.pronunciationUrl] || ''
      }
      if (!english && !translation) continue
      items.push({ english, translation, pronunciationUrl })
    }
    dataBySheet[name] = items
  }
    const payload = { sheets, dataBySheet, savedAt: Date.now(), filename: 'sample.xlsx' }
    return payload
  } catch (e) {
    return null
  }
}
