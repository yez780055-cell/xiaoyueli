import type { AppSettings, Forecast, PeriodRecord } from '../types'
import { daysBetween, formatDate, weekdayLabel } from '../domain/date'
import { classifyCalendarDate, forecastCountdown } from '../domain/forecast'
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
  onTogglePeriod,
  onBackfill
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
  onTogglePeriod: (date: string, enabled: boolean) => void
  onBackfill: () => void
}) {
  const active = getActivePeriod(periods)
  const selectedPeriod = getPeriodOnDate(periods, selectedDate, today)
  const selectedDateType = classifyCalendarDate(selectedDate, periods, forecast, today)
  const selectedForecast = selectedDateType === 'predicted'
  const selectedForecastWindow = selectedDateType === 'uncertain'
  const isFuture = selectedDate > today
  const hasRecords = periods.length > 0
  const toggleChecked = Boolean(selectedPeriod && selectedPeriod.endDate === null)
  const toggleDisabled = isFuture || Boolean(selectedPeriod?.endDate) || Boolean(active && !selectedPeriod)
  const completedLength = selectedPeriod?.endDate ? completedPeriodLength(selectedPeriod) : null
  const detailStatus = selectedPeriod
    ? selectedPeriod.endDate
      ? selectedDate === selectedPeriod.endDate
        ? '经期最后一天 · 共 ' + completedLength + ' 天'
        : '已结束的实际经期 · 共 ' + completedLength + ' 天'
      : '经期进行中 · 第 ' + (daysBetween(selectedPeriod.startDate, selectedDate) + 1) + ' 天'
    : selectedForecast
      ? '预计经期 · 非实际记录'
      : selectedForecastWindow
        ? '预测日期浮动范围 · 非经期标记'
        : isFuture
          ? '未来日期 · 不能记录'
          : active
            ? '已有经期进行中'
            : '尚无经期记录'
  const countdown = forecastCountdown(forecast)

  return (
    <main className="page-shell home-page page-enter">
      <header className="home-header">
        <div className="brand-lockup"><span className="brand-mark"><Icon name="calendar" size={21} /></span><span><strong>小月历</strong><small>她的周期记录</small></span></div>
        <div className="header-actions"><span className="local-badge"><i />本机保存</span><button className="icon-button header-stats" aria-label="周期统计与历史" onClick={onOpenStats}><Icon name="chart" size={20} /></button><button className="icon-button header-settings" aria-label="设置" onClick={onOpenSettings}><Icon name="settings" size={21} /></button></div>
      </header>

      {active ? (
        <section className="cycle-hero cycle-hero--actual card">
          <div className="cycle-hero-top"><span className="status-label"><i className="status-pulse" />经期进行中</span><span className="hero-soft-label">{forecast.status === 'ready' ? `下次 ${countdown}` : '今天自动记录'}</span></div>
          <div className="hero-mainline"><div><strong>第 {periodDayNumber(active, today)} 天</strong><p>从 {formatDate(active.startDate, false)} 开始 · 结束日期由你确认</p></div><span className="hero-symbol hero-symbol--pink"><Icon name="drop" size={24} /></span></div>
          <div className="progress-track"><span className="progress-pink" style={{ width: `${Math.min(100, Math.max(14, periodDayNumber(active, today) * 16))}%` }} /></div>
          <div className="hero-bottomline"><span>{formatDate(active.startDate, false)} — 今天</span><span>在日期详情中关闭开关以结束记录</span></div>
          {forecast.status === 'ready' ? (
            <div className="hero-prediction-note"><Icon name="info" size={14} /><span>下次预计 {forecast.expectedStart && formatDate(forecast.expectedStart, false)}（{countdown}）；可能提前至 {forecast.windowStart && formatDate(forecast.windowStart, false)}，推迟至 {forecast.windowEnd && formatDate(forecast.windowEnd, false)}。{forecast.reason}</span></div>
          ) : forecast.status === 'insufficient-data' ? <div className="hero-prediction-note"><Icon name="info" size={14} />{forecast.reason}</div> : null}
        </section>
      ) : !hasRecords ? (
        <section className="cycle-hero cycle-hero--empty card">
          <div className="empty-hero-mark"><Icon name="sparkle" size={22} /></div>
          <div className="empty-hero-copy"><span className="eyebrow">YOUR PRIVATE CYCLE JOURNAL</span><h1>还没有经期记录</h1><p>从今天开始记录，或补录一段已经发生的经期。</p></div>
          <div className="empty-hero-actions"><button className="button button-primary button-small" onClick={onStart}><Icon name="drop" size={16} />开始记录</button><button className="button button-soft button-small" onClick={onBackfill}><Icon name="plus" size={16} />补录历史</button></div>
        </section>
      ) : forecast.status === 'ready' ? (
        <section className="cycle-hero cycle-hero--forecast card">
          <div className="cycle-hero-top"><span className="status-label status-label--purple"><i />距下次经期</span><span className="hero-soft-label">{forecast.basis === 'history' ? `最近 ${forecast.sampleCount} 个周期中位数` : forecast.basis === 'recent-cycle' ? '依据最近一个周期' : '参考周期估算'}</span></div>
          <div className="hero-mainline"><div><strong>{countdown}</strong><p>预计 {forecast.expectedStart && formatDate(forecast.expectedStart)}</p></div><span className="hero-symbol hero-symbol--purple"><Icon name="sparkle" size={23} /></span></div>
          <div className="progress-track progress-track--purple"><span className="progress-purple" style={{ width: `${forecast.daysUntil !== null && forecast.daysUntil >= 0 ? Math.max(18, Math.min(100, 100 - forecast.daysUntil * 3)) : 100}%` }} /></div>
          <div className="hero-bottomline"><span>{forecast.windowStart && forecast.windowEnd ? `可能提前至 ${formatDate(forecast.windowStart, false)} · 推迟至 ${formatDate(forecast.windowEnd, false)}` : forecast.reason}</span><span className="confidence-label">{forecast.confidence === 'low' ? '低可信' : forecast.confidence === 'high' ? '较稳定' : '参考'}</span></div>
          {forecast.reason.includes('核实历史记录') && <div className="hero-prediction-note"><Icon name="info" size={14} />{forecast.reason}</div>}
        </section>
      ) : (
        <section className="cycle-hero cycle-hero--insufficient card">
          <div className="cycle-hero-top"><span className="status-label status-label--purple"><i />预测尚未形成</span><span className="hero-soft-label">只显示实际记录</span></div>
          <div className="insufficient-body"><span className="hero-symbol hero-symbol--purple"><Icon name="chart" size={22} /></span><div><strong>{forecast.reason}</strong><p>{settings.referenceCycleLength ? '可继续记录，让预测逐步依据真实周期校准。' : '你也可以在设置中填写参考周期，用作估算。'}</p></div></div>
        </section>
      )}

      <CalendarGrid monthDate={monthDate} selectedDate={selectedDate} today={today} periods={periods} forecast={forecast} onSelect={onSelectDate} onMonthChange={onMonthChange} />

      <section className="day-detail card" aria-live="polite">
        <div className="day-detail-heading">
          <div><span className="eyebrow">日期详情</span><h2>{formatDate(selectedDate, false)} <small>{weekdayLabel(selectedDate)}</small></h2></div>
        </div>
        <p className={['detail-status-copy', selectedPeriod ? 'detail-status-copy--actual' : selectedForecast || selectedForecastWindow ? 'detail-status-copy--forecast' : ''].filter(Boolean).join(' ')}>{detailStatus}</p>
        <div className="period-toggle-row">
          <span className="period-toggle-label">生理期</span>
          <button
            type="button"
            className={['period-toggle-switch', toggleChecked ? 'period-toggle-switch--on' : ''].filter(Boolean).join(' ')}
            role="switch"
            aria-label="生理期"
            aria-checked={toggleChecked}
            disabled={toggleDisabled}
            onClick={() => onTogglePeriod(selectedDate, !toggleChecked)}
          >
            <span />
          </button>
        </div>
      </section>

      <footer className="home-footer"><span>预测只作参考 · 记录仅保存在本机</span></footer>
    </main>
  )
}
