import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'
import type { AppData, AppSettings, Page, PeriodRecord } from './types'
import { daysBetween, localDateString, shiftMonth } from './domain/date'
import { calculateForecast } from './domain/forecast'
import { prepareRestoredData } from './domain/backup'
import { addCompletedPeriod, createPeriod, getHistoricalPeriodEndDateMax, sortPeriods, togglePeriodForDate, undoPeriodToggle, validatePeriod } from './domain/periods'
import { clearAppData, createSerialSaveQueue, emptyAppData, loadAppData, saveAppData } from './domain/storage'
import { createPinHash, decryptBackup, encryptBackup, verifyPin } from './domain/security'
import { Icon } from './components/Icon'
import { Modal } from './components/Modal'
import { ConfirmRecordModal, PeriodFormModal } from './components/PeriodFormModal'
import { BackupPasswordModal, ClearDataModal, PinSetupModal, UnlockScreen } from './components/SensitiveModals'
import { HomePage } from './pages/HomePage'
import { SettingsPage } from './pages/SettingsPage'
import { StatsPage } from './pages/StatsPage'
import { Welcome, type WelcomeAction } from './pages/Welcome'
import './styles.css'

type ModalName = 'form-backfill' | 'form-backfill-fixed' | 'form-edit' | 'delete' | 'backup' | 'restore' | 'restore-confirm' | 'clear' | 'set-pin' | 'disable-lock' | null

interface ToastAction { label: string; onClick: () => void }
interface ToastState { message: string; action?: ToastAction }

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export default function App() {
  const [data, setData] = useState<AppData | null>(null)
  const [ready, setReady] = useState(false)
  const [today, setToday] = useState(localDateString())
  const [monthDate, setMonthDate] = useState(localDateString())
  const [selectedDate, setSelectedDate] = useState(localDateString())
  const [page, setPage] = useState<Page>('calendar')
  const [modal, setModal] = useState<ModalName>(null)
  const [editingRecord, setEditingRecord] = useState<PeriodRecord | null>(null)
  const [deletingRecord, setDeletingRecord] = useState<PeriodRecord | null>(null)
  const [pendingRestore, setPendingRestore] = useState<AppData | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [locked, setLocked] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null)
  const toastTimer = useRef<number | null>(null)
  const dataRef = useRef<AppData | null>(null)
  const pageRef = useRef<Page>('calendar')
  const modalRef = useRef<ModalName>(null)

  const showToast = useCallback((message: string, action?: ToastAction) => {
    setToast({ message, action })
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 3200)
  }, [])

  const saveQueueRef = useRef(createSerialSaveQueue<AppData>(
    saveAppData,
    () => showToast('保存失败，请检查设备存储空间。')
  ))

  const runToastAction = () => {
    const action = toast?.action
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
    toastTimer.current = null
    setToast(null)
    action?.onClick()
  }

  useEffect(() => {
    let mounted = true
    loadAppData().then((loaded) => {
      if (!mounted) return
      dataRef.current = loaded
      setData(loaded)
      setLocked(loaded.settings.appLock.enabled && !!loaded.settings.appLock.hash)
      setReady(true)
    }).catch(() => {
      if (!mounted) return
      const empty = emptyAppData()
      dataRef.current = empty
      setData(empty)
      setReady(true)
      showToast('无法读取本机数据，已进入空白日历。')
    })
    return () => { mounted = false }
  }, [showToast])

  useEffect(() => {
    registerSW({ immediate: true })
  }, [])

  useEffect(() => {
    const beforeInstall = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as InstallPromptEvent)
    }
    const installed = () => {
      setInstallPrompt(null)
      showToast('小月历已添加到主屏幕。')
    }
    window.addEventListener('beforeinstallprompt', beforeInstall)
    window.addEventListener('appinstalled', installed)
    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstall)
      window.removeEventListener('appinstalled', installed)
    }
  }, [showToast])

  useEffect(() => {
    const updateToday = () => {
      const next = localDateString()
      setToday(next)
    }
    const timer = window.setInterval(updateToday, 60_000)
    document.addEventListener('visibilitychange', updateToday)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', updateToday)
    }
  }, [])

  useEffect(() => { pageRef.current = page }, [page])
  useEffect(() => { modalRef.current = modal }, [modal])

  const openModal = useCallback((name: Exclude<ModalName, null>) => {
    if (!modalRef.current) window.history.pushState({ app: 'xiaoyueli', page: pageRef.current, modal: true }, '', window.location.href)
    modalRef.current = name
    setModal(name)
  }, [])

  const closeModal = useCallback(() => {
    const hasHistoryEntry = Boolean((window.history.state as { modal?: boolean } | null)?.modal)
    modalRef.current = null
    setModal(null)
    if (hasHistoryEntry) window.history.back()
  }, [])

  useEffect(() => {
    window.history.replaceState({ app: 'xiaoyueli', page: 'calendar' }, '', window.location.href)
    const onPopState = (event: PopStateEvent) => {
      if (modalRef.current) {
        modalRef.current = null
        setModal(null)
      }
      const state = event.state as { app?: string; page?: Page } | null
      const nextPage = state?.app === 'xiaoyueli' && state.page ? state.page : 'calendar'
      pageRef.current = nextPage
      setPage(nextPage)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const navigate = useCallback((next: Page) => {
    if (next === pageRef.current) return
    window.history.pushState({ app: 'xiaoyueli', page: next }, '', window.location.href)
    pageRef.current = next
    setPage(next)
  }, [])

  const goBack = useCallback(() => {
    if (pageRef.current === 'calendar') return
    window.history.back()
  }, [])

  const commit = useCallback((update: (previous: AppData) => AppData) => {
    const previous = dataRef.current
    if (!previous) return
    const next = update(previous)
    dataRef.current = next
    setData(next)
    void saveQueueRef.current(next)
  }, [showToast])

  const updateSettings = useCallback((update: Partial<AppSettings>) => {
    commit((previous) => ({ ...previous, settings: { ...previous.settings, ...update } }))
  }, [commit])

  const forecast = useMemo(() => data ? calculateForecast(data.periods, data.settings, today) : calculateForecast([], emptyAppData().settings, today), [data, today])

  const selectDate = (date: string) => {
    setSelectedDate(date)
    if (date.slice(0, 7) !== monthDate.slice(0, 7)) setMonthDate(date)
  }

  const togglePeriod = (date: string, enabled: boolean) => {
    const current = dataRef.current
    if (!current) return
    const result = togglePeriodForDate(current.periods, date, enabled, today)
    if (!result.ok) {
      showToast(result.message)
      return
    }
    if (!result.changed) {
      if (result.action === 'backfill-required') {
        setSelectedDate(result.startDate)
        setMonthDate(result.startDate)
        openModal('form-backfill-fixed')
      }
      return
    }

    const previousRecord = current.periods.find((period) => period.id === result.record.id) ?? null
    commit((previous) => ({ ...previous, periods: result.periods }))
    setSelectedDate(date)
    setMonthDate(date)

    const undo: ToastAction = {
      label: '撤销',
      onClick: () => {
        const latest = dataRef.current
        const restoredPeriods = latest
          ? undoPeriodToggle(latest.periods, result.action, result.record, previousRecord, today)
          : null
        if (!latest || !restoredPeriods) {
          showToast('记录已变化，无法撤销。')
          return
        }
        commit((previous) => ({ ...previous, periods: restoredPeriods }))
        showToast(result.action === 'started' ? '已撤销经期开始记录。' : '已撤销经期结束记录。')
      }
    }
    const message = result.action === 'started'
      ? '已从 ' + date + ' 开始记录，并自动延续至今天。'
      : result.action === 'cancelled'
        ? '已取消经期开始记录。'
        : '已将 ' + date + ' 设为经期结束日。'
    showToast(message, undo)
  }

  const savePeriod = (startDate: string, endDate: string | null, existing?: PeriodRecord) => {
    const current = dataRef.current
    if (!current) return
    if (existing) {
      const validation = validatePeriod({ startDate, endDate }, current.periods, { excludeId: existing.id, allowOngoing: true, today })
      if (!validation.valid) return showToast(validation.message ?? '请检查日期。')
      commit((previous) => ({
        ...previous,
        periods: sortPeriods(previous.periods.map((period) => period.id === existing.id ? { ...period, startDate, endDate, updatedAt: new Date().toISOString() } : period))
      }))
      showToast('记录已修改，预测和统计已更新。')
    } else {
      if (!endDate) return showToast('请选择结束日期。')
      const result = addCompletedPeriod(current.periods, startDate, endDate, today)
      if (!result.ok) return showToast(result.message)
      commit((previous) => ({ ...previous, periods: result.periods }))
      showToast('历史经期已补录。')
    }
    setSelectedDate(startDate)
    setMonthDate(startDate)
    setEditingRecord(null)
    closeModal()
  }

  const deletePeriod = () => {
    if (!deletingRecord) return
    const id = deletingRecord.id
    commit((previous) => ({ ...previous, periods: previous.periods.filter((period) => period.id !== id) }))
    setDeletingRecord(null)
    setEditingRecord(null)
    closeModal()
    showToast('经期记录已删除，预测和统计已更新。')
  }

  const finishWelcome = (action: WelcomeAction, cycle: number | null, length: number | null) => {
    if (!data) return
    let periods = data.periods
    if (action === 'start') {
      const validation = validatePeriod({ startDate: today, endDate: null }, periods, { allowOngoing: true, today })
      if (!validation.valid) return showToast(validation.message ?? '无法开始记录。')
      periods = sortPeriods([...periods, createPeriod(today)])
      setSelectedDate(today)
      setMonthDate(today)
    }
    const next: AppData = {
      periods,
      settings: { ...data.settings, onboardingComplete: true, referenceCycleLength: cycle, referencePeriodLength: length }
    }
    dataRef.current = next
    setData(next)
    void saveQueueRef.current(next)
    setPage('calendar')
    pageRef.current = 'calendar'
    if (action === 'backfill') openModal('form-backfill')
    if (action === 'start') showToast('已开始记录，经期会自动延续到今天。')
  }

  const handleBackup = async (password: string) => {
    if (!data) return
    const text = await encryptBackup(data, password)
    const blob = new Blob([text], { type: 'application/vnd.xiaoyueli.encrypted-backup+json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `小月历-加密备份-${today}.xyl`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1200)
    closeModal()
    showToast('加密备份已生成并下载。')
  }

  const handleRestore = async (text: string, password: string) => {
    const decrypted = await decryptBackup(text, password)
    const restored = prepareRestoredData(decrypted, today)
    setPendingRestore(restored)
    modalRef.current = 'restore-confirm'
    setModal('restore-confirm')
  }

  const confirmRestore = () => {
    if (!pendingRestore) return
    const restored = { ...pendingRestore, settings: { ...pendingRestore.settings, onboardingComplete: true } }
    dataRef.current = restored
    setData(restored)
    void saveQueueRef.current(restored)
    setPendingRestore(null)
    setLocked(false)
    setPage('calendar')
    pageRef.current = 'calendar'
    closeModal()
    showToast('备份已恢复，统计与预测已更新。')
  }

  const clearEverything = async () => {
    try {
      await clearAppData()
      const empty = emptyAppData()
      dataRef.current = empty
      setData(empty)
      setLocked(false)
      setPendingRestore(null)
      setPage('calendar')
      pageRef.current = 'calendar'
      closeModal()
      showToast('本机数据已清除。')
    } catch (error) {
      showToast(error instanceof Error ? error.message : '清除失败，请重试。')
    }
  }

  const savePin = async (pin: string) => {
    if (!('crypto' in window) || !crypto.subtle) throw new Error('当前浏览器环境不支持安全的 PIN 校验。请通过 HTTPS 或已安装的 PWA 使用。')
    const credentials = await createPinHash(pin)
    updateSettings({ appLock: { enabled: true, ...credentials } })
    closeModal()
    showToast('应用锁已开启，离开应用后会要求输入 PIN。')
  }

  const unlock = async (pin: string): Promise<boolean> => {
    if (!data?.settings.appLock.salt || !data.settings.appLock.hash) return false
    try {
      const valid = await verifyPin(pin, data.settings.appLock.salt, data.settings.appLock.hash)
      if (valid) setLocked(false)
      return valid
    } catch { return false }
  }

  const disableLock = () => {
    updateSettings({ appLock: { enabled: false, salt: null, hash: null } })
    closeModal()
    showToast('应用锁已关闭。')
  }

  const installApp = async () => {
    if (!installPrompt) return showToast('请打开浏览器菜单，选择「添加到主屏幕」安装小月历。')
    await installPrompt.prompt()
    const result = await installPrompt.userChoice
    if (result.outcome === 'accepted') setInstallPrompt(null)
  }

  useEffect(() => {
    if (!data?.settings.appLock.enabled || locked) return
    const lockOnLeave = () => { if (document.visibilityState === 'hidden') setLocked(true) }
    document.addEventListener('visibilitychange', lockOnLeave)
    return () => document.removeEventListener('visibilitychange', lockOnLeave)
  }, [data?.settings.appLock.enabled, locked])

  useEffect(() => {
    if (!ready || !data || locked) return
    const deliverDueReminders = () => {
      const current = dataRef.current
      if (!current || !current.settings.onboardingComplete) return
      const now = new Date()
      const currentDay = localDateString(now)
      const nextForecast = calculateForecast(current.periods, current.settings, currentDay)
      const active = current.periods.some((period) => period.endDate === null)
      const reminders = current.settings.reminders
      const candidates: { key: string; date: string; time: string; title: string; body: string }[] = []
      if (reminders.forecastEnabled && !active && nextForecast.status === 'ready' && nextForecast.expectedStart && nextForecast.expectedStart >= currentDay) {
        const date = addCalendarDays(nextForecast.expectedStart, -reminders.forecastDaysBefore)
        candidates.push({ key: `forecast:${nextForecast.expectedStart}:${reminders.forecastDaysBefore}`, date, time: reminders.forecastTime, title: '预计经期提醒', body: `预计 ${nextForecast.expectedStart} 左右开始经期，记得留意她的状态。` })
      }
      if (reminders.checkEnabled && !active && nextForecast.status === 'ready' && nextForecast.expectedStart) {
        const date = addCalendarDays(nextForecast.expectedStart, reminders.checkAfterDays)
        candidates.push({ key: `check:${nextForecast.expectedStart}:${reminders.checkAfterDays}`, date, time: reminders.checkTime, title: '经期记录核实提醒', body: '可以确认是否已经开始经期，并在小月历里记录。' })
      }
      const due = candidates.find((item) => {
        if (current.settings.deliveredReminders.includes(item.key) || item.date > currentDay) return false
        if (daysBetween(item.date, currentDay) > 3) return false
        const [hour, minute] = item.time.split(':').map(Number)
        const alarm = parseDateAtTime(item.date, hour, minute)
        return now.getTime() >= alarm.getTime()
      })
      if (!due) return
      const updated: AppData = {
        ...current,
        settings: { ...current.settings, deliveredReminders: [...current.settings.deliveredReminders, due.key].slice(-60) }
      }
      dataRef.current = updated
      setData(updated)
      void saveQueueRef.current(updated)
      showToast(due.body)
      if ('Notification' in window && Notification.permission === 'granted' && document.visibilityState === 'visible') {
        try { new Notification(`小月历 · ${due.title}`, { body: due.body, icon: `${import.meta.env.BASE_URL}icon.svg`, tag: due.key }) } catch { /* keep the in-app reminder available */ }
      }
    }
    deliverDueReminders()
    const timer = window.setInterval(deliverDueReminders, 30_000)
    document.addEventListener('visibilitychange', deliverDueReminders)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', deliverDueReminders)
    }
  }, [ready, data, locked, showToast])

  if (!ready || !data) return <Splash />
  if (locked) return <div className="app-root"><UnlockScreen onUnlock={unlock} onReset={() => openModal('clear')} />{modal === 'clear' && <ClearDataModal onClose={closeModal} onConfirm={clearEverything} />}{toast && <ToastBanner toast={toast} onAction={runToastAction} />}</div>
  if (!data.settings.onboardingComplete) return <Welcome settings={data.settings} onFinish={finishWelcome} />

  return (
    <div className="app-root">
      {page === 'calendar' && <HomePage
        periods={data.periods}
        settings={data.settings}
        forecast={forecast}
        today={today}
        monthDate={monthDate}
        selectedDate={selectedDate}
        onSelectDate={selectDate}
        onMonthChange={(amount) => setMonthDate((current) => shiftMonth(current, amount))}
        onOpenStats={() => navigate('stats')}
        onOpenSettings={() => navigate('settings')}
        onStart={() => togglePeriod(today, true)}
        onTogglePeriod={togglePeriod}
        onBackfill={() => openModal('form-backfill')}
      />}
      {page === 'stats' && <StatsPage periods={data.periods} onBack={goBack} onBackfill={() => openModal('form-backfill')} onEdit={(record) => { setEditingRecord(record); openModal('form-edit') }} />}
      {page === 'settings' && <SettingsPage settings={data.settings} onBack={goBack} onUpdate={updateSettings} onBackup={() => openModal('backup')} onRestore={() => openModal('restore')} onClear={() => openModal('clear')} onRequestLock={() => openModal('set-pin')} onDisableLock={() => openModal('disable-lock')} onToast={showToast} canInstall={!!installPrompt} onInstall={installApp} />}

      {modal === 'form-backfill' && <PeriodFormModal mode="backfill" initialDate={selectedDate < today ? selectedDate : ''} onClose={closeModal} onSave={(start, end) => savePeriod(start, end)} />}
      {modal === 'form-backfill-fixed' && <PeriodFormModal mode="backfill" initialDate={selectedDate} fixedStartDate endDateMax={getHistoricalPeriodEndDateMax(selectedDate, data.periods, today)} title="记录历史经期" onClose={closeModal} onSave={(start, end) => savePeriod(start, end)} />}
      {modal === 'form-edit' && editingRecord && <PeriodFormModal mode="edit" record={editingRecord} initialDate={today} onClose={closeModal} onSave={(start, end) => savePeriod(start, end, editingRecord)} onDelete={() => { setDeletingRecord(editingRecord); modalRef.current = 'delete'; setModal('delete') }} />}
      {modal === 'delete' && deletingRecord && <ConfirmRecordModal kind="delete" date={deletingRecord.startDate} onClose={closeModal} onConfirm={deletePeriod} />}
      {modal === 'backup' && <BackupPasswordModal mode="create" onClose={closeModal} onCreate={handleBackup} onRestore={handleRestore} onError={showToast} />}
      {modal === 'restore' && <BackupPasswordModal mode="restore" onClose={closeModal} onCreate={handleBackup} onRestore={handleRestore} onError={showToast} />}
      {modal === 'restore-confirm' && pendingRestore && <Modal title="确认恢复备份" onClose={() => { setPendingRestore(null); closeModal() }}><div className="form-modal-content"><div className="restore-summary"><span className="restore-number">{pendingRestore.periods.length}</span><span><strong>段经期记录</strong><small>加密文件已解密并通过日期冲突校验</small></span></div><p className="modal-description">继续后，当前设备中的记录和设置将被备份内容替换。此次恢复不会带入应用锁 PIN。</p><div className="modal-actions"><button className="button button-ghost" onClick={() => { setPendingRestore(null); closeModal() }}>取消</button><button className="button button-primary" onClick={confirmRestore}><Icon name="refresh" size={17} />确认恢复</button></div></div></Modal>}
      {modal === 'clear' && <ClearDataModal onClose={closeModal} onConfirm={clearEverything} />}
      {modal === 'set-pin' && <PinSetupModal onClose={closeModal} onSave={savePin} onError={showToast} />}
      {modal === 'disable-lock' && <Modal title="关闭应用锁" onClose={closeModal}><div className="confirm-content"><span className="confirm-icon confirm-icon--delete"><Icon name="lock" size={23} /></span><p>关闭后，打开小月历时不再要求输入 PIN。当前记录不会被删除。</p><div className="modal-actions"><button className="button button-ghost" onClick={closeModal}>取消</button><button className="button button-primary" onClick={disableLock}>关闭应用锁</button></div></div></Modal>}
      {toast && <ToastBanner toast={toast} onAction={runToastAction} />}
    </div>
  )
}

function ToastBanner({ toast, onAction }: { toast: ToastState; onAction: () => void }) {
  return (
    <div className="toast-message" role="status">
      <Icon name="info" size={16} />
      <span className="toast-copy">{toast.message}</span>
      {toast.action && <button type="button" className="toast-action" onClick={onAction}>{toast.action.label}</button>}
    </div>
  )
}

function Splash() {
  return <main className="splash-screen"><span className="brand-mark brand-mark--large"><Icon name="calendar" size={25} /></span><strong>小月历</strong><span>正在打开本机记录…</span></main>
}

function addCalendarDays(date: string, amount: number): string {
  const value = new Date(`${date}T12:00:00`)
  value.setDate(value.getDate() + amount)
  return localDateString(value)
}

function parseDateAtTime(date: string, hour: number, minute: number): Date {
  const result = new Date(`${date}T12:00:00`)
  result.setHours(hour, minute, 0, 0)
  return result
}
