import { monthGrid, parseLocalDate, sameMonth, shiftMonth } from '../domain/date'
import { Icon } from './Icon'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

export function CalendarDatePicker({
  value,
  monthDate,
  today,
  rangeStart,
  rangeEnd,
  isDateDisabled,
  onSelect,
  onMonthChange
}: {
  value: string
  monthDate: string
  today: string
  rangeStart?: string
  rangeEnd?: string
  isDateDisabled: (date: string) => boolean
  onSelect: (date: string) => void
  onMonthChange: (date: string) => void
}) {
  const date = parseLocalDate(monthDate)
  const currentMonth = monthDate.slice(0, 7)
  const currentYear = date.getFullYear()
  const minimumYear = value ? Math.min(1900, Number(value.slice(0, 4))) : 1900
  const latestYear = Number(today.slice(0, 4))
  const years = Array.from({ length: latestYear - minimumYear + 1 }, (_, index) => latestYear - index)
  const months = Array.from({ length: 12 }, (_, index) => index + 1)
  const atFirstMonth = currentMonth <= '1900-01'
  const atLastMonth = currentMonth >= today.slice(0, 7)

  const changeMonth = (year: number, month: number) => {
    const next = year + '-' + String(month).padStart(2, '0') + '-01'
    onMonthChange(next.slice(0, 7) > today.slice(0, 7) ? today : next)
  }

  return (
    <section className="date-picker" aria-label="选择日期">
      <div className="date-picker-toolbar">
        <button type="button" className="date-picker-nav" aria-label="上个月" disabled={atFirstMonth} onClick={() => onMonthChange(shiftMonth(monthDate, -1))}>
          <Icon name="chevron-left" size={18} />
        </button>
        <div className="date-picker-selects">
          <select aria-label="选择年份" value={currentYear} onChange={(event) => changeMonth(Number(event.target.value), date.getMonth() + 1)}>{years.map((year) => <option key={year} value={year}>{year}年</option>)}</select>
          <select aria-label="选择月份" value={date.getMonth() + 1} onChange={(event) => changeMonth(currentYear, Number(event.target.value))}>{months.map((month) => <option key={month} value={month} disabled={currentYear === Number(today.slice(0, 4)) && month > Number(today.slice(5, 7))}>{month}月</option>)}</select>
        </div>
        <button type="button" className="date-picker-nav" aria-label="下个月" disabled={atLastMonth} onClick={() => onMonthChange(shiftMonth(monthDate, 1))}>
          <Icon name="chevron-right" size={18} />
        </button>
      </div>
      <div className="date-picker-weekdays" aria-hidden="true">{WEEKDAYS.map((weekday, index) => <span className={index === 0 || index === 6 ? 'weekend' : ''} key={weekday}>{weekday}</span>)}</div>
      <div className="date-picker-days">
        {monthGrid(monthDate).map((day) => {
          const disabled = isDateDisabled(day)
          const inRange = Boolean(rangeStart && rangeEnd && day >= rangeStart && day <= rangeEnd)
          const selected = day === value
          const classes = [
            'date-picker-day',
            !sameMonth(day, monthDate) ? 'date-picker-day--outside' : '',
            inRange ? 'date-picker-day--range' : '',
            day === rangeStart ? 'date-picker-day--range-start' : '',
            day === rangeEnd ? 'date-picker-day--range-end' : '',
            selected ? 'date-picker-day--selected' : '',
            day === today ? 'date-picker-day--today' : '',
            disabled ? 'date-picker-day--disabled' : ''
          ].filter(Boolean).join(' ')
          return <button type="button" key={day} className={classes} disabled={disabled} title={disabled ? '与已有经期冲突或超出可选范围' : undefined} aria-label={day} aria-pressed={selected} onClick={() => onSelect(day)}><span>{parseLocalDate(day).getDate()}</span></button>
        })}
      </div>
      <div className="date-picker-hint"><span><i className="date-picker-swatch date-picker-swatch--range" />经期范围</span><span><i className="date-picker-swatch date-picker-swatch--disabled" />不可选日期</span></div>
    </section>
  )
}
