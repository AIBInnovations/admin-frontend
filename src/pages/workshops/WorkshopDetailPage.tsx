import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Users, Calendar, Clock, Settings, Link as LinkIcon, Edit, Archive,
  CheckCircle, XCircle, AlertCircle, ExternalLink, Film, Loader2, Bell,
  Award, CalendarRange, IndianRupee, Copy,
} from 'lucide-react'
import { toast } from 'sonner'
import { workshopsService, Workshop, WorkshopFormData, WorkshopDay } from '@/services/workshops.service'
import { WorkshopFormModal } from '@/components/workshops/WorkshopFormModal'
import { ArchiveModal } from '@/components/modals/ArchiveModal'

const statusColors: Record<string, string> = {
  scheduled: 'bg-blue-500/10 text-blue-600 border-blue-200',
  live: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
  completed: 'bg-gray-500/10 text-gray-600 border-gray-200',
  cancelled: 'bg-red-500/10 text-red-600 border-red-200',
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function WorkshopDetailPage() {
  const { workshopId } = useParams<{ workshopId: string }>()
  const navigate = useNavigate()

  const [workshop, setWorkshop] = useState<Workshop | null>(null)
  const [loading, setLoading] = useState(true)
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [archiveModalOpen, setArchiveModalOpen] = useState(false)
  const [archiveBlocked, setArchiveBlocked] = useState(false)
  const [archiveBlockReason, setArchiveBlockReason] = useState('')
  const [loadingArchiveImpact, setLoadingArchiveImpact] = useState(false)
  const [cancellingDay, setCancellingDay] = useState<string | null>(null)
  const [issuingCertificates, setIssuingCertificates] = useState(false)

  // Notification modal
  const [notifyModalOpen, setNotifyModalOpen] = useState(false)
  const [notifyLoading, setNotifyLoading] = useState(false)
  const [notifyPreviewLoading, setNotifyPreviewLoading] = useState(false)
  const [notifyTitle, setNotifyTitle] = useState('')
  const [notifyMessage, setNotifyMessage] = useState('')
  const [notifyAudienceLabel, setNotifyAudienceLabel] = useState('')
  const [notifyUserCount, setNotifyUserCount] = useState(0)

  const fetchWorkshop = useCallback(async () => {
    if (!workshopId) return
    try {
      setLoading(true)
      const response = await workshopsService.getById(workshopId)
      if (response.success && response.data) {
        setWorkshop(response.data)
      } else {
        toast.error('Workshop not found')
        navigate('/workshops')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load workshop')
      navigate('/workshops')
    } finally {
      setLoading(false)
    }
  }, [workshopId, navigate])

  useEffect(() => { fetchWorkshop() }, [fetchWorkshop])

  const handleArchiveClick = async () => {
    if (!workshopId) return
    setArchiveModalOpen(true)
    setLoadingArchiveImpact(true)
    setArchiveBlocked(false)
    setArchiveBlockReason('')
    try {
      const response = await workshopsService.getDeleteImpact(workshopId)
      if (response.success && response.data?.blocked) {
        setArchiveBlocked(true)
        const reasons = response.data.dependencies
          ?.filter((d) => d.blocking)
          .map((d) => `${d.count} ${d.label}`)
          .join(', ')
        setArchiveBlockReason(`Cannot archive. Remove dependencies first: ${reasons}`)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to check dependencies')
    } finally {
      setLoadingArchiveImpact(false)
    }
  }

  const handleArchiveConfirm = async () => {
    if (!workshopId) return
    const response = await workshopsService.archive(workshopId)
    if (!response.success) {
      toast.error(response.message || 'Failed to archive workshop')
      throw new Error(response.message || 'Failed to archive workshop')
    }
    toast.success('Workshop archived')
    navigate('/workshops')
  }

  const handleFormSubmit = async (data: WorkshopFormData) => {
    if (!workshopId) return
    const response = await workshopsService.update(workshopId, data)
    if (!response.success) {
      toast.error(response.message || 'Failed to update workshop')
      throw new Error(response.message || 'Failed to update workshop')
    }
    toast.success('Workshop updated')
    fetchWorkshop()
  }

  const handleCancelWorkshop = async () => {
    if (!workshop || !workshopId) return
    const confirmed = window.confirm(
      `Cancel "${workshop.title}"?\n\nEvery day's Zoom meeting will be deleted and all registrations cancelled. ` +
        `Paid students will need to be refunded manually.`,
    )
    if (!confirmed) return

    try {
      const response = await workshopsService.cancel(workshopId)
      if (response.success) {
        const pending = response.data?.refunds_pending ?? 0
        toast.success(
          pending > 0
            ? `Workshop cancelled. ${pending} paid purchase(s) need a manual refund.`
            : 'Workshop cancelled',
        )
        fetchWorkshop()
      } else {
        toast.error(response.message || 'Failed to cancel workshop')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to cancel workshop')
    }
  }

  const handleCancelDay = async (day: WorkshopDay) => {
    if (!workshopId) return
    const confirmed = window.confirm(
      `Cancel Day ${day.day_number} — "${day.title}"?\n\nIts Zoom meeting will be deleted. The rest of the ` +
        `workshop continues, and this day stops counting toward certificates.`,
    )
    if (!confirmed) return

    setCancellingDay(day.session_id)
    try {
      const response = await workshopsService.cancelDay(workshopId, day.session_id)
      if (response.success) {
        toast.success(`Day ${day.day_number} cancelled`)
        fetchWorkshop()
      } else {
        toast.error(response.message || 'Failed to cancel day')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to cancel day')
    } finally {
      setCancellingDay(null)
    }
  }

  const handleIssueCertificates = async () => {
    if (!workshopId) return
    setIssuingCertificates(true)
    try {
      const response = await workshopsService.issueCertificates(workshopId)
      if (response.success && response.data) {
        const { issued, skipped, failed } = response.data
        toast.success(`Issued ${issued} certificate(s). ${skipped} skipped, ${failed} failed.`)
        fetchWorkshop()
      } else {
        toast.error(response.message || 'Failed to issue certificates')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to issue certificates')
    } finally {
      setIssuingCertificates(false)
    }
  }

  const openNotifyModal = async () => {
    if (!workshopId) return
    setNotifyModalOpen(true)
    setNotifyPreviewLoading(true)
    try {
      const response = await workshopsService.getNotificationPreview(workshopId)
      if (response.success && response.data) {
        setNotifyTitle(response.data.title)
        setNotifyMessage(response.data.message)
        setNotifyAudienceLabel(response.data.audience_label)
        setNotifyUserCount(response.data.user_count)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load notification preview')
    } finally {
      setNotifyPreviewLoading(false)
    }
  }

  const handleSendNotification = async () => {
    if (!workshopId) return
    setNotifyLoading(true)
    try {
      const response = await workshopsService.sendNotification(workshopId, {
        title: notifyTitle,
        message: notifyMessage,
      })
      if (response.success && response.data) {
        toast.success(`Notification sent to ${response.data.sent} user(s)`)
        setNotifyModalOpen(false)
      } else {
        toast.error(response.message || 'Failed to send notification')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send notification')
    } finally {
      setNotifyLoading(false)
    }
  }

  const copyToClipboard = (value: string, label: string) => {
    navigator.clipboard.writeText(value).then(
      () => toast.success(`${label} copied`),
      () => toast.error('Could not copy to clipboard'),
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!workshop) return null

  const subjectName = typeof workshop.subject_id === 'object' ? workshop.subject_id.name : '—'
  const days = workshop.days || []
  const activeDays = days.filter((d) => d.status !== 'cancelled')
  const canCancel = workshop.status === 'scheduled' || workshop.status === 'live'

  return (
    <div className="space-y-6">
      <PageHeader
        title={workshop.title}
        description={`${workshop.day_count}-day workshop · ${subjectName}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Workshops', href: '/workshops' },
          { label: workshop.title },
        ]}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={openNotifyModal}>
              <Bell className="mr-2 h-4 w-4" />Notify
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(`/workshops/${workshop._id}/enrollees`)}>
              <Users className="mr-2 h-4 w-4" />Enrollees
            </Button>
            <Button variant="outline" size="sm" onClick={() => setFormModalOpen(true)}>
              <Edit className="mr-2 h-4 w-4" />Edit
            </Button>
            {canCancel && (
              <Button variant="outline" size="sm" className="text-amber-600" onClick={handleCancelWorkshop}>
                <XCircle className="mr-2 h-4 w-4" />Cancel
              </Button>
            )}
            <Button variant="outline" size="sm" className="text-amber-600" onClick={handleArchiveClick}>
              <Archive className="mr-2 h-4 w-4" />Archive
            </Button>
          </div>
        }
      />

      {/* Status strip */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={`capitalize ${statusColors[workshop.status] || ''}`}>{workshop.status}</Badge>
        <Badge
          className={
            workshop.publish_status === 'published'
              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
              : 'bg-amber-500/10 text-amber-600 border-amber-200'
          }
        >
          {workshop.publish_status === 'published' ? 'Published' : 'Draft'}
        </Badge>
        {workshop.is_free || !workshop.price ? (
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">FREE</Badge>
        ) : (
          <Badge variant="secondary">₹{workshop.price.toLocaleString('en-IN')}</Badge>
        )}
        {workshop.certificate_enabled && (
          <Badge variant="secondary" className="gap-1">
            <Award className="h-3 w-3" />Certificates on
          </Badge>
        )}
        {workshop.archivedAt && <Badge className="bg-red-500/10 text-red-600 border-red-200">Archived</Badge>}
      </div>

      {/* Stat tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CalendarRange className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-semibold">{workshop.day_count}</p>
                <p className="text-xs text-muted-foreground">
                  Days{activeDays.length !== days.length ? ` · ${days.length - activeDays.length} cancelled` : ''}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-semibold">{workshop.enrollment_count ?? 0}</p>
                <p className="text-xs text-muted-foreground">
                  Registered
                  {workshop.capacity_mode === 'limited' && workshop.max_seats
                    ? ` of ${workshop.max_seats}`
                    : ''}
                  {(workshop.waitlist_count ?? 0) > 0 ? ` · ${workshop.waitlist_count} waiting` : ''}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <IndianRupee className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-semibold">{workshop.purchase_count ?? 0}</p>
                <p className="text-xs text-muted-foreground">Paid purchases</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Award className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-semibold">{workshop.certificate_count ?? 0}</p>
                <p className="text-xs text-muted-foreground">Certificates issued</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agenda */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />Day-by-day agenda
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {formatDateTime(workshop.start_date)} → {formatDateTime(workshop.end_date)} IST
          </span>
        </CardHeader>
        <CardContent className="space-y-3">
          {days.length === 0 ? (
            <p className="text-sm text-muted-foreground">No days configured.</p>
          ) : (
            days.map((day) => {
              const cancelled = day.status === 'cancelled'
              return (
                <div
                  key={day.session_id}
                  className={`rounded-lg border p-4 ${cancelled ? 'bg-muted/40 opacity-70' : ''}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                          Day {day.day_number}
                        </Badge>
                        <Badge className={`text-[10px] capitalize ${statusColors[day.status] || ''}`}>
                          {day.status}
                        </Badge>
                      </div>
                      <p className={`text-sm font-medium ${cancelled ? 'line-through' : ''}`}>{day.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        <Clock className="inline h-3 w-3 mr-1 -mt-0.5" />
                        {formatDateTime(day.scheduled_start_time)} – {formatTime(day.scheduled_end_time)} IST
                        {' · '}{day.duration_minutes} min
                        {day.faculty_name ? ` · ${day.faculty_name}` : ''}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        <Users className="inline h-3 w-3 mr-1 -mt-0.5" />
                        {day.attendee_count} attended
                        {' · '}
                        <Film className="inline h-3 w-3 mx-1 -mt-0.5" />
                        {day.recording_count} recording{day.recording_count === 1 ? '' : 's'}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {day.zoom_join_url && !cancelled && (
                        <>
                          <Button
                            variant="outline" size="sm"
                            onClick={() => copyToClipboard(day.zoom_join_url!, 'Join link')}
                          >
                            <Copy className="mr-1.5 h-3.5 w-3.5" />Join link
                          </Button>
                          {day.zoom_host_url && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={day.zoom_host_url} target="_blank" rel="noreferrer">
                                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />Start as host
                              </a>
                            </Button>
                          )}
                        </>
                      )}
                      {!cancelled && day.status !== 'completed' && (
                        <Button
                          variant="ghost" size="sm" className="text-amber-600"
                          onClick={() => handleCancelDay(day)}
                          disabled={cancellingDay === day.session_id}
                        >
                          {cancellingDay === day.session_id ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <XCircle className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          Cancel day
                        </Button>
                      )}
                    </div>
                  </div>

                  {day.zoom_meeting_id && !cancelled && (
                    <p className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <LinkIcon className="h-3 w-3" />
                      Zoom meeting {day.zoom_meeting_id}
                    </p>
                  )}
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings className="h-4 w-4" />Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Registration mode</span>
              <span className="capitalize">{workshop.enrollment_mode.replace(/_/g, ' ')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Registration closes</span>
              <span>
                {workshop.registration_closes_at
                  ? formatDateTime(workshop.registration_closes_at)
                  : formatDateTime(workshop.start_date)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Capacity</span>
              <span>
                {workshop.capacity_mode === 'unlimited' ? 'Unlimited' : `${workshop.max_seats ?? '—'} seats`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Waitlist</span>
              <span>{workshop.allow_waitlist ? 'Enabled' : 'Disabled'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Platform</span>
              <span className="capitalize">{workshop.platform}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Visibility</span>
              <span className="capitalize">{workshop.visible_to}</span>
            </div>
          </CardContent>
        </Card>

        {/* Certificates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="h-4 w-4" />Certificates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {!workshop.certificate_enabled ? (
              <p className="text-muted-foreground">
                Certificates are turned off for this workshop. Enable them in Edit to issue completion
                certificates.
              </p>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Attendance required</span>
                  <span>
                    {workshop.certificate_min_days_attended
                      ? `${workshop.certificate_min_days_attended} of ${activeDays.length} days`
                      : `All ${activeDays.length} days`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Issued so far</span>
                  <span>{workshop.certificate_count ?? 0}</span>
                </div>

                {workshop.status === 'completed' ? (
                  <Button
                    className="w-full"
                    onClick={handleIssueCertificates}
                    disabled={issuingCertificates}
                  >
                    {issuingCertificates ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Issuing...</>
                    ) : (
                      <><Award className="mr-2 h-4 w-4" />Issue certificates to eligible students</>
                    )}
                  </Button>
                ) : (
                  <p className="flex items-start gap-2 text-xs text-muted-foreground">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    Certificates become issuable once the workshop has ended. Students can also claim their
                    own from the store.
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">About</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{workshop.description}</p>
        </CardContent>
      </Card>

      {/* Recordings shortcut */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Film className="h-4 w-4" />Recordings
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Upload a recording from{' '}
          <Link to="/content/recordings" className="text-primary underline underline-offset-2">
            Content → Recordings
          </Link>{' '}
          and attach it to the relevant day. Registered students can then replay days they missed.
        </CardContent>
      </Card>

      <WorkshopFormModal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        workshop={workshop}
        mode="edit"
      />

      <ArchiveModal
        open={archiveModalOpen}
        onClose={() => { setArchiveModalOpen(false); setArchiveBlocked(false); setArchiveBlockReason('') }}
        onConfirm={handleArchiveConfirm}
        title="Archive Workshop"
        itemName={workshop.title}
        isLoadingImpact={loadingArchiveImpact}
        blocked={archiveBlocked}
        blockReason={archiveBlockReason}
      />

      {/* Notification modal */}
      <Dialog open={notifyModalOpen} onOpenChange={setNotifyModalOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Send Workshop Notification</DialogTitle>
            <DialogDescription>
              {notifyPreviewLoading
                ? 'Loading audience...'
                : `${notifyAudienceLabel} — ${notifyUserCount} user(s)`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notify_title">Title</Label>
              <Input
                id="notify_title"
                value={notifyTitle}
                onChange={(e) => setNotifyTitle(e.target.value)}
                disabled={notifyLoading || notifyPreviewLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notify_message">Message</Label>
              <Textarea
                id="notify_message"
                rows={3}
                value={notifyMessage}
                onChange={(e) => setNotifyMessage(e.target.value)}
                disabled={notifyLoading || notifyPreviewLoading}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNotifyModalOpen(false)} disabled={notifyLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleSendNotification}
              disabled={notifyLoading || notifyPreviewLoading || notifyUserCount === 0 || !notifyTitle || !notifyMessage}
            >
              {notifyLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</>
              ) : (
                <><CheckCircle className="mr-2 h-4 w-4" />Send to {notifyUserCount}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
