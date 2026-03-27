import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/common/DataTable'
import { SearchWithFilters, FilterConfig } from '@/components/common/SearchBar'
import { BookFormModal } from '@/components/books/BookFormModal'
import { PublishConfirmModal } from '@/components/common/PublishConfirmModal'
import { Plus, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import { booksService, Book, BookFormData } from '@/services/books.service'
import { useBooksColumns } from './BooksPage.columns'

export function BooksPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  // State
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [availabilityFilter, setAvailabilityFilter] = useState(searchParams.get('availability') || 'all')
  const [publishFilter, setPublishFilter] = useState(searchParams.get('publish_status') || 'all')
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [publishModal, setPublishModal] = useState<{ entityId: string; action: 'publish' | 'unpublish' } | null>(null)

  // Fetch books
  const fetchBooks = useCallback(async () => {
    try {
      setLoading(true)
      const response = await booksService.getAll({
        page: 1,
        limit: 100,
        is_available: availabilityFilter === 'all' ? null : availabilityFilter === 'available',
        publish_status: publishFilter === 'all' ? null : publishFilter,
      })

      if (response.success && response.data) {
        setBooks(response.data.entities || [])
      } else {
        toast.error(response.message || 'Failed to load books')
        setBooks([])
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load books')
      setBooks([])
    } finally {
      setLoading(false)
    }
  }, [availabilityFilter, publishFilter])

  useEffect(() => { fetchBooks() }, [fetchBooks])

  // URL params sync
  useEffect(() => {
    const params: Record<string, string> = {}
    if (search) params.search = search
    if (availabilityFilter !== 'all') params.availability = availabilityFilter
    if (publishFilter !== 'all') params.publish_status = publishFilter
    if (currentPage > 1) params.page = currentPage.toString()
    setSearchParams(params)
  }, [search, availabilityFilter, publishFilter, currentPage, setSearchParams])

  // Client-side filter
  const filteredBooks = search
    ? books.filter((b) => b.title.toLowerCase().includes(search.toLowerCase()))
    : books

  // Pagination for filtered results
  const startIndex = (currentPage - 1) * 20
  const paginatedBooks = filteredBooks.slice(startIndex, startIndex + 20)
  const filteredTotalPages = Math.ceil(filteredBooks.length / 20)

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [search, availabilityFilter, publishFilter])

  // Handlers
  const handleCreate = () => {
    setModalMode('create')
    setSelectedBook(null)
    setFormModalOpen(true)
  }

  const handlePublishAction = (entityId: string, action: 'publish' | 'unpublish') => {
    setPublishModal({ entityId, action })
  }

  const handleEdit = (book: Book) => {
    setModalMode('edit')
    setSelectedBook(book)
    setFormModalOpen(true)
  }

  const handleFormSubmit = async (data: BookFormData, ebookFile?: File, onProgress?: (pct: number) => void) => {
    try {
      let bookId: string | undefined
      if (modalMode === 'create') {
        const response = await booksService.create(data)
        if (response.success && response.data) {
          bookId = response.data._id
          toast.success('Book created successfully')
        } else {
          toast.error(response.message || 'Failed to create book')
          throw new Error(response.message || 'Failed to create book')
        }
      } else if (selectedBook) {
        const response = await booksService.update(selectedBook._id, data)
        if (response.success) {
          bookId = selectedBook._id
          toast.success('Book updated successfully')
        } else {
          toast.error(response.message || 'Failed to update book')
          throw new Error(response.message || 'Failed to update book')
        }
      }

      // Upload ebook file if provided
      if (bookId && ebookFile) {
        await booksService.uploadEbook(bookId, ebookFile, onProgress)
        toast.success('E-book file uploaded successfully')
      }

      fetchBooks()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save book')
      throw error
    }
  }

  // Filters
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

  const columns = useBooksColumns({
    onEdit: handleEdit,
    onPublishAction: handlePublishAction,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Books"
        description="Manage book catalog, pricing, and stock"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Content' }, { label: 'Books' }]}
        action={
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />Add Book
          </Button>
        }
      />

      <SearchWithFilters
        value={search}
        onChange={setSearch}
        placeholder="Search title, author, ISBN..."
        filters={filters}
        activeFilters={{ availability: availabilityFilter, publish_status: publishFilter }}
        onFiltersChange={(f) => {
          if (f.availability !== undefined) setAvailabilityFilter(f.availability)
          if (f.publish_status !== undefined) setPublishFilter(f.publish_status)
        }}
      />

      <DataTable
        data={paginatedBooks}
        columns={columns}
        isLoading={loading}
        pagination={{
          currentPage,
          totalPages: filteredTotalPages,
          totalCount: filteredBooks.length,
          onPageChange: setCurrentPage,
        }}
        emptyState={{
          icon: BookOpen,
          title: search || availabilityFilter !== 'all' || publishFilter !== 'all'
            ? 'No books found matching your filters'
            : 'No books yet',
          description: !search && availabilityFilter === 'all' && publishFilter === 'all'
            ? 'Get started by adding your first book'
            : undefined,
          action: !search && availabilityFilter === 'all' && publishFilter === 'all' ? (
            <Button onClick={handleCreate} variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />Add your first book
            </Button>
          ) : undefined,
        }}
        getRowKey={(book) => book._id}
      />

      <BookFormModal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        book={selectedBook}
        mode={modalMode}
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
