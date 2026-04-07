import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/common/DataTable'
import { SearchWithFilters, FilterConfig } from '@/components/common/SearchBar'
import { ArchiveModal } from '@/components/modals/ArchiveModal'
import { PublishConfirmModal } from '@/components/common/PublishConfirmModal'
import { DocumentFormModal } from '@/components/documents/DocumentFormModal'
import { ErrorModal } from '@/components/common/ErrorModal'
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
  const [publishFilter, setPublishFilter] = useState(searchParams.get('publish_status') || 'all')
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Dropdown data
  const [seriesList, setSeriesList] = useState<Series[]>([])

  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [archiveModalOpen, setArchiveModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [publishModal, setPublishModal] = useState<{ entityId: string; action: 'publish' | 'unpublish' } | null>(null)
  // Error modal — every catchable failure in this page surfaces here so the
  // admin sees the precise reason instead of a transient toast.
  const [errorModal, setErrorModal] = useState<{ open: boolean; title?: string; message: string }>({
    open: false,
    message: '',
  })
  const showError = (message: string, title?: string) => setErrorModal({ open: true, title, message })

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
        publish_status: publishFilter === 'all' ? null : publishFilter,
      })

      if (response.success && response.data) {
        setDocuments(response.data.entities || [])
        setTotalPages(response.data.pagination?.totalPages || 1)
        setTotalCount(response.data.pagination?.total || 0)
      } else {
        toast.error(response.message || 'Failed to load documents')
        setDocuments([])
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load documents')
      setDocuments([])
    } finally {
      setLoading(false)
    }
  }, [currentPage, seriesFilter, formatFilter, accessFilter, publishFilter])

  useEffect(() => { fetchDocuments() }, [fetchDocuments])

  // URL params sync
  useEffect(() => {
    const params: Record<string, string> = {}
    if (seriesFilter !== 'all') params.series = seriesFilter
    if (formatFilter !== 'all') params.format = formatFilter
    if (accessFilter !== 'all') params.access = accessFilter
    if (publishFilter !== 'all') params.publish_status = publishFilter
    if (currentPage > 1) params.page = currentPage.toString()
    setSearchParams(params)
  }, [seriesFilter, formatFilter, accessFilter, publishFilter, currentPage, setSearchParams])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [seriesFilter, formatFilter, accessFilter, publishFilter])

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

  const handlePublishAction = (entityId: string, action: 'publish' | 'unpublish') => {
    setPublishModal({ entityId, action })
  }

  const handleArchiveClick = (doc: Document) => {
    setSelectedDocument(doc)
    setArchiveModalOpen(true)
  }

  const handleFormSubmit = async (
    data: DocumentFormData,
    file?: File,
    onProgress?: (percent: number) => void,
    linkedBookId?: string,
  ) => {
    // Track whether a precise error has already been surfaced via showError()
    // inside this invocation. The catch block consults this LOCAL flag instead
    // of `errorModal.open`, because that React state is captured in the closure
    // and won't reflect synchronous setState calls before the catch fires.
    let surfacedSpecificError = false
    const surfaceError = (message: string, title?: string) => {
      surfacedSpecificError = true
      showError(message, title)
    }

    try {
      // ── CREATE ──
      if (modalMode === 'create') {
        if (linkedBookId) {
          // Linked-mode create: no file upload, mirror from Book.
          const response = await documentsService.createLinked({
            source_book_id: linkedBookId,
            series_id: data.series_id,
            subject_id: data.subject_id,
            is_free: data.is_free,
            publish_status: data.publish_status,
          })
          if (!response.success) {
            const msg = response.message || 'Failed to link eBook as document'
            surfaceError(msg, 'Could not link eBook')
            throw new Error(msg)
          }
          toast.success('eBook linked as document successfully')
          fetchDocuments()
          return
        }
        if (!file) {
          // Should be caught by modal validation, but defend anyway.
          const msg = 'A document file is required to create a standalone document.'
          surfaceError(msg, 'Missing file')
          throw new Error(msg)
        }
        const response = await documentsService.upload(data, file, onProgress)
        if (!response.success) {
          const msg = response.message || 'Failed to upload document'
          surfaceError(msg, 'Upload failed')
          throw new Error(msg)
        }
        toast.success('Document uploaded successfully')
        fetchDocuments()
        return
      }

      // ── EDIT ──
      if (!selectedDocument) return

      // For linked documents, strip every mirrored field defensively. The
      // backend also rejects them, but we surface a friendlier error if
      // somehow they leak through.
      const isLinkedDoc = !!selectedDocument.source_book_id
      const safeData: Partial<DocumentFormData> = isLinkedDoc
        ? {
            series_id: data.series_id,
            subject_id: data.subject_id,
            is_free: data.is_free,
            publish_status: data.publish_status,
            display_order: data.display_order,
          }
        : data

      const response = await documentsService.update(selectedDocument._id, safeData)
      if (!response.success) {
        const msg = response.message || 'Failed to update document'
        surfaceError(msg, 'Update failed')
        throw new Error(msg)
      }

      // File replace is only valid for standalone documents.
      if (file) {
        if (isLinkedDoc) {
          const msg = 'This document is linked to an eBook. Replace the file on the source Book — the change will propagate automatically.'
          surfaceError(msg, 'Cannot replace file')
          throw new Error(msg)
        }
        const replaceRes = await documentsService.replaceFile(selectedDocument._id, file, onProgress)
        if (!replaceRes.success) {
          const msg = replaceRes.message || 'Failed to replace document file'
          surfaceError(msg, 'File replacement failed')
          throw new Error(msg)
        }
      }

      toast.success(file ? 'Document updated and file replaced' : 'Document updated successfully')
      fetchDocuments()
    } catch (error: any) {
      // For unknown (network, axios, unexpected) failures, surface the raw
      // error. Skip if a more precise error was already surfaced above.
      if (!surfacedSpecificError) {
        showError(error?.message || 'Failed to save document', 'Something went wrong')
      }
      throw error
    }
  }

  const handleArchiveConfirm = async () => {
    if (!selectedDocument) return
    let surfacedSpecificError = false
    try {
      const response = await documentsService.archive(selectedDocument._id)
      if (response.success) {
        toast.success('Document archived successfully')
        fetchDocuments()
      } else {
        const msg = response.message || 'Failed to archive document'
        surfacedSpecificError = true
        showError(msg, 'Archive failed')
        throw new Error(msg)
      }
    } catch (error: any) {
      if (!surfacedSpecificError) {
        showError(error?.message || 'Failed to archive document', 'Archive failed')
      }
      throw error
    }
  }

  // Filters
  const filters: FilterConfig[] = [
    {
      key: 'series',
      label: 'Series',
      type: 'select',
      searchable: true,
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

  const columns = useDocumentsColumns({
    onEdit: handleEdit,
    onArchive: handleArchiveClick,
    onPublishAction: handlePublishAction,
  })

  const filteredDocuments = search ? documents.filter((d) => d.title.toLowerCase().includes(search.toLowerCase())) : documents

  const hasFilters = search !== '' || seriesFilter !== 'all' || formatFilter !== 'all' || accessFilter !== 'all' || publishFilter !== 'all'

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
        activeFilters={{ series: seriesFilter, format: formatFilter, access: accessFilter, publish_status: publishFilter }}
        onFiltersChange={(f) => {
          if (f.series !== undefined) setSeriesFilter(f.series)
          if (f.format !== undefined) setFormatFilter(f.format)
          if (f.access !== undefined) setAccessFilter(f.access)
          if (f.publish_status !== undefined) setPublishFilter(f.publish_status)
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

      <ArchiveModal
        open={archiveModalOpen}
        onClose={() => setArchiveModalOpen(false)}
        onConfirm={handleArchiveConfirm}
        title="Archive Document"
        itemName={selectedDocument?.title}
      />

      {publishModal && (
        <PublishConfirmModal
          open={!!publishModal}
          onOpenChange={(open) => { if (!open) setPublishModal(null) }}
          entityType="document"
          entityId={publishModal.entityId}
          action={publishModal.action}
          onSuccess={fetchDocuments}
        />
      )}

      <ErrorModal
        open={errorModal.open}
        title={errorModal.title}
        message={errorModal.message}
        onClose={() => setErrorModal({ open: false, message: '' })}
      />
    </div>
  )
}
