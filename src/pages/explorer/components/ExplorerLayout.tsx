import { ReactNode } from 'react'

interface ExplorerLayoutProps {
  topBar: ReactNode
  focusCard?: ReactNode
  children: ReactNode
}

export function ExplorerLayout({ topBar, focusCard, children }: ExplorerLayoutProps) {
  return (
    <div className="min-h-full bg-slate-100 flex flex-col">
      {topBar}
      <div className="flex-1 min-h-0 flex flex-col gap-3 p-3 sm:p-4 lg:p-5">
        {focusCard && (
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5">
            {focusCard}
          </div>
        )}
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 flex-1 min-h-0 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  )
}
