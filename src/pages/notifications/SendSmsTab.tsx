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
import { MessageSquare, Users, BookOpen, UserCheck, X, Search, Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'
import { notificationsService } from '@/services/notifications.service'
import { subjectsService, type Subject } from '@/services/subjects.service'
import { usersService, type User } from '@/services/users.service'

type TargetAudience = 'all' | 'subject' | 'specific'

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

  // User search
  const [userSearch, setUserSearch] = useState('')
  const [userResults, setUserResults] = useState<User[]>([])
  const [searchingUsers, setSearchingUsers] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<User[]>([])

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
    if (target === 'subject' && !subjectId) return false
    if (target === 'specific' && selectedUsers.length === 0) return false
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
        response = await notificationsService.sendSmsToSubject({
          subject_id: subjectId,
          message: message.trim(),
        })
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
            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  { value: 'all', icon: Users, label: 'All Users', desc: 'Send to everyone' },
                  { value: 'subject', icon: BookOpen, label: 'By Subject', desc: 'Subject subscribers' },
                  { value: 'specific', icon: UserCheck, label: 'Specific Users', desc: 'Pick individual users' },
                ] as const
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
            <div className="space-y-2">
              <Label>Subject</Label>
              {loadingSubjects ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading subjects…
                </div>
              ) : (
                <Select value={subjectId} onValueChange={setSubjectId}>
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
              {target === 'subject' && subjectId && 'Sending to users subscribed to the selected subject'}
              {target === 'subject' && !subjectId && 'Select a subject first'}
              {target === 'specific' &&
                selectedUsers.length > 0 &&
                `Sending to ${selectedUsers.length} selected user${selectedUsers.length > 1 ? 's' : ''}`}
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
