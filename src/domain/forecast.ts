import type { AppSettings, Forecast, PeriodRecord } from '../types'
import { addDays, daysBetween, localDateString } from './date'
import { average, completedPeriodLength, sortPeriods } from './periods'

export function calculateForecast(
  periods: PeriodRecord[],
  settings: Pick<AppSettings, 'referenceCycleLength' | 'referencePeriodLength'>,
  today = localDateString()
): Forecast {
  const sorted = sortPeriods(periods)
  if (sorted.length === 0) {
    return {
      status: 'no-records', reason: '先记录一次经期，才能确定预测起点。', expectedStart: null,
      windowStart: null, windowEnd: null, periodLength: null, averageCycle: null,
      daysUntil: null, basis: null, confidence: null
    }
  }

  const starts = sorted.map((period) => period.startDate)
  const intervals = starts.slice(1).map((start, index) => daysBetween(starts[index], start)).filter((days) => days > 0).slice(-6)
  const historicalAverage = average(intervals)
  const cycle = historicalAverage ?? settings.referenceCycleLength
  if (!cycle || cycle < 15 || cycle > 90) {
    return {
      status: 'insufficient-data', reason: '目前只有一次经期开始记录。再记录一次，或在设置中填写参考周期后即可预测。',
      expectedStart: null, windowStart: null, windowEnd: null, periodLength: null,
      averageCycle: null, daysUntil: null, basis: null, confidence: null
    }
  }

  const latestStart = starts[starts.length - 1]
  const expectedStart = addDays(latestStart, Math.round(cycle))
  const basis = historicalAverage === null ? 'reference' : 'history'
  let margin = basis === 'reference' ? 2 : 1
  if (intervals.length >= 2) {
    const spread = Math.max(...intervals) - Math.min(...intervals)
    margin = Math.max(1, Math.ceil(spread / 2))
  }

  const completedLengths = sorted.map(completedPeriodLength).filter((length): length is number => length !== null).slice(-6)
  const periodLength = average(completedLengths) ?? settings.referencePeriodLength
  const confidence = intervals.length >= 4 ? 'high' : intervals.length >= 2 ? 'medium' : 'low'
  return {
    status: 'ready',
    reason: basis === 'history' ? '根据近期实际周期估算。' : '记录尚少，按你设置的参考周期估算。',
    expectedStart,
    windowStart: addDays(expectedStart, -margin),
    windowEnd: addDays(expectedStart, margin),
    periodLength: periodLength ? Math.round(periodLength) : null,
    averageCycle: Math.round(cycle),
    daysUntil: daysBetween(today, expectedStart),
    basis,
    confidence
  }
}

export function isForecastDate(date: string, forecast: Forecast): boolean {
  if (forecast.status !== 'ready' || !forecast.windowStart || !forecast.windowEnd || !forecast.periodLength) return false
  const markedEnd = addDays(forecast.windowEnd, forecast.periodLength - 1)
  return date >= forecast.windowStart && date <= markedEnd
}

export function forecastCountdown(forecast: Forecast): string | null {
  if (forecast.status !== 'ready' || forecast.daysUntil === null) return null
  if (forecast.daysUntil < 0) return `已过预计日期 ${Math.abs(forecast.daysUntil)} 天`
  if (forecast.daysUntil === 0) return '预计今天开始'
  return `还有 ${forecast.daysUntil} 天`
}
