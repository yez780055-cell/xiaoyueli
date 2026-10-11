import { useState } from 'react'
import type { PeriodRecord } from '../types'
import { formatDate, localDateString } from '../domain/date'
import { Icon } from './Icon'
import { Modal } from './Modal'

export function PeriodFormModal({
  mode,
  record,
  initialDate,
  onClose,
  onSave,
  onDelete
}: {
  mode: 'backfill' | 'edit'
  record?: PeriodRecord
  initialDate: string
  onClose: () => void
  onSave: (startDate: string, endDate: string | null) => void
  onDelete?: () => void
}) {
  const today = localDateString()
  const [startDate, setStartDate] = useState(record ? record.startDate : initialDate)
  const [endDate, setEndDate] = useState(record ? (record.endDate ?? '') : (mode === 'backfill' ? '' : initialDate))
  const [ongoing, setOngoing] = useState(record?.endDate === null)
  const [error, setError] = useState('')
  const title = mode === 'backfill' ? '补录历史经期' : '编辑这段经期'

  const submit = () => {
    if (!startDate || (!ongoing && !endDate)) {
      setError('请选择经期的开始和结束日期。')
      return
    }
    if (startDate > today || (!ongoing && endDate > today)) {
      setError('只能记录今天或之前发生的日期。')
      return
    }
    if (!ongoing && startDate > endDate) {
      setError('结束日期不能早于开始日期。')
      return
    }
    onSave(startDate, ongoing ? null : endDate)
  }

  return (
    <Modal title={title} onClose={onClose}>
      <div className="form-modal-content">
        <p className="modal-description">日期会立即用于更新日历、统计与预测。已有记录冲突时无法保存。</p>
        <label className="field-label" htmlFor="period-start">开始日期</label>
        <input className="date-input" id="period-start" type="date" max={today} value={startDate} onChange={(event) => { setStartDate(event.target.value); setError('') }} />
        <label className="field-label" htmlFor="period-end">结束日期</label>
        <input className="date-input" id="period-end" type="date" max={today} value={endDate} disabled={ongoing} onChange={(event) => { setEndDate(event.target.value); setError('') }} />
        {mode === 'edit' && <button type="button" className={`ongoing-choice ${ongoing ? 'ongoing-choice--active' : ''}`} aria-pressed={ongoing} onClick={() => { setOngoing(!ongoing); setError('') }}><span className="checkbox-mark">{ongoing && <Icon name="check" size={13} />}</span><span><strong>这段经期仍在进行</strong><small>结束日期会自动延续到今天</small></span></button>}
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button className="button button-ghost" onClick={onClose}>取消</button>
          <button className="button button-primary" onClick={submit}><Icon name="check" size={17} />{mode === 'backfill' ? '保存记录' : '保存修改'}</button>
        </div>
        {mode === 'edit' && onDelete && <button className="delete-record-link" onClick={onDelete}><Icon name="trash" size={16} />删除这段经期</button>}
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
    start: { title: '开始记录经期', body: `从 ${formatDate(date)} 开始记录吗？记录会自动延续到今天，直到你手动确认结束。`, action: '确认开始', icon: 'drop' as const },
    end: { title: '结束这段经期', body: `将 ${formatDate(date)} 设为最后一天吗？`, action: '确认结束', icon: 'check' as const },
    delete: { title: '删除这段记录', body: '删除后，日历、统计和预测会立即重新计算。此操作无法撤销。', action: '删除记录', icon: 'trash' as const }
  }[kind]
  return <Modal title={content.title} onClose={onClose}><div className="confirm-content"><span className={`confirm-icon confirm-icon--${kind}`}><Icon name={content.icon} size={23} /></span><p>{content.body}</p><div className="modal-actions"><button className="button button-ghost" onClick={onClose}>取消</button><button className={`button ${kind === 'delete' ? 'button-danger' : 'button-primary'}`} onClick={onConfirm}>{content.action}</button></div></div></Modal>
}
