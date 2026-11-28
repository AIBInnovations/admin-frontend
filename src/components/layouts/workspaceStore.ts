import { useEffect, useId, useRef, useSyncExternalStore } from 'react'

/**
 * Workspaces and unsaved changes, in one place.
 *
 * A "workspace" is a full-page surface (every form that used to be a popup)
 * that covers the content area while the list stays mounted underneath. A
 * "guard" is anything with unsaved edits: a workspace or a routed editor page.
 *
 * React Router supports a single blocker per router, so pages must not call
 * useBlocker themselves. They call useUnsavedChanges(dirty) and the layout's
 * <NavigationGuard> does the blocking for everyone.
 */
interface WorkspaceEntry { id: string; close: () => void }
interface Prompt { onDiscard: () => void; onKeep?: () => void }

let workspaces: WorkspaceEntry[] = []
const guards = new Map<string, () => boolean>()
let prompt: Prompt | null = null
let version = 0
const listeners = new Set<() => void>()

function emit() {
  version += 1
  listeners.forEach((l) => l())
}
function subscribe(l: () => void) {
  listeners.add(l)
  return () => { listeners.delete(l) }
}

export const workspaceStore = {
  openWorkspace(entry: WorkspaceEntry) {
    workspaces = [...workspaces.filter((w) => w.id !== entry.id), entry]
    emit()
  },
  closeWorkspace(id: string) {
    if (!workspaces.some((w) => w.id === id)) return
    workspaces = workspaces.filter((w) => w.id !== id)
    emit()
  },
  setGuard(id: string, isDirty: () => boolean) { guards.set(id, isDirty) },
  clearGuard(id: string) { guards.delete(id) },
  anyDirty() { return [...guards.values()].some((g) => g()) },
  ask(next: Prompt) { prompt = next; emit() },
  answer(discard: boolean) {
    const p = prompt
    prompt = null
    emit()
    if (discard) p?.onDiscard()
    else p?.onKeep?.()
  },
}

export function useWorkspaceState() {
  useSyncExternalStore(subscribe, () => version, () => version)
  return { outermost: workspaces[0] ?? null, count: workspaces.length, prompt }
}

/**
 * Call from any routed editor page. While `dirty` is true, leaving the page
 * (link, Back, closing the tab) asks first.
 */
export function useUnsavedChanges(dirty: boolean) {
  const id = useId()
  const ref = useRef(dirty)
  ref.current = dirty
  useEffect(() => {
    workspaceStore.setGuard(id, () => ref.current)
    return () => workspaceStore.clearGuard(id)
  }, [id])
}
