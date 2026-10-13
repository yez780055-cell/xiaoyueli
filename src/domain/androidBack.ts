import type { Page } from '../types'

// A native Back press should traverse in-app history before considering exit.
export type AndroidBackAction = 'history-back' | 'confirm-exit' | 'exit'

export function resolveAndroidBackAction(
  page: Page,
  inHistorySubpage: boolean,
  lastBackAt: number,
  now: number
): AndroidBackAction {
  if (inHistorySubpage || page !== 'calendar') return 'history-back'
  if (lastBackAt > 0 && now >= lastBackAt && now - lastBackAt <= 2000) return 'exit'
  return 'confirm-exit'
}
