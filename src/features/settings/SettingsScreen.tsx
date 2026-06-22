import { useEffect, useState, type FormEvent } from 'react'
import {
  getSettings,
  updateAudioSettings,
} from '../../db/repositories/settingsRepository'
import {
  getAudioAvailability,
  playDutchCardAudio,
  subscribeToVoiceChanges,
  type AudioAvailability,
} from '../../domain/audio/audioService'
import type { AppSettings } from '../../domain/settings/settingsTypes'
import styles from './SettingsScreen.module.css'

export function SettingsScreen() {
  const [settings, setSettings] = useState<AppSettings>()
  const [availability, setAvailability] = useState<AudioAvailability>(() =>
    getAudioAvailability(),
  )
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let isActive = true

    getSettings()
      .then((nextSettings) => {
        if (isActive) {
          setSettings(nextSettings)
        }
      })
      .catch((loadError: unknown) => {
        if (isActive) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Settings could not be loaded.',
          )
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false)
        }
      })

    const unsubscribe = subscribeToVoiceChanges(() => {
      setAvailability(getAudioAvailability())
    })

    return () => {
      isActive = false
      unsubscribe()
    }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!settings) {
      return
    }

    setIsSaving(true)
    setMessage('')
    setError('')

    try {
      const updatedSettings = await updateAudioSettings(settings)
      setSettings(updatedSettings)
      setMessage('Audio settings saved.')
    } catch (saveError: unknown) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Settings could not be saved.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function testVoice() {
    if (!settings) {
      return
    }

    setIsTesting(true)
    setMessage('')
    setError('')

    try {
      await playDutchCardAudio(
        { article: 'de', backDutch: 'komkommer' },
        settings,
      )
      setMessage('Voice test completed.')
    } catch (audioError: unknown) {
      setError(
        audioError instanceof Error
          ? audioError.message
          : 'Dutch audio could not be played.',
      )
    } finally {
      setIsTesting(false)
    }
  }

  if (isLoading) {
    return <p className={styles.status}>Loading settings…</p>
  }

  if (!settings) {
    return (
      <section className={styles.errorState} role="alert">
        <h1>Settings are unavailable.</h1>
        <p>{error}</p>
      </section>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p>Settings</p>
        <h1>Shape your study experience.</h1>
        <span>
          Choose how Dutch pronunciation behaves when answers are revealed.
        </span>
      </header>

      <form className={styles.panel} onSubmit={handleSubmit}>
        <div className={styles.panelHeading}>
          <div>
            <p>Dutch audio</p>
            <h2>Pronunciation</h2>
          </div>
          <span
            className={
              availability.supported
                ? styles.availableBadge
                : styles.unavailableBadge
            }
          >
            {availability.supported ? 'Browser audio available' : 'Unavailable'}
          </span>
        </div>

        <label className={styles.toggleField}>
          <span>
            <strong>Auto-play answer audio</strong>
            <small>Play Dutch when an answer is revealed.</small>
          </span>
          <input
            type="checkbox"
            checked={settings.autoPlayAudio}
            onChange={(event) =>
              setSettings({
                ...settings,
                autoPlayAudio: event.target.checked,
              })
            }
          />
        </label>

        <label className={styles.field}>
          <span>Preferred Dutch voice</span>
          <select
            value={settings.preferredVoiceURI ?? ''}
            onChange={(event) =>
              setSettings({
                ...settings,
                preferredVoiceURI: event.target.value || undefined,
              })
            }
            disabled={!availability.supported}
          >
            <option value="">Automatic — prefer Belgian Dutch</option>
            {availability.voices.map((voice) => (
              <option key={voice.voiceURI} value={voice.voiceURI}>
                {voice.name} ({voice.lang})
              </option>
            ))}
          </select>
          <small>
            Voice availability depends on this browser and operating system.
          </small>
        </label>

        <label className={styles.field}>
          <span>Speech rate — {settings.speechRate.toFixed(1)}×</span>
          <input
            type="range"
            min="0.5"
            max="1.5"
            step="0.1"
            value={settings.speechRate}
            onChange={(event) =>
              setSettings({
                ...settings,
                speechRate: Number(event.target.value),
              })
            }
          />
          <div className={styles.rangeLabels}>
            <small>Slower</small>
            <small>Normal</small>
            <small>Faster</small>
          </div>
        </label>

        {availability.supported && availability.voices.length === 0 ? (
          <p className={styles.warning} role="status">
            No Dutch voice is currently available. Installing a Dutch system
            voice may make it appear here.
          </p>
        ) : null}

        {message ? (
          <p className={styles.success} role="status">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}

        <div className={styles.actions}>
          <button
            type="button"
            onClick={() => void testVoice()}
            disabled={
              isTesting ||
              !availability.supported ||
              availability.voices.length === 0
            }
          >
            {isTesting ? 'Playing…' : 'Test Dutch voice'}
          </button>
          <button
            className={styles.primaryButton}
            type="submit"
            disabled={isSaving}
          >
            {isSaving ? 'Saving…' : 'Save settings'}
          </button>
        </div>
      </form>
    </div>
  )
}
