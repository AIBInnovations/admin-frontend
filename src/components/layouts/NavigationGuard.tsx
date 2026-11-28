import { useEffect, useRef } from 'react'
import { useBlocker, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useWorkspaceState, workspaceStore } from './workspaceStore'

const HASH = '#edit'

/**
 * Makes workspaces behave like pages:
 *  - opening one adds a history entry, so the browser's Back closes it instead
 *    of leaving the list;
 *  - leaving with unsaved changes (Back, a link, closing the tab) asks first.
 */
export function NavigationGuard() {
  const { outermost, prompt } = useWorkspaceState()
  const location = useLocation()
  const navigate = useNavigate()
  const isOpen = !!outermost
  const closeRef = useRef<(() => void) | null>(null)
  closeRef.current = outermost?.close ?? null
  const pushedOn = useRef<string | null>(null)

  useEffect(() => {
    const here = location.pathname + location.search
    if (isOpen) {
      if (location.hash === HASH) return
      if (pushedOn.current === here) {
        // Our entry was removed while the workspace is open: Back was pressed.
        pushedOn.current = null
        closeRef.current?.()
      } else {
        pushedOn.current = here
        navigate({ pathname: location.pathname, search: location.search, hash: HASH }, { state: location.state })
      }
      return
    }
    if (location.hash === HASH) {
      if (pushedOn.current === here) {
        pushedOn.current = null
        navigate(-1)
      } else {
        // A reloaded or shared #edit link: nothing is open, so drop the hash.
        navigate({ pathname: location.pathname, search: location.search }, { replace: true, state: location.state })
      }
    } else {
      pushedOn.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, location.hash, location.pathname, location.search])

  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (!workspaceStore.anyDirty()) return false
    if (currentLocation.pathname !== nextLocation.pathname) return true
    return currentLocation.hash === HASH && nextLocation.hash !== HASH
  })

  useEffect(() => {
    if (blocker.state !== 'blocked') return
    workspaceStore.ask({ onDiscard: () => blocker.proceed(), onKeep: () => blocker.reset() })
  }, [blocker])

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!workspaceStore.anyDirty()) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  if (!prompt) return null
  return <UnsavedBar />
}

function UnsavedBar() {
  const keep = useRef<HTMLButtonElement>(null)
  useEffect(() => { keep.current?.focus() }, [])
  return (
    <div
      role="alertdialog"
      aria-modal="false"
      aria-labelledby="unsaved-title"
      data-variant="dock"
      onKeyDown={(e) => {
        if (e.key === 'Escape') { e.stopPropagation(); workspaceStore.answer(false) }
      }}
      className="pg-dock fixed inset-x-4 bottom-4 z-[80] mx-auto flex max-w-[560px] flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-raised sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0">
        <p id="unsaved-title" className="text-sm font-semibold text-foreground">Leave without saving?</p>
        <p className="text-sm text-muted-foreground">Your changes on this page will be lost.</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button ref={keep} variant="outline" size="sm" onClick={() => workspaceStore.answer(false)}>Keep editing</Button>
        <Button variant="destructive" size="sm" onClick={() => workspaceStore.answer(true)}>Discard changes</Button>
      </div>
    </div>
  )
}
