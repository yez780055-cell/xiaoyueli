import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SettingsPage } from './SettingsPage'
import { defaultSettings } from '../domain/storage'

describe('compact settings page', () => {
  it('keeps cycle settings, the local care memo, privacy controls, and a compact about footer', () => {
    const settings = defaultSettings()
    settings.careMemo = '请记得带热水袋'
    const markup = renderToStaticMarkup(createElement(SettingsPage, {
      settings,
      onBack: () => undefined,
      onUpdate: () => undefined,
      onBackup: () => undefined,
      onRestore: () => undefined,
      onClear: () => undefined,
      onRequestLock: () => undefined,
      onDisableLock: () => undefined,
      onToast: () => undefined
    }))

    expect(markup).toContain('参考周期长度')
    expect(markup).toContain('参考经期长度')
    expect(markup).toContain('请记得带热水袋')
    expect(markup).toContain('自动保存 · 仅保存在本机')
    expect(markup).toContain('应用锁')
    expect(markup).toContain('备份与恢复')
    expect(markup).toContain('清除所有记录')
    expect(markup).toContain('about-footer')
    expect(markup).not.toContain('预计经期提醒')
    expect(markup).not.toContain('经期记录核实提醒')
    expect(markup).not.toContain('开启浏览器通知')
  })
})
