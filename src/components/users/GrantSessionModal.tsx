import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Video } from 'lucide-react'
import { toast } from 'sonner'
import type { GrantSessionData } from '@/services/users.service'
import { type LiveSession, liveSessionsService } from '@/services/liveSessions.service'

const grantSessionSchema = z.object({
  session_id: z.string().min(1, 'Session is required'),
  create_invoice: z.boolean().optional(),
  invoice_amount: z.number().min(0).optional(),
  reason: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
})

type GrantSessionFormValues = z.infer<typeof grantSessionSchema>

interface GrantSessionModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: GrantSessionData) => Promise<void>
  userName: string
}

export function GrantSessionModal({ open, onClose, onSubmit, userName }: GrantSessionModalProps) {
  const [sessions, setSessions] = useState<LiveSession[]>([])
  const [selectedSession, setSelectedSession] = useState<LiveSession | null>(null)
  const [loadingSessions, setLoadingSessions] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<GrantSessionFormValues>({
    resolver: zodResolver(grantSessionSchema),
    defaultValues: {
      session_id: '',
      create_invoice: false,
      invoice_amount: 0,
      reason: '',
      notes: '',
    },
  })

  const watchSessionId = watch('session_id')
  const watchCreateInvoice = watch('create_invoice')
  const watchInvoiceAmount = watch('invoice_amount')

  // Fetch scheduled sessions
  useEffect(() => {
    if (open) {
      setLoadingSessions(true)
      liveSessionsService
        .getAll({ limit: 100, upcoming: true })
        .then((res) => {
          if (res.success && res.data) {
            setSessions(res.data.entities || [])
          }
        })
        .catch(() => toast.error('Failed to load sessions'))
        .finally(() => setLoadingSessions(false))
    }
  }, [open])

  // Update selected session when session_id changes
  useEffect(() => {
    if (watchSessionId) {
      const session = sessions.find((s) => s._id === watchSessionId)
      setSelectedSession(session || null)
      if (session) {
        setValue('invoice_amount', session.price ?? 0)
      }
    } else {
      setSelectedSession(null)
    }
  }, [watchSessionId, sessions, setValue])

  // Reset form
  useEffect(() => {
    if (open) {
      reset({
        session_id: '',
        create_invoice: false,
        invoice_amount: 0,
        reason: '',
        notes: '',
      })
      setSelectedSession(null)
    }
  }, [open, reset])

  const handleFormSubmit = async (data: GrantSessionFormValues) => {
    const submitData: GrantSessionData = {
      session_id: data.session_id,
      reason: data.reason,
      notes: data.notes,
    }
    if (data.create_invoice && data.invoice_amount && data.invoice_amount > 0) {
      submitData.create_invoice = true
      submitData.invoice_amount = data.invoice_amount
    }
    await onSubmit(submitData)
    onClose()
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle>Grant Session Access</DialogTitle>
          <DialogDescription>
            Grant complimentary session access to <strong>{userName}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Session Selection */}
          <div className="space-y-2">
            <Label>
              Live Session <span className="text-red-500">*</span>
            </Label>
            <Controller
              name="session_id"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isSubmitting || loadingSessions}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={loadingSessions ? 'Loading...' : 'Select session'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions.length === 0 && !loadingSessions ? (
                      <div className="px-2 py-4 text-sm text-muted-foreground text-center">No upcoming sessions available</div>
                    ) : (
                      sessions.map((session) => (
                        <SelectItem key={session._id} value={session._id}>
                          {session.title} — {formatDate(session.scheduled_start_time)}
                          {session.is_free ? ' (Free)' : ` (₹${session.price})`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.session_id && (
              <p className="text-sm text-red-500">{errors.session_id.message}</p>
            )}
          </div>

          {/* Invoice Toggle */}
          <div className="flex items-center space-x-2">
            <Controller
              name="create_invoice"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="create_invoice_session"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isSubmitting}
                />
              )}
            />
            <Label htmlFor="create_invoice_session" className="text-sm font-normal cursor-pointer">
              Create Zoho Invoice (payment collected externally)
            </Label>
          </div>

          {/* Invoice Amount */}
          {watchCreateInvoice && (
            <div className="space-y-2">
              <Label htmlFor="invoice_amount_session">
                Invoice Amount (INR) <span className="text-red-500">*</span>
              </Label>
              <Controller
                name="invoice_amount"
                control={control}
                render={({ field }) => (
                  <Input
                    id="invoice_amount_session"
                    type="number"
                    min={0}
                    step={0.01}
                    disabled={isSubmitting}
                    {...field}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value)
                      field.onChange(Number.isNaN(v) ? 0 : v)
                    }}
                  />
                )}
              />
              {errors.invoice_amount && (
                <p className="text-sm text-red-500">{errors.invoice_amount.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Enter the amount collected. Default: session price ₹{selectedSession?.price || 0}
              </p>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason_session">Reason</Label>
            <Input
              id="reason_session"
              placeholder="e.g., Promotional offer, Scholarship, etc."
              disabled={isSubmitting}
              {...register('reason')}
            />
            {errors.reason && <p className="text-sm text-red-500">{errors.reason.message}</p>}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes_session">Internal Notes</Label>
            <Textarea
              id="notes_session"
              placeholder="Additional notes (internal only)"
              rows={3}
              disabled={isSubmitting}
              {...register('notes')}
            />
            {errors.notes && <p className="text-sm text-red-500">{errors.notes.message}</p>}
          </div>

          {/* Summary */}
          {selectedSession && (
            <div className="rounded-lg border bg-muted/50 p-3 space-y-1 text-sm">
              <div className="flex items-center gap-2 font-medium">
                <Video className="h-4 w-4" />
                Access Summary
              </div>
              <p className="text-muted-foreground">
                User will be enrolled in <strong>{selectedSession.title}</strong> with a guaranteed seat
                {watchCreateInvoice && watchInvoiceAmount && watchInvoiceAmount > 0
                  ? <> for <strong>₹{watchInvoiceAmount}</strong> (invoice will be created).</>
                  : <> at no cost.</>
                }
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !selectedSession}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Granting...
                </>
              ) : (
                'Grant Access'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
