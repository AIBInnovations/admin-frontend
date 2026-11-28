import { useEffect, useRef } from 'react'

interface KeyboardNavOptions {
  onHelp: () => void
  onFind: () => void
  onSave: () => void
  /** Escape: close the open item, else go up one level. */
  onEscape: () => void
}

function isTyping(): boolean {
  const el = document.activeElement as HTMLElement | null
  return !!el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable)
}

/** An open menu, dialog or popover handles its own keys. */
function isOverlayOpen(): boolean {
  return document.querySelector('[role="dialog"][data-state="open"],[role="alertdialog"],[role="menu"][data-state="open"],[data-radix-popper-content-wrapper]') !== null
}

export function useKeyboardNav(options: KeyboardNavOptions) {
  const ref = useRef(options)
  ref.current = options

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 's') {
        // Never the browser's "Save page as" here
        e.preventDefault()
        ref.current.onSave()
        return
      }
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || isTyping() || isOverlayOpen()) return
      if (e.key === '?') { e.preventDefault(); ref.current.onHelp() }
      else if (e.key === '/') { e.preventDefault(); ref.current.onFind() }
      else if (e.key === 'Escape') { e.preventDefault(); ref.current.onEscape() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
