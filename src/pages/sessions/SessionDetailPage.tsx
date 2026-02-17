import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Video, Users, Calendar, Clock, DollarSign, Settings,
  Monitor, Link as LinkIcon, UserCheck, Eye, Edit, Trash2,
  CheckCircle, XCircle, AlertCircle, PlayCircle, ExternalLink, Film,
  Package, Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { liveSessionsService, LiveSession, LiveSessionFormData } from '@/services/liveSessions.service'
import { recordingsService, Recording } from '@/services/recordings.service'
import { packageTypesService, PackageType } from '@/services/packageTypes.service'
import { SessionFormModal } from '@/components/sessions/SessionFormModal'
import { DeleteModal } from '@/components/modals/DeleteModal'

export function SessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()

  const [session, setSession] = useState<LiveSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [loadingRecordings, setLoadingRecordings] = useState(true)

  // Convert to package state
  const [convertModalOpen, setConvertModalOpen] = useState(false)
  const [convertLoading, setConvertLoading] = useState(false)
  const [packageTypes, setPackageTypes] = useState<PackageType[]>([])
  const [selectedPackageTypeId, setSelectedPackageTypeId] = useState('')
  const [convertPrice, setConvertPrice] = useState('0')
  const [convertDuration, setConvertDuration] = useState('365')

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

  const fetchRecordings = useCallback(async () => {
    if (!sessionId) return
    try {
      setLoadingRecordings(true)
      const response = await recordingsService.getAll({ session_id: sessionId, limit: 100 })
      if (response.success && response.data) {
        setRecordings(response.data.entities || [])
      }
    } catch (error) {
      console.error('Failed to load recordings:', error)
    } finally {
      setLoadingRecordings(false)
    }
  }, [sessionId])

  useEffect(() => { fetchRecordings() }, [fetchRecordings])

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

  const handleOpenConvertModal = async () => {
    setConvertModalOpen(true)
    setSelectedPackageTypeId('')
    setConvertPrice(session?.price?.toString() || '0')
    setConvertDuration('365')
    const res = await packageTypesService.getAllPublic()
    if (res.success && res.data) setPackageTypes(res.data)
  }

  const handleConvertToPackage = async () => {
    if (!sessionId || !selectedPackageTypeId) return
    try {
      setConvertLoading(true)
      const response = await liveSessionsService.convertToPackage(sessionId, {
        package_type_id: selectedPackageTypeId,
        price: parseFloat(convertPrice) || 0,
        duration_days: parseInt(convertDuration) || 365,
      })
      if (response.success && response.data) {
        toast.success(`Package created with ${response.data.video_count} video(s)`)
        setConvertModalOpen(false)
        navigate(`/content/packages/${response.data.package_id}`)
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to convert session to package')
    } finally {
      setConvertLoading(false)
    }
  }

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`
    const mins = Math.floor(seconds / 60)
    if (mins < 60) return `${mins}m`
    const hrs = Math.floor(mins / 60)
    const remainMins = mins % 60
    return remainMins > 0 ? `${hrs}h ${remainMins}m` : `${hrs}h`
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
            {recordings.length > 0 && (
              <Button size="sm" onClick={handleOpenConvertModal}>
                <Package className="mr-2 h-4 w-4" />
                Convert to Package
              </Button>
            )}
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

      {/* Session Recordings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Film className="h-4 w-4" />
            Session Recordings
            <Badge variant="secondary" className="text-[10px] ml-1">
              {recordings.length}
            </Badge>
          </CardTitle>
          <Link to="/content/recordings">
            <Button variant="outline" size="sm">
              <ExternalLink className="mr-2 h-4 w-4" />
              Manage Recordings
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {loadingRecordings ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : recordings.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <Film className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>No recordings assigned to this session yet</p>
              <Link to="/content/recordings">
                <Button variant="link" size="sm" className="mt-2">
                  Go to Recordings page to upload and assign
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-24">Duration</TableHead>
                  <TableHead className="w-28">Status</TableHead>
                  <TableHead className="w-24">Size</TableHead>
                  <TableHead className="w-32">Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recordings.map((recording) => (
                  <TableRow key={recording._id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{recording.title}</p>
                        {recording.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-md">
                            {recording.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {recording.duration_seconds > 0
                        ? formatDuration(recording.duration_seconds)
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs capitalize ${
                          recording.processing_status === 'ready'
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
                            : recording.processing_status === 'failed'
                              ? 'bg-red-500/10 text-red-600 border-red-200'
                              : 'bg-amber-500/10 text-amber-600 border-amber-200'
                        }`}
                      >
                        {recording.processing_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {recording.file_size_mb > 0
                        ? `${recording.file_size_mb.toFixed(1)} MB`
                        : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(recording.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
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

      {/* Convert to Package Modal */}
      <Dialog open={convertModalOpen} onOpenChange={(open) => !convertLoading && setConvertModalOpen(open)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Convert Session to Package</DialogTitle>
            <DialogDescription>
              This will create a new package with the session recordings as videos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Summary */}
            <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
              <p><span className="font-medium">Package:</span> {session.title}</p>
              <p><span className="font-medium">Subject:</span> {typeof session.subject_id === 'object' ? session.subject_id.name : '—'}</p>
              <p>
                <span className="font-medium">Will create:</span>{' '}
                1 series, 1 module, {recordings.length} video{recordings.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Package Type */}
            <div className="space-y-2">
              <Label>
                Package Type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={selectedPackageTypeId}
                onValueChange={setSelectedPackageTypeId}
                disabled={convertLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select package type" />
                </SelectTrigger>
                <SelectContent>
                  {packageTypes.map((pt) => (
                    <SelectItem key={pt._id} value={pt._id}>
                      {pt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Price & Duration */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="convert-price">Price (INR)</Label>
                <Input
                  id="convert-price"
                  type="number"
                  min={0}
                  value={convertPrice}
                  onChange={(e) => setConvertPrice(e.target.value)}
                  disabled={convertLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="convert-duration">Duration (days)</Label>
                <Input
                  id="convert-duration"
                  type="number"
                  min={1}
                  value={convertDuration}
                  onChange={(e) => setConvertDuration(e.target.value)}
                  disabled={convertLoading}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConvertModalOpen(false)}
              disabled={convertLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConvertToPackage}
              disabled={convertLoading || !selectedPackageTypeId}
            >
              {convertLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Converting...
                </>
              ) : (
                <>
                  <Package className="mr-2 h-4 w-4" />
                  Create Package
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
