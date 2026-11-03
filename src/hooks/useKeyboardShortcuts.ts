import { useEffect } from 'react'

interface KeyboardShortcutOptions {
  onToggle: () => void
  onReset: () => void
  onSkip: () => void
}

const INTERACTIVE_SELECTOR =
  'input, textarea, select, button, a, [contenteditable="true"], [role="textbox"]'

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  return target.closest(INTERACTIVE_SELECTOR) !== null
}

/**
 * Global Space/R/S shortcuts. They are ignored while typing, while a control
 * has focus, and while a modal or the mobile drawer is open.
 */
export function useKeyboardShortcuts({
  onToggle,
  onReset,
  onSkip,
}: KeyboardShortcutOptions): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isInteractiveTarget(event.target)) return
      if (document.querySelector('[role="dialog"], .sidebar--open')) return

      if (event.code === 'Space' || event.key === ' ') {
        event.preventDefault()
        onToggle()
        return
      }

      if (event.key.toLowerCase() === 'r') {
        event.preventDefault()
        onReset()
        return
      }

      if (event.key.toLowerCase() === 's') {
        event.preventDefault()
        onSkip()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onToggle, onReset, onSkip])
}
