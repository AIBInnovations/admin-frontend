import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/common/DataTable'
import { SearchWithFilters, FilterConfig } from '@/components/common/SearchBar'
import { DeleteModal } from '@/components/modals/DeleteModal'
import { DocumentFormModal } from '@/components/documents/DocumentFormModal'
import { Plus, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { documentsService, Document, DocumentFormData } from '@/services/documents.service'
import { seriesService, Series } from '@/services/series.service'
import { useDocumentsColumns } from './DocumentsPage.columns'

export function DocumentsPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  // State
  const [documents, setDocuments] = useState<Document[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [seriesFilter, setSeriesFilter] = useState(searchParams.get('series') || 'all')
  const [formatFilter, setFormatFilter] = useState(searchParams.get('format') || 'all')
  const [accessFilter, setAccessFilter] = useState(searchParams.get('access') || 'all')
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Dropdown data
  const [seriesList, setSeriesList] = useState<Series[]>([])

  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)

  // Fetch series for filter dropdown
  useEffect(() => {
    seriesService.getAll({ limit: 100, sort_by: 'name', sort_order: 'asc' }).then((res) => {
      if (res.success && res.data) setSeriesList(res.data.entities)
    })
  }, [])

  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true)
      const response = await documentsService.getAll({
        page: currentPage,
        limit: 20,
        series_id: seriesFilter !== 'all' ? seriesFilter : undefined,
        file_format: formatFilter !== 'all' ? formatFilter : undefined,
        is_free: accessFilter === 'all' ? null : accessFilter === 'free',
      })

      if (response.success && response.data) {
        setDocuments(response.data.entities || [])
        setTotalPages(response.data.pagination?.totalPages || 1)
        setTotalCount(response.data.pagination?.total || 0)
      }
    } catch (error) {
      toast.error('Failed to load documents')
      setDocuments([])
    } finally {
      setLoading(false)
    }
  }, [currentPage, seriesFilter, formatFilter, accessFilter])

  useEffect(() => { fetchDocuments() }, [fetchDocuments])

  // URL params sync
  useEffect(() => {
    const params: Record<string, string> = {}
    if (seriesFilter !== 'all') params.series = seriesFilter
    if (formatFilter !== 'all') params.format = formatFilter
    if (accessFilter !== 'all') params.access = accessFilter
    if (currentPage > 1) params.page = currentPage.toString()
    setSearchParams(params)
  }, [seriesFilter, formatFilter, accessFilter, currentPage, setSearchParams])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [seriesFilter, formatFilter, accessFilter])

  // Handlers
  const handleCreate = () => {
    setModalMode('create')
    setSelectedDocument(null)
    setFormModalOpen(true)
  }

  const handleEdit = (doc: Document) => {
    setModalMode('edit')
    setSelectedDocument(doc)
    setFormModalOpen(true)
  }

  const handleDeleteClick = (doc: Document) => {
    setSelectedDocument(doc)
    setDeleteModalOpen(true)
  }

  const handleFormSubmit = async (data: DocumentFormData, file?: File, onProgress?: (percent: number) => void) => {
    try {
      if (modalMode === 'create' && file) {
        const response = await documentsService.upload(data, file, onProgress)
        if (response.success) {
          toast.success('Document uploaded successfully')
          fetchDocuments()
        }
      } else if (selectedDocument) {
        const response = await documentsService.update(selectedDocument._id, data)
        if (response.success) {
          toast.success('Document updated successfully')
          fetchDocuments()
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save document')
      throw error
    }
  }

  const handleDeleteConfirm = async () => {
    if (!selectedDocument) return
    try {
      const response = await documentsService.delete(selectedDocument._id)
      if (response.success) {
        toast.success('Document deleted successfully')
        fetchDocuments()
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete document')
      throw error
    }
  }

  // Filters
  const filters: FilterConfig[] = [
    {
      key: 'series',
      label: 'Series',
      type: 'select',
      options: [
        { label: 'All Series', value: 'all' },
        ...seriesList.map((s) => ({ label: s.name, value: s._id })),
      ],
      placeholder: 'Filter by series',
      defaultValue: 'all',
    },
    {
      key: 'format',
      label: 'Format',
      type: 'select',
      options: [
        { label: 'All Formats', value: 'all' },
        { label: 'PDF', value: 'pdf' },
        { label: 'EPUB', value: 'epub' },
        { label: 'DOC', value: 'doc' },
        { label: 'DOCX', value: 'docx' },
        { label: 'PPT', value: 'ppt' },
        { label: 'PPTX', value: 'pptx' },
      ],
      placeholder: 'Filter by format',
      defaultValue: 'all',
    },
    {
      key: 'access',
      label: 'Access',
      type: 'select',
      options: [
        { label: 'All', value: 'all' },
        { label: 'Free', value: 'free' },
        { label: 'Paid', value: 'paid' },
      ],
      placeholder: 'Filter by access',
      defaultValue: 'all',
    },
  ]

  const columns = useDocumentsColumns({
    onEdit: handleEdit,
    onDelete: handleDeleteClick,
  })

  const filteredDocuments = search ? documents.filter((d) => d.title.toLowerCase().includes(search.toLowerCase())) : documents

  const hasFilters = search !== '' || seriesFilter !== 'all' || formatFilter !== 'all' || accessFilter !== 'all'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        description="Manage PDF notes, slides, and study materials"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Content' }, { label: 'Documents' }]}
        action={
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />Upload Document
          </Button>
        }
      />

      <SearchWithFilters
        value={search}
        onChange={setSearch}
        placeholder="Search documents..."
        filters={filters}
        activeFilters={{ series: seriesFilter, format: formatFilter, access: accessFilter }}
        onFiltersChange={(f) => {
          if (f.series !== undefined) setSeriesFilter(f.series)
          if (f.format !== undefined) setFormatFilter(f.format)
          if (f.access !== undefined) setAccessFilter(f.access)
        }}
      />

      <DataTable
        data={filteredDocuments}
        columns={columns}
        isLoading={loading}
        pagination={{
          currentPage,
          totalPages,
          totalCount,
          onPageChange: setCurrentPage,
        }}
        emptyState={{
          icon: FileText,
          title: hasFilters ? 'No documents found matching your search and filters' : 'No documents yet',
          description: !hasFilters ? 'Get started by uploading your first document' : undefined,
          action: !hasFilters ? (
            <Button onClick={handleCreate} variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />Upload your first document
            </Button>
          ) : undefined,
        }}
        getRowKey={(doc) => doc._id}
      />

      <DocumentFormModal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        document={selectedDocument}
        mode={modalMode}
      />

      <DeleteModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Document"
        itemName={selectedDocument?.title}
      />
    </div>
  )
}
