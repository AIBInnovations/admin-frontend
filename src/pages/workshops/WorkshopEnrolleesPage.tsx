import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
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
import {
  Users, ArrowLeft, MoreHorizontal, ShieldOff, Loader2, Check, Minus, Award, Download,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  workshopsService, WorkshopEnrollee, WorkshopEnrolleesResponse,
} from '@/services/workshops.service'

const typeColors: Record<string, string> = {
  paid: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
  free: 'bg-blue-500/10 text-blue-600 border-blue-200',
  admin_override: 'bg-purple-500/10 text-purple-600 border-purple-200',
}

const statusColors: Record<string, string> = {
  confirmed: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
  waitlisted: 'bg-amber-500/10 text-amber-600 border-amber-200',
  cancelled: 'bg-red-500/10 text-red-600 border-red-200',
}

/** CSV-escape a cell: quote it, and double any embedded quotes. */
function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value)
  return `"${s.replace(/"/g, '""')}"`
}

export function WorkshopEnrolleesPage() {
  const { workshopId } = useParams<{ workshopId: string }>()
  const navigate = useNavigate()

  const [data, setData] = useState<WorkshopEnrolleesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')

  const [revokeTarget, setRevokeTarget] = useState<WorkshopEnrollee | null>(null)
  const [revokeReason, setRevokeReason] = useState('')
  const [revoking, setRevoking] = useState(false)

  const fetchEnrollees = useCallback(async () => {
    if (!workshopId) return
    try {
      setLoading(true)
      const response = await workshopsService.getEnrollees(
        workshopId,
        statusFilter === 'all' ? undefined : statusFilter,
      )
      if (response.success && response.data) {
        setData(response.data)
      } else {
        toast.error(response.message || 'Failed to load enrollees')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load enrollees')
    } finally {
      setLoading(false)
    }
  }, [workshopId, statusFilter])

  useEffect(() => { fetchEnrollees() }, [fetchEnrollees])

  const handleRevoke = async () => {
    if (!workshopId || !revokeTarget) return
    setRevoking(true)
    try {
      const response = await workshopsService.revokeEnrollment(
        workshopId,
        revokeTarget._id,
        revokeReason || undefined,
      )
      if (response.success) {
        toast.success('Registration revoked')
        setRevokeTarget(null)
        setRevokeReason('')
        fetchEnrollees()
      } else {
        toast.error(response.message || 'Failed to revoke registration')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to revoke registration')
    } finally {
      setRevoking(false)
    }
  }

  const filtered = useMemo(() => {
    const rows = data?.enrollees || []
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (e) =>
        e.user_id.name?.toLowerCase().includes(q) ||
        e.user_id.email?.toLowerCase().includes(q) ||
        e.user_id.phone_number?.toLowerCase().includes(q) ||
        e.user_id.student_id?.toLowerCase().includes(q),
    )
  }, [data, search])

  /** Client-side CSV so an admin can pull the attendance matrix without a backend export. */
  const handleExportCsv = () => {
    if (!data) return
    const dayHeaders = data.days.map((d) => `Day ${d.day_number}`)
    const header = [
      'Name', 'Email', 'Phone', 'Student ID', 'Type', 'Status',
      ...dayHeaders, 'Days Attended', 'Certificate',
    ]
    const rows = filtered.map((e) => [
      e.user_id.name,
      e.user_id.email,
      e.user_id.phone_number,
      e.user_id.student_id || '',
      e.enrollment_type,
      e.enrollment_status,
      ...data.days.map((d) => (e.attended_day_numbers.includes(d.day_number) ? 'Yes' : 'No')),
      e.days_attended,
      e.certificate ? (e.certificate.revoked ? 'Revoked' : e.certificate.certificate_number) : '',
    ])

    const csv = [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n')
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `workshop-enrollees-${workshopId}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!data) return null

  const { workshop, days, by_status: byStatus } = data

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workshop Enrollees"
        description={`${workshop.title} · ${workshop.day_count} day${workshop.day_count === 1 ? '' : 's'}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Workshops', href: '/workshops' },
          { label: workshop.title, href: `/workshops/${workshopId}` },
          { label: 'Enrollees' },
        ]}
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`/workshops/${workshopId}`)}>
              <ArrowLeft className="mr-2 h-4 w-4" />Back
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={filtered.length === 0}>
              <Download className="mr-2 h-4 w-4" />Export CSV
            </Button>
          </div>
        }
      />

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-semibold">{data.total_enrollees}</p>
            <p className="text-xs text-muted-foreground">Total registrations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-semibold text-emerald-600">{byStatus.confirmed}</p>
            <p className="text-xs text-muted-foreground">
              Confirmed{workshop.max_seats ? ` of ${workshop.max_seats} seats` : ''}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-semibold text-amber-600">{byStatus.waitlisted}</p>
            <p className="text-xs text-muted-foreground">Waitlisted</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-semibold text-red-600">{byStatus.cancelled}</p>
            <p className="text-xs text-muted-foreground">Cancelled</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search by name, email, phone or student ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="waitlisted">Waitlisted</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Attendance matrix */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[220px]">Student</TableHead>
                <TableHead className="w-24">Type</TableHead>
                <TableHead className="w-28">Status</TableHead>
                {days.map((d) => (
                  <TableHead key={d.session_id} className="w-16 text-center">
                    <span className={d.status === 'cancelled' ? 'line-through text-muted-foreground' : ''}>
                      D{d.day_number}
                    </span>
                  </TableHead>
                ))}
                <TableHead className="w-20 text-center">Attended</TableHead>
                <TableHead className="w-36">Certificate</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={days.length + 6} className="h-32 text-center text-muted-foreground">
                    <Users className="mx-auto mb-2 h-8 w-8 opacity-40" />
                    {search || statusFilter !== 'all'
                      ? 'No enrollees match your filters'
                      : 'Nobody has registered yet'}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((e) => (
                  <TableRow key={e._id}>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{e.user_id.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {e.user_id.email}
                          {e.user_id.student_id ? ` · ${e.user_id.student_id}` : ''}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] capitalize ${typeColors[e.enrollment_type] || ''}`}>
                        {e.enrollment_type.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] capitalize ${statusColors[e.enrollment_status] || ''}`}>
                        {e.enrollment_status}
                        {e.enrollment_status === 'waitlisted' && e.waitlist_position
                          ? ` #${e.waitlist_position}`
                          : ''}
                      </Badge>
                    </TableCell>
                    {days.map((d) => {
                      const attended = e.attended_day_numbers.includes(d.day_number)
                      return (
                        <TableCell key={d.session_id} className="text-center">
                          {attended ? (
                            <Check className="mx-auto h-4 w-4 text-emerald-600" />
                          ) : (
                            <Minus className="mx-auto h-4 w-4 text-muted-foreground/40" />
                          )}
                        </TableCell>
                      )
                    })}
                    <TableCell className="text-center text-sm">
                      {e.days_attended}/{days.filter((d) => d.status !== 'cancelled').length}
                    </TableCell>
                    <TableCell>
                      {e.certificate ? (
                        e.certificate.revoked ? (
                          <Badge className="bg-red-500/10 text-red-600 border-red-200 text-[10px]">Revoked</Badge>
                        ) : (
                          <span className="flex items-center gap-1 text-xs">
                            <Award className="h-3 w-3 text-emerald-600" />
                            <span className="font-mono truncate max-w-[110px]">
                              {e.certificate.certificate_number}
                            </span>
                          </span>
                        )
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {e.enrollment_status !== 'cancelled' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setRevokeTarget(e)} className="text-red-600">
                              <ShieldOff className="mr-2 h-4 w-4" />Revoke access
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Revoke modal */}
      <Dialog open={!!revokeTarget} onOpenChange={(open) => { if (!open) setRevokeTarget(null) }}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Revoke workshop access</DialogTitle>
            <DialogDescription>
              {revokeTarget?.user_id.name} will lose access to every remaining day, any recordings, and their
              certificate. If they held a confirmed seat, the next waitlisted student is promoted automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="revoke_reason">Reason (optional)</Label>
            <Textarea
              id="revoke_reason"
              rows={3}
              placeholder="e.g., Refund processed"
              value={revokeReason}
              onChange={(ev) => setRevokeReason(ev.target.value)}
              disabled={revoking}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeTarget(null)} disabled={revoking}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRevoke} disabled={revoking}>
              {revoking ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Revoking...</>
              ) : (
                <><ShieldOff className="mr-2 h-4 w-4" />Revoke access</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
