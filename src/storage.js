import { initCard, normalizeId } from './srs.js'

/**
 * Key for last workbook snapshot in localStorage.
 * Used to quickly restore previously parsed sheets without re-upload.
 * @type {string}
 */

const LAST_WORKBOOK_KEY = 'lastWorkbookData'

/**
 * Load last workbook payload from localStorage.
 * @returns {{sheets:string[], dataBySheet:Record<string,Array<{english:string,translation:string,pronunciationUrl:string}>>, savedAt:number, filename:string}|null}
 */
export function loadLastWorkbook() {
  try {
    const raw = localStorage.getItem(LAST_WORKBOOK_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/**
 * Save last workbook payload to localStorage.
 * @param {any} payload
 * @returns {void}
 */
export function saveLastWorkbook(payload) {
  try {
    localStorage.setItem(LAST_WORKBOOK_KEY, JSON.stringify(payload))
  } catch {
    // ignore
  }
}

/**
 * Build storage key for a sheet.
 * @param {string} sheetName
 * @returns {string}
 */
function keyForSheet(sheetName) {
  return `vocabProgress:${sheetName}`
}

/**
 * Load persisted SRS progress for a sheet.
 * @param {string} sheetName
 * @returns {import('./srs.js').Card[]}
 */
export function loadProgress(sheetName) {
  try {
    const raw = localStorage.getItem(keyForSheet(sheetName))
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

/**
 * Save SRS progress for a sheet.
 * @param {string} sheetName
 * @param {import('./srs.js').Card[]} cards
 * @returns {void}
 */
export function saveProgress(sheetName, cards) {
  try {
    localStorage.setItem(keyForSheet(sheetName), JSON.stringify(cards))
  } catch {
    // ignore
  }
}

/**
 * Reset (remove) SRS progress for a sheet.
 * @param {string} sheetName
 * @returns {void}
 */
export function resetProgress(sheetName) {
  localStorage.removeItem(keyForSheet(sheetName))
}

/**
 * Merge parsed rows with existing progress. New words are initialized into box 1.
 * Existing words keep progress fields but update text/url from the source.
 * @param {string} sheetName
 * @param {Array<{english:string,translation:string,pronunciationUrl:string}>} rows
 * @returns {import('./srs.js').Card[]}
 */
export function mergeProgress(sheetName, rows) {
  const existing = loadProgress(sheetName)
  const byId = new Map(existing.map((c) => [normalizeId(c.english), c]))
  const merged = []
  for (const row of rows) {
    const id = normalizeId(row.english)
    const found = byId.get(id)
    if (found) {
      // Update basic fields but keep progress
      found.english = row.english || found.english
      found.translation = row.translation || found.translation
      found.pronunciationUrl = row.pronunciationUrl || found.pronunciationUrl
      merged.push(found)
    } else {
      merged.push(initCard(row))
    }
  }
  saveProgress(sheetName, merged)
  return merged
}
