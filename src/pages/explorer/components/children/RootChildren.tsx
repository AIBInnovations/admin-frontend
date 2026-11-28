import { BookCopy, BookOpen, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useExplorerAccess } from '../../access'
import { usePanelSelection } from '../../context/PanelSelectionContext'
import type { ExplorerData } from '../../hooks/useExplorerData'
import { useUrlState } from '../../hooks/useUrlState'
import { EXPLORER_BASE, type ExplorerFocus } from '../../parseExplorerPath'
import { ExplorerEmptyState } from '../ExplorerEmptyState'
import { ExplorerLibraryRail } from '../ExplorerLibraryRail'
import { ChildrenListSkeleton } from '../ExplorerSkeleton'
import { ListToolbar } from '../ListToolbar'
import { SubjectRow } from '../rows/rows'
import { matches } from './shared'

export function RootChildren({ data, focus }: { data: ExplorerData; focus: ExplorerFocus }) {
  const { can } = useExplorerAccess()
  const { create, go } = usePanelSelection()
  const [search, setSearch] = useUrlState('q')
  const { subjects } = data
  const filtered = (subjects ?? []).filter((s) => matches(s.name, search))
  const canCreate = can('subject', 'create')

  return (
    <>
      <ListToolbar search={search} onSearch={setSearch} placeholder="Search subjects">
        {can('book', 'read') && <Button size="sm" variant="outline" className="h-9" onClick={() => go(`${EXPLORER_BASE}/books`)}><BookCopy className="h-4 w-4" /> Books</Button>}
        {canCreate && <Button size="sm" className="h-9" onClick={() => create('subject')}><Plus className="h-4 w-4" /> New Subject</Button>}
      </ListToolbar>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {!subjects ? <ChildrenListSkeleton /> : filtered.length > 0 ? (
          <ul aria-label="Subjects" className="py-1.5">{filtered.map((s) => <li key={s._id}><SubjectRow subject={s} parentFocus={focus} /></li>)}</ul>
        ) : subjects.length > 0 ? (
          <ExplorerEmptyState icon={BookOpen} title="No subjects match" description={`Nothing here is called "${search}".`} action={{ label: 'Clear search', onClick: () => setSearch('') }} />
        ) : (
          <ExplorerEmptyState icon={BookOpen} title="No subjects yet" description="A subject holds packages, and packages hold series, modules and videos." action={canCreate ? { label: 'Create subject', onClick: () => create('subject') } : undefined} />
        )}
        {can('document', 'read') && <ExplorerLibraryRail documents={data.libraryDocuments ?? []} />}
      </div>
    </>
  )
}
