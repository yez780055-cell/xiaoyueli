import { useState } from 'react'
import type { AppSettings } from '../types'
import { Icon } from '../components/Icon'

export type WelcomeAction = 'start' | 'backfill' | 'skip'

export function Welcome({
  settings,
  onFinish
}: {
  settings: AppSettings
  onFinish: (action: WelcomeAction, cycle: number | null, length: number | null) => void
}) {
  const [cycle, setCycle] = useState(settings.referenceCycleLength?.toString() ?? '')
  const [length, setLength] = useState(settings.referencePeriodLength?.toString() ?? '')
  const [error, setError] = useState('')

  const finish = (action: WelcomeAction) => {
    if (action === 'skip') {
      onFinish('skip', null, null)
      return
    }
    const parsedCycle = cycle.trim() ? Number(cycle) : null
    const parsedLength = length.trim() ? Number(length) : null
    if ((parsedCycle !== null && (!Number.isInteger(parsedCycle) || parsedCycle < 15 || parsedCycle > 90)) ||
        (parsedLength !== null && (!Number.isInteger(parsedLength) || parsedLength < 1 || parsedLength > 15))) {
      setError('请检查参考周期和经期长度，或留空跳过。')
      return
    }
    onFinish(action, parsedCycle, parsedLength)
  }

  return (
    <main className="welcome-shell page-enter">
      <div className="welcome-topline"><span>小月历</span><span>只属于你们的记录</span></div>
      <div className="welcome-content">
        <div className="welcome-art" aria-hidden="true">
          <div className="welcome-orbit welcome-orbit--one" /><div className="welcome-orbit welcome-orbit--two" />
          <div className="welcome-calendar"><div className="welcome-calendar-top"><i /><i /><i /></div><div className="welcome-calendar-body"><span /><span /><span /><span /><span /><b><Icon name="heart" size={22} /></b><span /><span /><span /></div></div>
          <span className="welcome-spark welcome-spark--a"><Icon name="sparkle" size={17} /></span><span className="welcome-spark welcome-spark--b"><Icon name="sparkle" size={12} /></span>
        </div>
        <span className="eyebrow">A GENTLE CYCLE JOURNAL</span>
        <h1>记录她的周期，<br /><em>把关心放进日常。</em></h1>
        <p className="welcome-lead">开始与结束由你确认。经期会自动延续到今天，预测只作参考，不会替你创建真实记录。</p>

        <div className="privacy-pill"><span className="privacy-pill-icon"><Icon name="shield" size={17} /></span><span><strong>记录只保存在这台设备</strong><small>离线使用 · 不需要账号 · 不上传云端</small></span><Icon name="check" size={17} className="privacy-check" /></div>

        <section className="welcome-parameters">
          <div><h2>参考周期 <span>选填</span></h2><p>记录还不够时，可用于参考估算。</p></div>
          <div className="welcome-fields">
            <label><span>周期长度</span><span className="welcome-number"><input inputMode="numeric" type="number" min="15" max="90" placeholder="—" value={cycle} onChange={(event) => { setCycle(event.target.value); setError('') }} /><small>天</small></span></label>
            <label><span>经期长度</span><span className="welcome-number"><input inputMode="numeric" type="number" min="1" max="15" placeholder="—" value={length} onChange={(event) => { setLength(event.target.value); setError('') }} /><small>天</small></span></label>
          </div>
          {error && <p className="form-error">{error}</p>}
        </section>

        <div className="welcome-actions">
          <button className="button button-primary welcome-main-action" onClick={() => finish('start')}><Icon name="drop" size={18} />开始记录今天</button>
          <button className="button button-outline" onClick={() => finish('backfill')}><Icon name="calendar" size={17} />补录历史经期</button>
          <button className="text-button welcome-skip" onClick={() => finish('skip')}>全部跳过，进入日历 <Icon name="chevron-right" size={16} /></button>
        </div>
        <p className="welcome-footnote">预测根据实际记录逐步形成；任何时候都可以在设置里修改参考值。</p>
      </div>
    </main>
  )
}
