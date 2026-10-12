import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { calculateForecast } from '../domain/forecast'
import { defaultSettings } from '../domain/storage'
import type { PeriodRecord } from '../types'
import { HomePage } from './HomePage'

const today = '2024-10-12'
const endedPeriod: PeriodRecord = {
  id: 'period-october',
  startDate: '2024-10-03',
  endDate: '2024-10-07',
  createdAt: '2024-10-03T08:00:00.000Z',
  updatedAt: '2024-10-07T08:00:00.000Z'
}

function renderHome(selectedDate: string, period: PeriodRecord = endedPeriod): string {
  const settings = defaultSettings()
  const periods = [period]
  const forecast = calculateForecast(periods, settings, today)
  return renderToStaticMarkup(createElement(HomePage, {
    periods,
    settings,
    forecast,
    today,
    monthDate: '2024-10-01',
    selectedDate,
    onSelectDate: () => undefined,
    onMonthChange: () => undefined,
    onOpenStats: () => undefined,
    onOpenSettings: () => undefined,
    onStart: () => undefined,
    onTogglePeriod: () => undefined,
    onBackfill: () => undefined
  }))
}

function switchMarkup(markup: string): string {
  const button = markup.match(/<button\b(?=[^>]*\brole="switch")[^>]*>/)?.[0]
  if (!button) throw new Error('The period switch was not rendered.')
  return button
}

function selectedDayClass(markup: string): string {
  const button = markup.match(/<button class="([^"]*calendar-day--selected[^"]*)"[^>]*>/)
  if (!button) throw new Error('The selected calendar date was not rendered.')
  return button[1]
}

describe('HomePage period switch for completed history', () => {
  it('shows prior days as on and read-only, with the end date off and read-only', () => {
    for (const date of ['2024-10-03', '2024-10-06']) {
      const button = switchMarkup(renderHome(date))
      expect(button).toContain('aria-checked="true"')
      expect(button).toContain('disabled=""')
    }

    const endDay = switchMarkup(renderHome('2024-10-07'))
    expect(endDay).toContain('aria-checked="false"')
    expect(endDay).toContain('disabled=""')
  })

  it('keeps dates after the period off and includes the end date in the actual pink band', () => {
    const endDay = renderHome('2024-10-07')
    expect(switchMarkup(endDay)).toContain('aria-checked="false"')
    expect(selectedDayClass(endDay)).toContain('calendar-day--actual')

    const followingDay = renderHome('2024-10-08')
    expect(switchMarkup(followingDay)).toContain('aria-checked="false"')
    expect(selectedDayClass(followingDay)).not.toContain('calendar-day--actual')
  })

  it('keeps an ongoing period on and interactive through today', () => {
    const ongoing = { ...endedPeriod, endDate: null, updatedAt: '2024-10-12T08:00:00.000Z' }
    const button = switchMarkup(renderHome(today, ongoing))
    expect(button).toContain('aria-checked="true"')
    expect(button).not.toContain('disabled=""')
  })
})
