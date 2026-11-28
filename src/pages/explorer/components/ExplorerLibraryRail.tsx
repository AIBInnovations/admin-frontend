import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronRight, Library } from 'lucide-react'
import type { Document } from '@/services/documents.service'
import { cn } from '@/lib/utils'
import { plural } from '../ui/text'
import { DocumentRow } from './rows/rows'

/** Documents that belong to no subject and no series. */
export function ExplorerLibraryRail({ documents }: { documents: Document[] }) {
  const [params] = useSearchParams()
  const linked = documents.some((d) => params.get('item') === `document:${d._id}`)
  const [expanded, setExpanded] = useState(false)
  useEffect(() => { if (linked) setExpanded(true) }, [linked])

  if (documents.length === 0) return null
  return (
    <div className="border-t border-border">
      <button type="button" aria-expanded={expanded} onClick={() => setExpanded((v) => !v)} className="flex w-full items-center gap-2.5 px-4 py-3 text-left transition-colors hover:bg-muted/70">
        <Library aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 text-sm font-medium text-foreground">Library: documents outside any subject</span>
        <span className="text-xs tabular-nums text-muted-foreground">{plural(documents.length, 'document')}</span>
        <ChevronRight aria-hidden="true" className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', expanded && 'rotate-90')} />
      </button>
      {expanded && <ul aria-label="Documents outside any subject" className="pb-1.5">{documents.map((d) => <li key={d._id}><DocumentRow document={d} /></li>)}</ul>}
    </div>
  )
}
