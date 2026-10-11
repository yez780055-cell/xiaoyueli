import { useEffect, useState, type ReactNode } from 'react'
import type { AppSettings } from '../types'
import { Icon } from '../components/Icon'

export function SettingsPage({
  settings,
  onBack,
  onUpdate,
  onBackup,
  onRestore,
  onClear,
  onRequestLock,
  onDisableLock,
  onToast,
  canInstall = false,
  onInstall
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
  canInstall?: boolean
  onInstall?: () => void
}) {
  const [cycle, setCycle] = useState(settings.referenceCycleLength?.toString() ?? '')
  const [length, setLength] = useState(settings.referencePeriodLength?.toString() ?? '')
  const [memo, setMemo] = useState(settings.careMemo)
  const [saved, setSaved] = useState(true)

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

  const updateReminder = (update: Partial<AppSettings['reminders']>) => {
    onUpdate({ reminders: { ...settings.reminders, ...update } })
  }

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      onToast('此浏览器不支持通知权限；小月历仍会在打开时显示提醒。')
      return
    }
    if (Notification.permission === 'granted') {
      onToast('浏览器通知已允许。')
      return
    }
    try {
      const permission = await Notification.requestPermission()
      onToast(permission === 'granted' ? '浏览器通知已允许。' : '未开启浏览器通知，提醒会在小月历内显示。')
    } catch {
      onToast('无法更改浏览器通知权限；提醒仍会在小月历内显示。')
    }
  }

  const notificationLabel = !('Notification' in window) ? '仅应用内提醒' : Notification.permission === 'granted' ? '通知已允许' : Notification.permission === 'denied' ? '浏览器已关闭通知权限' : '开启浏览器通知'

  return (
    <main className="page-shell secondary-page settings-page page-enter">
      <header className="subpage-header">
        <button className="icon-button" aria-label="返回日历" onClick={onBack}><Icon name="arrow-left" /></button>
        <div><span className="eyebrow">YOUR PREFERENCES</span><h1>设置</h1></div>
        <div className="header-spacer" />
      </header>

      <SettingGroup title="周期预测" caption="参考值不会自动成为经期记录。">
        <div className="setting-input-row"><span className="setting-icon setting-icon--lavender"><Icon name="refresh" /></span><label htmlFor="reference-cycle"><strong>参考周期长度</strong><small>两次经期开始日之间的天数</small></label><span className="number-input-wrap"><input id="reference-cycle" inputMode="numeric" type="number" min="15" max="90" value={cycle} placeholder="—" onChange={(event) => setCycle(event.target.value)} /><small>天</small></span></div>
        <div className="setting-input-row"><span className="setting-icon setting-icon--pink"><Icon name="drop" /></span><label htmlFor="reference-length"><strong>参考经期长度</strong><small>通常持续的天数</small></label><span className="number-input-wrap"><input id="reference-length" inputMode="numeric" type="number" min="1" max="15" value={length} placeholder="—" onChange={(event) => setLength(event.target.value)} /><small>天</small></span></div>
        <div className="setting-footer"><span>留空表示暂不使用参考值</span><button className="button button-soft button-small" onClick={saveCycle}>保存参数</button></div>
      </SettingGroup>

      <SettingGroup title="提醒与关怀" caption="提醒依赖本机浏览器，关闭应用时不保证准时送达。">
        <div className="setting-toggle-row"><span className="setting-icon setting-icon--pink"><Icon name="bell" /></span><div className="setting-copy"><strong>预计经期提醒</strong><small>预计开始前 {settings.reminders.forecastDaysBefore} 天</small></div><Toggle checked={settings.reminders.forecastEnabled} label="预计经期提醒" onChange={(checked) => updateReminder({ forecastEnabled: checked })} /></div>
        {settings.reminders.forecastEnabled && <div className="setting-subrow"><label>提前提醒<select value={settings.reminders.forecastDaysBefore} onChange={(event) => updateReminder({ forecastDaysBefore: Number(event.target.value) })}><option value={1}>1 天</option><option value={3}>3 天</option><option value={5}>5 天</option></select></label><label>提醒时间<input type="time" value={settings.reminders.forecastTime} onChange={(event) => updateReminder({ forecastTime: event.target.value })} /></label></div>}
        <div className="setting-toggle-row"><span className="setting-icon setting-icon--lavender"><Icon name="check" /></span><div className="setting-copy"><strong>经期记录核实提醒</strong><small>提醒你确认是否开始经期</small></div><Toggle checked={settings.reminders.checkEnabled} label="经期记录核实提醒" onChange={(checked) => updateReminder({ checkEnabled: checked })} /></div>
        {settings.reminders.checkEnabled && <div className="setting-subrow"><label>间隔<input type="number" min="1" max="20" value={settings.reminders.checkAfterDays} onChange={(event) => updateReminder({ checkAfterDays: Math.max(1, Math.min(20, Number(event.target.value))) })} /> 天</label><label>提醒时间<input type="time" value={settings.reminders.checkTime} onChange={(event) => updateReminder({ checkTime: event.target.value })} /></label></div>}
        <button className="setting-action-row" onClick={requestPermission}><span className="setting-icon setting-icon--cream"><Icon name="sun" /></span><span><strong>{notificationLabel}</strong><small>在应用运行时发送通知</small></span><Icon name="chevron-right" size={17} /></button>
        <div className="memo-wrap"><label htmlFor="care-memo"><span className="setting-icon setting-icon--pink"><Icon name="heart" /></span><span><strong>她的关怀备忘</strong><small>只在本机保存，首页日期详情中查看</small></span><em>{saved ? '已保存' : '保存中…'}</em></label><textarea id="care-memo" value={memo} maxLength={500} placeholder="记下她希望你记住的小事……" onChange={(event) => setMemo(event.target.value)} onBlur={() => { onUpdate({ careMemo: memo }); setSaved(true) }} /></div>
      </SettingGroup>

      <SettingGroup title="隐私与数据" caption="记录保存在当前设备的浏览器数据库中，不上传账号或云服务。">
        <div className="setting-toggle-row"><span className="setting-icon setting-icon--lavender"><Icon name="lock" /></span><div className="setting-copy"><strong>应用锁</strong><small>{settings.appLock.enabled ? '已开启 · 仅用于日常遮挡' : '关闭'}</small></div>{settings.appLock.enabled ? <button className="text-button danger-text" onClick={onDisableLock}>关闭</button> : <button className="button button-soft button-small" onClick={onRequestLock}>设置 PIN</button>}</div>
        <p className="security-note"><Icon name="info" size={16} />应用锁可减少他人随手打开查看，但不能替代设备锁或存储加密；有权限访问此浏览器数据的人仍可能读取记录。</p>
        <button className="setting-action-row" onClick={onBackup}><span className="setting-icon setting-icon--lavender"><Icon name="cloud" /></span><span><strong>创建加密备份</strong><small>使用密码加密后保存到文件</small></span><Icon name="chevron-right" size={17} /></button>
        <button className="setting-action-row" onClick={onRestore}><span className="setting-icon setting-icon--cream"><Icon name="upload" /></span><span><strong>从加密备份恢复</strong><small>校验并确认后替换本机数据</small></span><Icon name="chevron-right" size={17} /></button>
        <button className="setting-action-row setting-action-row--danger" onClick={onClear}><span className="setting-icon setting-icon--danger"><Icon name="trash" /></span><span><strong>清除所有记录</strong><small>删除此设备内的小月历数据</small></span><Icon name="chevron-right" size={17} /></button>
      </SettingGroup>

      <SettingGroup title="关于小月历">
        <div className="about-row"><span className="brand-mark brand-mark--small"><Icon name="calendar" size={19} /></span><span><strong>小月历</strong><small>版本 1.0 · 离线优先</small></span><span className="about-version">为她记录，也为自己安心</span></div>
        {canInstall && onInstall && <button className="setting-action-row" onClick={onInstall}><span className="setting-icon setting-icon--lavender"><Icon name="download" /></span><span><strong>安装到主屏幕</strong><small>像应用一样打开小月历</small></span><Icon name="chevron-right" size={17} /></button>}
      </SettingGroup>
      <p className="settings-footer-note">小月历仅帮助整理个人记录与估算周期，预测不代表实际发生。</p>
    </main>
  )
}

function SettingGroup({ title, caption, children }: { title: string; caption?: string; children: ReactNode }) {
  return <section className="settings-group"><div className="settings-group-title"><h2>{title}</h2>{caption && <p>{caption}</p>}</div><div className="settings-group-card card">{children}</div></section>
}

function Toggle({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return <button className={`switch ${checked ? 'switch--on' : ''}`} role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}><span /></button>
}
