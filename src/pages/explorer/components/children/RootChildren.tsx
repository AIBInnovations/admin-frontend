import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Plus, BookOpen, BookCopy } from 'lucide-react'
import { SubjectRow } from '../rows/SubjectRow'
import { ExplorerEmptyState } from '../ExplorerEmptyState'
import { SubjectsGridSkeleton } from '../ExplorerSkeleton'
import { ExplorerLibraryRail } from '../ExplorerLibraryRail'
import { usePanelSelection } from '../../context/PanelSelectionContext'
import { EXPLORER_BASE } from '../../parseExplorerPath'
import type { Subject } from '@/services/subjects.service'
import type { Document } from '@/services/documents.service'
import type { ExplorerFocus } from '../../parseExplorerPath'

interface RootChildrenProps {
  subjects: Subject[] | undefined
  loading: boolean
  focus: ExplorerFocus
  onRefresh?: () => void
  libraryDocuments?: Document[]
}

export function RootChildren({ subjects, loading, focus, onRefresh, libraryDocuments }: RootChildrenProps) {
  const [search, setSearch] = useState('')
  const { select } = usePanelSelection()
  const navigate = useNavigate()

  const newSubject = () => select({ kind: 'subject', entity: null })

  const filtered = subjects?.filter((s) =>
    search.length < 1 ? true : s.name.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <>
      <div>
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 sm:px-5 py-3 border-b border-slate-100">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9 h-8 text-sm"
              placeholder="Search subjects…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 shrink-0 border-slate-200 text-slate-600 hover:bg-slate-50"
            onClick={() => navigate(`${EXPLORER_BASE}/books`)}
          >
            <BookCopy className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Books</span>
          </Button>
          <Button size="sm" className="gap-1.5 shrink-0" onClick={newSubject}>
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Subject</span>
          </Button>
        </div>

        {/* List */}
        {loading && !subjects ? (
          <SubjectsGridSkeleton />
        ) : filtered && filtered.length > 0 ? (
          <div className="py-1.5">
            {filtered.map((subject) => (
              <SubjectRow
                key={subject._id}
                subject={subject}
                parentFocus={focus}
                onRefresh={onRefresh}
              />
            ))}
          </div>
        ) : (
          <ExplorerEmptyState
            icon={BookOpen}
            title={search ? 'No subjects match' : 'No subjects yet'}
            description={
              search
                ? `No results for "${search}". Try a different search.`
                : 'Create your first subject to start organising your content.'
            }
            action={search ? undefined : { label: 'Create subject', onClick: newSubject }}
          />
        )}
      </div>

      {libraryDocuments && libraryDocuments.length > 0 && (
        <ExplorerLibraryRail documents={libraryDocuments} onRefresh={onRefresh} />
      )}
    </>
  )
}
