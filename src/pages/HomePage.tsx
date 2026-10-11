import type { AppSettings, Forecast, PeriodRecord } from '../types'
import { daysBetween, formatDate, weekdayLabel } from '../domain/date'
import { forecastCountdown, isForecastDate } from '../domain/forecast'
import { completedPeriodLength, getActivePeriod, getPeriodOnDate, periodDayNumber } from '../domain/periods'
import { CalendarGrid } from '../components/CalendarGrid'
import { Icon } from '../components/Icon'

export function HomePage({
  periods,
  settings,
  forecast,
  today,
  monthDate,
  selectedDate,
  onSelectDate,
  onMonthChange,
  onOpenStats,
  onOpenSettings,
  onStart,
  onEnd,
  onBackfill,
  onEdit,
  onShowMemo
}: {
  periods: PeriodRecord[]
  settings: AppSettings
  forecast: Forecast
  today: string
  monthDate: string
  selectedDate: string
  onSelectDate: (date: string) => void
  onMonthChange: (amount: number) => void
  onOpenStats: () => void
  onOpenSettings: () => void
  onStart: () => void
  onEnd: () => void
  onBackfill: () => void
  onEdit: (record: PeriodRecord) => void
  onShowMemo: () => void
}) {
  const active = getActivePeriod(periods)
  const selectedPeriod = getPeriodOnDate(periods, selectedDate, today)
  const selectedForecast = !selectedPeriod && isForecastDate(selectedDate, forecast)
  const isFuture = selectedDate > today
  const hasRecords = periods.length > 0
  const countdown = forecastCountdown(forecast)

  return (
    <main className="page-shell home-page page-enter">
      <header className="home-header">
        <div className="brand-lockup"><span className="brand-mark"><Icon name="calendar" size={21} /></span><span><strong>小月历</strong><small>她的周期记录</small></span></div>
        <div className="header-actions"><span className="local-badge"><i />本机保存</span><button className="icon-button header-settings" aria-label="设置" onClick={onOpenSettings}><Icon name="settings" size={21} /></button></div>
      </header>

      {active ? (
        <section className="cycle-hero cycle-hero--actual card">
          <div className="cycle-hero-top"><span className="status-label"><i className="status-pulse" />经期进行中</span><span className="hero-soft-label">{forecast.status === 'ready' ? `下次 ${countdown}` : '今天自动记录'}</span></div>
          <div className="hero-mainline"><div><strong>第 {periodDayNumber(active, today)} 天</strong><p>从 {formatDate(active.startDate, false)} 开始 · 结束日期由你确认</p></div><span className="hero-symbol hero-symbol--pink"><Icon name="drop" size={24} /></span></div>
          <div className="progress-track"><span className="progress-pink" style={{ width: `${Math.min(100, Math.max(14, periodDayNumber(active, today) * 16))}%` }} /></div>
          <div className="hero-bottomline"><span>{formatDate(active.startDate, false)} — 今天</span><button className="hero-action-link" onClick={onEnd}>今天结束经期 <Icon name="chevron-right" size={15} /></button></div>
          {forecast.status === 'insufficient-data' && <div className="hero-prediction-note"><Icon name="info" size={14} />{forecast.reason}</div>}
        </section>
      ) : !hasRecords ? (
        <section className="cycle-hero cycle-hero--empty card">
          <div className="empty-hero-mark"><Icon name="sparkle" size={22} /></div>
          <div className="empty-hero-copy"><span className="eyebrow">YOUR PRIVATE CYCLE JOURNAL</span><h1>还没有经期记录</h1><p>从今天开始记录，或补录一段已经发生的经期。</p></div>
          <div className="empty-hero-actions"><button className="button button-primary button-small" onClick={onStart}><Icon name="drop" size={16} />开始记录</button><button className="button button-soft button-small" onClick={onBackfill}><Icon name="plus" size={16} />补录历史</button></div>
        </section>
      ) : forecast.status === 'ready' ? (
        <section className="cycle-hero cycle-hero--forecast card">
          <div className="cycle-hero-top"><span className="status-label status-label--purple"><i />距下次经期</span><span className="hero-soft-label">{forecast.basis === 'history' ? '根据实际记录' : '参考估算'}</span></div>
          <div className="hero-mainline"><div><strong>{countdown}</strong><p>预计 {forecast.expectedStart && formatDate(forecast.expectedStart)}</p></div><span className="hero-symbol hero-symbol--purple"><Icon name="sparkle" size={23} /></span></div>
          <div className="progress-track progress-track--purple"><span className="progress-purple" style={{ width: `${forecast.daysUntil !== null && forecast.daysUntil >= 0 ? Math.max(18, Math.min(100, 100 - forecast.daysUntil * 3)) : 100}%` }} /></div>
          <div className="hero-bottomline"><span>{forecast.windowStart && forecast.windowEnd ? `预计范围 ${formatDate(forecast.windowStart, false)} — ${formatDate(forecast.windowEnd, false)}` : forecast.reason}</span><span className="confidence-label">{forecast.confidence === 'low' ? '估算' : forecast.confidence === 'high' ? '较稳定' : '参考'}</span></div>
        </section>
      ) : (
        <section className="cycle-hero cycle-hero--insufficient card">
          <div className="cycle-hero-top"><span className="status-label status-label--purple"><i />预测尚未形成</span><span className="hero-soft-label">只显示实际记录</span></div>
          <div className="insufficient-body"><span className="hero-symbol hero-symbol--purple"><Icon name="chart" size={22} /></span><div><strong>{forecast.reason}</strong><p>{settings.referenceCycleLength ? '可继续记录，让预测逐步依据真实周期校准。' : '你也可以在设置中填写参考周期，用作估算。'}</p></div></div>
        </section>
      )}

      <CalendarGrid monthDate={monthDate} selectedDate={selectedDate} today={today} periods={periods} forecast={forecast} onSelect={onSelectDate} onMonthChange={onMonthChange} />

      <section className="day-detail card" aria-live="polite">
        <div className="day-detail-heading"><div><span className="eyebrow">日期详情</span><h2>{formatDate(selectedDate, false)} <small>{weekdayLabel(selectedDate)}</small></h2></div><span className={`detail-date-mark ${selectedPeriod ? 'detail-date-mark--actual' : selectedForecast ? 'detail-date-mark--forecast' : ''}`}><Icon name={selectedPeriod ? 'drop' : selectedForecast ? 'sparkle' : 'calendar'} size={21} /></span></div>
        {selectedPeriod ? (
          <>
            <div className="detail-status-line"><span className="record-bullet record-bullet--actual" />{selectedPeriod.endDate ? `实际经期 · 共 ${completedPeriodLength(selectedPeriod)} 天` : `经期进行中 · 第 ${Math.max(1, daysBetween(selectedPeriod.startDate, selectedDate) + 1)} 天`}</div>
            <div className="detail-lines"><span>开始日期</span><strong>{formatDate(selectedPeriod.startDate)}</strong><span>结束日期</span><strong>{selectedPeriod.endDate ? formatDate(selectedPeriod.endDate) : '尚未结束 · 自动记录至今天'}</strong><span>记录类型</span><strong>实际记录</strong></div>
            {selectedPeriod.id === active?.id && <button className="button button-primary detail-primary-action" onClick={onEnd}>今天结束经期</button>}
            <button className="button button-outline detail-secondary-action" onClick={() => onEdit(selectedPeriod)}><Icon name="edit" size={16} />编辑这段经期</button>
          </>
        ) : selectedForecast ? (
          <>
            <div className="detail-status-line detail-status-line--purple"><span className="record-bullet record-bullet--forecast" />预测经期 · 不是实际记录</div>
            <div className="forecast-detail-note"><Icon name="info" size={17} /><span>预计开始 {forecast.expectedStart && formatDate(forecast.expectedStart)}<small>{forecast.windowStart && forecast.windowEnd ? `可能范围 ${formatDate(forecast.windowStart, false)} — ${formatDate(forecast.windowEnd, false)}` : forecast.reason}</small></span></div>
            {forecast.periodLength && <p className="prediction-duration">预计持续约 {forecast.periodLength} 天，仅供参考。</p>}
          </>
        ) : isFuture ? (
          <div className="empty-detail"><span>这一天还没有记录</span><p>未来日期不会被标记为实际经期。</p></div>
        ) : (
          <>
            <div className="empty-detail"><span>{selectedDate === today ? '今天还没有经期记录' : '这一天没有经期记录'}</span><p>实际记录由你确认；预测日期会用浅紫色单独显示。</p></div>
            {selectedDate === today && !active && <button className="button button-primary detail-primary-action" onClick={onStart}><Icon name="drop" size={17} />从今天开始记录</button>}
            {selectedDate < today && <button className="button button-outline detail-secondary-action" onClick={onBackfill}><Icon name="plus" size={16} />补录历史经期</button>}
          </>
        )}
        {settings.careMemo.trim() && <button className="care-memo-link" onClick={onShowMemo}><span><Icon name="heart" size={16} />她的关怀备忘</span><Icon name="chevron-right" size={16} /></button>}
      </section>

      <button className="stats-link-card card" onClick={onOpenStats}><span className="stats-link-icon"><Icon name="chart" size={19} /></span><span><strong>周期统计与历史</strong><small>查看真实记录与变化趋势</small></span><Icon name="chevron-right" size={18} /></button>
      <footer className="home-footer"><span>预测只作参考 · 记录仅保存在本机</span><button onClick={onOpenSettings}>隐私与设置</button></footer>
    </main>
  )
}
