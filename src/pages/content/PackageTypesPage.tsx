import { useState } from 'react'
import { Layers, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable } from '@/components/common/DataTable'
import { DeleteModal } from '@/components/modals/DeleteModal'
import { PackageTypeFormModal } from '@/components/packageTypes/PackageTypeFormModal'
import { Button } from '@/components/ui/button'
import { StaleNotice } from '@/components/users/kit'
import { ensureOk, errText, unwrap, usePageInRange, useResource, useUrlState } from '@/components/users/lib'
import { useAuth } from '@/contexts/AuthContext'
import { packageTypesService, type PackageType } from '@/services/packageTypes.service'
import type { DeleteImpactResponse, ListResponse } from '@/types/api.types'
import { usePackageTypesColumns } from './PackageTypesPage.columns'

export function PackageTypesPage() {
  const { hasPermission } = useAuth()
  const canCreate = hasPermission('packages.create')
  const canUpdate = hasPermission('packages.update')
  const canDelete = hasPermission('packages.delete')
  const { page, setPage } = useUrlState({})

  const { data, loading, error, reload } = useResource<ListResponse<PackageType>>(async () => unwrap(await packageTypesService.getAll({ page, limit: 20 }), 'Failed to load package types'), [page])
  const totalPages = data?.pagination?.totalPages || 1
  usePageInRange(page, data ? totalPages : undefined, loading, setPage)

  const [form, setForm] = useState<{ open: boolean; mode: 'create' | 'edit'; type: PackageType | null }>({ open: false, mode: 'create', type: null })
  const [deleting, setDeleting] = useState<PackageType | null>(null)
  const [impact, setImpact] = useState<DeleteImpactResponse | null>(null)
  const [impactLoading, setImpactLoading] = useState(false)

  const openCreate = () => setForm({ open: true, mode: 'create', type: null })
  const openEdit = (type: PackageType) => setForm({ open: true, mode: 'edit', type })
  const openDelete = async (type: PackageType) => {
    setDeleting(type)
    setImpact(null)
    setImpactLoading(true)
    try { setImpact(unwrap(await packageTypesService.getDeleteImpact(type._id))) } catch { /* the API still refuses a type that is in use */ } finally { setImpactLoading(false) }
  }
  const confirmDelete = async () => {
    if (!deleting) return
    try {
      ensureOk(await packageTypesService.delete(deleting._id), 'Failed to delete package type')
      toast.success('Package type deleted successfully')
      await reload({ silent: true })
    } catch (err) {
      toast.error(errText(err, 'Failed to delete package type'))
      throw err
    }
  }

  const columns = usePackageTypesColumns({ onEdit: canUpdate ? openEdit : undefined, onDelete: canDelete ? openDelete : undefined })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Package Types"
        description="Manage package types such as Theory, Practical, etc."
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Content' }, { label: 'Packages', href: '/content/packages' }, { label: 'Package Types' }]}
        action={canCreate ? <Button onClick={openCreate}><Plus aria-hidden="true" />Add Package Type</Button> : undefined}
      />
      {error && data && <StaleNotice message={error} onRetry={() => reload()} />}
      <DataTable
        data={data?.entities || []}
        columns={columns}
        isLoading={loading}
        error={error}
        onRetry={() => reload()}
        onRowClick={canUpdate ? openEdit : undefined}
        pagination={{ currentPage: page, totalPages, totalCount: data?.pagination?.total || 0, onPageChange: setPage }}
        emptyState={{
          icon: Layers, title: 'No package types yet', description: 'Get started by creating your first package type',
          action: canCreate ? <Button onClick={openCreate} variant="outline" size="sm"><Plus aria-hidden="true" />Create your first package type</Button> : undefined,
        }}
        getRowKey={(pt) => pt._id}
      />
      <PackageTypeFormModal open={form.open} onClose={() => setForm((f) => ({ ...f, open: false }))} onSaved={() => reload({ silent: true })} packageType={form.type} mode={form.mode} />
      <DeleteModal
        open={!!deleting} onClose={() => { setDeleting(null); setImpact(null) }} onConfirm={confirmDelete} title="Delete Package Type" itemName={deleting?.name}
        isLoadingImpact={impactLoading} blocked={impact?.blocked}
        warning={impact?.dependencies?.length ? {
          message: impact.blocked ? 'Cannot delete. Remove the following dependencies first:' : 'The following associated data will be affected:',
          details: impact.dependencies.map((d) => ({ label: d.label, count: d.count, blocking: d.blocking })),
        } : undefined}
      />
    </div>
  )
}
