import { useEffect, useMemo, useState } from 'react'
import type { PeriodRecord } from '../types'
import { average, completedPeriodLength, sortPeriods } from '../domain/periods'
import { daysBetween, formatDate, formatShortRange } from '../domain/date'
import { Icon } from '../components/Icon'

export function StatsPage({
  periods,
  onBack,
  onBackfill,
  onEdit
}: {
  periods: PeriodRecord[]
  onBack: () => void
  onBackfill: () => void
  onEdit: (record: PeriodRecord) => void
}) {
  const [showHistory, setShowHistory] = useState(false)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state as { app?: string; page?: string; statsSubpage?: string } | null
      setShowHistory(state?.app === 'xiaoyueli' && state.page === 'stats' && state.statsSubpage === 'history')
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const openHistory = () => {
    window.history.pushState({ app: 'xiaoyueli', page: 'stats', statsSubpage: 'history' }, '', window.location.href)
    setShowHistory(true)
  }

  const returnToOverview = () => {
    const state = window.history.state as { statsSubpage?: string } | null
    if (state?.statsSubpage === 'history') window.history.back()
    else setShowHistory(false)
  }
  const sorted = useMemo(() => sortPeriods(periods), [periods])
  const intervals = useMemo(() => sorted.slice(1).map((period, index) => daysBetween(sorted[index].startDate, period.startDate)).filter((value) => value > 0).slice(-6), [sorted])
  const lengths = useMemo(() => sorted.map(completedPeriodLength).filter((value): value is number => value !== null).slice(-6), [sorted])
  const averageCycle = average(intervals)
  const averageLength = average(lengths)
  const recent = [...sorted].reverse()

  return (
    <main className="page-shell secondary-page page-enter">
      <header className="subpage-header">
        <button className="icon-button" aria-label={showHistory ? '返回统计概览' : '返回日历'} onClick={showHistory ? returnToOverview : onBack}><Icon name="arrow-left" /></button>
        <div><span className="eyebrow">CYCLE JOURNAL</span><h1>{showHistory ? '历史记录' : '周期统计'}</h1></div>
        <div className="header-spacer" />
      </header>

      {showHistory ? (
        <section className="stats-content page-enter">
          <div className="history-heading"><div><span className="eyebrow">SAVED RECORDS</span><h2>经期记录</h2></div><button className="button button-soft button-small" onClick={onBackfill}><Icon name="plus" size={16} />补录</button></div>
          {recent.length === 0 ? (
            <EmptyState icon="calendar" title="还没有历史记录" text="补录已发生的经期后，统计和预测会逐步形成。" action="补录历史经期" onAction={onBackfill} />
          ) : (
            <div className="history-list card">
              {recent.map((record) => {
                const length = completedPeriodLength(record)
                return (
                  <button className="history-row" key={record.id} onClick={() => onEdit(record)}>
                    <span className="history-mark"><Icon name="drop" size={17} /></span>
                    <span className="history-main"><strong>{formatShortRange(record.startDate, record.endDate)}</strong><small>{record.endDate ? formatDate(record.startDate) : '进行中 · 自动记录至今天'}</small></span>
                    <span className="history-length">{length ? length + ' 天' : '进行中'}</span>
                    <Icon name="chevron-right" size={17} className="history-chevron" />
                  </button>
                )
              })}
            </div>
          )}
          {recent.length > 0 && <p className="quiet-note">记录按开始日期排列。点击一条记录可修改或删除。</p>}
        </section>
      ) : (
        <section className="stats-content page-enter">
          <div className="stats-summary-grid">
            <MetricCard icon="refresh" label="平均周期" value={averageCycle === null ? '—' : Math.round(averageCycle) + ' 天'} note={intervals.length ? '基于最近 ' + intervals.length + ' 个周期' : '记录至少两次开始日期'} tint="lavender" />
            <MetricCard icon="drop" label="平均经期" value={averageLength === null ? '—' : averageLength.toFixed(1) + ' 天'} note={lengths.length ? '基于最近 ' + lengths.length + ' 次已结束记录' : '结束经期后开始统计'} tint="pink" />
            <MetricCard icon="calendar" label="已保存记录" value={periods.length + ' 次'} note={periods.some((period) => period.endDate === null) ? '包含一段进行中的经期' : '仅统计你保存的记录'} tint="cream" />
          </div>
          <TrendCard title="周期长度趋势" unit="天" values={intervals} emptyText="再记录几次经期开始日期后，这里会显示真实趋势。" />
          <TrendCard title="经期长度趋势" unit="天" values={lengths} bar emptyText="结束并保存经期后，这里会显示真实趋势。" />
          <HistoryPreview records={recent.slice(0, 3)} onEdit={onEdit} onMore={openHistory} onBackfill={onBackfill} />
        </section>
      )}
    </main>
  )
}

function MetricCard({ icon, label, value, note, tint }: { icon: 'refresh' | 'drop' | 'calendar'; label: string; value: string; note: string; tint: string }) {
  return <article className={['metric-card', 'metric-card--' + tint].join(' ')}><span className="metric-icon"><Icon name={icon} size={18} /></span><span className="metric-label">{label}</span><strong>{value}</strong><small>{note}</small></article>
}

function TrendCard({ title, unit, values, bar = false, emptyText }: { title: string; unit: string; values: number[]; bar?: boolean; emptyText: string }) {
  const enough = values.length >= 2
  const width = 320
  const height = 144
  const left = 27
  const right = 303
  const top = 20
  const bottom = 112
  const min = values.length ? Math.min(...values) : 0
  const max = values.length ? Math.max(...values) : 1
  const pad = Math.max(2, (max - min) * 0.35)
  const low = min - pad
  const high = max + pad
  const point = (value: number, index: number) => ({
    x: values.length <= 1 ? (left + right) / 2 : left + (right - left) * index / (values.length - 1),
    y: bottom - ((value - low) / (high - low)) * (bottom - top)
  })
  const points = values.map(point)
  const line = points.map((item) => item.x + ',' + item.y).join(' ')

  return (
    <article className="trend-card card">
      <div className="trend-card-heading"><h3>{title}</h3><span>单位：{unit}</span></div>
      {!enough ? (
        <div className="chart-empty"><span className="chart-empty-symbol"><Icon name="chart" size={18} /></span><p>{values.length === 1 ? '已记录 1 个数据点' : emptyText}</p></div>
      ) : (
        <div className="chart-wrap">
          <svg className="trend-chart" viewBox={'0 0 ' + width + ' ' + (height + 24)} role="img" aria-label={title + '数据为：' + values.map((value) => value + unit).join('、')}>
            {[0, 1, 2, 3].map((lineIndex) => {
              const y = top + ((bottom - top) / 3) * lineIndex
              const value = Math.round(high - ((high - low) / 3) * lineIndex)
              return <g key={lineIndex}><line x1={left} y1={y} x2={right} y2={y} className="chart-gridline"/><text x="2" y={y + 3} className="chart-axis-label">{value}</text></g>
            })}
            {!bar && <polyline points={line} className="chart-line" />}
            {points.map((item, index) => bar ? (
              <g key={index}><rect x={item.x - 9} y={item.y} width="18" height={bottom - item.y} rx="7" className="chart-bar"/><text x={item.x} y={item.y - 7} textAnchor="middle" className="chart-value">{values[index]}</text><text x={item.x} y="133" textAnchor="middle" className="chart-point-label">第{index + 1}次</text></g>
            ) : (
              <g key={index}><circle cx={item.x} cy={item.y} r="4" className="chart-point"/><text x={item.x} y={item.y - 10} textAnchor="middle" className="chart-value">{values[index]}</text><text x={item.x} y="133" textAnchor="middle" className="chart-point-label">第{index + 1}次</text></g>
            ))}
          </svg>
        </div>
      )}
      {enough && <div className="trend-footnote">最近 {values.length} 次实际记录</div>}
    </article>
  )
}

function HistoryPreview({ records, onEdit, onMore, onBackfill }: { records: PeriodRecord[]; onEdit: (record: PeriodRecord) => void; onMore: () => void; onBackfill: () => void }) {
  return (
    <section className="history-preview-section">
      <div className="history-heading"><h3>最近的经期</h3><button className="text-button" onClick={onMore}>查看全部历史 <Icon name="chevron-right" size={15} /></button></div>
      {records.length === 0 ? <EmptyState icon="book" title="还没有经期记录" text="你的每一条记录都会来自手动记录或补录。" action="补录历史经期" onAction={onBackfill} /> : (
        <div className="history-list card">
          {records.map((record) => {
            const length = completedPeriodLength(record)
            return <button className="history-row" key={record.id} onClick={() => onEdit(record)}><span className="history-mark"><Icon name="drop" size={17} /></span><span className="history-main"><strong>{formatShortRange(record.startDate, record.endDate)}</strong><small>{record.endDate ? '已结束的经期' : '进行中'}</small></span><span className="history-length">{length ? length + ' 天' : '进行中'}</span><Icon name="chevron-right" size={17} className="history-chevron" /></button>
          })}
        </div>
      )}
    </section>
  )
}

export function EmptyState({ icon, title, text, action, onAction }: { icon: 'calendar' | 'book' | 'chart'; title: string; text: string; action?: string; onAction?: () => void }) {
  return (
    <div className="empty-state card"><span className="empty-state-icon"><Icon name={icon} size={23} /></span><h3>{title}</h3><p>{text}</p>{action && onAction && <button className="button button-primary button-small" onClick={onAction}><Icon name="plus" size={16} />{action}</button>}</div>
  )
}
