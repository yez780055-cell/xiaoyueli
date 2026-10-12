import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PeriodFormModal } from './PeriodFormModal'

describe('fixed-start historical backfill form', () => {
  it('locks the selected start date and limits the end date to the supplied boundary', () => {
    const markup = renderToStaticMarkup(createElement(PeriodFormModal, {
      mode: 'backfill',
      initialDate: '2024-06-21',
      fixedStartDate: true,
      endDateMax: '2024-10-11',
      title: '记录历史经期',
      onClose: () => undefined,
      onSave: () => undefined
    }))

    expect(markup).toContain('记录历史经期')
    const startInput = markup.match(/id="period-start"[^>]*>/)?.[0]
    const endInput = markup.match(/id="period-end"[^>]*>/)?.[0]
    expect(startInput).toContain('value="2024-06-21"')
    expect(startInput).toContain('disabled=""')
    expect(endInput).toContain('min="2024-06-21"')
    expect(endInput).toContain('max="2024-10-11"')
  })
})
