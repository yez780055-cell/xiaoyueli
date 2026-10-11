import type { PeriodRecord } from '../types'
import { daysBetween, daysInPeriod, isValidDateString, localDateString } from './date'

export interface PeriodValidation {
  valid: boolean
  message?: string
}

export function validatePeriod(
  candidate: Pick<PeriodRecord, 'startDate' | 'endDate'>,
  periods: PeriodRecord[],
  options: { excludeId?: string; allowOngoing?: boolean; today?: string } = {}
): PeriodValidation {
  const today = options.today ?? localDateString()
  if (!isValidDateString(candidate.startDate)) return { valid: false, message: '请选择有效的开始日期。' }
  if (candidate.endDate && !isValidDateString(candidate.endDate)) return { valid: false, message: '请选择有效的结束日期。' }
  if (!candidate.endDate && !options.allowOngoing) return { valid: false, message: '请填写结束日期。' }
  if (candidate.endDate && candidate.startDate > candidate.endDate) {
    return { valid: false, message: '结束日期不能早于开始日期。' }
  }
  if (candidate.startDate > today || (candidate.endDate && candidate.endDate > today)) {
    return { valid: false, message: '经期记录不能晚于今天。' }
  }
  if (!candidate.endDate && periods.some((period) => period.endDate === null && period.id !== options.excludeId)) {
    return { valid: false, message: '已有一段进行中的经期，请先结束它再记录新的经期。' }
  }

  const candidateEnd = candidate.endDate ?? today
  const conflict = periods.some((period) => {
    if (period.id === options.excludeId) return false
    const existingEnd = period.endDate ?? today
    return candidate.startDate <= existingEnd && period.startDate <= candidateEnd
  })
  if (conflict) return { valid: false, message: '这段日期与已有经期重叠，请检查后再保存。' }
  return { valid: true }
}

export function getActivePeriod(periods: PeriodRecord[]): PeriodRecord | null {
  return periods.find((period) => period.endDate === null) ?? null
}

export function getPeriodOnDate(periods: PeriodRecord[], date: string, today = localDateString()): PeriodRecord | null {
  return periods.find((period) => period.startDate <= date && (period.endDate ?? today) >= date) ?? null
}

export function periodDayNumber(period: PeriodRecord, today = localDateString()): number {
  return daysBetween(period.startDate, period.endDate ?? today) + 1
}

export function completedPeriodLength(period: PeriodRecord): number | null {
  return period.endDate ? daysInPeriod(period.startDate, period.endDate) : null
}

export function sortPeriods(periods: PeriodRecord[]): PeriodRecord[] {
  return [...periods].sort((a, b) => a.startDate.localeCompare(b.startDate))
}

export function createPeriod(startDate: string, endDate: string | null = null): PeriodRecord {
  const now = new Date().toISOString()
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `period-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    startDate,
    endDate,
    createdAt: now,
    updatedAt: now
  }
}

export function average(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}
