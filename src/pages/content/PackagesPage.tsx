import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Layers, Package as PackageIcon, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable } from '@/components/common/DataTable'
import { PublishConfirmModal } from '@/components/common/PublishConfirmModal'
import { SearchWithFilters, type FilterConfig } from '@/components/common/SearchBar'
import { Button } from '@/components/ui/button'
import { Segmented, StaleNotice } from '@/components/users/kit'
import { ensureOk, errText, unwrap, usePageInRange, useResource, useUrlSearch, useUrlState } from '@/components/users/lib'
import { useAuth } from '@/contexts/AuthContext'
import { packagesService, type Package } from '@/services/packages.service'
import { subjectsService, type Subject } from '@/services/subjects.service'
import type { ListResponse } from '@/types/api.types'
import { usePackagesColumns } from './PackagesPage.columns'
import { PackageSubscriptionsTable } from './PackageSubscriptionsTable'

export function PackagesPage() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canCreate = hasPermission('packages.create')
  const canUpdate = hasPermission('packages.update')

  const { state, set, page, setPage } = useUrlState({ search: '', subject: 'all', status: 'all', sale: 'all', publish_status: 'all', view: 'packages' })
  const [search, setSearch] = useUrlSearch(state.search, (v) => set({ search: v }))
  // "subscriptions" lists every tier as its own line (owner, 23 Nov)
  const view = state.view === 'subscriptions' ? 'subscriptions' : 'packages'
  const pageSize = view === 'subscriptions' ? 100 : 20

  const { data, loading, error, reload, setData } = useResource<ListResponse<Package>>(async () => unwrap(await packagesService.getAll({
    page,
    // The subscriptions view numbers every length across the catalogue, so it loads the whole list in one go
    limit: pageSize,
    search: state.search || undefined,
    subject_id: state.subject !== 'all' ? state.subject : undefined,
    is_active: state.status === 'all' ? null : state.status === 'active',
    is_on_sale: state.sale === 'all' ? null : state.sale === 'on_sale',
    publish_status: state.publish_status === 'all' ? null : state.publish_status,
  }), 'Failed to load packages'), [page, pageSize, state.search, state.subject, state.status, state.sale, state.publish_status])

  const packages = data?.entities || []
  const totalPages = data?.pagination?.totalPages || 1
  usePageInRange(page, data ? totalPages : undefined, loading, setPage)

  // Rows shown on earlier pages, so numbering continues if the catalogue ever spans pages
  const [offsets, setOffsets] = useState<Record<number, number>>({})
  useEffect(() => {
    if (!data || loading || view !== 'subscriptions') return
    const rowsHere = data.entities.reduce((n, p) => n + Math.max(1, (p.tiers || []).length), 0)
    setOffsets((prev) => ({ ...prev, [page + 1]: (prev[page] ?? 0) + rowsHere }))
  }, [data, loading, page, view])

  const subjects = useResource<Subject[]>(async () => unwrap(await subjectsService.getSubjects({ limit: 100, sort_by: 'name', sort_order: 'asc' })).entities, [])

  const [publishModal, setPublishModal] = useState<{ entityId: string; action: 'publish' | 'unpublish' } | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  const toggleActive = async (pkg: Package) => {
    if (toggling) return
    setToggling(pkg._id)
    try {
      ensureOk(await packagesService.toggleActive(pkg._id, !pkg.is_active), 'Failed to update status')
      setData((prev) => prev && { ...prev, entities: prev.entities.map((p) => (p._id === pkg._id ? { ...p, is_active: !pkg.is_active } : p)) })
      toast.success(`Package ${!pkg.is_active ? 'activated' : 'deactivated'} successfully`)
      void reload({ silent: true })
    } catch (err) {
      toast.error(errText(err, 'Failed to update status'))
    } finally {
      setToggling(null)
    }
  }

  const filters: FilterConfig[] = [
    { key: 'subject', label: 'Subject', type: 'select', searchable: true, placeholder: 'Filter by subject', defaultValue: 'all', options: [{ label: 'All Subjects', value: 'all' }, ...(subjects.data || []).map((s) => ({ label: s.name, value: s._id }))] },
    { key: 'status', label: 'Status', type: 'select', placeholder: 'Filter by status', defaultValue: 'all', options: [{ label: 'All', value: 'all' }, { label: 'Active', value: 'active' }, { label: 'Inactive', value: 'inactive' }] },
    { key: 'sale', label: 'Sale', type: 'select', placeholder: 'Filter by sale', defaultValue: 'all', options: [{ label: 'All', value: 'all' }, { label: 'On Sale', value: 'on_sale' }, { label: 'Not on Sale', value: 'not_on_sale' }] },
    { key: 'publish_status', label: 'Publish Status', type: 'select', placeholder: 'Filter by publish status', defaultValue: 'all', options: [{ label: 'All', value: 'all' }, { label: 'Published', value: 'published' }, { label: 'Draft', value: 'draft' }] },
  ]
  const hasFilters = !!state.search || state.subject !== 'all' || state.status !== 'all' || state.sale !== 'all' || state.publish_status !== 'all'
  const clearFilters = () => { setSearch(''); set({ search: '', subject: 'all', status: 'all', sale: 'all', publish_status: 'all' }) }

  const columns = usePackagesColumns({
    onNavigate: (pkg) => navigate(`/content/packages/${pkg._id}`),
    onEdit: canUpdate ? (pkg) => navigate(`/content/packages/${pkg._id}/edit`) : undefined,
    onToggleActive: canUpdate ? toggleActive : undefined,
    togglingId: toggling,
    onPublishAction: canUpdate ? (pkg, action) => setPublishModal({ entityId: pkg._id, action }) : undefined,
  })

  return (
    <div className="relative space-y-6">
      <PageHeader
        title="Packages"
        description="Manage course packages, pricing, and enrollment"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Content' }, { label: 'Packages' }]}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" asChild className="bg-card"><Link to="/content/package-types"><Layers aria-hidden="true" />Manage Types</Link></Button>
            {canCreate && <Button asChild><Link to="/content/packages/new"><Plus aria-hidden="true" />Add Package</Link></Button>}
          </div>
        }
      />

      <SearchWithFilters
        value={search}
        onChange={setSearch}
        placeholder="Search packages..."
        filters={filters}
        activeFilters={{ subject: state.subject, status: state.status, sale: state.sale, publish_status: state.publish_status }}
        onFiltersChange={(f) => set({ subject: f.subject ?? state.subject, status: f.status ?? state.status, sale: f.sale ?? state.sale, publish_status: f.publish_status ?? state.publish_status })}
      />

      <Segmented
        label="View" value={view}
        onChange={(v) => { setOffsets({}); set({ view: v }) }}
        options={[{ value: 'packages', label: 'Packages' }, { value: 'subscriptions', label: 'Subscriptions (one row per length)' }]}
      />

      {error && data && <StaleNotice message={error} onRetry={() => reload()} />}

      {view === 'subscriptions' ? (
        <>
          <PackageSubscriptionsTable
            packages={packages} loading={loading} error={!data ? error : null} onRetry={() => reload()}
            firstSerial={(offsets[page] ?? 0) + 1} onClearFilters={hasFilters ? clearFilters : undefined}
          />
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="bg-card" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
                <Button size="sm" variant="outline" className="bg-card" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <DataTable
          data={packages}
          columns={columns}
          isLoading={loading}
          error={error}
          onRetry={() => reload()}
          pagination={{ currentPage: page, totalPages, totalCount: data?.pagination?.total || 0, onPageChange: setPage }}
          emptyState={{
            icon: PackageIcon,
            title: hasFilters ? 'No packages found matching your filters' : 'No packages yet',
            description: hasFilters ? undefined : 'Get started by creating your first package',
            action: hasFilters
              ? <Button variant="outline" size="sm" onClick={clearFilters}>Clear filters</Button>
              : canCreate ? <Button asChild variant="outline" size="sm"><Link to="/content/packages/new"><Plus aria-hidden="true" />Create your first package</Link></Button> : undefined,
          }}
          onRowClick={(pkg) => navigate(`/content/packages/${pkg._id}`)}
          getRowKey={(pkg) => pkg._id}
        />
      )}

      {publishModal && (
        <PublishConfirmModal
          open
          onOpenChange={(open) => { if (!open) setPublishModal(null) }}
          entityType="package"
          entityId={publishModal.entityId}
          action={publishModal.action}
          onSuccess={() => { setPublishModal(null); void reload({ silent: true }) }}
        />
      )}
    </div>
  )
}
