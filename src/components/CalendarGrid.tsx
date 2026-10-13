import { useRef, type PointerEvent as ReactPointerEvent, type MouseEvent as ReactMouseEvent } from 'react'
import { getCalendarSwipeDirection } from '../domain/calendarSwipe'
import { formatDate, monthGrid, monthTitle, sameMonth } from '../domain/date'
import { classifyCalendarDate } from '../domain/forecast'
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
  const statuses = days.map((date) => classifyCalendarDate(date, periods, forecast, today))
  const types = statuses.map((status) => status === 'actual' || status === 'predicted' ? status : 'none')
  const touchStart = useRef<{ pointerId: number; x: number; y: number; time: number } | null>(null)
  const suppressClickUntil = useRef(0)

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'touch' || !event.isPrimary) return
    touchStart.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, time: event.timeStamp }
  }

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = touchStart.current
    touchStart.current = null
    if (!start || start.pointerId !== event.pointerId) return
    const direction = getCalendarSwipeDirection(
      event.clientX - start.x,
      event.clientY - start.y,
      event.timeStamp - start.time
    )
    if (direction) {
      // The touch may still synthesize a click on a date after pointerup.
      suppressClickUntil.current = Date.now() + 450
      onMonthChange(direction)
    }
  }

  const onDayClickCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (Date.now() < suppressClickUntil.current) {
      event.preventDefault()
      event.stopPropagation()
    }
  }

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
      <div
        className="calendar-days"
        key={monthDate.slice(0, 7)}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { touchStart.current = null }}
        onClickCapture={onDayClickCapture}
      >
        {days.map((date, index) => {
          const type = types[index]
          const status = statuses[index]
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
              aria-label={`${formatDate(date)}${status === 'actual' ? '，实际经期' : status === 'predicted' ? '，预测经期' : status === 'uncertain' ? '，预测开始日期可能范围' : ''}${date === today ? '，今天' : ''}`}
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

