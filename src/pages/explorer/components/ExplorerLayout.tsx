import { ReactNode } from 'react'

interface ExplorerLayoutProps {
  topBar: ReactNode
  /** Left column: the children list. */
  children: ReactNode
  /** Right column: the docked detail/editor panel. */
  detailPanel: ReactNode
}

export function ExplorerLayout({ topBar, children, detailPanel }: ExplorerLayoutProps) {
  return (
    <div className="min-h-full bg-slate-100 flex flex-col">
      <div className="flex-1 min-h-0 flex flex-col gap-3 p-3 sm:p-4 lg:p-5">
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 overflow-hidden">
          {topBar}
        </div>

        <div className="flex-1 min-h-0 flex gap-3">
          {/* List */}
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 flex-1 min-w-0 overflow-hidden flex flex-col">
            {children}
          </div>

          {/* Docked detail panel (desktop) */}
          <div className="hidden lg:flex bg-white rounded-2xl shadow-sm ring-1 ring-black/5 w-95 xl:w-110 shrink-0 overflow-hidden flex-col">
            {detailPanel}
          </div>
        </div>
      </div>
    </div>
  )
}
