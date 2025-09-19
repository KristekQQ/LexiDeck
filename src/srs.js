/**
 * Leitner box review intervals in milliseconds.
 * @type {{1:number,2:number,3:number,4:number,5:number}}
 */
const BOX_INTERVALS_MS = {
  1: 0, // ihned
  2: 10 * 60 * 1000, // 10 min
  3: 60 * 60 * 1000, // 1 hod
  4: 24 * 60 * 60 * 1000, // 1 den
  5: 3 * 24 * 60 * 60 * 1000 // 3 dny
}

/**
 * Normalizes the unique identifier for a card based on english term.
 * @param {string} english
 * @returns {string}
 */
export function normalizeId(english) {
  return String(english || '').trim().toLowerCase()
}

/**
 * @typedef {Object} Card
 * @property {string} id
 * @property {string} english
 * @property {string} translation
 * @property {string} pronunciationUrl
 * @property {number} box
 * @property {number|null} lastReviewedAt
 * @property {number} correctCount
 * @property {number} wrongCount
 * @property {number} dueAt
 */

/**
 * Initializes a new card from parsed row.
 * @param {{english?:string, translation?:string, pronunciationUrl?:string}} row
 * @returns {Card}
 */
export function initCard(row) {
  const now = Date.now()
  return {
    id: normalizeId(row.english),
    english: row.english || '',
    translation: row.translation || '',
    pronunciationUrl: row.pronunciationUrl || '',
    box: 1,
    lastReviewedAt: null,
    correctCount: 0,
    wrongCount: 0,
    dueAt: now
  }
}

/**
 * Schedules next review of card based on result.
 * @param {Card} card
 * @param {boolean} wasCorrect
 * @param {number} [now]
 * @returns {Card}
 */
export function scheduleNext(card, wasCorrect, now = Date.now()) {
  let nextBox
  if (wasCorrect) {
    nextBox = Math.min(5, (card.box || 1) + 1)
    card.correctCount = (card.correctCount || 0) + 1
  } else {
    nextBox = 1
    card.wrongCount = (card.wrongCount || 0) + 1
  }
  card.box = nextBox
  card.lastReviewedAt = now
  const interval = BOX_INTERVALS_MS[nextBox] || 0
  card.dueAt = now + interval
  return card
}

/**
 * Whether a card is due for review at given time.
 * @param {Card} card
 * @param {number} [now]
 * @returns {boolean}
 */
export function isDue(card, now = Date.now()) {
  return (card.dueAt || 0) <= now
}

/**
 * Picks next card to review: due items first (lowest box), otherwise from lowest available box.
 * @param {Card[]} cards
 * @param {number} [now]
 * @returns {Card|null}
 */
export function pickNext(cards, now = Date.now()) {
  if (!cards || cards.length === 0) return null
  const due = cards.filter((c) => isDue(c, now))
  if (due.length > 0) {
    // Prefer lowest box among due, then random
    const minBox = Math.min(...due.map((c) => c.box || 1))
    const pool = due.filter((c) => (c.box || 1) === minBox)
    return pool[Math.floor(Math.random() * pool.length)]
  }
  // No due: take the lowest available box
  const minBox = Math.min(...cards.map((c) => c.box || 1))
  const pool = cards.filter((c) => (c.box || 1) === minBox)
  return pool[Math.floor(Math.random() * pool.length)]
}

/**
 * Computes basic statistics for a set of cards.
 * @param {Card[]} cards
 * @param {number} [now]
 * @returns {{total:number, correct:number, wrong:number, accuracy:number, byBox:Record<1|2|3|4|5,number>, due:number}}
 */
export function statsFor(cards, now = Date.now()) {
  const total = cards.length
  const correct = cards.reduce((a, c) => a + (c.correctCount || 0), 0)
  const wrong = cards.reduce((a, c) => a + (c.wrongCount || 0), 0)
  const byBox = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  let due = 0
  for (const c of cards) {
    const b = c.box || 1
    byBox[b] = (byBox[b] || 0) + 1
    if (isDue(c, now)) due++
  }
  const answered = correct + wrong
  const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0
  return { total, correct, wrong, accuracy, byBox, due }
}

/**
 * Exported intervals for external tests.
 * @type {{1:number,2:number,3:number,4:number,5:number}}
 */
export const INTERVALS_MS = BOX_INTERVALS_MS
