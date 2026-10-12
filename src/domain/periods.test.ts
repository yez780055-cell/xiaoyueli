import { describe, expect, it } from 'vitest'
import { getPeriodOnDate, togglePeriodForDate, validatePeriod, type PeriodToggleResult } from './periods'
import type { PeriodRecord } from '../types'

function period(id: string, startDate: string, endDate: string | null): PeriodRecord {
  return { id, startDate, endDate, createdAt: 'created', updatedAt: 'updated' }
}

const saved: PeriodRecord[] = [period('saved', '2024-03-02', '2024-03-06')]

function changed(result: PeriodToggleResult): Extract<PeriodToggleResult, { changed: true }> {
  if (!result.ok || !result.changed) throw new Error('Expected a period toggle change.')
  return result
}

describe('period validation', () => {
  it('rejects reversed dates and future records', () => {
    expect(validatePeriod({ startDate: '2024-03-07', endDate: '2024-03-06' }, saved, { today: '2024-03-10' }).valid).toBe(false)
    expect(validatePeriod({ startDate: '2024-03-11', endDate: null }, saved, { allowOngoing: true, today: '2024-03-10' }).valid).toBe(false)
  })

  it('rejects overlap, including sharing an endpoint', () => {
    expect(validatePeriod({ startDate: '2024-03-06', endDate: '2024-03-09' }, saved, { today: '2024-03-10' }).message).toContain('重叠')
    expect(validatePeriod({ startDate: '2024-03-07', endDate: '2024-03-09' }, saved, { today: '2024-03-10' }).valid).toBe(true)
  })

  it('allows editing the current record without conflicting with itself', () => {
    expect(validatePeriod({ startDate: '2024-03-01', endDate: '2024-03-05' }, saved, { excludeId: 'saved', today: '2024-03-10' }).valid).toBe(true)
  })

  it('allows only one ongoing record', () => {
    const ongoing = [...saved, period('b', '2024-03-08', null)]
    expect(validatePeriod({ startDate: '2024-03-10', endDate: null }, ongoing, { allowOngoing: true, today: '2024-03-10' }).valid).toBe(false)
  })
})

describe('period date toggle', () => {
  it('starts from the selected date and extends the actual period through today across months', () => {
    const today = '2024-04-02'
    const started = changed(togglePeriodForDate([], '2024-03-29', true, today))
    expect(started.action).toBe('started')
    expect(started.record.startDate).toBe('2024-03-29')
    expect(started.record.endDate).toBeNull()
    expect(getPeriodOnDate(started.periods, '2024-04-02', today)?.id).toBe(started.record.id)
    expect(getPeriodOnDate(started.periods, '2024-04-03', today)).toBeNull()
  })

  it('closes on the selected active date, keeps that end date included, and stops after it', () => {
    const today = '2024-04-02'
    const started = changed(togglePeriodForDate([], '2024-03-29', true, today))
    const ended = changed(togglePeriodForDate(started.periods, '2024-04-01', false, today))
    expect(ended.action).toBe('ended')
    expect(ended.record.endDate).toBe('2024-04-01')
    expect(getPeriodOnDate(ended.periods, '2024-04-01', today)?.id).toBe(ended.record.id)
    expect(getPeriodOnDate(ended.periods, '2024-04-02', today)).toBeNull()
  })

  it('allows a one-day record when the start date is immediately closed', () => {
    const started = changed(togglePeriodForDate([], '2024-03-10', true, '2024-03-10'))
    const ended = changed(togglePeriodForDate(started.periods, '2024-03-10', false, '2024-03-10'))
    expect(ended.record.startDate).toBe('2024-03-10')
    expect(ended.record.endDate).toBe('2024-03-10')
  })

  it('rejects future dates, overlaps, and attempts to add a second active period', () => {
    expect(togglePeriodForDate([], '2024-03-11', true, '2024-03-10').ok).toBe(false)
    expect(togglePeriodForDate(saved, '2024-03-05', true, '2024-03-10').ok).toBe(false)
    const ongoing = [period('ongoing', '2024-03-08', null)]
    const duplicate = togglePeriodForDate(ongoing, '2024-03-09', true, '2024-03-10')
    expect(duplicate.ok).toBe(true)
    if (duplicate.ok) expect(duplicate.changed).toBe(false)
    expect(togglePeriodForDate(ongoing, '2024-03-07', true, '2024-03-10').ok).toBe(false)
  })

  it('keeps completed historical dates read-only from the toggle', () => {
    expect(togglePeriodForDate(saved, '2024-03-03', true, '2024-03-10').ok).toBe(false)
    expect(togglePeriodForDate(saved, '2024-03-03', false, '2024-03-10').ok).toBe(false)
  })
})
