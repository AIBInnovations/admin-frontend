import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Users, ArrowLeft } from 'lucide-react'
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
                    <TableHead className="hidden sm:table-cell pr-6">Enrolled</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrollees.map((enrollee, index) => {
                    const user = enrollee.user_id
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
                        <TableCell className="hidden sm:table-cell text-xs text-muted-foreground pr-6">
                          {new Date(enrollee.enrolled_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
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
    </div>
  )
}
