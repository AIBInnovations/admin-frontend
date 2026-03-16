import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable, ColumnDef } from '@/components/common/DataTable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { ArrowLeft, FileText, Eye } from 'lucide-react'
import { toast } from 'sonner'
import {
  formsService, Form, FormSubmission, FormTemplate, FormTemplateField,
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

  // Get template fields from form
  const templateFields: FormTemplateField[] =
    form && typeof form.template_id === 'object' && form.template_id?.fields
      ? form.template_id.fields
      : []

  // Fetch submissions
  const fetchSubmissions = useCallback(async () => {
    if (!formId) return
    try {
      setLoading(true)
      const response = await formsService.getSubmissions({
        form_id: formId,
        page: currentPage,
        limit: 20,
      })

      if (response.success && response.data) {
        setForm(response.data.form as any)
        setSubmissions(response.data.entities || [])
        setTotalPages(response.data.pagination?.totalPages || 1)
        setTotalCount(response.data.pagination?.total || 0)
      } else {
        toast.error(response.message || 'Failed to load submissions')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load submissions')
    } finally {
      setLoading(false)
    }
  }, [formId, currentPage])

  useEffect(() => { fetchSubmissions() }, [fetchSubmissions])

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

  return (
    <div className="space-y-6">
      <PageHeader
        title={form?.title ? `Submissions: ${form.title}` : 'Form Submissions'}
        description={`${totalCount} submission${totalCount !== 1 ? 's' : ''}`}
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
          title: 'No submissions yet',
          description: 'Submissions will appear here when users fill out this form.',
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
