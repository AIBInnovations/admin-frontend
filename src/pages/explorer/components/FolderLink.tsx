import { forwardRef, type AnchorHTMLAttributes } from 'react'
import { usePanelSelection } from '../context/PanelSelectionContext'
import { keepKeyboardPlace } from '../keyboardPlace'

interface FolderLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> { href: string }

/** A real link (new tab, copy address) that asks before leaving unsaved edits. */
export const FolderLink = forwardRef<HTMLAnchorElement, FolderLinkProps>(function FolderLink({ href, onClick, ...props }, ref) {
  const { go } = usePanelSelection()
  return (
    <a
      ref={ref}
      href={href}
      onClick={(e) => {
        onClick?.(e)
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
        e.preventDefault()
        // detail 0: opened with the keyboard
        if (e.detail === 0) keepKeyboardPlace()
        go(href)
      }}
      {...props}
    />
  )
})
