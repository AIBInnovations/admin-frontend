import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { CopyButton, DetailSkeleton, FactGrid, Section } from '@/components/common/detail'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { formsService, FormSubmission, FormTemplateField } from '@/services/forms.service'
import { RecordError, useRecord } from '@/components/forms/editor/EditorPage'
import { Note } from '@/components/forms/editor/fields'
import { SubmissionPayment } from '@/components/forms/submissionStatus'
import { istDateTime } from '@/components/forms/editor/ist'

type FormRef = { _id: string; title: string; template_id?: { name?: string; fields?: FormTemplateField[] } | null }

async function load(id: string) {
  const res = await formsService.getSubmissionById(id)
  return { ...res, data: res.data?.submission }
}

const isLink = (v: string) => /^https?:\/\/\S+$/i.test(v)

export function FormSubmissionDetailPage() {
  const { formId, submissionId } = useParams<{ formId: string; submissionId: string }>()
  const { record, loading, error, reload } = useRecord<FormSubmission>(submissionId, load)
  const back = `/content/forms/${formId}/submissions`

  if (loading && !record) return <DetailSkeleton />
  if (!record) return <RecordError status={error?.status ?? null} message={error?.message ?? ''} noun="submission" back={{ label: 'Back to submissions', href: back }} onRetry={reload} />
  return <Submission submission={record} back={back} />
}

function Submission({ submission, back }: { submission: FormSubmission; back: string }) {
  const { hasPermission } = useAuth()
  const form = submission.form_id && typeof submission.form_id === 'object' ? (submission.form_id as FormRef) : null
  const fields = [...(form?.template_id?.fields ?? [])].sort((a, b) => a.display_order - b.display_order)
  const answers = submission.responses ?? {}
  const known = new Set(fields.map((f) => f.field_key))
  const others = Object.entries(answers).filter(([k]) => !known.has(k))
  const user = submission.user_id && typeof submission.user_id === 'object' ? submission.user_id : null
  const status = submission.payment_status || 'none'
  const when = istDateTime(submission.submitted_at || submission.createdAt)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Submission Details"
        description={`Submitted ${when}${user ? ` by ${user.name || user.phone_number}` : ''}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Content' },
          { label: 'Forms', href: '/content/forms' },
          { label: form?.title ? `Submissions: ${form.title}` : 'Submissions', href: back },
          { label: 'Submission Details' },
        ]}
        action={<Button asChild variant="outline" className="bg-card"><Link to={back}><ArrowLeft aria-hidden="true" />Back to Submissions</Link></Button>}
      />

      {!form && <Note tone="warning">The form this was submitted to has been deleted.</Note>}

      <Section title="Answers" description={form?.template_id?.name}>
        {fields.length === 0 && others.length === 0 ? (
          <p className="text-sm text-muted-foreground">This submission has no answers.</p>
        ) : (
          <dl className="divide-y divide-border">
            {fields.map((f) => <Answer key={f.field_key} label={f.label} value={answers[f.field_key]} />)}
            {others.map(([k, v]) => <Answer key={k} label={k.replace(/_/g, ' ')} value={v} note="No longer on the form" />)}
          </dl>
        )}
      </Section>

      <Section title="Submitted By">
        {user ? (
          <FactGrid
            facts={[
              { label: 'Name', value: hasPermission('users.read') ? <Link className="text-primary hover:underline" to={`/users/${user._id}`}>{user.name || 'User'}</Link> : user.name || 'User' },
              { label: 'Phone', value: user.phone_number, copy: user.phone_number || null },
              { label: 'Email', value: user.email, copy: user.email || null },
            ]}
          />
        ) : (
          <p className="text-sm text-muted-foreground">Anonymous. This was submitted without signing in.</p>
        )}
      </Section>

      {status !== 'none' && (
        <Section title="Payment">
          <FactGrid
            facts={[
              { label: 'Status', value: <SubmissionPayment status={status} /> },
              submission.payment_link_id ? { label: 'Payment link id', value: submission.payment_link_id, mono: true, copy: submission.payment_link_id } : null,
              submission.payment_link_url
                ? { label: 'Payment link', value: <a href={submission.payment_link_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">View Payment Link<ExternalLink aria-hidden="true" className="h-3.5 w-3.5" /></a> }
                : null,
            ]}
          />
        </Section>
      )}
    </div>
  )
}

function Answer({ label, value, note }: { label: string; value?: string; note?: string }) {
  return (
    <div className="grid gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,240px)_minmax(0,1fr)] sm:gap-6">
      <dt className="text-[13px] text-muted-foreground">{label}{note && <span className="block text-xs">{note}</span>}</dt>
      <dd className="flex min-w-0 items-start gap-1.5 text-sm">
        {!value ? <span className="text-muted-foreground">No answer</span>
          : isLink(value)
            ? <><a href={value} target="_blank" rel="noopener noreferrer" className="min-w-0 break-all text-primary hover:underline">{value}</a><CopyButton value={value} label={label} /></>
            : <span className="min-w-0 whitespace-pre-wrap break-words">{value}</span>}
      </dd>
    </div>
  )
}
