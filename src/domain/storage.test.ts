import { describe, expect, it, vi } from 'vitest'
import { createSerialSaveQueue, defaultSettings, normalizeAppData } from './storage'

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((done) => { resolve = done })
  return { promise, resolve }
}

describe('serialized local persistence', () => {
  it('writes rapid state changes in order, with the newest snapshot last', async () => {
    const gate = deferred()
    let activeWrites = 0
    let maxConcurrentWrites = 0
    const persisted: string[] = []
    const save = vi.fn(async (snapshot: string) => {
      activeWrites += 1
      maxConcurrentWrites = Math.max(maxConcurrentWrites, activeWrites)
      try {
        if (snapshot === 'start') await gate.promise
        persisted.push(snapshot)
      } finally {
        activeWrites -= 1
      }
    })
    const onError = vi.fn()
    const enqueue = createSerialSaveQueue(save, onError)

    const start = enqueue('start')
    const end = enqueue('end')
    const undo = enqueue('undo')
    await Promise.resolve()
    expect(save).toHaveBeenCalledTimes(1)

    gate.resolve()
    await Promise.all([start, end, undo])
    expect(save.mock.calls.map(([snapshot]) => snapshot)).toEqual(['start', 'end', 'undo'])
    expect(persisted).toEqual(['start', 'end', 'undo'])
    expect(maxConcurrentWrites).toBe(1)
    expect(onError).not.toHaveBeenCalled()
  })

  it('continues saving later snapshots after one persistence error', async () => {
    const onError = vi.fn()
    let persisted = ''
    const enqueue = createSerialSaveQueue(async (snapshot: string) => {
      if (snapshot === 'bad') throw new Error('storage unavailable')
      persisted = snapshot
    }, onError)

    await expect(enqueue('bad')).resolves.toBeUndefined()
    await expect(enqueue('latest')).resolves.toBeUndefined()
    expect(onError).toHaveBeenCalledTimes(1)
    expect(persisted).toBe('latest')
  })

  it('keeps reminder fields when normalizing existing local data', () => {
    const settings = defaultSettings()
    settings.reminders.forecastEnabled = true
    settings.reminders.forecastDaysBefore = 5
    settings.reminders.checkEnabled = true
    const normalized = normalizeAppData({
      periods: [],
      settings: { ...settings, careMemo: '本地备忘' }
    })

    expect(normalized.settings.reminders.forecastEnabled).toBe(true)
    expect(normalized.settings.reminders.forecastDaysBefore).toBe(5)
    expect(normalized.settings.reminders.checkEnabled).toBe(true)
    expect(normalized.settings.careMemo).toBe('本地备忘')
  })
})
