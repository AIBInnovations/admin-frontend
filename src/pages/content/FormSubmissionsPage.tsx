import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle, Eye, FileText, XCircle } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { ColumnDef } from '@/components/common/DataTable'
import { DetailSkeleton } from '@/components/common/detail'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatCount } from '@/lib/format'
import { formsService, FormSubmission, FormTemplateField, PaymentCounts } from '@/services/forms.service'
import { RecordError, useRecord } from '@/components/forms/editor/EditorPage'
import { ListTable, Tag, useRemoteList } from '@/components/forms/editor/list'
import { SubmissionPayment } from '@/components/forms/submissionStatus'
import { istDateTime } from '@/components/forms/editor/ist'
import { StudentLink } from '@/components/students/StudentLink'

type Tab = 'paid' | 'unpaid'

export function FormSubmissionsPage() {
  const { formId } = useParams<{ formId: string }>()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get('tab') === 'unpaid' ? 'unpaid' : 'paid'
  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1)
  const go = (next: { tab?: Tab; page?: number }) => setParams((prev) => {
    const p = new URLSearchParams(prev)
    if (next.tab) { if (next.tab === 'paid') p.delete('tab'); else p.set('tab', next.tab); p.delete('page') }
    if (next.page) { if (next.page > 1) p.set('page', String(next.page)); else p.delete('page') }
    return p
  }, { replace: true })

  const { record: form, loading, error, reload } = useRecord(formId, (id) => formsService.getById(id))
  const [counts, setCounts] = useState<PaymentCounts | null>(null)
  // The API ignores payment_status for free forms, and filters by it for paid ones.
  const list = useRemoteList<FormSubmission>(
    JSON.stringify([formId, page, tab]),
    async () => {
      const res = await formsService.getSubmissions({ form_id: formId!, page, limit: 20, payment_status: tab })
      if (res.data?.payment_counts) setCounts(res.data.payment_counts)
      return res
    },
    page,
    (n) => go({ page: n }),
  )

  if (loading && !form) return <DetailSkeleton />
  if (!form) return <RecordError status={error?.status ?? null} message={error?.message ?? ''} noun="form" back={{ label: 'Back to forms', href: '/content/forms' }} onRetry={reload} />

  const paid = !!(form.payment_amount && form.payment_amount > 0)
  const template = form.template_id && typeof form.template_id === 'object' ? (form.template_id as { fields?: FormTemplateField[] }) : null
  const fields = template?.fields ?? []
  const open = (s: FormSubmission) => navigate(`/content/forms/${formId}/submissions/${s._id}`)

  const columns: ColumnDef<FormSubmission>[] = [
    // The first three answers
    ...fields.slice(0, 3).map((field): ColumnDef<FormSubmission> => ({
      id: field.field_key,
      header: field.label,
      cell: (s) => <span className="block max-w-[220px] truncate text-sm" title={s.responses?.[field.field_key]}>{s.responses?.[field.field_key] || '—'}</span>,
    })),
    {
      id: 'submitted_by',
      header: 'Submitted By',
      width: 'w-40',
      cell: (s) => s.user_id && typeof s.user_id === 'object' ? (
        <div className="max-w-[200px] text-sm">
          <p className="truncate"><StudentLink student={s.user_id} fallback="User" from="Submissions" /></p>
          <p className="text-xs tabular-nums text-muted-foreground">{s.user_id.phone_number}</p>
        </div>
      ) : <Tag>Anonymous</Tag>,
    },
    { id: 'submitted_at', header: 'Submitted At', width: 'w-44', cell: (s) => <span className="whitespace-nowrap text-[13px] text-muted-foreground">{istDateTime(s.submitted_at || s.createdAt)}</span> },
    ...(paid && tab === 'unpaid' ? [{ id: 'payment_status', header: 'Status', width: 'w-28', cell: (s: FormSubmission) => <SubmissionPayment status={s.payment_status} /> }] : []),
    {
      id: 'actions',
      header: '',
      width: 'w-10',
      cell: (s) => <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Open submission" onClick={() => open(s)}><Eye /></Button>,
    },
  ]

  const n = paid ? (tab === 'paid' ? counts?.paid : counts?.unpaid) ?? list.total : list.total
  const what = paid ? (tab === 'paid' ? 'paid ' : 'unpaid/failed ') : ''

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Submissions: ${form.title}`}
        description={`${formatCount(n)} ${what}submission${n !== 1 ? 's' : ''}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Content' },
          { label: 'Forms', href: '/content/forms' },
          { label: 'Submissions' },
        ]}
        action={<Button asChild variant="outline" className="bg-card"><Link to="/content/forms"><ArrowLeft aria-hidden="true" />Back to Forms</Link></Button>}
      />

      {paid && (
        <Tabs value={tab} onValueChange={(t) => go({ tab: t as Tab })}>
          <TabsList>
            <TabsTrigger value="paid" className="gap-1.5"><CheckCircle aria-hidden="true" className="h-3.5 w-3.5" />Paid{counts ? ` (${formatCount(counts.paid)})` : ''}</TabsTrigger>
            <TabsTrigger value="unpaid" className="gap-1.5"><XCircle aria-hidden="true" className="h-3.5 w-3.5" />Unpaid / Failed{counts ? ` (${formatCount(counts.unpaid)})` : ''}</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      <ListTable
        list={list}
        columns={columns}
        page={page}
        onPage={(p) => go({ page: p })}
        rowKey={(s) => s._id}
        onRowClick={open}
        filtered={false}
        filteredTitle=""
        onClear={() => {}}
        empty={paid && tab === 'unpaid'
          ? { icon: FileText, title: 'No unpaid submissions', description: 'No submissions with pending, failed, or canceled payments.' }
          : { icon: FileText, title: 'No submissions yet', description: 'Submissions will appear here when users fill out this form.' }}
      />
    </div>
  )
}
