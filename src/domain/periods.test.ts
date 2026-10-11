import { describe, expect, it } from 'vitest'
import { validatePeriod } from './periods'
import type { PeriodRecord } from '../types'

const saved: PeriodRecord[] = [{ id: 'a', startDate: '2024-03-02', endDate: '2024-03-06', createdAt: '', updatedAt: '' }]

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
    expect(validatePeriod({ startDate: '2024-03-01', endDate: '2024-03-05' }, saved, { excludeId: 'a', today: '2024-03-10' }).valid).toBe(true)
  })

  it('allows only one ongoing record', () => {
    const ongoing = [...saved, { id: 'b', startDate: '2024-03-08', endDate: null, createdAt: '', updatedAt: '' }]
    expect(validatePeriod({ startDate: '2024-03-10', endDate: null }, ongoing, { allowOngoing: true, today: '2024-03-10' }).valid).toBe(false)
  })
})
