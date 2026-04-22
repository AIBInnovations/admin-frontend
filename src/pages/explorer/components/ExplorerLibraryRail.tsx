import { useState } from 'react'
import { ChevronDown, ChevronRight, Library } from 'lucide-react'
import { DocumentRow } from './rows/DocumentRow'
import type { Document } from '@/services/documents.service'

interface ExplorerLibraryRailProps {
  documents: Document[]
  onRefresh?: () => void
}

export function ExplorerLibraryRail({ documents, onRefresh }: ExplorerLibraryRailProps) {
  const [expanded, setExpanded] = useState(false)

  if (documents.length === 0) return null

  return (
    <div className="border-t border-slate-100">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-4 sm:px-5 py-3 text-left hover:bg-slate-50 transition-colors"
      >
        <Library className="w-4 h-4 text-slate-400 shrink-0" />
        <span className="text-sm font-medium text-slate-700 flex-1">
          Library — Orphan Documents
        </span>
        <span className="text-xs text-slate-400 mr-2">{documents.length} doc{documents.length !== 1 ? 's' : ''}</span>
        {expanded
          ? <ChevronDown className="w-4 h-4 text-slate-400" />
          : <ChevronRight className="w-4 h-4 text-slate-400" />}
      </button>

      {expanded && (
        <div className="border-t border-slate-100 py-1.5">
          {documents.map((d) => (
            <DocumentRow key={d._id} document={d} onRefresh={onRefresh} />
          ))}
        </div>
      )}
    </div>
  )
}
