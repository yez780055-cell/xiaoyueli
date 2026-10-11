import { formatDate, monthGrid, monthTitle, sameMonth } from '../domain/date'
import { getPeriodOnDate } from '../domain/periods'
import { isForecastDate } from '../domain/forecast'
import type { Forecast, PeriodRecord } from '../types'
import { Icon } from './Icon'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

export function CalendarGrid({
  monthDate,
  selectedDate,
  today,
  periods,
  forecast,
  onSelect,
  onMonthChange
}: {
  monthDate: string
  selectedDate: string
  today: string
  periods: PeriodRecord[]
  forecast: Forecast
  onSelect: (date: string) => void
  onMonthChange: (amount: number) => void
}) {
  const days = monthGrid(monthDate)
  const types = days.map((date) => getPeriodOnDate(periods, date, today) ? 'actual' : isForecastDate(date, forecast) ? 'predicted' : 'none')

  return (
    <section className="calendar-card card" aria-label={`${monthTitle(monthDate)}月历`}>
      <div className="calendar-heading">
        <button className="icon-button" aria-label="上个月" onClick={() => onMonthChange(-1)}><Icon name="chevron-left" /></button>
        <h2>{monthTitle(monthDate)}</h2>
        <button className="icon-button" aria-label="下个月" onClick={() => onMonthChange(1)}><Icon name="chevron-right" /></button>
      </div>
      <div className="calendar-weekdays" aria-hidden="true">
        {WEEKDAYS.map((day, index) => <span className={index === 0 ? 'weekend-label' : ''} key={day}>{day}</span>)}
      </div>
      <div className="calendar-days">
        {days.map((date, index) => {
          const type = types[index]
          const row = Math.floor(index / 7)
          const previousSame = index % 7 > 0 && types[index - 1] === type && type !== 'none'
          const nextSame = index % 7 < 6 && types[index + 1] === type && type !== 'none'
          const inMonth = sameMonth(date, monthDate)
          const classes = [
            'calendar-day',
            !inMonth && 'calendar-day--outside',
            date === today && 'calendar-day--today',
            date === selectedDate && 'calendar-day--selected',
            type !== 'none' && `calendar-day--${type}`,
            type !== 'none' && !previousSame && 'calendar-day--range-start',
            type !== 'none' && !nextSame && 'calendar-day--range-end',
            index % 7 === 0 && 'calendar-day--sunday'
          ].filter(Boolean).join(' ')
          return (
            <button
              className={classes}
              key={`${row}-${date}`}
              aria-label={`${formatDate(date)}${type === 'actual' ? '，实际经期' : type === 'predicted' ? '，预测经期' : ''}${date === today ? '，今天' : ''}`}
              aria-pressed={date === selectedDate}
              onClick={() => onSelect(date)}
            >
              <span className="day-number">{Number(date.slice(-2))}</span>
              {date === today && <span className="today-dot" />}
            </button>
          )
        })}
      </div>
      <div className="calendar-legend">
        <span><i className="legend-dot legend-dot--actual" />实际经期</span>
        <span><i className="legend-dot legend-dot--predicted" />预测经期</span>
      </div>
    </section>
  )
}

