import type { AppData, AppSettings } from '../types'

const DB_NAME = 'xiaoyueli-local'
const STORE_NAME = 'app-state'
const LOCAL_FALLBACK = 'xiaoyueli-state-v1'

export function defaultSettings(): AppSettings {
  return {
    onboardingComplete: false,
    referenceCycleLength: null,
    referencePeriodLength: null,
    careMemo: '',
    reminders: {
      forecastEnabled: false,
      forecastDaysBefore: 3,
      forecastTime: '20:00',
      checkEnabled: false,
      checkAfterDays: 8,
      checkTime: '20:00'
    },
    appLock: { enabled: false, salt: null, hash: null },
    deliveredReminders: []
  }
}

export function emptyAppData(): AppData {
  return { periods: [], settings: defaultSettings() }
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('当前浏览器不支持本地数据库'))
      return
    }
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'key' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('无法打开本地数据库'))
  })
}

export async function loadAppData(): Promise<AppData> {
  let database: IDBDatabase | null = null
  try {
    const connection = await openDatabase()
    database = connection
    const result = await new Promise<AppData | null>((resolve, reject) => {
      const request = connection.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get('root')
      request.onsuccess = () => resolve(request.result?.data ?? null)
      request.onerror = () => reject(request.error)
    })
    return result ? normalizeAppData(result) : emptyAppData()
  } catch {
    try {
      const raw = localStorage.getItem(LOCAL_FALLBACK)
      return raw ? normalizeAppData(JSON.parse(raw) as AppData) : emptyAppData()
    } catch {
      return emptyAppData()
    }
  } finally {
    database?.close()
  }
}

export async function saveAppData(data: AppData): Promise<void> {
  let database: IDBDatabase | null = null
  try {
    const connection = await openDatabase()
    database = connection
    await new Promise<void>((resolve, reject) => {
      const transaction = connection.transaction(STORE_NAME, 'readwrite')
      transaction.objectStore(STORE_NAME).put({ key: 'root', data })
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error ?? new Error('保存已取消'))
    })
  } catch {
    localStorage.setItem(LOCAL_FALLBACK, JSON.stringify(data))
  } finally {
    database?.close()
  }
}

export async function clearAppData(): Promise<void> {
  localStorage.removeItem(LOCAL_FALLBACK)
  if (!('indexedDB' in window)) return
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('数据库仍在使用，请关闭其他小月历页面后重试。'))
  })
}

export function normalizeAppData(value: AppData): AppData {
  const defaults = defaultSettings()
  const settings = value?.settings ?? defaults
  return {
    periods: Array.isArray(value?.periods) ? value.periods : [],
    settings: {
      ...defaults,
      ...settings,
      reminders: { ...defaults.reminders, ...(settings.reminders ?? {}) },
      appLock: { ...defaults.appLock, ...(settings.appLock ?? {}) },
      deliveredReminders: Array.isArray(settings.deliveredReminders) ? settings.deliveredReminders : []
    }
  }
}
