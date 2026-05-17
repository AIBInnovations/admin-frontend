import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useResetPageOnChange } from '@/hooks/useResetPageOnChange'
import { useLatestFetch } from '@/hooks/useLatestFetch'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/common/DataTable'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { DeleteModal } from '@/components/modals/DeleteModal'
import { WebStoreRedirectRuleFormModal } from '@/components/webStoreRedirectRules/WebStoreRedirectRuleFormModal'
import { Plus, Globe } from 'lucide-react'
import { toast } from 'sonner'
import {
  webStoreRedirectRulesService,
  WebStoreRedirectRule,
  WebStoreRedirectRuleFormData,
  RedirectPlatform,
} from '@/services/webStoreRedirectRules.service'
import { useWebStoreRedirectRulesColumns } from './WebStoreRedirectRulesPage.columns'

export function WebStoreRedirectRulesPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const [rules, setRules] = useState<WebStoreRedirectRule[]>([])
  const [loading, setLoading] = useState(true)
  const [platformFilter, setPlatformFilter] = useState(searchParams.get('platform') || 'all')
  const [activeFilter, setActiveFilter] = useState(searchParams.get('is_active') || 'all')
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const [formModalOpen, setFormModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [selectedRule, setSelectedRule] = useState<WebStoreRedirectRule | null>(null)

  const { nextFetchId, isStale } = useLatestFetch()

  const fetchRules = useCallback(async () => {
    const fetchId = nextFetchId()
    setLoading(true)
    try {
      const response = await webStoreRedirectRulesService.getAll({
        page: currentPage,
        limit: 20,
        platform: platformFilter !== 'all' ? (platformFilter as RedirectPlatform) : undefined,
        is_active: activeFilter === 'all' ? undefined : activeFilter === 'true',
      })
      if (isStale(fetchId)) return

      if (response.success && response.data) {
        setRules(response.data.entities || [])
        setTotalPages(response.data.pagination?.totalPages || 1)
        setTotalCount(response.data.pagination?.total || 0)
      } else {
        toast.error(response.message || 'Failed to load redirect rules')
      }
    } catch (error: any) {
      if (isStale(fetchId)) return
      toast.error(error.message || 'Failed to load redirect rules')
    } finally {
      if (!isStale(fetchId)) setLoading(false)
    }
  }, [currentPage, platformFilter, activeFilter, nextFetchId, isStale])

  useEffect(() => { fetchRules() }, [fetchRules])

  useEffect(() => {
    const params: Record<string, string> = {}
    if (platformFilter !== 'all') params.platform = platformFilter
    if (activeFilter !== 'all') params.is_active = activeFilter
    if (currentPage > 1) params.page = currentPage.toString()
    setSearchParams(params)
  }, [platformFilter, activeFilter, currentPage, setSearchParams])

  useResetPageOnChange(setCurrentPage, [platformFilter, activeFilter])

  const handleCreate = () => {
    setModalMode('create')
    setSelectedRule(null)
    setFormModalOpen(true)
  }

  const handleEdit = (rule: WebStoreRedirectRule) => {
    setModalMode('edit')
    setSelectedRule(rule)
    setFormModalOpen(true)
  }

  const handleDeleteClick = (rule: WebStoreRedirectRule) => {
    setSelectedRule(rule)
    setDeleteModalOpen(true)
  }

  const handleToggleActive = async (rule: WebStoreRedirectRule) => {
    try {
      const response = await webStoreRedirectRulesService.update(rule._id, { is_active: !rule.is_active })
      if (response.success) {
        toast.success(`Rule ${!rule.is_active ? 'activated' : 'deactivated'}`)
        fetchRules()
      } else {
        toast.error(response.message || 'Failed to toggle rule')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to toggle rule')
    }
  }

  const handleFormSubmit = async (data: WebStoreRedirectRuleFormData) => {
    try {
      if (modalMode === 'create') {
        const response = await webStoreRedirectRulesService.create(data)
        if (response.success) {
          toast.success('Rule created successfully')
          fetchRules()
        } else {
          toast.error(response.message || 'Failed to create rule')
          throw new Error(response.message || 'Failed to create rule')
        }
      } else if (selectedRule) {
        const response = await webStoreRedirectRulesService.update(selectedRule._id, data)
        if (response.success) {
          toast.success('Rule updated successfully')
          fetchRules()
        } else {
          toast.error(response.message || 'Failed to update rule')
          throw new Error(response.message || 'Failed to update rule')
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save rule')
      throw error
    }
  }

  const handleDeleteConfirm = async () => {
    if (!selectedRule) return
    try {
      const response = await webStoreRedirectRulesService.delete(selectedRule._id)
      if (response.success) {
        toast.success('Rule deleted successfully')
        fetchRules()
      } else {
        toast.error(response.message || 'Failed to delete rule')
        throw new Error(response.message || 'Failed to delete rule')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete rule')
      throw error
    }
  }

  const columns = useWebStoreRedirectRulesColumns({
    onEdit: handleEdit,
    onDelete: handleDeleteClick,
    onToggleActive: handleToggleActive,
  })

  const hasFilters = platformFilter !== 'all' || activeFilter !== 'all'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Web Store Redirect"
        description="Map app version ranges to web-store base URLs. iOS reader-mode redirects use these rules."
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Settings' },
          { label: 'Web Store Redirect' },
        ]}
        action={
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />Add Rule
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="h-9 w-[180px]">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            <SelectItem value="ios">iOS</SelectItem>
            <SelectItem value="android">Android</SelectItem>
          </SelectContent>
        </Select>
        <Select value={activeFilter} onValueChange={setActiveFilter}>
          <SelectTrigger className="h-9 w-[160px]">
            <SelectValue placeholder="Active" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="true">Active</SelectItem>
            <SelectItem value="false">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        data={rules}
        columns={columns}
        isLoading={loading}
        pagination={{
          currentPage,
          totalPages,
          totalCount,
          onPageChange: setCurrentPage,
        }}
        emptyState={{
          icon: Globe,
          title: hasFilters ? 'No rules match filters' : 'No redirect rules yet',
          description: !hasFilters ? 'Create a rule to start dynamically routing app users to a web store.' : undefined,
          action: !hasFilters ? (
            <Button onClick={handleCreate} variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />Create your first rule
            </Button>
          ) : undefined,
        }}
        getRowKey={(rule) => rule._id}
      />

      <WebStoreRedirectRuleFormModal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        rule={selectedRule}
        mode={modalMode}
      />

      <DeleteModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Redirect Rule"
        itemName={selectedRule ? `${selectedRule.platform} ${selectedRule.min_version}..${selectedRule.max_version ?? '∞'}` : undefined}
      />
    </div>
  )
}
