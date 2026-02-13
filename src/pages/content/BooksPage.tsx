import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/common/DataTable'
import { SearchWithFilters, FilterConfig } from '@/components/common/SearchBar'
import { DeleteModal } from '@/components/modals/DeleteModal'
import { BookFormModal } from '@/components/books/BookFormModal'
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
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)

  // Fetch books
  const fetchBooks = useCallback(async () => {
    try {
      setLoading(true)
      const response = await booksService.getAll({
        page: 1,
        limit: 1000,
        is_available: availabilityFilter === 'all' ? null : availabilityFilter === 'available',
      })

      if (response.success && response.data) {
        setBooks(response.data.entities || [])
      }
    } catch (error) {
      toast.error('Failed to load books')
      setBooks([])
    } finally {
      setLoading(false)
    }
  }, [availabilityFilter])

  useEffect(() => { fetchBooks() }, [fetchBooks])

  // URL params sync
  useEffect(() => {
    const params: Record<string, string> = {}
    if (search) params.search = search
    if (availabilityFilter !== 'all') params.availability = availabilityFilter
    if (currentPage > 1) params.page = currentPage.toString()
    setSearchParams(params)
  }, [search, availabilityFilter, currentPage, setSearchParams])

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
  }, [search, availabilityFilter])

  // Handlers
  const handleCreate = () => {
    setModalMode('create')
    setSelectedBook(null)
    setFormModalOpen(true)
  }

  const handleEdit = (book: Book) => {
    setModalMode('edit')
    setSelectedBook(book)
    setFormModalOpen(true)
  }

  const handleDeleteClick = (book: Book) => {
    setSelectedBook(book)
    setDeleteModalOpen(true)
  }

  const handleFormSubmit = async (data: BookFormData) => {
    try {
      if (modalMode === 'create') {
        const response = await booksService.create(data)
        if (response.success) {
          toast.success('Book created successfully')
          fetchBooks()
        }
      } else if (selectedBook) {
        const response = await booksService.update(selectedBook._id, data)
        if (response.success) {
          toast.success('Book updated successfully')
          fetchBooks()
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save book')
      throw error
    }
  }

  const handleDeleteConfirm = async () => {
    if (!selectedBook) return
    try {
      const response = await booksService.delete(selectedBook._id)
      if (response.success) {
        toast.success('Book deleted successfully')
        fetchBooks()
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete book')
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
  ]

  const columns = useBooksColumns({
    onEdit: handleEdit,
    onDelete: handleDeleteClick,
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
        activeFilters={{ availability: availabilityFilter }}
        onFiltersChange={(f) => {
          if (f.availability !== undefined) setAvailabilityFilter(f.availability)
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
          title: search || availabilityFilter !== 'all'
            ? 'No books found matching your filters'
            : 'No books yet',
          description: !search && availabilityFilter === 'all'
            ? 'Get started by adding your first book'
            : undefined,
          action: !search && availabilityFilter === 'all' ? (
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

      <DeleteModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Book"
        itemName={selectedBook?.title}
      />
    </div>
  )
}
