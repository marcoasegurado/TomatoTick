import { useCallback, useEffect, useState } from 'react'
import {
  isStandalone,
  type BeforeInstallPromptEvent,
} from '../utils/pwa'

interface InstallPromptState {
  canInstall: boolean
  promptInstall: () => Promise<void>
}

/** Capture the browser's install prompt and expose it as a UI action. */
export function useInstallPrompt(): InstallPromptState {
  const [promptEvent, setPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [standalone, setStandalone] = useState(isStandalone)

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setPromptEvent(event as BeforeInstallPromptEvent)
    }
    const handleInstalled = () => {
      setPromptEvent(null)
      setStandalone(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt,
      )
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (!promptEvent) return
    await promptEvent.prompt()
    const choice = await promptEvent.userChoice
    if (choice.outcome === 'accepted') {
      setPromptEvent(null)
    }
  }, [promptEvent])

  return {
    canInstall: Boolean(promptEvent) && !standalone,
    promptInstall,
  }
}
