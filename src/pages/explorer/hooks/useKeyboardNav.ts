import { useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

interface KeyboardNavOptions {
  onHelp?: () => void
  upUrl?: string
  searchRef?: React.RefObject<HTMLInputElement | null>
}

function isInputFocused(): boolean {
  const tag = document.activeElement?.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (document.activeElement as HTMLElement)?.isContentEditable === true
}

// Any Radix overlay (dialog, alert-dialog, popover, dropdown-menu, tooltip, etc.)
// renders its content inside a container marked with `data-state="open"` and one
// of these role/data attributes. If ANY of them are open, let Radix handle the
// keypress — don't steal Escape/Backspace out from under it.
function isOverlayOpen(): boolean {
  return document.querySelector(
    '[data-radix-dialog-content],[data-radix-alert-dialog-content],[data-radix-popper-content-wrapper],[role="dialog"][data-state="open"],[role="menu"][data-state="open"]',
  ) !== null
}

export function useKeyboardNav({ onHelp, upUrl, searchRef }: KeyboardNavOptions = {}) {
  const navigate = useNavigate()

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      const metaOrCtrl = e.metaKey || e.ctrlKey

      if (metaOrCtrl && e.key === 'k') {
        e.preventDefault()
        searchRef?.current?.focus()
        return
      }

      if (isInputFocused()) return
      if (isOverlayOpen()) return

      switch (e.key) {
        case '?':
          e.preventDefault()
          onHelp?.()
          break

        case 'Escape':
        case 'Backspace':
          if (upUrl) {
            e.preventDefault()
            navigate(upUrl)
          }
          break
      }
    },
    [onHelp, upUrl, searchRef, navigate],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])
}
