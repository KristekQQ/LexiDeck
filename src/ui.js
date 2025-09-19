import { parseFile, loadSampleWorkbookIfAvailable } from './excel.js'
import { playPronunciation, speak } from './audio.js'
import { pickNext, scheduleNext, statsFor } from './srs.js'
import { loadLastWorkbook, mergeProgress, loadProgress, saveProgress, resetProgress } from './storage.js'

/**
 * Global UI state for current workbook/sheet and the active card.
 * @type {{workbook: null | {sheets:string[], dataBySheet:Record<string,Array<{english:string,translation:string,pronunciationUrl:string}>>}, sheet: string|null, cards: import('./srs.js').Card[], currentCard: import('./srs.js').Card|null}}
 */
let current = {
  workbook: null,
  sheet: null,
  cards: [],
  currentCard: null
}

let isTransitioning = false

/**
 * Shorthand to get element by id.
 * @param {string} id
 * @returns {HTMLElement}
 */
function el(id) { return document.getElementById(id) }

/**
 * Set top-of-page message text.
 * @param {string} text
 */
function setMessage(text) {
  const m = el('message')
  if (!m) return
  m.textContent = text || ''
}

/** Render sheet options and select current. */
function renderSheets() {
  const select = el('sheetSelect')
  select.innerHTML = ''
  if (!current.workbook) return
  for (const s of current.workbook.sheets) {
    const opt = document.createElement('option')
    opt.value = s
    opt.textContent = s
    select.appendChild(opt)
  }
  if (current.sheet && current.workbook.sheets.includes(current.sheet)) {
    select.value = current.sheet
  } else {
    current.sheet = current.workbook.sheets[0]
  }
  setMessage(`Načten sešit. Listů: ${current.workbook.sheets.length}. Vybrán: ${current.sheet}.`)
}

/** Load and merge progress for current sheet into state. */
function loadSheetProgress() {
  if (!current.workbook || !current.sheet) return
  const rows = current.workbook.dataBySheet[current.sheet] || []
  current.cards = mergeProgress(current.sheet, rows)
  current.currentCard = pickNext(current.cards)
}

/** Render current card word/translation and reset flip state. */
function renderCard() {
  const card = el('card')
  const word = el('word')
  const translation = el('translation')
  const link = el('translateLink')
  if (!current.currentCard) {
    word.textContent = 'Žádná data'
    translation.textContent = 'Nahrajte Excel a vyberte list'
    if (link) link.style.display = 'none'
    card.classList.remove('flipped')
    return
  }
  word.textContent = current.currentCard.english
  translation.textContent = current.currentCard.translation
  if (link) {
    const targetUrl = buildTranslateUrl(current.currentCard)
    link.href = targetUrl
    link.style.display = 'inline-block'
  }
  card.classList.remove('flipped')
}

function buildTranslateUrl(card) {
  const w = String(card.english || '').trim()
  const url = String(card.pronunciationUrl || '').trim()
  if (url) return url
  const base = 'https://translate.google.cz/'
  const params = new URLSearchParams({ hl: 'cs', sl: 'en', tl: 'cs', text: w, op: 'translate' })
  return base + '?' + params.toString()
}

/** Render stats panel for current sheet. */
function renderStats() {
  const statsEl = el('stats')
  if (!current.cards || current.cards.length === 0) {
    statsEl.textContent = ''
    return
  }
  const s = statsFor(current.cards)
  statsEl.innerHTML = `
    <strong>Statistiky</strong> – Položek: ${s.total}, Správně: ${s.correct}, Špatně: ${s.wrong}, Přesnost: ${s.accuracy}%<br/>
    Boxy: [1:${s.byBox[1]}] [2:${s.byBox[2]}] [3:${s.byBox[3]}] [4:${s.byBox[4]}] [5:${s.byBox[5]}] – Due: ${s.due}
  `
}

/** Pick and display next card. */
function nextCard() {
  current.currentCard = pickNext(current.cards)
  renderCard()
  renderStats()
}

function waitForFlipBack() {
  return new Promise((resolve) => {
    const card = el('card')
    const inner = card.querySelector('.card-inner')
    let done = false
    const finish = () => { if (!done) { done = true; resolve() } }
    const timer = setTimeout(finish, 650)
    inner.addEventListener('transitionend', () => {
      clearTimeout(timer)
      finish()
    }, { once: true })
  })
}

async function onEvaluate(correct) {
  if (!current.currentCard || isTransitioning) return
  isTransitioning = true
  try {
    scheduleNext(current.currentCard, correct)
    saveProgress(current.sheet, current.cards)
    const card = el('card')
    if (card.classList.contains('flipped')) {
      card.classList.remove('flipped')
      await waitForFlipBack()
    }
    nextCard()
  } finally {
    isTransitioning = false
  }
}

function onFlip() {
  el('card').classList.toggle('flipped')
}

/** Play pronunciation for current card using URL or TTS. */
async function onPlay() {
  if (!current.currentCard) return
  const { pronunciationUrl, english } = current.currentCard
  if (pronunciationUrl) {
    await playPronunciation(pronunciationUrl, english)
  } else {
    speak(english)
  }
}

/** Bind UI event handlers (file, select, buttons, keys). */
function bindEvents() {
  const fileInput = el('fileInput')
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const wb = await parseFile(file)
    current.workbook = wb
    const pref = wb.sheets.find((s) => /^(stage|stake)\s*11$/i.test(String(s)))
    current.sheet = pref || wb.sheets[0]
    renderSheets()
    loadSheetProgress()
    renderCard()
    renderStats()
  })

  el('sheetSelect').addEventListener('change', (e) => {
    current.sheet = e.target.value
    loadSheetProgress()
    renderCard()
    renderStats()
  })

  el('card').addEventListener('click', onFlip)
  el('playBtn').addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    onPlay()
  })
  const translateLink = el('translateLink')
  if (translateLink) {
    translateLink.addEventListener('click', (e) => {
      // Don’t flip the card when opening external link
      e.stopPropagation()
    })
  }
  el('knewBtn').addEventListener('click', () => onEvaluate(true))
  el('didntKnowBtn').addEventListener('click', () => onEvaluate(false))

  el('resetBtn').addEventListener('click', () => {
    if (!current.sheet) return
    const ok = confirm(`Opravdu resetovat pokrok pro list \"${current.sheet}\"?`)
    if (!ok) return
    resetProgress(current.sheet)
    // Re-merge from source rows
    loadSheetProgress()
    renderCard()
    renderStats()
  })

  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault()
      onFlip()
    } else if (e.key === '1') {
      onEvaluate(true)
    } else if (e.key === '2') {
      onEvaluate(false)
    } else if (e.key.toLowerCase() === 'p') {
      onPlay()
    }
  })

  el('loadSampleBtn').addEventListener('click', async () => {
    const wb = await loadSampleWorkbookIfAvailable()
    if (!wb) { setMessage('Nepodařilo se načíst /data/sample.xlsx'); return }
    current.workbook = wb
    const pref = wb.sheets.find((s) => /^(stage|stake)\s*11$/i.test(String(s)))
    current.sheet = pref || wb.sheets[0]
    renderSheets()
    loadSheetProgress()
    renderCard()
    renderStats()
  })
}

/** Initialize UI, attempt to load sample/last workbook, and bind events. */
export function initUI() {
  // Try sample workbook (read-only) if available; fallback to last stored
  ;(async () => {
    const sample = await loadSampleWorkbookIfAvailable()
    const last = loadLastWorkbook()
    if (sample && sample.sheets?.length) {
      current.workbook = sample
      const pref = sample.sheets.find((s) => /^(stage|stake)\s*11$/i.test(String(s)))
      current.sheet = pref || sample.sheets[0]
    } else if (last && last.sheets?.length) {
      current.workbook = last
      const pref = last.sheets.find((s) => /^(stage|stake)\s*11$/i.test(String(s)))
      current.sheet = pref || last.sheets[0]
    }
    if (current.workbook) {
      renderSheets()
      loadSheetProgress()
      renderCard()
      renderStats()
    } else {
      setMessage('Nenačten žádný sešit. Nahrajte .xlsx nebo klikněte „Načíst sample.xlsx“.')
    }
  })()
  bindEvents()
  bindSelfCheck()
  // If HTTP on LAN (not secure), hint about Chrome flag to allow SW
  try {
    if (!window.isSecureContext && !/^localhost|127\.0\.0\.1$/.test(location.hostname)) {
      setMessage(
        `Běžíte na HTTP (${location.origin}). Pro offline PWA v Chrome povolte flag ` +
          `Insecure origins treated as secure a přidejte ${location.origin}.`
      )
    }
  } catch {}
}

/** Bind click handler for the self-check panel. */
function bindSelfCheck() {
  const btn = document.getElementById('runCheckBtn')
  if (!btn) return
  btn.addEventListener('click', runSelfCheck)
}

/**
 * Self-check diagnostics to verify environment/installability.
 * Writes PASS/FAIL rows into #checkResults and logs summary.
 */
async function runSelfCheck() {
  const resultsEl = document.getElementById('checkResults')
  const results = []
  const add = (name, pass, info = '') => {
    results.push({ name, pass, info })
  }
  try {
    // 1) URL check (localhost)
    add('Dev/Preview URL', /^http:\/\/(localhost|127\.0\.0\.1)(:\\d+)?$/.test(location.origin), location.origin)

    // 2) Service worker controller within 5s
    let swPass = false
    if ('serviceWorker' in navigator) {
      for (let i = 0; i < 10; i++) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 500))
        if (navigator.serviceWorker.controller) { swPass = true; break }
      }
    }
    add('Service Worker controller', swPass)

    // 3) Manifest link + fetch OK
    const link = document.querySelector('link[rel="manifest"]')
    let manifestOk = false
    if (link && link.href) {
      try {
        const r = await fetch(link.href, { cache: 'no-store' })
        manifestOk = r.ok
      } catch {}
    }
    add('Manifest přítomen a načten', manifestOk)

    // 4) Cache existence + index cached (CACHE_V1)
    let cachePass = false
    try {
      const keys = await caches.keys()
      const target = keys.find((k) => k === 'CACHE_V1')
      if (target) {
        const hit = await caches.match('/index.html')
        cachePass = !!hit
      }
    } catch {}
    add('Cache statických assetů', cachePass)

    // 5) localStorage R/W
    let lsPass = false
    try {
      const key = '__lexideck_test__'
      localStorage.setItem(key, 'ok')
      lsPass = localStorage.getItem(key) === 'ok'
      localStorage.removeItem(key)
    } catch {}
    add('localStorage R/W', lsPass)

    // 6) SheetJS
    add('SheetJS (XLSX) dostupný', !!window.XLSX)

    // 7) Excel zdroj: sample.xlsx fetch nebo file input
    let excelSource = false
    try {
      const r = await fetch('/data/sample.xlsx', { method: 'GET', cache: 'no-store' })
      excelSource = r.ok
    } catch {}
    if (!excelSource) excelSource = !!document.getElementById('fileInput')
    add('Excel zdroj dostupný', excelSource)

    // 8) Klávesové zkratky (flip)
    const card = document.getElementById('card')
    const before = card.classList.contains('flipped')
    const evt = new KeyboardEvent('keydown', { code: 'Space', key: ' ', bubbles: true })
    document.dispatchEvent(evt)
    const after = card.classList.contains('flipped')
    const keyPass = before !== after
    add('Klávesové zkratky (mezerník)', keyPass)

    // 9) Audio dostupné
    const audioAvail = !!window.Audio || !!window.speechSynthesis
    add('Audio / speechSynthesis', audioAvail)

    // 10) PWA offline – alespoň jeden hit v cache.match
    let offlinePass = false
    try {
      const hit = await caches.match('/index.html')
      offlinePass = !!hit
    } catch {}
    add('PWA offline (cache hit)', offlinePass)
  } finally {
    // render results
    resultsEl.innerHTML = results
      .map((r) => `<div style="color:${r.pass ? '#15803d' : '#dc2626'}">${r.pass ? 'PASS' : 'FAIL'} – ${r.name}${r.info ? ' (' + r.info + ')' : ''}</div>`) 
      .join('')
    console.log('Self-check summary:', results)
  }
}
