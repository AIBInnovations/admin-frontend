import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable, ColumnDef } from '@/components/common/DataTable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { ArrowLeft, FileText, Eye, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import {
  formsService, Form, FormSubmission, FormTemplateField, PaymentCounts,
} from '@/services/forms.service'

export function FormSubmissionsPage() {
  const { formId } = useParams<{ formId: string }>()
  const navigate = useNavigate()

  const [form, setForm] = useState<(Form & { template_id: any }) | null>(null)
  const [submissions, setSubmissions] = useState<FormSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [paymentCounts, setPaymentCounts] = useState<PaymentCounts | null>(null)
  const [activeTab, setActiveTab] = useState<'paid' | 'unpaid'>('paid')

  const isPaidForm = !!(form?.payment_amount && form.payment_amount > 0)

  // Get template fields from form
  const templateFields: FormTemplateField[] =
    form && typeof form.template_id === 'object' && form.template_id?.fields
      ? form.template_id.fields
      : []

  // Fetch submissions
  // On initial load (form unknown), always send payment_status='paid'.
  // Backend ignores this param for free forms, and for paid forms it filters correctly.
  const fetchSubmissions = useCallback(async () => {
    if (!formId) return
    try {
      setLoading(true)
      const response = await formsService.getSubmissions({
        form_id: formId,
        page: currentPage,
        limit: 20,
        payment_status: activeTab,
      })

      if (response.success && response.data) {
        setForm(response.data.form as any)
        setSubmissions(response.data.entities || [])
        setTotalPages(response.data.pagination?.totalPages || 1)
        setTotalCount(response.data.pagination?.total || 0)
        if (response.data.payment_counts) {
          setPaymentCounts(response.data.payment_counts)
        }
      } else {
        toast.error(response.message || 'Failed to load submissions')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load submissions')
    } finally {
      setLoading(false)
    }
  }, [formId, currentPage, activeTab])

  useEffect(() => { fetchSubmissions() }, [fetchSubmissions])

  // When switching tabs, reset to page 1
  const handleTabChange = (tab: string) => {
    setActiveTab(tab as 'paid' | 'unpaid')
    setCurrentPage(1)
  }

  // Build dynamic columns
  const columns: ColumnDef<FormSubmission>[] = [
    // Dynamic columns from template fields (show first 3 fields as columns)
    ...templateFields.slice(0, 3).map((field) => ({
      id: field.field_key,
      header: field.label,
      cell: (sub: FormSubmission) => {
        const value = sub.responses?.[field.field_key]
        return (
          <span className="text-sm truncate max-w-[200px] block">
            {value || '—'}
          </span>
        )
      },
    })),
    // Submitted by
    {
      id: 'submitted_by',
      header: 'Submitted By',
      width: 'w-36',
      cell: (sub: FormSubmission) => {
        if (sub.user_id && typeof sub.user_id === 'object') {
          return (
            <div className="text-sm">
              <p className="font-medium truncate">{sub.user_id.name || 'User'}</p>
              <p className="text-xs text-muted-foreground">{sub.user_id.phone_number}</p>
            </div>
          )
        }
        return <Badge className="text-[10px] bg-gray-500/10 text-gray-500 border-gray-200">Anonymous</Badge>
      },
    },
    // Submitted at
    {
      id: 'submitted_at',
      header: 'Submitted At',
      width: 'w-36',
      cell: (sub: FormSubmission) => (
        <span className="text-xs text-muted-foreground">
          {new Date(sub.submitted_at || sub.createdAt).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
          })}
        </span>
      ),
    },
    // Payment status badge — show on unpaid tab to distinguish none/pending/expired/canceled
    ...(isPaidForm && activeTab === 'unpaid' ? [{
      id: 'payment_status',
      header: 'Status',
      width: 'w-28' as const,
      cell: (sub: FormSubmission) => {
        const status = sub.payment_status || 'none'
        const styles: Record<string, string> = {
          none: 'bg-gray-500/10 text-gray-500 border-gray-200',
          pending: 'bg-amber-500/10 text-amber-600 border-amber-200',
          expired: 'bg-red-500/10 text-red-600 border-red-200',
          canceled: 'bg-red-500/10 text-red-600 border-red-200',
        }
        const labels: Record<string, string> = {
          none: 'Not Paid',
          pending: 'Pending',
          expired: 'Expired',
          canceled: 'Canceled',
        }
        return (
          <Badge className={`text-[10px] ${styles[status] || styles.none}`}>
            {labels[status] || status}
          </Badge>
        )
      },
    }] as ColumnDef<FormSubmission>[] : []),
    // View action
    {
      id: 'actions',
      header: '',
      width: 'w-10',
      cell: (sub: FormSubmission) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => { setSelectedSubmission(sub); setDetailOpen(true) }}
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ]

  // Description text
  const descriptionText = isPaidForm
    ? activeTab === 'paid'
      ? `${paymentCounts?.paid ?? totalCount} paid submission${(paymentCounts?.paid ?? totalCount) !== 1 ? 's' : ''}`
      : `${paymentCounts?.unpaid ?? totalCount} unpaid/failed submission${(paymentCounts?.unpaid ?? totalCount) !== 1 ? 's' : ''}`
    : `${totalCount} submission${totalCount !== 1 ? 's' : ''}`

  return (
    <div className="space-y-6">
      <PageHeader
        title={form?.title ? `Submissions: ${form.title}` : 'Form Submissions'}
        description={descriptionText}
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Content' },
          { label: 'Forms', href: '/content/forms' },
          { label: 'Submissions' },
        ]}
        action={
          <Button variant="outline" onClick={() => navigate('/content/forms')}>
            <ArrowLeft className="mr-2 h-4 w-4" />Back to Forms
          </Button>
        }
      />

      {/* Tabs for paid forms */}
      {isPaidForm && (
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="paid" className="gap-1.5">
              <CheckCircle className="h-3.5 w-3.5" />
              Paid{paymentCounts ? ` (${paymentCounts.paid})` : ''}
            </TabsTrigger>
            <TabsTrigger value="unpaid" className="gap-1.5">
              <XCircle className="h-3.5 w-3.5" />
              Unpaid / Failed{paymentCounts ? ` (${paymentCounts.unpaid})` : ''}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      <DataTable
        data={submissions}
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
          title: isPaidForm && activeTab === 'unpaid'
            ? 'No unpaid submissions'
            : 'No submissions yet',
          description: isPaidForm && activeTab === 'unpaid'
            ? 'No submissions with pending, failed, or canceled payments.'
            : 'Submissions will appear here when users fill out this form.',
        }}
        getRowKey={(sub) => sub._id}
      />

      {/* Submission detail dialog */}
      <Dialog open={detailOpen} onOpenChange={(open) => !open && setDetailOpen(false)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Submission Details</DialogTitle>
            <DialogDescription>
              {selectedSubmission && (
                <>
                  Submitted{' '}
                  {new Date(selectedSubmission.submitted_at || selectedSubmission.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                  {selectedSubmission.user_id && typeof selectedSubmission.user_id === 'object' && (
                    <> by {selectedSubmission.user_id.name || selectedSubmission.user_id.phone_number}</>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-3 mt-2">
              {templateFields.map((field) => {
                const value = selectedSubmission.responses?.[field.field_key]
                return (
                  <div key={field.field_key} className="border-b border-border/50 pb-3 last:border-0">
                    <p className="text-xs font-medium text-muted-foreground mb-1">{field.label}</p>
                    <p className="text-sm">{value || '—'}</p>
                  </div>
                )
              })}

              {/* Payment info */}
              {selectedSubmission.payment_status && selectedSubmission.payment_status !== 'none' && (
                <div className="border-t border-border/50 pt-3 mt-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Payment</p>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-[10px] ${
                      selectedSubmission.payment_status === 'paid'
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
                        : selectedSubmission.payment_status === 'pending'
                        ? 'bg-amber-500/10 text-amber-600 border-amber-200'
                        : 'bg-red-500/10 text-red-600 border-red-200'
                    }`}>
                      {selectedSubmission.payment_status.charAt(0).toUpperCase() + selectedSubmission.payment_status.slice(1)}
                    </Badge>
                    {selectedSubmission.payment_link_url && (
                      <a
                        href={selectedSubmission.payment_link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        View Payment Link
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
