import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Video, Users, Calendar, Clock, DollarSign, Settings,
  Monitor, Link as LinkIcon, UserCheck, Eye, Edit, Trash2,
  CheckCircle, XCircle, AlertCircle, PlayCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { liveSessionsService, LiveSession, LiveSessionFormData } from '@/services/liveSessions.service'
import { SessionFormModal } from '@/components/sessions/SessionFormModal'
import { DeleteModal } from '@/components/modals/DeleteModal'

export function SessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()

  const [session, setSession] = useState<LiveSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)

  const fetchSession = useCallback(async () => {
    if (!sessionId) return
    try {
      setLoading(true)
      const response = await liveSessionsService.getById(sessionId)
      if (response.success && response.data) {
        setSession(response.data)
      } else {
        toast.error('Session not found')
        navigate('/sessions')
      }
    } catch {
      toast.error('Failed to load session details')
      navigate('/sessions')
    } finally {
      setLoading(false)
    }
  }, [sessionId, navigate])

  useEffect(() => { fetchSession() }, [fetchSession])

  const handleEdit = () => {
    setFormModalOpen(true)
  }

  const handleDeleteClick = () => {
    setDeleteModalOpen(true)
  }

  const handleFormSubmit = async (data: LiveSessionFormData) => {
    if (!session) return
    try {
      const response = await liveSessionsService.update(session._id, data)
      if (response.success) {
        toast.success('Session updated successfully')
        fetchSession()
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update session')
      throw error
    }
  }

  const handleDeleteConfirm = async () => {
    if (!session) return
    try {
      const response = await liveSessionsService.delete(session._id)
      if (response.success) {
        toast.success('Session deleted successfully')
        navigate('/sessions')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete session')
      throw error
    }
  }

  const handleCancel = async () => {
    if (!session) return
    try {
      const response = await liveSessionsService.cancel(session._id)
      if (response.success) {
        toast.success('Session cancelled successfully')
        fetchSession()
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel session')
    }
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (!session) return null

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusIcon = (status: LiveSession['status']) => {
    switch (status) {
      case 'scheduled':
        return <Clock className="h-4 w-4" />
      case 'live':
        return <PlayCircle className="h-4 w-4" />
      case 'completed':
        return <CheckCircle className="h-4 w-4" />
      case 'cancelled':
        return <XCircle className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: LiveSession['status']) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-500/10 text-blue-600 border-blue-200'
      case 'live':
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
      case 'completed':
        return 'bg-zinc-500/10 text-zinc-600 border-zinc-200'
      case 'cancelled':
        return 'bg-red-500/10 text-red-600 border-red-200'
    }
  }

  const getPlatformIcon = (platform: LiveSession['platform']) => {
    return <Monitor className="h-4 w-4" />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={session.title}
        description="View and manage live session details"
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Sessions', href: '/sessions' },
          { label: session.title },
        ]}
        action={
          <div className="flex items-center gap-2">
            {session.status === 'scheduled' && (
              <Button variant="outline" size="sm" onClick={handleCancel}>
                <XCircle className="mr-2 h-4 w-4" />
                Cancel Session
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={handleDeleteClick}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        }
      />

      {/* Status Badge */}
      <div>
        <Badge className={`text-xs ${getStatusColor(session.status)}`}>
          {getStatusIcon(session.status)}
          <span className="ml-1.5 capitalize">{session.status}</span>
        </Badge>
      </div>

      {/* Basic Information */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Video className="h-4 w-4" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Title</p>
              <p className="text-sm font-medium">{session.title}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Description</p>
              <p className="text-sm">{session.description || '—'}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Subject</p>
                <p className="text-sm font-medium">
                  {typeof session.subject_id === 'object' ? session.subject_id.name : session.subject_id}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Faculty</p>
                <p className="text-sm font-medium">
                  {session.faculty_id && typeof session.faculty_id === 'object'
                    ? session.faculty_id.name
                    : session.faculty_id || '—'}
                </p>
              </div>
            </div>
            {session.series_id && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Series</p>
                <p className="text-sm font-medium">
                  {typeof session.series_id === 'object' ? session.series_id.name : session.series_id}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" />
              Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Start Time</p>
              <p className="text-sm font-medium">{formatDateTime(session.scheduled_start_time)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">End Time</p>
              <p className="text-sm font-medium">{formatDateTime(session.scheduled_end_time)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Duration</p>
              <p className="text-sm font-medium">{session.duration_minutes} minutes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Meeting Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Monitor className="h-4 w-4" />
            Meeting Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Platform</p>
              <div className="flex items-center gap-2">
                {getPlatformIcon(session.platform)}
                <p className="text-sm font-medium capitalize">{session.platform}</p>
              </div>
            </div>
            {session.zoom_meeting_id && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Zoom Meeting ID</p>
                <p className="text-sm font-medium font-mono">{session.zoom_meeting_id}</p>
              </div>
            )}
          </div>
          {session.zoom_join_url && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Zoom Join URL (Participants)</p>
              <div className="flex items-center gap-2">
                <a
                  href={session.zoom_join_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1 flex-1 min-w-0"
                >
                  <LinkIcon className="h-3 w-3 shrink-0" />
                  <span className="truncate">{session.zoom_join_url}</span>
                </a>
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                >
                  <a href={session.zoom_join_url} target="_blank" rel="noopener noreferrer">
                    <Users className="mr-2 h-4 w-4" />
                    Join as Participant
                  </a>
                </Button>
              </div>
            </div>
          )}
          {session.zoom_host_url && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Zoom Host URL (Start Meeting)</p>
              <div className="flex items-center gap-2">
                <a
                  href={session.zoom_host_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1 flex-1 min-w-0"
                >
                  <LinkIcon className="h-3 w-3 shrink-0" />
                  <span className="truncate">{session.zoom_host_url}</span>
                </a>
                <Button
                  size="sm"
                  asChild
                >
                  <a href={session.zoom_host_url} target="_blank" rel="noopener noreferrer">
                    <UserCheck className="mr-2 h-4 w-4" />
                    Start as Host
                  </a>
                </Button>
              </div>
            </div>
          )}
          {session.meeting_link && !session.zoom_join_url && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Meeting Link</p>
              <div className="flex items-center gap-2">
                <a
                  href={session.meeting_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1 flex-1 min-w-0"
                >
                  <LinkIcon className="h-3 w-3 shrink-0" />
                  <span className="truncate">{session.meeting_link}</span>
                </a>
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                >
                  <a href={session.meeting_link} target="_blank" rel="noopener noreferrer">
                    Join Meeting
                  </a>
                </Button>
              </div>
            </div>
          )}
          {session.thumbnail_url && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Thumbnail</p>
              <img
                src={session.thumbnail_url}
                alt={session.title}
                className="h-32 w-auto rounded-lg border"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Capacity & Enrollment */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              Capacity & Enrollment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Enrollment Mode</p>
                <Badge variant="outline" className="text-xs capitalize">
                  {session.enrollment_mode.replace(/_/g, ' ')}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Capacity Mode</p>
                <Badge variant="outline" className="text-xs capitalize">
                  {session.capacity_mode}
                </Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Current Attendees</p>
                <p className="text-sm font-medium">{session.current_attendees || 0}</p>
              </div>
              {session.max_attendees && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Max Attendees</p>
                  <p className="text-sm font-medium">{session.max_attendees}</p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {session.allow_waitlist ? (
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-zinc-400" />
                )}
                <span className="text-xs">Allow Waitlist</span>
              </div>
              <div className="flex items-center gap-2">
                {session.guaranteed_seats_for_paid ? (
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-zinc-400" />
                )}
                <span className="text-xs">Guaranteed Seats for Paid Users</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-4 w-4" />
              Pricing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Access</p>
              <Badge className={session.is_free ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200' : ''}>
                {session.is_free ? 'Free' : 'Paid'}
              </Badge>
            </div>
            {!session.is_free && (
              <>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Price</p>
                  <p className="text-lg font-bold">₹{session.price.toLocaleString('en-IN')}</p>
                </div>
                {session.compare_at_price && session.compare_at_price > session.price && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Compare at Price</p>
                    <p className="text-sm line-through text-muted-foreground">
                      ₹{session.compare_at_price.toLocaleString('en-IN')}
                    </p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Session Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="h-4 w-4" />
            Session Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            {session.auto_admit_users ? (
              <CheckCircle className="h-4 w-4 text-emerald-600" />
            ) : (
              <XCircle className="h-4 w-4 text-zinc-400" />
            )}
            <span className="text-xs">Auto-admit Users</span>
          </div>
          <div className="flex items-center gap-2">
            {session.allow_join_before_host ? (
              <CheckCircle className="h-4 w-4 text-emerald-600" />
            ) : (
              <XCircle className="h-4 w-4 text-zinc-400" />
            )}
            <span className="text-xs">Allow Join Before Host</span>
          </div>
        </CardContent>
      </Card>

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Eye className="h-4 w-4" />
            Metadata
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Created At</p>
              <p className="text-sm">{formatDateTime(session.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Last Updated</p>
              <p className="text-sm">{formatDateTime(session.updatedAt)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <SessionFormModal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        session={session}
        mode="edit"
      />

      {/* Delete Modal */}
      <DeleteModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Session"
        itemName={session.title}
      />
    </div>
  )
}
