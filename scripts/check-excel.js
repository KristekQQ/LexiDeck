// Read-only Excel check for data/sample.xlsx
// Usage: node scripts/check-excel.js [path] [sheet]
import fs from 'node:fs'
import path from 'node:path'
import * as XLSX from 'xlsx'

const fileArg = process.argv[2] || path.join(process.cwd(), 'data', 'sample.xlsx')
const sheetArg = process.argv[3]

function normalizeHeader(h) {
  return String(h || '').trim().toLowerCase().replace(/\s+/g, '')
}

const HEADER_ALIASES = {
  english: ['english', 'word', 'en'],
  translation: ['translation', 'cz', 'cs', 'czech', 'česky'],
  pronunciationUrl: ['pronunciationurl', 'pronunciation', 'url', 'audio']
}

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
    if (map.english === -1 && norm[i] === 'english') map.english = i
    if (map.translation === -1 && norm[i] === 'translation') map.translation = i
    if (map.pronunciationUrl === -1 && norm[i] === 'pronunciationurl') map.pronunciationUrl = i
  }
  return map
}

function fail(msg) { console.error('FAIL:', msg); process.exit(2) }

if (!fs.existsSync(fileArg)) fail(`Soubor nenalezen: ${fileArg}`)
const stat = fs.statSync(fileArg)
const buf = fs.readFileSync(fileArg)
const wb = XLSX.read(buf, { type: 'buffer' })
const sheets = wb.SheetNames || []
if (!sheets.length) fail('Sešit nemá žádné listy')

const sheetName = sheetArg || sheets[0]
if (!sheets.includes(sheetName)) fail(`List '${sheetName}' nenalezen. Dostupné: ${sheets.join(', ')}`)

const ws = wb.Sheets[sheetName]
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false })
if (!rows.length) fail(`List '${sheetName}' je prázdný`)

const headers = rows[0]
const map = mapHeaders(headers)
const allMissing = map.english === -1 && map.translation === -1 && map.pronunciationUrl === -1
let emptyCount = 0
const data = []
let startRow = allMissing ? 0 : 1
if (allMissing) {
  const r0 = rows[0] || []
  const e0 = (r0[0] || '').toString().trim()
  const t0 = (r0[1] || '').toString().trim()
  if (!e0 && !t0) startRow = 1
}
for (let r = startRow; r < rows.length; r++) {
  const row = rows[r] || []
  let english, translation, pronunciationUrl
  if (allMissing) {
    english = (row[0] || '').toString().trim()
    translation = (row[1] || '').toString().trim()
    pronunciationUrl = (row[2] || '').toString().trim()
  } else {
    english = (row[map.english] || '').toString().trim()
    translation = (row[map.translation] || '').toString().trim()
    pronunciationUrl = (row[map.pronunciationUrl] || '').toString().trim()
  }
  if (!english && !translation && !pronunciationUrl) { emptyCount++; continue }
  data.push({ english, translation, pronunciationUrl })
}

const snapshot = {
  rows: data.length,
  columns: allMissing ? ['col1->english','col2->translation','col3->pronunciationUrl'] : ['english','translation','pronunciationUrl'],
  last_modified: stat.mtime.toISOString(),
  sheet: sheetName
}

console.log('Data snapshot:', snapshot)
console.log('Info: prázdné řádky (NA):', emptyCount)
console.log('První 3 řádky:', data.slice(0, 3))
process.exit(0)
