import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { usePersistentState } from '@/hooks/usePersistentState'
import { useElementWidth } from '../hooks/useElementWidth'
import { takeKeyboardPlace } from '../keyboardPlace'
import '../explorer.css'

const MIN_EDITOR = 320
const MAX_EDITOR = 680
const MIN_LIST = 360
const GAP = 12
/** Below this there is no room for two columns; the editor becomes a side sheet. */
const DOCK_FROM = MIN_EDITOR + MIN_LIST + GAP

interface ExplorerLayoutProps {
  topBar: ReactNode
  /** Left column: the contents list. */
  children: ReactNode
  /** Right column: the docked editor. */
  detailPanel: ReactNode
  /** Who is looking, so each admin keeps their own width. */
  viewer: string
  /** Sheet (narrow screens): open when something was picked. */
  sheetOpen: boolean
  onSheetClose: () => void
  onCompactChange: (compact: boolean) => void
}

export function ExplorerLayout({ topBar, children, detailPanel, viewer, sheetOpen, onSheetClose, onCompactChange }: ExplorerLayoutProps) {
  const body = useRef<HTMLDivElement>(null)
  const available = useElementWidth(body)
  const contents = useRef<HTMLElement>(null)
  useEffect(() => { if (takeKeyboardPlace()) contents.current?.focus({ preventScroll: true }) }, [])
  const [preferred, setPreferred] = usePersistentState(`pgme.explorer.editorWidth.${viewer}`, 432)

  const docked = available >= DOCK_FROM
  const max = Math.min(MAX_EDITOR, available - MIN_LIST - GAP)
  const width = Math.max(MIN_EDITOR, Math.min(preferred, max))
  const compact = available > 0 && !docked

  useEffect(() => { if (available > 0) onCompactChange(compact) }, [available, compact, onCompactChange])

  const startDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    e.preventDefault()
    const handle = e.currentTarget
    handle.setPointerCapture(e.pointerId)
    const startX = e.clientX
    const startWidth = width
    const move = (ev: PointerEvent) => setPreferred(Math.round(Math.max(MIN_EDITOR, Math.min(max, startWidth + startX - ev.clientX))))
    const stop = () => {
      handle.removeEventListener('pointermove', move)
      handle.removeEventListener('pointerup', stop)
      handle.removeEventListener('pointercancel', stop)
    }
    handle.addEventListener('pointermove', move)
    handle.addEventListener('pointerup', stop)
    handle.addEventListener('pointercancel', stop)
  }, [width, max, setPreferred])

  const onResizeKey = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 64 : 16
    const next = { ArrowLeft: width + step, ArrowRight: width - step, Home: max, End: MIN_EDITOR }[e.key]
    if (next === undefined) return
    e.preventDefault()
    setPreferred(Math.max(MIN_EDITOR, Math.min(max, next)))
  }

  return (
    <div data-explorer className="flex h-full min-h-0 flex-col gap-3 p-3 sm:p-4">
      <header className="@container relative z-20 shrink-0 rounded-xl border border-border bg-card shadow-card">{topBar}</header>

      <div ref={body} className="flex min-h-0 flex-1">
        <section ref={contents} tabIndex={-1} aria-label="Contents" className="@container flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card outline-none focus-visible:border-ring">
          {available > 0 && children}
        </section>

        {docked && (
          <>
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Editor width"
              aria-valuenow={width}
              aria-valuemin={MIN_EDITOR}
              aria-valuemax={max}
              tabIndex={0}
              onPointerDown={startDrag}
              onKeyDown={onResizeKey}
              onDoubleClick={() => setPreferred(432)}
              title="Drag to resize. Double-click to reset."
              className="group flex w-3 shrink-0 cursor-col-resize touch-none items-center justify-center focus-visible:outline-none"
            >
              <span aria-hidden="true" className="h-10 w-1 rounded-full bg-border transition-colors group-hover:bg-primary/50 group-focus-visible:bg-ring group-active:bg-primary" />
            </div>
            <aside aria-label="Editor" style={{ width }} className="flex shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card">
              {detailPanel}
            </aside>
          </>
        )}
      </div>

      {compact && (
        <Sheet open={sheetOpen} onOpenChange={(open) => { if (!open) onSheetClose() }}>
          <SheetContent
            side="right"
            onInteractOutside={(e) => { if ((e.target as HTMLElement | null)?.closest('[role="alertdialog"],[data-sonner-toaster]')) e.preventDefault() }}
            className="flex w-full flex-col bg-card p-0 sm:max-w-lg [&>button:first-child]:hidden"
          >
            <SheetTitle className="sr-only">Editor</SheetTitle>
            <SheetDescription className="sr-only">Details of the selected item</SheetDescription>
            {detailPanel}
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}
