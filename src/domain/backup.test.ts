import { describe, expect, it } from 'vitest'
import { emptyAppData } from './storage'
import { prepareRestoredData } from './backup'

describe('backup restore validation', () => {
  it('clears app-lock credentials and reminder delivery history on restore', () => {
    const data = emptyAppData()
    data.settings.appLock = { enabled: true, salt: 'salt', hash: 'hash' }
    data.settings.deliveredReminders = ['old-reminder']
    const restored = prepareRestoredData(data, '2024-05-10')
    expect(restored.settings.appLock.enabled).toBe(false)
    expect(restored.settings.deliveredReminders).toEqual([])
    expect(restored.settings.onboardingComplete).toBe(true)
  })

  it('rejects overlapping or future records without returning a partial import', () => {
    const data = emptyAppData()
    data.periods = [
      { id: 'a', startDate: '2024-05-01', endDate: '2024-05-05', createdAt: '', updatedAt: '' },
      { id: 'b', startDate: '2024-05-05', endDate: '2024-05-08', createdAt: '', updatedAt: '' }
    ]
    expect(() => prepareRestoredData(data, '2024-05-10')).toThrow('重叠')
    data.periods[1] = { ...data.periods[1], id: 'c', startDate: '2024-05-11', endDate: '2024-05-12' }
    expect(() => prepareRestoredData(data, '2024-05-10')).toThrow('晚于今天')
  })
})
