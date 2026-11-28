import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useServerSearch } from '@/hooks/useServerSearch'
import { useLatestFetch } from '@/hooks/useLatestFetch'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable } from '@/components/common/DataTable'
import { SearchWithFilters, FilterConfig } from '@/components/common/SearchBar'
import { PublishConfirmModal } from '@/components/common/PublishConfirmModal'
import { useAuth } from '@/contexts/AuthContext'
import { Plus, BookOpen } from 'lucide-react'
import { booksService, Book } from '@/services/books.service'
import { errorText } from '@/components/books/bookDisplay'
import { useBooksColumns } from './BooksPage.columns'

const LIMIT = 20

// The existing filters
const filters: FilterConfig[] = [
  {
    key: 'availability',
    label: 'Availability',
    type: 'select',
    options: [
      { label: 'All', value: 'all' },
      { label: 'Available', value: 'available' },
      { label: 'Unavailable', value: 'unavailable' },
    ],
    placeholder: 'Filter by availability',
    defaultValue: 'all',
  },
  {
    key: 'publish_status',
    label: 'Publish Status',
    type: 'select',
    options: [
      { label: 'All', value: 'all' },
      { label: 'Published', value: 'published' },
      { label: 'Draft', value: 'draft' },
    ],
    placeholder: 'Filter by publish status',
    defaultValue: 'all',
  },
]

// Added in phase 2
const moreFilters = [
  {
    key: 'format', label: 'Format', options: [
      { label: 'Any format', value: 'all' },
      { label: 'EPUB', value: 'epub' },
      { label: 'PDF (old)', value: 'pdf' },
      { label: 'E-book without a file', value: 'no_file' },
      { label: 'Paperback only', value: 'paperback' },
    ],
  },
  {
    key: 'sample', label: 'Free sample', options: [
      { label: 'Sample or not', value: 'all' },
      { label: 'Has a sample', value: 'yes' },
      { label: 'No sample', value: 'no' },
    ],
  },
  {
    key: 'sort', label: 'Order', options: [
      { label: 'Store order', value: 'all' },
      { label: 'Most sold first', value: 'sold' },
      { label: 'Highest revenue first', value: 'revenue' },
    ],
  },
]
const FILTER_KEYS = ['availability', 'publish_status', 'format', 'sample']

export function BooksPage() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canCreate = hasPermission('books.create')
  const canEdit = hasPermission('books.update')

  // Filters and page live in the URL
  const [params, setParams] = useSearchParams()
  const search = params.get('search') || ''
  const value = (key: string) => params.get(key) || 'all'
  const availability = value('availability')
  const publishStatus = value('publish_status')
  const format = value('format')
  const sample = value('sample')
  const sort = value('sort')
  const currentPage = Math.max(1, Number(params.get('page')) || 1)
  const { inputValue, setInputValue, debouncedSearch } = useServerSearch(search)

  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [publishModal, setPublishModal] = useState<{ entityId: string; action: 'publish' | 'unpublish' } | null>(null)

  const { nextFetchId, isStale } = useLatestFetch()

  const update = useCallback((patch: Record<string, string | null>) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      for (const [key, v] of Object.entries(patch)) {
        if (!v || v === 'all') next.delete(key)
        else next.set(key, v)
      }
      return next
    }, { replace: true })
  }, [setParams])

  // Typing: search after a pause, from page 1
  useEffect(() => {
    if (debouncedSearch !== search) update({ search: debouncedSearch || null, page: null })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  const fetchBooks = useCallback(async () => {
    const fetchId = nextFetchId()
    setLoading(true)
    try {
      const response = await booksService.getAll({
        page: currentPage,
        limit: LIMIT,
        search: search || undefined,
        is_available: availability === 'all' ? null : availability === 'available',
        publish_status: publishStatus === 'all' ? null : publishStatus,
        format: format === 'all' ? null : format,
        has_sample: sample === 'all' ? null : sample === 'yes',
        sort: sort === 'all' ? null : sort,
      })
      if (isStale(fetchId)) return
      if (!response.success || !response.data) throw new Error(response.message || 'Failed to load books')
      const pages = response.data.pagination?.totalPages || 1
      setBooks(response.data.entities || [])
      setTotalPages(pages)
      setTotalCount(response.data.pagination?.total || 0)
      setError(null)
      // A page that no longer exists (a narrower filter, an old link)
      if (currentPage > pages) update({ page: pages > 1 ? String(pages) : null })
    } catch (err) {
      if (isStale(fetchId)) return
      setError(errorText(err, 'Failed to load books'))
    } finally {
      if (!isStale(fetchId)) setLoading(false)
    }
  }, [currentPage, search, availability, publishStatus, format, sample, sort, nextFetchId, isStale, update])

  useEffect(() => { fetchBooks() }, [fetchBooks])

  const filtered = !!search || FILTER_KEYS.some((k) => value(k) !== 'all')
  const clear = () => {
    setInputValue('')
    update({ search: null, page: null, availability: null, publish_status: null, format: null, sample: null })
  }

  const columns = useBooksColumns({
    canEdit,
    onOpen: (book) => navigate(`/content/books/${book._id}`),
    onEdit: (book) => navigate(`/content/books/${book._id}/edit`),
    onPublishAction: (entityId, action) => setPublishModal({ entityId, action }),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Books"
        description="Manage book catalog, pricing, and stock"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Content' }, { label: 'Books' }]}
        action={canCreate && (
          <Button onClick={() => navigate('/content/books/new')}>
            <Plus className="mr-2 h-4 w-4" />Add Book
          </Button>
        )}
      />

      <div className="space-y-3">
        <SearchWithFilters
          value={inputValue}
          onChange={setInputValue}
          placeholder="Search title, author, ISBN..."
          filters={filters}
          activeFilters={{ availability, publish_status: publishStatus }}
          onFiltersChange={(f) => update({ availability: f.availability ?? null, publish_status: f.publish_status ?? null, page: null })}
        />
        <div className="flex flex-wrap gap-3">
          {moreFilters.map((f) => (
            <Select key={f.key} value={value(f.key)} onValueChange={(v) => update({ [f.key]: v, page: null })}>
              <SelectTrigger className="h-9 w-[calc(50%-6px)] sm:w-[200px]" aria-label={f.label}><SelectValue /></SelectTrigger>
              <SelectContent>{f.options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
          ))}
          {filtered && <Button variant="ghost" size="sm" className="h-9" onClick={clear}>Clear filters</Button>}
        </div>
      </div>

      {error && books.length > 0 && (
        <p role="alert" className="rounded-lg bg-warning-soft px-4 py-2.5 text-sm">
          Showing the list from before. {error}{' '}
          <button type="button" className="font-medium text-primary underline-offset-2 hover:underline" onClick={fetchBooks}>Try again</button>
        </p>
      )}

      <DataTable
        data={books}
        columns={columns}
        isLoading={loading && books.length === 0}
        error={error}
        onRetry={fetchBooks}
        onRowClick={(book) => navigate(`/content/books/${book._id}`)}
        pagination={{
          currentPage,
          totalPages,
          totalCount,
          onPageChange: (p) => update({ page: p > 1 ? String(p) : null }),
        }}
        emptyState={{
          icon: BookOpen,
          title: filtered ? 'No books found matching your filters' : 'No books yet',
          description: filtered ? undefined : 'Get started by adding your first book',
          action: filtered ? (
            <Button onClick={clear} variant="outline" size="sm">Clear filters</Button>
          ) : canCreate ? (
            <Button onClick={() => navigate('/content/books/new')} variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />Add your first book
            </Button>
          ) : undefined,
        }}
        getRowKey={(book) => book._id}
      />

      {publishModal && (
        <PublishConfirmModal
          open={!!publishModal}
          onOpenChange={(open) => { if (!open) setPublishModal(null) }}
          entityType="book"
          entityId={publishModal.entityId}
          action={publishModal.action}
          onSuccess={fetchBooks}
        />
      )}
    </div>
  )
}
