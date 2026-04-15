import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Users, ArrowLeft, MoreHorizontal, ShieldOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { liveSessionsService, LiveSession, Enrollee } from '@/services/liveSessions.service'

export function SessionAttendeesPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()

  const [session, setSession] = useState<LiveSession | null>(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [enrollees, setEnrollees] = useState<Enrollee[]>([])
  const [loadingEnrollees, setLoadingEnrollees] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [stats, setStats] = useState<{ confirmed: number; waitlisted: number; cancelled: number }>({ confirmed: 0, waitlisted: 0, cancelled: 0 })

  // Revoke modal state
  const [revokeTarget, setRevokeTarget] = useState<Enrollee | null>(null)
  const [revokeReason, setRevokeReason] = useState('')
  const [revoking, setRevoking] = useState(false)

  useEffect(() => {
    if (!sessionId) return
    ;(async () => {
      try {
        setLoadingSession(true)
        const response = await liveSessionsService.getById(sessionId)
        if (response.success && response.data) {
          setSession(response.data)
        } else {
          toast.error('Session not found')
          navigate('/sessions')
        }
      } catch (error: any) {
        toast.error(error.message || 'Failed to load session')
        navigate('/sessions')
      } finally {
        setLoadingSession(false)
      }
    })()
  }, [sessionId, navigate])

  const fetchEnrollees = useCallback(async () => {
    if (!sessionId) return
    try {
      setLoadingEnrollees(true)
      const statusParam = statusFilter === 'all' ? undefined : statusFilter
      const response = await liveSessionsService.getEnrollees(sessionId, statusParam)
      if (response.success && response.data) {
        setEnrollees(response.data.enrollees || [])
        setStats(response.data.by_status)
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load attendees')
    } finally {
      setLoadingEnrollees(false)
    }
  }, [sessionId, statusFilter])

  useEffect(() => { fetchEnrollees() }, [fetchEnrollees])

  const openRevokeModal = (enrollee: Enrollee) => {
    setRevokeTarget(enrollee)
    setRevokeReason('')
  }

  const handleRevokeAccess = async () => {
    if (!sessionId || !revokeTarget) return
    setRevoking(true)
    try {
      const response = await liveSessionsService.revokeEnrollment(
        sessionId,
        revokeTarget._id,
        revokeReason || undefined,
      )
      if (response.success) {
        toast.success('Session access revoked successfully')
        setRevokeTarget(null)
        setRevokeReason('')
        fetchEnrollees()
      } else {
        toast.error(response.message || 'Failed to revoke access')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to revoke access')
    } finally {
      setRevoking(false)
    }
  }

  const totalCount = stats.confirmed + stats.waitlisted + stats.cancelled

  if (loadingSession) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Registered Users"
        description={session.title}
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Sessions', href: '/sessions' },
          { label: session.title, href: `/sessions/${sessionId}` },
          { label: 'Attendees' },
        ]}
        action={
          <Button variant="outline" size="sm" onClick={() => navigate(`/sessions/${sessionId}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Session
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{totalCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Confirmed</p>
            <p className="text-2xl font-bold text-emerald-600">{stats.confirmed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Waitlisted</p>
            <p className="text-2xl font-bold text-amber-600">{stats.waitlisted}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Cancelled</p>
            <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
          </CardContent>
        </Card>
      </div>

      {/* Enrollees Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Attendees
            <Badge variant="secondary" className="text-[10px] ml-1">
              {enrollees.length}
            </Badge>
          </CardTitle>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ({totalCount})</SelectItem>
              <SelectItem value="confirmed">Confirmed ({stats.confirmed})</SelectItem>
              <SelectItem value="waitlisted">Waitlisted ({stats.waitlisted})</SelectItem>
              <SelectItem value="cancelled">Cancelled ({stats.cancelled})</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {loadingEnrollees ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : enrollees.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>No registered users{statusFilter !== 'all' ? ` with status "${statusFilter}"` : ''}</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6 w-10">#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Student ID</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead className="hidden sm:table-cell">Phone</TableHead>
                    <TableHead className="hidden lg:table-cell">UG College</TableHead>
                    <TableHead className="hidden lg:table-cell">PG College</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Paid</TableHead>
                    <TableHead className="hidden sm:table-cell">Enrolled</TableHead>
                    <TableHead className="w-10 pr-6" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrollees.map((enrollee, index) => {
                    const user = enrollee.user_id
                    const canRevoke = enrollee.enrollment_status !== 'cancelled'
                    return (
                      <TableRow key={enrollee._id}>
                        <TableCell className="pl-6 text-xs text-muted-foreground">{index + 1}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{user?.name || '—'}</p>
                            <p className="text-xs text-muted-foreground md:hidden">{user?.email || ''}</p>
                            <p className="text-xs text-muted-foreground sm:hidden">{user?.phone_number || ''}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-mono">{user?.student_id || '—'}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm">{user?.email || '—'}</TableCell>
                        <TableCell className="hidden sm:table-cell text-sm">{user?.phone_number || '—'}</TableCell>
                        <TableCell className="hidden lg:table-cell text-xs">{user?.ug_college || '—'}</TableCell>
                        <TableCell className="hidden lg:table-cell text-xs">{user?.pg_college || '—'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {enrollee.enrollment_type.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] capitalize ${
                              enrollee.enrollment_status === 'confirmed'
                                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
                                : enrollee.enrollment_status === 'waitlisted'
                                  ? 'bg-amber-500/10 text-amber-600 border-amber-200'
                                  : 'bg-red-500/10 text-red-600 border-red-200'
                            }`}
                          >
                            {enrollee.enrollment_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">
                          {enrollee.purchase_id
                            ? `₹${enrollee.purchase_id.amount_paid?.toLocaleString('en-IN')}`
                            : '—'}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                          {new Date(enrollee.enrolled_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </TableCell>
                        <TableCell className="pr-6">
                          {canRevoke && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive gap-2"
                                  onClick={() => openRevokeModal(enrollee)}
                                >
                                  <ShieldOff className="h-4 w-4" />
                                  Revoke Access
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revoke Access Dialog */}
      <Dialog
        open={!!revokeTarget}
        onOpenChange={(open) => {
          if (!open && !revoking) {
            setRevokeTarget(null)
            setRevokeReason('')
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldOff className="h-5 w-5 text-destructive" />
              Revoke Session Access
            </DialogTitle>
            <DialogDescription>
              This will cancel{' '}
              <span className="font-medium text-foreground">
                {revokeTarget?.user_id?.name || revokeTarget?.user_id?.phone_number || 'this user'}
              </span>
              's enrollment in{' '}
              <span className="font-medium text-foreground">{session.title}</span>
              . They will lose access immediately. This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="revoke-reason" className="text-sm">
                Reason <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                id="revoke-reason"
                placeholder="e.g. Refund issued, duplicate enrollment, policy violation..."
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                rows={3}
                maxLength={500}
                disabled={revoking}
              />
            </div>
            {revokeTarget?.purchase_id && (
              <p className="text-xs text-muted-foreground">
                Associated purchase of{' '}
                <span className="font-medium">
                  ₹{revokeTarget.purchase_id.amount_paid?.toLocaleString('en-IN')}
                </span>{' '}
                will also be marked as revoked.
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => { setRevokeTarget(null); setRevokeReason('') }}
              disabled={revoking}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRevokeAccess} disabled={revoking}>
              {revoking ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Revoking...</>
              ) : (
                'Revoke Access'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
