import { useState } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Plus, Search, MoreVertical, Calendar, CalendarCheck, CalendarX,
  Eye, Pencil, Users, Trash2, XCircle, Video,
} from 'lucide-react'
import { mockLiveSessions } from '@/lib/mock-data'

function formatSessionDateTime(isoString: string) {
  const date = new Date(isoString)
  const day = date.getDate()
  const month = date.toLocaleString('en-IN', { month: 'short' })
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const h = hours % 12 || 12
  const m = minutes.toString().padStart(2, '0')
  return `${day} ${month}, ${h}:${m} ${ampm}`
}

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

const statusConfig = {
  scheduled: { label: 'Scheduled', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  completed: { label: 'Completed', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700 border-red-200' },
} as const

export function SessionsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedSession, setSelectedSession] = useState<typeof mockLiveSessions[0] | null>(null)

  const filtered = mockLiveSessions.filter((s) => {
    const matchesSearch = !search || s.title.toLowerCase().includes(search.toLowerCase()) || s.description.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalSessions = mockLiveSessions.length
  const scheduledCount = mockLiveSessions.filter((s) => s.status === 'scheduled').length
  const completedCount = mockLiveSessions.filter((s) => s.status === 'completed').length
  const cancelledCount = mockLiveSessions.filter((s) => s.status === 'cancelled').length

  return (
    <div>
      <PageHeader
        title="Live Sessions"
        description="Manage Zoom live sessions, scheduling, and capacity"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Live Sessions' }]}
        action={<Button><Plus className="mr-2 h-4 w-4" />Add Session</Button>}
      />

      {/* Stats */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <Card><CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Video className="h-5 w-5 text-primary" /></div>
          <div><p className="text-2xl font-bold">{totalSessions}</p><p className="text-xs text-muted-foreground">Total Sessions</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10"><Calendar className="h-5 w-5 text-blue-600" /></div>
          <div><p className="text-2xl font-bold">{scheduledCount}</p><p className="text-xs text-muted-foreground">Scheduled</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10"><CalendarCheck className="h-5 w-5 text-emerald-600" /></div>
          <div><p className="text-2xl font-bold">{completedCount}</p><p className="text-xs text-muted-foreground">Completed</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10"><CalendarX className="h-5 w-5 text-red-500" /></div>
          <div><p className="text-2xl font-bold">{cancelledCount}</p><p className="text-xs text-muted-foreground">Cancelled</p></div>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by session title..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Session</TableHead>
              <TableHead>Faculty</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Pricing</TableHead>
              <TableHead>Enrollment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((session) => {
              const isFull = session.capacity_mode === 'limited' && session.max_attendees !== null && session.enrolled_count >= session.max_attendees
              const capacityPercent = session.capacity_mode === 'limited' && session.max_attendees
                ? Math.min(100, Math.round((session.enrolled_count / session.max_attendees) * 100))
                : 0

              return (
                <TableRow key={session._id}>
                  {/* Session title + description */}
                  <TableCell className="max-w-[200px]">
                    <p className="truncate text-sm font-medium">{session.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{session.description}</p>
                  </TableCell>

                  {/* Faculty */}
                  <TableCell className="text-sm">{session.faculty_name}</TableCell>

                  {/* Subject */}
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px]">{session.subject_name}</Badge>
                  </TableCell>

                  {/* Date & Time */}
                  <TableCell className="whitespace-nowrap text-sm">
                    {formatSessionDateTime(session.scheduled_start_time)}
                  </TableCell>

                  {/* Duration */}
                  <TableCell className="text-sm">{formatDuration(session.duration_minutes)}</TableCell>

                  {/* Capacity */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="min-w-0">
                        <p className="text-sm">
                          {session.enrolled_count}/{session.capacity_mode === 'unlimited' ? '\u221E' : session.max_attendees}
                        </p>
                        {session.capacity_mode === 'limited' && session.max_attendees && (
                          <div className="mt-1 h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                            <div
                              className={`h-full rounded-full ${capacityPercent >= 90 ? 'bg-red-500' : capacityPercent >= 70 ? 'bg-amber-500' : 'bg-primary'}`}
                              style={{ width: `${capacityPercent}%` }}
                            />
                          </div>
                        )}
                      </div>
                      {isFull && (
                        <Badge variant="destructive" className="text-[10px]">FULL</Badge>
                      )}
                    </div>
                  </TableCell>

                  {/* Pricing */}
                  <TableCell>
                    {session.is_free ? (
                      <Badge className="border-emerald-200 bg-emerald-100 text-emerald-700 text-[10px]">FREE</Badge>
                    ) : (
                      <span className="text-sm font-medium">{'\u20B9'}{session.price}</span>
                    )}
                  </TableCell>

                  {/* Enrollment mode */}
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {session.enrollment_mode === 'enrollment_required' ? 'Required' : 'Open'}
                    </Badge>
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <Badge className={`text-[10px] ${statusConfig[session.status].className}`}>
                      {statusConfig[session.status].label}
                    </Badge>
                  </TableCell>

                  {/* Actions */}
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedSession(session)}>
                          <Eye className="mr-2 h-4 w-4" />View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Pencil className="mr-2 h-4 w-4" />Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Users className="mr-2 h-4 w-4" />View Enrollments
                        </DropdownMenuItem>
                        {session.status === 'scheduled' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600">
                              <XCircle className="mr-2 h-4 w-4" />Cancel Session
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" />Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Showing {filtered.length} of {totalSessions} sessions</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>Previous</Button>
          <Button variant="outline" size="sm">Next</Button>
        </div>
      </div>

      {/* Session Detail Dialog */}
      <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedSession?.title}</DialogTitle>
            <DialogDescription>{selectedSession?.description}</DialogDescription>
          </DialogHeader>
          {selectedSession && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Faculty</p>
                <p className="font-medium">{selectedSession.faculty_name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Subject</p>
                <p className="font-medium">{selectedSession.subject_name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Date & Time</p>
                <p className="font-medium">{formatSessionDateTime(selectedSession.scheduled_start_time)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Duration</p>
                <p className="font-medium">{formatDuration(selectedSession.duration_minutes)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Platform</p>
                <p className="font-medium capitalize">{selectedSession.platform}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <Badge className={statusConfig[selectedSession.status].className}>
                  {statusConfig[selectedSession.status].label}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground">Capacity</p>
                <p className="font-medium">
                  {selectedSession.enrolled_count} / {selectedSession.capacity_mode === 'unlimited' ? '\u221E' : selectedSession.max_attendees}
                  {' '}enrolled
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Pricing</p>
                <p className="font-medium">{selectedSession.is_free ? 'Free' : `\u20B9${selectedSession.price}`}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Enrollment Mode</p>
                <p className="font-medium capitalize">{selectedSession.enrollment_mode.replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Waitlist</p>
                <p className="font-medium">{selectedSession.allow_waitlist ? 'Allowed' : 'Not allowed'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Guaranteed Seats (Paid)</p>
                <p className="font-medium">{selectedSession.guaranteed_seats_for_paid ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Capacity Mode</p>
                <p className="font-medium capitalize">{selectedSession.capacity_mode}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
