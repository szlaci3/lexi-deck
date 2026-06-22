import type {
  AppSettings,
  AudioSettingsInput,
} from '../../domain/settings/settingsTypes'
import { validateAudioSettings } from '../../domain/settings/settingsValidation'
import { nowIso } from '../../utils/dates'
import { db } from '../dexie'

const settingsId = 'app-settings'

export async function getSettings(): Promise<AppSettings> {
  const existingSettings = await db.settings.get(settingsId)

  if (existingSettings) {
    return existingSettings
  }

  const timestamp = nowIso()
  const defaultSettings: AppSettings = {
    id: settingsId,
    autoPlayAudio: true,
    speechRate: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  await db.settings.add(defaultSettings)
  return defaultSettings
}

export async function updateAudioSettings(
  input: AudioSettingsInput,
): Promise<AppSettings> {
  const result = validateAudioSettings(input)

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
