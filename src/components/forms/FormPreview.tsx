import { ChevronDown, ChevronRight, FileText } from 'lucide-react'
import { formatINR } from '@/lib/format'
import type { FormTemplateField } from '@/services/forms.service'

interface FormPreviewProps {
  templateName: string
  fields: FormTemplateField[]
  title: string
  description: string
  examProcess: string
  bannerUrl: string | null
  payment: number
  examiner: boolean
  slots: string[]
}

/** How the form looks on the website: its card, then the form itself. */
export function FormPreview({ templateName, fields, title, description, examProcess, bannerUrl, payment, examiner, slots }: FormPreviewProps) {
  const ordered = [...fields].sort((a, b) => a.display_order - b.display_order)
  const heading = title.trim() || 'Untitled Form'
  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-[13px] font-medium text-muted-foreground">Card Preview</p>
        <div className="max-w-[320px] overflow-hidden rounded-xl border border-border bg-card shadow-card">
          <div className="flex aspect-video w-full items-center justify-center bg-accent">
            {bannerUrl ? <img src={bannerUrl} alt="" className="h-full w-full object-cover" /> : <FileText aria-hidden="true" className="h-8 w-8 text-primary/40" />}
          </div>
          <div className="p-4">
            <span className="inline-block rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">{templateName || 'Form'}</span>
            <p className="mt-2 line-clamp-2 break-words text-sm font-semibold leading-snug">{heading}</p>
            {description && <p className="mt-1.5 line-clamp-3 break-words text-xs leading-relaxed text-muted-foreground">{description}</p>}
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <FileText aria-hidden="true" className="h-3.5 w-3.5" />
              <span>{ordered.length} field{ordered.length === 1 ? '' : 's'}</span>
              {payment > 0 && <span className="ml-auto rounded-full bg-warning-soft px-2 py-0.5 font-medium text-warning">{formatINR(payment)}</span>}
            </div>
            <p className="mt-3 flex items-center justify-between border-t border-border pt-2.5 text-sm font-semibold text-primary">Fill Form<ChevronRight aria-hidden="true" className="h-4 w-4" /></p>
          </div>
        </div>
      </div>

      <div>
        <p className="mb-2 text-[13px] font-medium text-muted-foreground">Form Preview</p>
        <div className="max-h-[70dvh] overflow-y-auto rounded-xl border border-border bg-card shadow-card">
          {bannerUrl && <img src={bannerUrl} alt="" className="aspect-video w-full object-cover" />}
          <div className="bg-accent px-5 pb-4 pt-5">
            <span className="inline-block rounded-full bg-card px-2 py-0.5 text-xs font-medium text-accent-foreground">{templateName || 'Form'}</span>
            <p className="mt-2 break-words font-display text-lg font-semibold">{heading}</p>
            {description && <p className="mt-2 line-clamp-3 break-words text-sm leading-relaxed text-muted-foreground">{description}</p>}
            {description.length > 150 && <span className="mt-1 inline-block text-xs font-medium text-primary">Read more</span>}
          </div>
          {examProcess && (
            <div className="border-b border-border px-5 py-3">
              <p className="flex items-center justify-between text-sm font-semibold">Exam Process<ChevronDown aria-hidden="true" className="h-4 w-4 text-muted-foreground" /></p>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">{examProcess}</p>
            </div>
          )}
          <div className="space-y-4 px-5 py-5">
            {ordered.length === 0 && <p className="text-sm text-muted-foreground">Choose a template to see its fields.</p>}
            {ordered.map((field) => {
              const own = field.options?.length > 0
              const options = own ? field.options : examiner ? slots : []
              const multi = examiner && !own
              return (
                <div key={field.field_key}>
                  <p className="mb-1.5 text-sm font-medium">{field.label}{field.required && <span className="text-danger" aria-hidden="true"> *</span>}</p>
                  {field.type === 'radio' && options.length > 0 ? (
                    <ul className="space-y-2">
                      {options.map((o) => (
                        <li key={o} className="flex items-center gap-3 rounded-md border border-border px-3.5 py-2.5 text-sm text-muted-foreground">
                          <span aria-hidden="true" className={multi ? 'h-4 w-4 shrink-0 rounded-sm border border-input' : 'h-4 w-4 shrink-0 rounded-full border border-input'} />
                          <span className="min-w-0 break-words">{o}</span>
                        </li>
                      ))}
                    </ul>
                  ) : field.type === 'radio' ? (
                    <p className="rounded-md border border-dashed border-input px-3.5 py-2.5 text-sm text-muted-foreground">No options yet</p>
                  ) : (
                    <div className="truncate rounded-md border border-border bg-background px-3.5 py-2.5 text-sm text-muted-foreground">{field.label}</div>
                  )}
                </div>
              )
            })}
            {payment > 0 && (
              <p className="border-t border-border pt-3 text-xs text-muted-foreground">
                This form requires a non-refundable payment of <span className="font-semibold text-foreground">{formatINR(payment)}</span>. A payment link will be provided after submission.
              </p>
            )}
            <div aria-hidden="true" className="w-full rounded-md bg-primary py-3 text-center text-sm font-semibold text-primary-foreground opacity-80">Submit</div>
          </div>
        </div>
      </div>
    </div>
  )
}
