import type { AppData, PeriodRecord } from '../types'
import { normalizeAppData } from './storage'
import { sortPeriods, validatePeriod } from './periods'
import { validateBackupData } from './security'

export function prepareRestoredData(value: unknown, today: string): AppData {
  if (!validateBackupData(value)) throw new Error('备份文件内容不完整或格式无效，未更改本机数据。')
  const restored = normalizeAppData(value)
  const checked: PeriodRecord[] = []
  const ids = new Set<string>()
  for (const period of sortPeriods(restored.periods)) {
    if (ids.has(period.id)) throw new Error('备份中存在重复记录编号，未更改本机数据。')
    const validation = validatePeriod(period, checked, { allowOngoing: true, today })
    if (!validation.valid) throw new Error(`备份记录无法通过日期校验：${validation.message ?? ''}未更改本机数据。`)
    ids.add(period.id)
    checked.push(period)
  }
  restored.periods = checked
  restored.settings.onboardingComplete = true
  restored.settings.appLock = { enabled: false, salt: null, hash: null }
  restored.settings.deliveredReminders = []
  return restored
}
