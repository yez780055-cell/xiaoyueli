import { describe, expect, it } from 'vitest'
import { emptyAppData } from './storage'
import { prepareRestoredData } from './backup'
import { createPinHash, decryptBackup, encryptBackup, verifyPin } from './security'

describe('private local backup and app lock', () => {
  it('encrypts a backup, restores it with the right password, and rejects the wrong password', async () => {
    const data = emptyAppData()
    data.periods.push({ id: 'private-id', startDate: '2024-05-03', endDate: '2024-05-07', createdAt: 'now', updatedAt: 'now' })
    data.settings.careMemo = 'private memo phrase'
    data.settings.reminders.forecastEnabled = true
    data.settings.reminders.forecastDaysBefore = 1
    const encrypted = await encryptBackup(data, 'long-enough-password')
    expect(encrypted).not.toContain('private memo phrase')
    expect(encrypted).not.toContain('2024-05-03')
    await expect(decryptBackup(encrypted, 'wrong-password')).rejects.toThrow('密码不正确')
    const decrypted = await decryptBackup(encrypted, 'long-enough-password') as typeof data
    expect(decrypted.periods[0].startDate).toBe('2024-05-03')
    expect(decrypted.settings.careMemo).toBe('private memo phrase')
    const restored = prepareRestoredData(decrypted, '2024-05-10')
    expect(restored.settings.reminders.forecastEnabled).toBe(true)
    expect(restored.settings.reminders.forecastDaysBefore).toBe(1)
    expect(restored.settings.appLock.enabled).toBe(false)
  })

  it('stores a salted PIN verifier and checks it without storing the PIN', async () => {
    const credentials = await createPinHash('123456')
    expect(credentials.hash).not.toBe('123456')
    expect(await verifyPin('123456', credentials.salt, credentials.hash)).toBe(true)
    expect(await verifyPin('654321', credentials.salt, credentials.hash)).toBe(false)
  })
})
