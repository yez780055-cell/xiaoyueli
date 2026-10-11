import { describe, expect, it } from 'vitest'
import { calculateForecast, isForecastDate } from './forecast'
import type { AppSettings, PeriodRecord } from '../types'

const settings: Pick<AppSettings, 'referenceCycleLength' | 'referencePeriodLength'> = {
  referenceCycleLength: null,
  referencePeriodLength: null
}

function period(id: string, startDate: string, endDate: string | null): PeriodRecord {
  return { id, startDate, endDate, createdAt: '', updatedAt: '' }
}

describe('period forecast', () => {
  it('does not invent a prediction when there are no records or only one start date', () => {
    expect(calculateForecast([], settings, '2024-03-10').status).toBe('no-records')
    expect(calculateForecast([period('1', '2024-02-01', '2024-02-05')], settings, '2024-03-10').status).toBe('insufficient-data')
  })

  it('uses recorded start intervals and completed lengths', () => {
    const result = calculateForecast([
      period('1', '2024-01-01', '2024-01-05'),
      period('2', '2024-01-29', '2024-02-02'),
      period('3', '2024-02-26', null)
    ], settings, '2024-03-01')
    expect(result.status).toBe('ready')
    expect(result.expectedStart).toBe('2024-03-25')
    expect(result.periodLength).toBe(5)
    expect(result.basis).toBe('history')
    expect(result.daysUntil).toBe(24)
  })

  it('uses explicit reference values only as a labeled estimate', () => {
    const result = calculateForecast([period('1', '2024-02-01', '2024-02-05')], {
      referenceCycleLength: 28, referencePeriodLength: 5
    }, '2024-02-10')
    expect(result.status).toBe('ready')
    expect(result.basis).toBe('reference')
    expect(result.confidence).toBe('low')
    expect(isForecastDate('2024-02-29', result)).toBe(true)
  })
})
