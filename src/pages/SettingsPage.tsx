import { useEffect, useState, type ReactNode } from 'react'
import type { AppSettings } from '../types'
import { Icon } from '../components/Icon'
import { Modal } from '../components/Modal'

export function SettingsPage({
  settings,
  onBack,
  onUpdate,
  onBackup,
  onRestore,
  onClear,
  onRequestLock,
  onDisableLock,
  onToast
}: {
  settings: AppSettings
  onBack: () => void
  onUpdate: (update: Partial<AppSettings>) => void
  onBackup: () => void
  onRestore: () => void
  onClear: () => void
  onRequestLock: () => void
  onDisableLock: () => void
  onToast: (message: string) => void
}) {
  const [cycle, setCycle] = useState(settings.referenceCycleLength?.toString() ?? '')
  const [length, setLength] = useState(settings.referencePeriodLength?.toString() ?? '')
  const [memo, setMemo] = useState(settings.careMemo)
  const [saved, setSaved] = useState(true)
  const [backupMenuOpen, setBackupMenuOpen] = useState(false)

  useEffect(() => setCycle(settings.referenceCycleLength?.toString() ?? ''), [settings.referenceCycleLength])
  useEffect(() => setLength(settings.referencePeriodLength?.toString() ?? ''), [settings.referencePeriodLength])
  useEffect(() => setMemo(settings.careMemo), [settings.careMemo])
  useEffect(() => {
    if (memo === settings.careMemo) return
    setSaved(false)
    const timer = window.setTimeout(() => {
      onUpdate({ careMemo: memo })
      setSaved(true)
    }, 450)
    return () => window.clearTimeout(timer)
  }, [memo, onUpdate, settings.careMemo])

  const saveCycle = () => {
    const parsedCycle = cycle.trim() ? Number(cycle) : null
    const parsedLength = length.trim() ? Number(length) : null
    if ((parsedCycle !== null && (!Number.isInteger(parsedCycle) || parsedCycle < 15 || parsedCycle > 90)) ||
        (parsedLength !== null && (!Number.isInteger(parsedLength) || parsedLength < 1 || parsedLength > 15))) {
      onToast('周期参考值请填写有效天数。')
      return
    }
    onUpdate({ referenceCycleLength: parsedCycle, referencePeriodLength: parsedLength })
    onToast('周期参数已保存。')
  }

  const chooseBackupAction = (action: 'backup' | 'restore') => {
    setBackupMenuOpen(false)
    if (action === 'backup') onBackup()
    else onRestore()
  }

  return (
    <main className="page-shell secondary-page settings-page page-enter">
      <header className="subpage-header">
        <button className="icon-button" aria-label="返回日历" onClick={onBack}><Icon name="arrow-left" /></button>
        <div><span className="eyebrow">YOUR PREFERENCES</span><h1>设置</h1></div>
        <div className="header-spacer" />
      </header>

      <SettingGroup title="周期参数">
        <div className="setting-input-row"><span className="setting-icon setting-icon--lavender"><Icon name="refresh" /></span><label htmlFor="reference-cycle"><strong>参考周期长度</strong><small>两次经期开始日之间的天数</small></label><span className="number-input-wrap"><input id="reference-cycle" inputMode="numeric" type="number" min="15" max="90" value={cycle} placeholder="—" onChange={(event) => setCycle(event.target.value)} /><small>天</small></span></div>
        <div className="setting-input-row"><span className="setting-icon setting-icon--pink"><Icon name="drop" /></span><label htmlFor="reference-length"><strong>参考经期长度</strong><small>通常持续的天数</small></label><span className="number-input-wrap"><input id="reference-length" inputMode="numeric" type="number" min="1" max="15" value={length} placeholder="—" onChange={(event) => setLength(event.target.value)} /><small>天</small></span></div>
        <div className="setting-footer"><span>留空表示暂不使用参考值</span><button className="button button-soft button-small" onClick={saveCycle}>保存参数</button></div>
      </SettingGroup>

      <SettingGroup title="她的关怀备忘" className="memo-setting-group">
        <div className="memo-wrap">
          <label htmlFor="care-memo"><span className="setting-icon setting-icon--pink"><Icon name="heart" /></span><span><strong>仅保存文字</strong><small>自动保存 · 仅保存在本机</small></span><em>{saved ? '已保存' : '保存中…'}</em></label>
          <textarea id="care-memo" value={memo} maxLength={500} placeholder="记下她希望你记住的小事……" onChange={(event) => setMemo(event.target.value)} onBlur={() => { onUpdate({ careMemo: memo }); setSaved(true) }} />
        </div>
      </SettingGroup>

      <SettingGroup title="隐私与数据">
        <div className="setting-toggle-row"><span className="setting-icon setting-icon--lavender"><Icon name="lock" /></span><div className="setting-copy"><strong>应用锁</strong><small>{settings.appLock.enabled ? '已开启 · 仅用于日常遮挡' : '关闭'}</small></div>{settings.appLock.enabled ? <button className="text-button danger-text" onClick={onDisableLock}>关闭</button> : <button className="button button-soft button-small" onClick={onRequestLock}>设置 PIN</button>}</div>
        <p className="security-note"><Icon name="info" size={16} />应用锁用于日常隐私遮挡。请继续使用设备锁保护设备。</p>
        <button className="setting-action-row" onClick={() => setBackupMenuOpen(true)}><span className="setting-icon setting-icon--lavender"><Icon name="cloud" /></span><span><strong>备份与恢复</strong><small>创建或恢复加密备份</small></span><Icon name="chevron-right" size={17} /></button>
        <button className="setting-action-row setting-action-row--danger" onClick={onClear}><span className="setting-icon setting-icon--danger"><Icon name="trash" /></span><span><strong>清除所有记录</strong><small>删除此设备内的小月历数据</small></span><Icon name="chevron-right" size={17} /></button>
      </SettingGroup>

      <footer className="about-footer"><Icon name="calendar" size={18} /><span><strong>小月历</strong><small>版本 1.0 · 离线保存在本机</small></span></footer>

      {backupMenuOpen && <Modal title="备份与恢复" onClose={() => setBackupMenuOpen(false)}>
        <div className="backup-choice-list">
          <button className="setting-action-row" onClick={() => chooseBackupAction('backup')}><span className="setting-icon setting-icon--lavender"><Icon name="cloud" /></span><span><strong>创建加密备份</strong><small>使用密码加密后保存到文件</small></span><Icon name="chevron-right" size={17} /></button>
          <button className="setting-action-row" onClick={() => chooseBackupAction('restore')}><span className="setting-icon setting-icon--cream"><Icon name="upload" /></span><span><strong>从加密备份恢复</strong><small>校验并确认后替换本机数据</small></span><Icon name="chevron-right" size={17} /></button>
        </div>
      </Modal>}
    </main>
  )
}

function SettingGroup({ title, caption, className = '', children }: { title: string; caption?: string; className?: string; children: ReactNode }) {
  return <section className={['settings-group', className].filter(Boolean).join(' ')}><div className="settings-group-title"><h2>{title}</h2>{caption && <p>{caption}</p>}</div><div className="settings-group-card card">{children}</div></section>
}
