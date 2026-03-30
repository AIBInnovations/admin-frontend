import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MessageSquare, Users, BookOpen, UserCheck, X, Search, Loader2, Send, Package, Layers, Video } from 'lucide-react'
import { toast } from 'sonner'
import { notificationsService } from '@/services/notifications.service'
import { subjectsService, type Subject } from '@/services/subjects.service'
import { usersService, type User } from '@/services/users.service'
import { packagesService, type Package as PackageType } from '@/services/packages.service'
import { seriesService, type Series } from '@/services/series.service'
import { liveSessionsService, type LiveSession } from '@/services/liveSessions.service'

type TargetAudience = 'all' | 'subject' | 'specific' | 'session'
type SubjectScope = 'subscribers' | 'package' | 'series'

// SMS character limits
const SMS_SINGLE = 160
const SMS_CONCAT = 153 // each part in multi-part SMS

function getSmsInfo(text: string) {
  const len = text.length
  if (len === 0) return { parts: 0, remaining: SMS_SINGLE, chars: 0 }
  if (len <= SMS_SINGLE) return { parts: 1, remaining: SMS_SINGLE - len, chars: len }
  const parts = Math.ceil(len / SMS_CONCAT)
  const used = len % SMS_CONCAT || SMS_CONCAT
  return { parts, remaining: SMS_CONCAT - used, chars: len }
}

export function SendSmsTab() {
  // Audience
  const [target, setTarget] = useState<TargetAudience>('all')
  const [subjectId, setSubjectId] = useState('')
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loadingSubjects, setLoadingSubjects] = useState(false)
  const [subjectScope, setSubjectScope] = useState<SubjectScope>('subscribers')
  const [packageId, setPackageId] = useState('')
  const [seriesId, setSeriesId] = useState('')
  const [packages, setPackages] = useState<PackageType[]>([])
  const [series, setSeries] = useState<Series[]>([])
  const [loadingPackages, setLoadingPackages] = useState(false)
  const [loadingSeries, setLoadingSeries] = useState(false)

  // User search
  const [userSearch, setUserSearch] = useState('')
  const [userResults, setUserResults] = useState<User[]>([])
  const [searchingUsers, setSearchingUsers] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<User[]>([])

  // Session selection
  const [sessions, setSessions] = useState<LiveSession[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [sessionId, setSessionId] = useState('')

  // Message
  const [message, setMessage] = useState('')

  // Send state
  const [sending, setSending] = useState(false)

  const smsInfo = getSmsInfo(message)

  // ── Subject loading ──────────────────────────────────────────────────────
  useEffect(() => {
    if (target === 'subject' && subjects.length === 0) {
      setLoadingSubjects(true)
      subjectsService
        .getSubjects({ limit: 100, is_active: true, sort_by: 'display_order', sort_order: 'asc' })
        .then((res) => {
          if (res.success && res.data) setSubjects(res.data.entities || [])
        })
        .catch(() => toast.error('Failed to load subjects'))
        .finally(() => setLoadingSubjects(false))
    }
  }, [target, subjects.length])

  // Load sessions when target changes to 'session'
  useEffect(() => {
    if (target === 'session' && sessions.length === 0) {
      setLoadingSessions(true)
      liveSessionsService
        .getAll({ limit: 100, publish_status: 'published' })
        .then((res) => {
          if (res.success && res.data) setSessions(res.data.entities || [])
        })
        .catch(() => toast.error('Failed to load sessions'))
        .finally(() => setLoadingSessions(false))
    }
  }, [target, sessions.length])

  // Load packages when subject is selected and scope is package or series
  useEffect(() => {
    if (subjectId && (subjectScope === 'package' || subjectScope === 'series')) {
      setLoadingPackages(true)
      setPackageId('')
      setSeriesId('')
      setSeries([])
      packagesService
        .getAll({ subject_id: subjectId, is_active: true, limit: 100 })
        .then((res) => {
          if (res.success && res.data) setPackages(res.data.entities || [])
        })
        .catch(() => toast.error('Failed to load packages'))
        .finally(() => setLoadingPackages(false))
    }
  }, [subjectId, subjectScope])

  // Load series when package is selected and scope is series
  useEffect(() => {
    if (packageId && subjectScope === 'series') {
      setLoadingSeries(true)
      setSeriesId('')
      seriesService
        .getAll({ package_id: packageId, is_active: true, limit: 100 })
        .then((res) => {
          if (res.success && res.data) setSeries(res.data.entities || [])
        })
        .catch(() => toast.error('Failed to load series'))
        .finally(() => setLoadingSeries(false))
    }
  }, [packageId, subjectScope])

  // ── User search ──────────────────────────────────────────────────────────
  const searchUsers = useCallback(
    async (query: string) => {
      if (query.length < 2) {
        setUserResults([])
        return
      }
      setSearchingUsers(true)
      try {
        const res = await usersService.getAll({ search: query, limit: 10, is_active: true })
        if (res.success && res.data) {
          const selectedIds = new Set(selectedUsers.map((u) => u._id))
          setUserResults((res.data.entities || []).filter((u) => !selectedIds.has(u._id)))
        }
      } catch {
        // silently fail
      } finally {
        setSearchingUsers(false)
      }
    },
    [selectedUsers]
  )

  useEffect(() => {
    const timer = setTimeout(() => searchUsers(userSearch), 300)
    return () => clearTimeout(timer)
  }, [userSearch, searchUsers])

  const addUser = (user: User) => {
    setSelectedUsers((prev) => [...prev, user])
    setUserResults((prev) => prev.filter((u) => u._id !== user._id))
    setUserSearch('')
  }

  const removeUser = (userId: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u._id !== userId))
  }

  // ── Validation ────────────────────────────────────────────────────────────
  const canSend = () => {
    if (!message.trim()) return false
    if (target === 'subject') {
      if (!subjectId) return false
      if (subjectScope === 'package' && !packageId) return false
      if (subjectScope === 'series' && !seriesId) return false
    }
    if (target === 'specific' && selectedUsers.length === 0) return false
    if (target === 'session' && !sessionId) return false
    return true
  }

  // ── Send ──────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!canSend()) return
    setSending(true)

    try {
      let response
      if (target === 'all') {
        response = await notificationsService.sendSmsToAll({ message: message.trim() })
      } else if (target === 'subject') {
        if (subjectScope === 'package') {
          response = await notificationsService.sendSmsToPackage({ package_id: packageId, message: message.trim() })
        } else if (subjectScope === 'series') {
          response = await notificationsService.sendSmsToSeries({ series_id: seriesId, message: message.trim() })
        } else {
          response = await notificationsService.sendSmsToSubject({ subject_id: subjectId, message: message.trim() })
        }
      } else if (target === 'session') {
        response = await notificationsService.sendSmsToSession({ session_id: sessionId, message: message.trim() })
      } else {
        response = await notificationsService.sendSmsToUsers({
          user_ids: selectedUsers.map((u) => u._id),
          message: message.trim(),
        })
      }

      if (response.success && response.data) {
        const { sent, failed, total } = response.data
        toast.success(`SMS sent! ${sent}/${total} delivered${failed > 0 ? `, ${failed} failed` : ''}`)
        resetForm()
      } else {
        toast.error(response.message || 'Failed to send SMS')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to send SMS')
    } finally {
      setSending(false)
    }
  }

  const resetForm = () => {
    setMessage('')
    setSubjectId('')
    setSelectedUsers([])
    setUserSearch('')
    setUserResults([])
    setSubjectScope('subscribers')
    setPackageId('')
    setSeriesId('')
    setPackages([])
    setSeries([])
    setSessionId('')
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5" />
            Send SMS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* ── Target Audience ── */}
          <div className="space-y-2">
            <Label>Target Audience</Label>
            <div className="grid grid-cols-4 gap-3">
              {(
                [
                  { value: 'all' as const, icon: Users, label: 'All Users', desc: 'Send to everyone' },
                  { value: 'subject' as const, icon: BookOpen, label: 'By Subject', desc: 'Subject subscribers' },
                  { value: 'session' as const, icon: Video, label: 'By Session', desc: 'Session enrollees' },
                  { value: 'specific' as const, icon: UserCheck, label: 'Specific Users', desc: 'Pick individual users' },
                ]
              ).map(({ value, icon: Icon, label, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTarget(value)}
                  className={`flex items-center gap-3 rounded-lg border-2 p-4 text-left transition-colors ${
                    target === value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/30'
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                      target === value ? 'bg-primary/10' : 'bg-muted'
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 ${target === value ? 'text-primary' : 'text-muted-foreground'}`}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ── Subject selector ── */}
          {target === 'subject' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Subject</Label>
                {loadingSubjects ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading subjects…
                  </div>
                ) : (
                  <Select
                    value={subjectId}
                    onValueChange={(v) => {
                      setSubjectId(v)
                      setSubjectScope('subscribers')
                      setPackageId('')
                      setSeriesId('')
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((s) => (
                        <SelectItem key={s._id} value={s._id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {subjectId && (
                <div className="space-y-2">
                  <Label>Target Scope</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { value: 'subscribers' as const, icon: Users, label: 'All Subscribers', desc: 'All subject subscribers' },
                      { value: 'package' as const, icon: Package, label: 'Package', desc: 'Package purchasers' },
                      { value: 'series' as const, icon: Layers, label: 'Series', desc: 'Series subscribers' },
                    ]).map(({ value, icon: Icon, label, desc }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => { setSubjectScope(value); setPackageId(''); setSeriesId('') }}
                        className={`flex items-center gap-2 rounded-lg border p-3 text-left transition-colors ${
                          subjectScope === value
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-muted-foreground/30'
                        }`}
                      >
                        <Icon className={`h-4 w-4 shrink-0 ${subjectScope === value ? 'text-primary' : 'text-muted-foreground'}`} />
                        <div>
                          <p className="text-xs font-medium">{label}</p>
                          <p className="text-[10px] text-muted-foreground">{desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Package dropdown */}
              {subjectId && (subjectScope === 'package' || subjectScope === 'series') && (
                <div className="space-y-2">
                  <Label>Package</Label>
                  {loadingPackages ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading packages…
                    </div>
                  ) : (
                    <Select value={packageId} onValueChange={(v) => { setPackageId(v); setSeriesId('') }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a package" />
                      </SelectTrigger>
                      <SelectContent>
                        {packages.map((p) => (
                          <SelectItem key={p._id} value={p._id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {/* Series dropdown */}
              {subjectId && subjectScope === 'series' && packageId && (
                <div className="space-y-2">
                  <Label>Series</Label>
                  {loadingSeries ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading series…
                    </div>
                  ) : (
                    <Select value={seriesId} onValueChange={setSeriesId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a series" />
                      </SelectTrigger>
                      <SelectContent>
                        {series.map((s) => (
                          <SelectItem key={s._id} value={s._id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Session selector ── */}
          {target === 'session' && (
            <div className="space-y-2">
              <Label>Live Session</Label>
              {loadingSessions ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading sessions...
                </div>
              ) : (
                <Select value={sessionId} onValueChange={setSessionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a live session" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions.map((s) => (
                      <SelectItem key={s._id} value={s._id}>
                        {s.title}
                        {s.enrollment_count !== undefined ? ` (${s.enrollment_count} enrolled)` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* ── User selector ── */}
          {target === 'specific' && (
            <div className="space-y-3">
              <Label>Select Users</Label>
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map((user) => (
                    <Badge key={user._id} variant="secondary" className="gap-1 py-1 pl-2 pr-1">
                      {user.name || user.phone_number}
                      <button
                        type="button"
                        onClick={() => removeUser(user._id)}
                        className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search users by name, email, or phone…"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-9"
                />
                {searchingUsers && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
              </div>
              {userResults.length > 0 && (
                <div className="rounded-lg border">
                  {userResults.map((user) => (
                    <button
                      key={user._id}
                      type="button"
                      onClick={() => addUser(user)}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-accent first:rounded-t-lg last:rounded-b-lg"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                        {(user.name || '?')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{user.name || 'Unnamed'}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {user.phone_number}
                          {user.email ? ` · ${user.email}` : ''}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {userSearch.length >= 2 && !searchingUsers && userResults.length === 0 && (
                <p className="text-sm text-muted-foreground">No users found</p>
              )}
            </div>
          )}

          {/* ── Message ── */}
          <div className="space-y-2 border-t pt-6">
            <Label htmlFor="sms-message">
              Message <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="sms-message"
              placeholder="e.g. Dr. Sharma's Anatomy session starts in 30 mins. Join now on PGME!"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={1600}
              rows={5}
            />

            {/* SMS counter bar */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {smsInfo.chars} character{smsInfo.chars !== 1 ? 's' : ''}
                {smsInfo.parts > 1 && (
                  <span className="ml-2 text-amber-600">
                    · {smsInfo.parts} SMS parts (carriers may bill separately)
                  </span>
                )}
              </span>
              <span
                className={`font-medium tabular-nums ${
                  smsInfo.remaining <= 10
                    ? 'text-red-500'
                    : smsInfo.remaining <= 30
                    ? 'text-amber-500'
                    : 'text-muted-foreground'
                }`}
              >
                {smsInfo.remaining} left in part {smsInfo.parts || 1}
              </span>
            </div>

            {/* SMS info tip */}
            <p className="text-xs text-muted-foreground">
              Plain text only — no HTML or markdown. Keep it under 160 characters for a single SMS.
              Numbers are sent as <span className="font-medium">+91XXXXXXXXXX</span>.
            </p>
          </div>

          {/* ── Actions ── */}
          <div className="flex items-center justify-between border-t pt-6">
            <p className="text-sm text-muted-foreground">
              {target === 'all' && 'Will be sent to all active users with a registered phone'}
              {target === 'subject' && !subjectId && 'Select a subject first'}
              {target === 'subject' && subjectId && subjectScope === 'subscribers' && 'Sending to subject subscribers with a registered phone'}
              {target === 'subject' && subjectId && subjectScope === 'package' && !packageId && 'Select a package'}
              {target === 'subject' && subjectId && subjectScope === 'package' && packageId && 'Sending to package purchasers with a registered phone'}
              {target === 'subject' && subjectId && subjectScope === 'series' && !seriesId && 'Select a package and series'}
              {target === 'subject' && subjectId && subjectScope === 'series' && seriesId && 'Sending to series users with a registered phone'}
              {target === 'session' && !sessionId && 'Select a live session first'}
              {target === 'session' && sessionId && 'Sending to all confirmed enrollees of the selected session'}
              {target === 'specific' && selectedUsers.length > 0 && `Sending to ${selectedUsers.length} selected user${selectedUsers.length > 1 ? 's' : ''}`}
              {target === 'specific' && selectedUsers.length === 0 && 'Search and select users first'}
            </p>

            <Button onClick={handleSend} disabled={!canSend() || sending} size="lg">
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send SMS
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
