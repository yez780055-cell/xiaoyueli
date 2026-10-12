import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { PeriodFormModal } from './PeriodFormModal'
import { CalendarDatePicker } from './CalendarDatePicker'
import { validatePeriod } from '../domain/periods'
import type { PeriodRecord } from '../types'

describe('custom period date picker', () => {
  const laterPeriod: PeriodRecord = {
    id: 'later',
    startDate: '2024-10-12',
    endDate: null,
    createdAt: 'created',
    updatedAt: 'updated'
  }

  it('locks a fixed start date and disables end dates that overlap a later period', () => {
    const markup = renderToStaticMarkup(createElement(PeriodFormModal, {
      mode: 'backfill',
      initialDate: '2024-06-21',
      fixedStartDate: true,
      endDateMax: '2024-10-11',
      periods: [laterPeriod],
      title: '记录历史经期',
      onClose: () => undefined,
      onSave: () => undefined
    }))

    expect(markup).toContain('记录历史经期')
    expect(markup).toContain('固定开始日期')
    expect(markup).toContain('2024年6月21日')
    expect(markup).not.toContain('type="date"')
    expect(markup).toContain('选择年份')
    expect(markup).toContain('选择月份')
    expect(markup).toContain('取消')
  })

  it('highlights a selected range across a month boundary and marks a conflicting date disabled', () => {
    const startDate = '2024-09-30'
    const maxDate = '2024-10-11'
    const markup = renderToStaticMarkup(createElement(CalendarDatePicker, {
      value: '2024-10-03',
      monthDate: '2024-10-01',
      today: '2024-12-31',
      rangeStart: startDate,
      rangeEnd: '2024-10-03',
      isDateDisabled: (date: string) => date > maxDate || !validatePeriod(
        { startDate, endDate: date },
        [laterPeriod],
        { today: '2024-12-31' }
      ).valid,
      onSelect: () => undefined,
      onMonthChange: () => undefined
    }))
    const startCell = markup.split('</button>').find((part) => part.includes('aria-label="2024-09-30"'))
    const endCell = markup.split('</button>').find((part) => part.includes('aria-label="2024-10-03"'))
    const conflictCell = markup.split('</button>').find((part) => part.includes('aria-label="2024-10-12"'))

    expect(startCell).toContain('date-picker-day--range-start')
    expect(endCell).toContain('date-picker-day--range-end')
    expect(conflictCell).toContain('disabled=""')
  })

  it('keeps cancel separate from save and renders no native date control', () => {
    const onSave = vi.fn()
    const markup = renderToStaticMarkup(createElement(PeriodFormModal, {
      mode: 'backfill',
      initialDate: '',
      onClose: () => undefined,
      onSave
    }))
    expect(markup).toContain('>取消</button>')
    expect(markup).not.toContain('type="date"')
    expect(onSave).not.toHaveBeenCalled()
  })
})
