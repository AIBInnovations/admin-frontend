import { useMemo } from 'react'
import { BookText, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useExplorerAccess } from '../../access'
import { usePanelSelection } from '../../context/PanelSelectionContext'
import type { ExplorerData } from '../../hooks/useExplorerData'
import { useClearUrl, useUrlState } from '../../hooks/useUrlState'
import { ExplorerEmptyState, NoAccess } from '../ExplorerEmptyState'
import { ChildrenListSkeleton } from '../ExplorerSkeleton'
import { FilterSelect, ListToolbar } from '../ListToolbar'
import { BookRow } from '../rows/rows'
import { matches } from './shared'

export function BooksCatalog({ data }: { data: ExplorerData }) {
  const { can } = useExplorerAccess()
  const { create } = usePanelSelection()
  const [search, setSearch] = useUrlState('q')
  const [category, setCategory] = useUrlState('category', 'all')
  const [availability, setAvailability] = useUrlState('availability', 'all')
  const [status, setStatus] = useUrlState('status', 'all')
  const clearUrl = useClearUrl()
  const { books } = data

  const categories = useMemo(() => [...new Set((books ?? []).map((b) => b.category).filter(Boolean))].sort() as string[], [books])
  if (!can('book', 'read')) return <NoAccess what="books" />

  const filtered = (books ?? []).filter((b) =>
    matches(`${b.title} ${b.author}`, search)
    && (category === 'all' || b.category === category)
    && (availability === 'all' || b.is_available === (availability === 'available'))
    && (status === 'all' || b.publish_status === status))
  const clear = () => clearUrl(['q', 'category', 'availability', 'status'])
  const canCreate = can('book', 'create')

  return (
    <>
      <ListToolbar
        search={search}
        onSearch={setSearch}
        placeholder="Search books"
        filters={(
          <>
            <FilterSelect label="Category" value={category} onChange={setCategory} options={[{ value: 'all', label: 'All categories' }, ...categories.map((c) => ({ value: c, label: c }))]} />
            <FilterSelect label="Availability" value={availability} onChange={setAvailability} options={[{ value: 'all', label: 'All' }, { value: 'available', label: 'Available' }, { value: 'unavailable', label: 'Unavailable' }]} />
            <FilterSelect label="Status" value={status} onChange={setStatus} options={[{ value: 'all', label: 'Any status' }, { value: 'published', label: 'Published' }, { value: 'draft', label: 'Draft' }]} />
          </>
        )}
      >
        {canCreate && <Button size="sm" className="h-9" onClick={() => create('book')}><Plus className="h-4 w-4" /> New Book</Button>}
      </ListToolbar>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {!books ? <ChildrenListSkeleton /> : filtered.length > 0 ? (
          <ul aria-label="Books" className="py-1.5">{filtered.map((b) => <li key={b._id}><BookRow book={b} /></li>)}</ul>
        ) : books.length > 0 ? (
          <ExplorerEmptyState icon={BookText} title="No books match" description="Nothing fits this search and these filters." action={{ label: 'Clear filters', onClick: clear }} />
        ) : (
          <ExplorerEmptyState icon={BookText} title="No books yet" description="Add your first book to the catalogue." action={canCreate ? { label: 'Create book', onClick: () => create('book') } : undefined} />
        )}
      </div>
    </>
  )
}
