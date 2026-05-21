import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Plus, BookText } from 'lucide-react'
import { BookRow } from '../rows/BookRow'
import { ExplorerEmptyState } from '../ExplorerEmptyState'
import { ChildrenListSkeleton } from '../ExplorerSkeleton'
import { usePanelSelection } from '../../context/PanelSelectionContext'
import type { Book } from '@/services/books.service'
import type { ExplorerFocus } from '../../parseExplorerPath'

interface BooksCatalogProps {
  books: Book[] | undefined
  loading: boolean
  focus: ExplorerFocus
  onRefresh?: () => void
}

type AvailFilter = 'all' | 'available' | 'unavailable'
type PublishFilter = 'all' | 'published' | 'draft'

export function BooksCatalog({ books, loading, onRefresh: _onRefresh }: BooksCatalogProps) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [avail, setAvail] = useState<AvailFilter>('all')
  const [publish, setPublish] = useState<PublishFilter>('all')
  const { select } = usePanelSelection()

  const newBook = () => select({ kind: 'book', entity: null })

  const categories = useMemo(
    () => Array.from(new Set((books ?? []).map((b) => b.category).filter(Boolean))) as string[],
    [books],
  )

  const filtered = (books ?? []).filter((b) => {
    if (search && !`${b.title} ${b.author}`.toLowerCase().includes(search.toLowerCase())) return false
    if (category !== 'all' && b.category !== category) return false
    if (avail === 'available' && !b.is_available) return false
    if (avail === 'unavailable' && b.is_available) return false
    if (publish !== 'all' && b.publish_status !== publish) return false
    return true
  })

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 sm:px-5 py-3 border-b border-slate-100 flex-wrap">
        <div className="relative flex-1 min-w-40 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9 h-8 text-sm" placeholder="Search books…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-8 rounded-md border border-slate-200 bg-slate-50/60 px-2 text-sm">
          <option value="all">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <select value={avail} onChange={(e) => setAvail(e.target.value as AvailFilter)} className="h-8 rounded-md border border-slate-200 bg-slate-50/60 px-2 text-sm">
          <option value="all">All</option>
          <option value="available">Available</option>
          <option value="unavailable">Unavailable</option>
        </select>

        <select value={publish} onChange={(e) => setPublish(e.target.value as PublishFilter)} className="h-8 rounded-md border border-slate-200 bg-slate-50/60 px-2 text-sm">
          <option value="all">Any status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>

        <Button size="sm" className="gap-1.5 shrink-0 ml-auto" onClick={newBook}>
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Book</span>
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {loading && !books ? (
          <ChildrenListSkeleton />
        ) : filtered.length > 0 ? (
          <div className="py-1.5">
            {filtered.map((b) => <BookRow key={b._id} book={b} />)}
          </div>
        ) : (
          <ExplorerEmptyState
            icon={BookText}
            title={books && books.length > 0 ? 'No books match' : 'No books yet'}
            description={books && books.length > 0 ? 'Try clearing the filters.' : 'Add your first book to the catalog.'}
            action={books && books.length > 0 ? undefined : { label: 'Create book', onClick: newBook }}
          />
        )}
      </div>
    </div>
  )
}
