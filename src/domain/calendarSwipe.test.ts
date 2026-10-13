import { describe, expect, it } from 'vitest'
import { getCalendarSwipeDirection } from './calendarSwipe'

describe('calendar swipe navigation', () => {
  it('moves forward after a clear left swipe and backward after a right swipe', () => {
    expect(getCalendarSwipeDirection(-100, 4, 220)).toBe(1)
    expect(getCalendarSwipeDirection(95, -8, 300)).toBe(-1)
  })

  it('ignores taps, vertical scrolling, diagonal drags and long presses', () => {
    expect(getCalendarSwipeDirection(-15, 2, 160)).toBe(0)
    expect(getCalendarSwipeDirection(-65, 125, 160)).toBe(0)
    expect(getCalendarSwipeDirection(90, 78, 160)).toBe(0)
    expect(getCalendarSwipeDirection(-98, 0, 1500)).toBe(0)
  })
})
