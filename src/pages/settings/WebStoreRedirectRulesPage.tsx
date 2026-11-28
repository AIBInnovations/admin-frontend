import { useState } from 'react'
import { Globe, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable } from '@/components/common/DataTable'
import { DeleteModal } from '@/components/modals/DeleteModal'
import { WebStoreRedirectRuleFormModal } from '@/components/webStoreRedirectRules/WebStoreRedirectRuleFormModal'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StaleNotice } from '@/components/users/kit'
import { ensureOk, errText, unwrap, usePageInRange, useResource, useUrlState } from '@/components/users/lib'
import { useAuth } from '@/contexts/AuthContext'
import { webStoreRedirectRulesService, type RedirectPlatform, type WebStoreRedirectRule } from '@/services/webStoreRedirectRules.service'
import type { ListResponse } from '@/types/api.types'
import { describeVersionRange, getStoreKind, STORE_KIND_LABEL } from '@/lib/webStoreRedirect'
import { useWebStoreRedirectRulesColumns } from './WebStoreRedirectRulesPage.columns'

const describeRule = (r: WebStoreRedirectRule) => `${r.platform === 'ios' ? 'iPhone / iPad' : 'Android'}: ${describeVersionRange(r.min_version, r.max_version)}, opens ${STORE_KIND_LABEL[getStoreKind(r.base_url)]}`

export function WebStoreRedirectRulesPage() {
  const { hasPermission } = useAuth()
  const canUpdate = hasPermission('settings.update')
  const canDelete = hasPermission('settings.delete')
  const { state, set, clear, page, setPage } = useUrlState({ platform: 'all', is_active: 'all' })

  const { data, loading, error, reload } = useResource<ListResponse<WebStoreRedirectRule>>(async () => unwrap(await webStoreRedirectRulesService.getAll({
    page, limit: 20,
    platform: state.platform !== 'all' ? (state.platform as RedirectPlatform) : undefined,
    is_active: state.is_active === 'all' ? undefined : state.is_active === 'true',
  }), 'Failed to load redirect rules'), [page, state.platform, state.is_active])
  const totalPages = data?.pagination?.totalPages || 1
  usePageInRange(page, data ? totalPages : undefined, loading, setPage)

  const [form, setForm] = useState<{ open: boolean; mode: 'create' | 'edit'; rule: WebStoreRedirectRule | null }>({ open: false, mode: 'create', rule: null })
  const [deleting, setDeleting] = useState<WebStoreRedirectRule | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  const openCreate = () => setForm({ open: true, mode: 'create', rule: null })
  const openEdit = (rule: WebStoreRedirectRule) => setForm({ open: true, mode: 'edit', rule })

  const toggleActive = async (rule: WebStoreRedirectRule) => {
    if (toggling) return
    setToggling(rule._id)
    try {
      ensureOk(await webStoreRedirectRulesService.update(rule._id, { is_active: !rule.is_active }), 'Failed to toggle rule')
      toast.success(`Rule ${!rule.is_active ? 'activated' : 'deactivated'}`)
      await reload({ silent: true })
    } catch (err) {
      toast.error(errText(err, 'Failed to toggle rule'))
    } finally {
      setToggling(null)
    }
  }
  const confirmDelete = async () => {
    if (!deleting) return
    try {
      ensureOk(await webStoreRedirectRulesService.delete(deleting._id), 'Failed to delete rule')
      toast.success('Rule deleted successfully')
      await reload({ silent: true })
    } catch (err) {
      toast.error(errText(err, 'Failed to delete rule'))
      throw err
    }
  }

  const columns = useWebStoreRedirectRulesColumns({
    onEdit: canUpdate ? openEdit : undefined, onDelete: canDelete ? setDeleting : undefined, onToggleActive: canUpdate ? toggleActive : undefined, togglingId: toggling,
  })
  const hasFilters = state.platform !== 'all' || state.is_active !== 'all'

  return (
    <div className="relative space-y-6">
      <PageHeader
        title="Web Store Redirect"
        description="Decide which web store each app version opens. The iPhone app cannot show prices or payment, so it sends users to a web store instead."
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Settings' }, { label: 'Web Store Redirect' }]}
        action={canUpdate ? <Button onClick={openCreate}><Plus aria-hidden="true" />Add Rule</Button> : undefined}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select value={state.platform} onValueChange={(v) => set({ platform: v })}>
          <SelectTrigger aria-label="App" className="h-9 bg-card sm:w-[180px]"><SelectValue placeholder="Platform" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All apps</SelectItem>
            <SelectItem value="ios">iPhone / iPad</SelectItem>
            <SelectItem value="android">Android</SelectItem>
          </SelectContent>
        </Select>
        <Select value={state.is_active} onValueChange={(v) => set({ is_active: v })}>
          <SelectTrigger aria-label="Status" className="h-9 bg-card sm:w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All rules</SelectItem>
            <SelectItem value="true">On</SelectItem>
            <SelectItem value="false">Off</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && <Button variant="ghost" size="sm" onClick={clear}>Clear filters</Button>}
      </div>
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
          icon: Globe,
          title: hasFilters ? 'No rules match filters' : 'No redirect rules yet',
          description: hasFilters ? undefined : 'Create a rule to start dynamically routing app users to a web store.',
          action: hasFilters ? <Button variant="outline" size="sm" onClick={clear}>Clear filters</Button> : canUpdate ? <Button onClick={openCreate} variant="outline" size="sm"><Plus aria-hidden="true" />Create your first rule</Button> : undefined,
        }}
        getRowKey={(rule) => rule._id}
      />
      <WebStoreRedirectRuleFormModal open={form.open} onClose={() => setForm((f) => ({ ...f, open: false }))} onSaved={() => reload({ silent: true })} rule={form.rule} mode={form.mode} />
      <DeleteModal open={!!deleting} onClose={() => setDeleting(null)} onConfirm={confirmDelete} title="Delete Redirect Rule" itemName={deleting ? describeRule(deleting) : undefined} />
    </div>
  )
}
