import { useState, type FormEvent } from 'react'
import { Icon } from './Icon'
import { Modal } from './Modal'

export function BackupPasswordModal({
  mode,
  onClose,
  onCreate,
  onRestore,
  onError
}: {
  mode: 'create' | 'restore'
  onClose: () => void
  onCreate: (password: string) => Promise<void>
  onRestore: (fileText: string, password: string) => Promise<void>
  onError: (message: string) => void
}) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const title = mode === 'create' ? '创建加密备份' : '恢复加密备份'

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (password.length < 8) return onError('备份密码至少需要 8 位。')
    if (mode === 'create' && password !== confirm) return onError('两次输入的密码不一致。')
    if (mode === 'restore' && !file) return onError('请先选择小月历加密备份文件。')
    setBusy(true)
    try {
      if (mode === 'create') await onCreate(password)
      else await onRestore(await file!.text(), password)
    } catch (error) {
      onError(error instanceof Error ? error.message : '操作失败，请重试。')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form className="form-modal-content" onSubmit={submit}>
        <div className="backup-shield"><Icon name={mode === 'create' ? 'lock' : 'shield'} size={22} /></div>
        <p className="modal-description">{mode === 'create' ? '备份文件使用 AES-GCM 加密。请记住密码；小月历不会保存或找回它。' : '恢复会先解密和校验文件，确认后替换当前设备内的数据。'}</p>
        {mode === 'restore' && <label className="file-pick"><Icon name="upload" size={18} /><span>{file?.name ?? '选择加密备份文件'}</span><input type="file" accept=".json,.xyl,application/json" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>}
        <label className="field-label" htmlFor="backup-password">{mode === 'create' ? '设置备份密码' : '输入备份密码'}</label>
        <input className="text-input" id="backup-password" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="至少 8 位" />
        {mode === 'create' && <><label className="field-label" htmlFor="backup-password-confirm">再次输入密码</label><input className="text-input" id="backup-password-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="确认备份密码" /></>}
        <div className="modal-actions"><button type="button" className="button button-ghost" onClick={onClose}>取消</button><button type="submit" className="button button-primary" disabled={busy}><Icon name={mode === 'create' ? 'download' : 'refresh'} size={17} />{busy ? '处理中…' : mode === 'create' ? '生成并下载' : '解密并检查'}</button></div>
      </form>
    </Modal>
  )
}

export function ClearDataModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => Promise<void> }) {
  const [phrase, setPhrase] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    if (phrase.trim() !== '清除') return
    setBusy(true)
    await onConfirm()
    setBusy(false)
  }
  return <Modal title="清除所有数据" onClose={onClose}><div className="form-modal-content clear-modal-content"><span className="confirm-icon confirm-icon--delete"><Icon name="trash" size={23} /></span><p>这会删除本机的经期记录、周期参数、关怀备忘和提醒设置，并返回首次欢迎页。若以后需要查看，请先创建加密备份。</p><label className="field-label" htmlFor="clear-confirm">输入「清除」继续</label><input className="text-input" id="clear-confirm" value={phrase} onChange={(event) => setPhrase(event.target.value)} autoComplete="off" /><div className="modal-actions"><button className="button button-ghost" onClick={onClose}>取消</button><button className="button button-danger" disabled={phrase.trim() !== '清除' || busy} onClick={submit}>{busy ? '正在清除…' : '确认清除'}</button></div></div></Modal>
}

export function PinSetupModal({ onClose, onSave, onError }: { onClose: () => void; onSave: (pin: string) => Promise<void>; onError: (message: string) => void }) {
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!/^\d{6}$/.test(pin)) return onError('请设置 6 位数字 PIN。')
    if (pin !== confirm) return onError('两次输入的 PIN 不一致。')
    setBusy(true)
    try { await onSave(pin) } catch (error) { onError(error instanceof Error ? error.message : '无法设置应用锁。') } finally { setBusy(false) }
  }
  return <Modal title="设置应用锁" onClose={onClose}><form className="form-modal-content" onSubmit={submit}><div className="backup-shield"><Icon name="lock" size={22} /></div><p className="modal-description">设置 6 位数字 PIN。离开应用后再次打开时需要解锁；这只是日常遮挡，不是设备级加密。</p><label className="field-label" htmlFor="pin-new">设置 PIN</label><input id="pin-new" className="text-input pin-input" type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6 位数字" /><label className="field-label" htmlFor="pin-confirm">再次输入 PIN</label><input id="pin-confirm" className="text-input pin-input" type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} value={confirm} onChange={(event) => setConfirm(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="确认 PIN" /><div className="modal-actions"><button type="button" className="button button-ghost" onClick={onClose}>取消</button><button type="submit" className="button button-primary" disabled={busy}>{busy ? '保存中…' : '开启应用锁'}</button></div></form></Modal>
}

export function UnlockScreen({ onUnlock, onReset }: { onUnlock: (pin: string) => Promise<boolean>; onReset: () => void }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    const valid = await onUnlock(pin)
    setBusy(false)
    if (!valid) { setError('PIN 不正确，请再试一次。'); setPin('') }
  }
  return <main className="unlock-shell"><div className="brand-mark brand-mark--large"><Icon name="calendar" size={25} /></div><span className="eyebrow">小月历 · 已锁定</span><h1>输入 PIN 解锁</h1><p>你的周期记录保存在这台设备。</p><form onSubmit={submit}><input className="text-input pin-input unlock-pin" type="password" inputMode="numeric" autoComplete="current-password" maxLength={6} value={pin} onChange={(event) => { setPin(event.target.value.replace(/\D/g, '').slice(0, 6)); setError('') }} placeholder="••••••" aria-label="6 位数字 PIN" /><button className="button button-primary" type="submit" disabled={pin.length !== 6 || busy}>{busy ? '正在验证…' : '解锁'}</button></form>{error && <p className="form-error">{error}</p>}<button className="text-button unlock-reset" onClick={onReset}>忘记 PIN？清除本机数据</button><p className="security-note"><Icon name="info" size={15} />清除数据会删除所有记录；PIN 无法由小月历找回。</p></main>
}
