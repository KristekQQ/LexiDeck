/**
 * Shared HTMLAudioElement instance to avoid creating multiple elements.
 * @type {HTMLAudioElement|undefined}
 */
let sharedAudio

/**
 * Heuristic check whether a URL likely points to a direct audio file.
 * @param {string} url
 * @returns {boolean}
 */
function isLikelyAudioUrl(url) {
  try {
    const u = new URL(url, location.href)
    const ext = (u.pathname.split('.').pop() || '').toLowerCase()
    if (['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(ext)) return true
    if (/gstatic\.com/.test(u.hostname)) return true
    return false
  } catch {
    return false
  }
}

/**
 * Extracts `text` query param from Google Translate-like URLs.
 * @param {string} url
 * @param {string} [fallbackWord]
 * @returns {string}
 */
function extractWordFromUrl(url, fallbackWord) {
  try {
    const u = new URL(url, location.href)
    const t = u.searchParams.get('text')
    if (t) return decodeURIComponent(t)
  } catch {}
  return fallbackWord || ''
}

/**
 * Plays pronunciation from direct audio URL or falls back to TTS (speechSynthesis).
 * Never opens a new tab.
 * @param {string} url
 * @param {string} [fallbackWord]
 * @returns {Promise<void>}
 */
export async function playPronunciation(url, fallbackWord) {
  const text = extractWordFromUrl(url, fallbackWord)
  if (url && isLikelyAudioUrl(url)) {
    try {
      if (!sharedAudio) sharedAudio = new Audio()
      sharedAudio.pause()
      sharedAudio.src = url
      sharedAudio.crossOrigin = 'anonymous'
      await sharedAudio.play()
      return
    } catch {
      // fallthrough to TTS
    }
  }
  // Default: Web Speech API TTS on the word
  speak(text)
}

/** @type {SpeechSynthesisVoice|null} */
let cachedVoice = null
/**
 * Picks the best matching English voice if available.
 * @returns {SpeechSynthesisVoice|null}
 */
function pickVoice() {
  if (!('speechSynthesis' in window)) return null
  if (cachedVoice) return cachedVoice
  const voices = window.speechSynthesis.getVoices()
  cachedVoice =
    voices.find((v) => /en-US/i.test(v.lang)) ||
    voices.find((v) => /en-GB/i.test(v.lang)) ||
    voices.find((v) => /^en/i.test(v.lang)) ||
    null
  return cachedVoice
}

/**
 * Speaks a word using Web Speech API (en-US default, fallback to any English voice).
 * @param {string} word
 * @returns {void}
 */
export function speak(word) {
  if (!('speechSynthesis' in window)) return
  const text = String(word || '')
  if (!text) return
  const utter = new SpeechSynthesisUtterance(text)
  utter.lang = 'en-US'
  const voice = pickVoice()
  if (voice) utter.voice = voice
  // Ensure voices are available on some browsers
  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.onvoiceschanged = () => {
      const v = pickVoice()
      if (v) utter.voice = v
      window.speechSynthesis.speak(utter)
    }
    // In case onvoiceschanged never fires, try speak anyway
    window.speechSynthesis.speak(utter)
  } else {
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utter)
  }
}
