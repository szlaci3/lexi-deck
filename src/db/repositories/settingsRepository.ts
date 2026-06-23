import type {
  AppSettings,
  SettingsInput,
} from '../../domain/settings/settingsTypes'
import { validateSettings } from '../../domain/settings/settingsValidation'
import { nowIso } from '../../utils/dates'
import { db } from '../dexie'

const settingsId = 'app-settings'
export const defaultDailyNewCardLimit = 20
export const defaultDailyReviewLimit = 200

export async function getSettings(): Promise<AppSettings> {
  const existingSettings = await db.settings.get(settingsId)

  if (existingSettings) {
    const migratedSettings: AppSettings = {
      ...existingSettings,
      dailyNewCardLimit:
        existingSettings.dailyNewCardLimit ?? defaultDailyNewCardLimit,
      dailyReviewLimit:
        existingSettings.dailyReviewLimit ?? defaultDailyReviewLimit,
    }
    if (
      existingSettings.dailyNewCardLimit === undefined ||
      existingSettings.dailyReviewLimit === undefined
    ) {
      await db.settings.put(migratedSettings)
    }
    return migratedSettings
  }

  const timestamp = nowIso()
  const defaultSettings: AppSettings = {
    id: settingsId,
    autoPlayAudio: true,
    speechRate: 1,
    dailyNewCardLimit: defaultDailyNewCardLimit,
    dailyReviewLimit: defaultDailyReviewLimit,
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  await db.settings.add(defaultSettings)
  return defaultSettings
}

export async function updateSettings(
  input: SettingsInput,
): Promise<AppSettings> {
  const result = validateSettings(input)

  if (!result.valid) {
    throw new Error(result.error)
  }

  const existingSettings = await getSettings()
  const updatedSettings: AppSettings = {
    ...existingSettings,
    ...result.value,
    updatedAt: nowIso(),
  }

  await db.settings.put(updatedSettings)
  return updatedSettings
}
