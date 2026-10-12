import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { StatsPage } from './StatsPage'

describe('single statistics overview', () => {
  it('shows the real summary, trends, recent history, and a separate history entry', () => {
    const markup = renderToStaticMarkup(createElement(StatsPage, {
      periods: [
        { id: 'one', startDate: '2024-05-01', endDate: '2024-05-05', createdAt: '', updatedAt: '' },
        { id: 'two', startDate: '2024-05-29', endDate: '2024-06-02', createdAt: '', updatedAt: '' }
      ],
      onBack: () => undefined,
      onBackfill: () => undefined,
      onEdit: () => undefined
    }))

    expect(markup).toContain('平均周期')
    expect(markup).toContain('平均经期')
    expect(markup).toContain('已保存记录')
    expect(markup).toContain('周期长度趋势')
    expect(markup).toContain('经期长度趋势')
    expect(markup).toContain('最近的经期')
    expect(markup).toContain('查看全部历史')
    expect(markup).not.toContain('role="tablist"')
    expect(markup).not.toContain('周期变化')
    expect(markup).toContain('2 次')
  })

  it('uses compact empty states instead of SVG charts with insufficient data', () => {
    const markup = renderToStaticMarkup(createElement(StatsPage, {
      periods: [],
      onBack: () => undefined,
      onBackfill: () => undefined,
      onEdit: () => undefined
    }))
    expect(markup.match(/class="chart-empty"/g)).toHaveLength(2)
    expect(markup).not.toContain('class="trend-chart"')
  })
})
