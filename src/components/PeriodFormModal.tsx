import { useState } from 'react'
import type { PeriodRecord } from '../types'
import { formatDate, localDateString } from '../domain/date'
import { validatePeriod } from '../domain/periods'
import { Icon } from './Icon'
import { Modal } from './Modal'
import { CalendarDatePicker } from './CalendarDatePicker'

export function PeriodFormModal({
  mode,
  record,
  initialDate,
  fixedStartDate = false,
  endDateMax,
  periods = [],
  title,
  onClose,
  onSave,
  onDelete
}: {
  mode: 'backfill' | 'edit'
  record?: PeriodRecord
  initialDate: string
  fixedStartDate?: boolean
  endDateMax?: string
  periods?: PeriodRecord[]
  title?: string
  onClose: () => void
  onSave: (startDate: string, endDate: string | null) => void
  onDelete?: () => void
}) {
  const today = localDateString()
  const initialStart = record?.startDate ?? initialDate
  const [startDate, setStartDate] = useState(initialStart)
  const [endDate, setEndDate] = useState(record ? (record.endDate ?? '') : '')
  const [ongoing, setOngoing] = useState(record?.endDate === null)
  const [activeField, setActiveField] = useState<'start' | 'end'>(fixedStartDate ? 'end' : 'start')
  const [monthDate, setMonthDate] = useState(initialStart || today)
  const [error, setError] = useState('')
  const modalTitle = title ?? (mode === 'backfill' ? '补录历史经期' : '编辑这段经期')
  const activeValue = activeField === 'start' ? startDate : endDate
  const maxEndDate = endDateMax ?? today

  const selectField = (field: 'start' | 'end') => {
    if (field === 'start' && fixedStartDate) return
    if (field === 'end' && ongoing) return
    setActiveField(field)
    setError('')
    const value = field === 'start' ? startDate : endDate
    setMonthDate(value || startDate || today)
  }

  const isDateDisabled = (date: string) => {
    if (date > today) return true
    if (activeField === 'end') {
      if (!startDate || date < startDate || date > maxEndDate) return true
      return !validatePeriod(
        { startDate, endDate: date },
        periods,
        { excludeId: record?.id, today }
      ).valid
    }
    return periods.some((period) => period.id !== record?.id &&
      period.startDate <= date && (period.endDate ?? today) >= date)
  }

  const chooseDate = (date: string) => {
    if (isDateDisabled(date)) return
    setError('')
    if (activeField === 'start') {
      setStartDate(date)
      if (endDate && endDate < date) setEndDate('')
      if (!ongoing) setActiveField('end')
    } else {
      setEndDate(date)
    }
    setMonthDate(date)
  }

  const toggleOngoing = () => {
    const next = !ongoing
    setOngoing(next)
    setActiveField(next ? 'start' : 'end')
    if (!next && !endDate) setMonthDate(startDate || today)
    setError('')
  }

  const submit = () => {
    if (!startDate || (!ongoing && !endDate)) {
      setError('请选择经期的开始和结束日期。')
      return
    }
    if (!ongoing && endDateMax && endDate > endDateMax) {
      setError('结束日期与后续经期重叠，请调整日期。')
      return
    }
    const validation = validatePeriod(
      { startDate, endDate: ongoing ? null : endDate },
      periods,
      { excludeId: record?.id, allowOngoing: mode === 'edit', today }
    )
    if (!validation.valid) {
      setError(validation.message ?? '请检查日期。')
      return
    }
    onSave(startDate, ongoing ? null : endDate)
  }

  const rangeEnd = endDate && !ongoing ? endDate : undefined

  return (
    <Modal title={modalTitle} onClose={onClose} size="wide">
      <div className="form-modal-content period-form-content">
        <p className="modal-description">{fixedStartDate ? '开始日期已固定，请选择结束日期。' : '选择开始日期，再选择结束日期；已有经期的日期不可选。'}</p>
        <div className="date-choice-row">
          <button type="button" className={['date-choice', activeField === 'start' ? 'date-choice--active' : '', fixedStartDate ? 'date-choice--fixed' : ''].filter(Boolean).join(' ')} onClick={() => selectField('start')} aria-pressed={activeField === 'start'} aria-label={fixedStartDate ? '固定开始日期' : '选择开始日期'} disabled={fixedStartDate}>
            <span>开始日期{fixedStartDate ? ' · 固定' : ''}</span><strong>{startDate ? formatDate(startDate) : '请选择'}</strong>
          </button>
          <button type="button" className={['date-choice', activeField === 'end' ? 'date-choice--active' : '', ongoing ? 'date-choice--disabled' : ''].filter(Boolean).join(' ')} onClick={() => selectField('end')} disabled={ongoing} aria-pressed={activeField === 'end'} aria-label="选择结束日期">
            <span>结束日期{ongoing ? ' · 进行中' : ''}</span><strong>{endDate ? formatDate(endDate) : '请选择'}</strong>
          </button>
        </div>
        {fixedStartDate && <p className="fixed-date-note">开始日期为首页所选日期：{formatDate(startDate)}</p>}
        <CalendarDatePicker
          value={activeValue}
          monthDate={monthDate}
          today={today}
          rangeStart={startDate || undefined}
          rangeEnd={rangeEnd}
          isDateDisabled={isDateDisabled}
          onSelect={chooseDate}
          onMonthChange={setMonthDate}
        />
        {mode === 'edit' && <button type="button" className={['ongoing-choice', ongoing ? 'ongoing-choice--active' : ''].filter(Boolean).join(' ')} aria-pressed={ongoing} onClick={toggleOngoing}><span className="checkbox-mark">{ongoing && <Icon name="check" size={13} />}</span><span><strong>这段经期仍在进行</strong><small>结束日期会自动延续到今天</small></span></button>}
        {error && <p className="form-error" role="alert">{error}</p>}
        {mode === 'edit' && onDelete && <button className="delete-record-link" onClick={onDelete}><Icon name="trash" size={16} />删除这段经期</button>}
        <div className="modal-actions date-picker-actions">
          <button className="button button-ghost" onClick={onClose}>取消</button>
          <button className="button button-primary" onClick={submit}><Icon name="check" size={17} />{mode === 'backfill' ? '保存记录' : '保存修改'}</button>
        </div>
      </div>
    </Modal>
  )
}

export function ConfirmRecordModal({
  kind,
  date,
  onClose,
  onConfirm
}: {
  kind: 'start' | 'end' | 'delete'
  date: string
  onClose: () => void
  onConfirm: () => void
}) {
  const content = {
    start: { title: '开始记录经期', body: '从 ' + formatDate(date) + ' 开始记录吗？记录会自动延续到今天，直到你手动确认结束。', action: '确认开始', icon: 'drop' as const },
    end: { title: '结束这段经期', body: '将 ' + formatDate(date) + ' 设为最后一天吗？', action: '确认结束', icon: 'check' as const },
    delete: { title: '删除这段记录', body: '删除后，日历、统计和预测会立即重新计算。此操作无法撤销。', action: '删除记录', icon: 'trash' as const }
  }[kind]
  return <Modal title={content.title} onClose={onClose}><div className="confirm-content"><span className={['confirm-icon', 'confirm-icon--' + kind].join(' ')}><Icon name={content.icon} size={23} /></span><p>{content.body}</p><div className="modal-actions"><button className="button button-ghost" onClick={onClose}>取消</button><button className={['button', kind === 'delete' ? 'button-danger' : 'button-primary'].join(' ')} onClick={onConfirm}>{content.action}</button></div></div></Modal>
}
