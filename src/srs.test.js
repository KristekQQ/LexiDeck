import { describe, it, expect } from 'vitest'
import { initCard, scheduleNext, pickNext, statsFor, INTERVALS_MS } from './srs.js'

describe('SRS Leitner', () => {
  it('initializes card in box 1 and due now', () => {
    const c = initCard({ english: 'test', translation: 'test' })
    expect(c.box).toBe(1)
    expect(c.dueAt).toBeTypeOf('number')
  })

  it('advances on correct and resets on wrong', () => {
    const now = Date.now()
    const c = initCard({ english: 'x', translation: 'y' })
    scheduleNext(c, true, now)
    expect(c.box).toBe(2)
    expect(c.dueAt).toBe(now + INTERVALS_MS[2])
    scheduleNext(c, false, now)
    expect(c.box).toBe(1)
    expect(c.dueAt).toBe(now + INTERVALS_MS[1])
  })

  it('picks due first, otherwise lowest box', () => {
    const now = Date.now()
    const a = initCard({ english: 'a', translation: 'a' }) // due now
    const b = initCard({ english: 'b', translation: 'b' })
    scheduleNext(b, true, now) // moves to box 2, due in future
    const pick = pickNext([a, b], now)
    expect(pick.english).toBe('a')
  })

  it('stats compute accuracy and due', () => {
    const now = Date.now()
    const a = initCard({ english: 'a', translation: 'a' })
    const b = initCard({ english: 'b', translation: 'b' })
    scheduleNext(a, true, now)
    scheduleNext(b, false, now)
    const s = statsFor([a, b], now)
    expect(s.total).toBe(2)
    expect(s.correct + s.wrong).toBe(2)
    expect(s.byBox[1] + s.byBox[2] + s.byBox[3] + s.byBox[4] + s.byBox[5]).toBe(2)
  })
})

