import { describe, expect, it } from 'vitest'
import { resolveAndroidBackAction } from './androidBack'

describe('Android system Back navigation', () => {
  it('returns through history and page layers before exit', () => {
    expect(resolveAndroidBackAction('stats', true, 0, 1000)).toBe('history-back')
    expect(resolveAndroidBackAction('stats', false, 0, 1000)).toBe('history-back')
    expect(resolveAndroidBackAction('settings', false, 0, 1000)).toBe('history-back')
  })

  it('requires a second Back press within two seconds on the calendar home page', () => {
    expect(resolveAndroidBackAction('calendar', false, 0, 1000)).toBe('confirm-exit')
    expect(resolveAndroidBackAction('calendar', false, 1000, 1900)).toBe('exit')
    expect(resolveAndroidBackAction('calendar', false, 1000, 4000)).toBe('confirm-exit')
  })
})
