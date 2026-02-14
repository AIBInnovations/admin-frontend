import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Send, Users, BookOpen, UserCheck, X, Search, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { notificationsService } from '@/services/notifications.service'
import { subjectsService, type Subject } from '@/services/subjects.service'
import { usersService, type User } from '@/services/users.service'

type TargetAudience = 'all' | 'subject' | 'specific'

export function SendNotificationTab() {
  // Form state
  const [target, setTarget] = useState<TargetAudience>('all')
  const [subjectId, setSubjectId] = useState('')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [clickUrl, setClickUrl] = useState('')
  const [sending, setSending] = useState(false)

  // Subjects
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loadingSubjects, setLoadingSubjects] = useState(false)

  // User search & selection
  const [userSearch, setUserSearch] = useState('')
  const [userResults, setUserResults] = useState<User[]>([])
  const [searchingUsers, setSearchingUsers] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<User[]>([])

  // Load subjects when target changes to 'subject'
  useEffect(() => {
    if (target === 'subject' && subjects.length === 0) {
      setLoadingSubjects(true)
      subjectsService
        .getSubjects({ limit: 100, is_active: true, sort_by: 'display_order', sort_order: 'asc' })
        .then((res) => {
          if (res.success && res.data) {
            setSubjects(res.data.entities || [])
          }
        })
        .catch(() => toast.error('Failed to load subjects'))
        .finally(() => setLoadingSubjects(false))
    }
  }, [target, subjects.length])

  // Search users with debounce
  const searchUsers = useCallback(async (query: string) => {
    if (query.length < 2) {
      setUserResults([])
      return
    }
    setSearchingUsers(true)
    try {
      const res = await usersService.getAll({ search: query, limit: 10, is_active: true })
      if (res.success && res.data) {
        // Filter out already selected users
        const selectedIds = new Set(selectedUsers.map((u) => u._id))
        setUserResults((res.data.entities || []).filter((u) => !selectedIds.has(u._id)))
      }
    } catch {
      // Silently fail search
    } finally {
      setSearchingUsers(false)
    }
  }, [selectedUsers])

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

  const resetForm = () => {
    setTitle('')
    setMessage('')
    setClickUrl('')
    setSubjectId('')
    setSelectedUsers([])
    setUserSearch('')
    setUserResults([])
  }

  const canSend = () => {
    if (!title.trim() || !message.trim()) return false
    if (target === 'subject' && !subjectId) return false
    if (target === 'specific' && selectedUsers.length === 0) return false
    return true
  }

  const handleSend = async () => {
    if (!canSend()) return

    setSending(true)
    try {
      const payload = {
        title: title.trim(),
        message: message.trim(),
        ...(clickUrl.trim() && { click_url: clickUrl.trim() }),
      }

      let response
      if (target === 'all') {
        response = await notificationsService.sendToAll(payload)
      } else if (target === 'subject') {
        response = await notificationsService.sendToSubject({ ...payload, subject_id: subjectId })
      } else {
        response = await notificationsService.sendToUsers({
          ...payload,
          user_ids: selectedUsers.map((u) => u._id),
        })
      }

      if (response.success) {
        const result = response.data
        const successCount = result?.push_results?.success ?? 0
        const failCount = result?.push_results?.failure ?? 0
        toast.success(
          `Notification sent! ${successCount} delivered, ${failCount} failed`
        )
        resetForm()
      } else {
        toast.error(response.message || 'Failed to send notification')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to send notification')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Send className="h-5 w-5" />
            Send Push Notification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Target Audience */}
          <div className="space-y-2">
            <Label>Target Audience</Label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setTarget('all')}
                className={`flex items-center gap-3 rounded-lg border-2 p-4 text-left transition-colors ${
                  target === 'all'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/30'
                }`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  target === 'all' ? 'bg-primary/10' : 'bg-muted'
                }`}>
                  <Users className={`h-5 w-5 ${target === 'all' ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <p className="text-sm font-medium">All Users</p>
                  <p className="text-xs text-muted-foreground">Send to everyone</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTarget('subject')}
                className={`flex items-center gap-3 rounded-lg border-2 p-4 text-left transition-colors ${
                  target === 'subject'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/30'
                }`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  target === 'subject' ? 'bg-primary/10' : 'bg-muted'
                }`}>
                  <BookOpen className={`h-5 w-5 ${target === 'subject' ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <p className="text-sm font-medium">By Subject</p>
                  <p className="text-xs text-muted-foreground">Subject subscribers</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTarget('specific')}
                className={`flex items-center gap-3 rounded-lg border-2 p-4 text-left transition-colors ${
                  target === 'specific'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/30'
                }`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  target === 'specific' ? 'bg-primary/10' : 'bg-muted'
                }`}>
                  <UserCheck className={`h-5 w-5 ${target === 'specific' ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <p className="text-sm font-medium">Specific Users</p>
                  <p className="text-xs text-muted-foreground">Pick individual users</p>
                </div>
              </button>
            </div>
          </div>

          {/* Subject Selector */}
          {target === 'subject' && (
            <div className="space-y-2">
              <Label>Subject</Label>
              {loadingSubjects ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading subjects...
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

          {/* User Selector */}
          {target === 'specific' && (
            <div className="space-y-3">
              <Label>Select Users</Label>

              {/* Selected users */}
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

              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search users by name, email, or phone..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-9"
                />
                {searchingUsers && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
              </div>

              {/* Search results */}
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
                          {user.phone_number}{user.email ? ` · ${user.email}` : ''}
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

          {/* Notification Content */}
          <div className="space-y-4 border-t pt-6">
            <div className="space-y-2">
              <Label htmlFor="notif-title">Title <span className="text-red-500">*</span></Label>
              <Input
                id="notif-title"
                placeholder="e.g. New Live Session Available!"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground">{title.length}/200</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notif-message">Message <span className="text-red-500">*</span></Label>
              <Textarea
                id="notif-message"
                placeholder="e.g. Dr. Sharma is going live on Anatomy at 5 PM today. Don't miss it!"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={1000}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">{message.length}/1000</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notif-url">Click URL <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                id="notif-url"
                type="url"
                placeholder="https://pgme.app/sessions/abc123"
                value={clickUrl}
                onChange={(e) => setClickUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Deep link users will be taken to when they tap the notification
              </p>
            </div>
          </div>

          {/* Send Button */}
          <div className="flex items-center justify-between border-t pt-6">
            <p className="text-sm text-muted-foreground">
              {target === 'all' && 'This will be sent to all active users'}
              {target === 'subject' && subjectId && `Sending to users subscribed to selected subject`}
              {target === 'subject' && !subjectId && 'Select a subject first'}
              {target === 'specific' && selectedUsers.length > 0 && `Sending to ${selectedUsers.length} selected user${selectedUsers.length > 1 ? 's' : ''}`}
              {target === 'specific' && selectedUsers.length === 0 && 'Search and select users first'}
            </p>
            <Button
              onClick={handleSend}
              disabled={!canSend() || sending}
              size="lg"
            >
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Notification
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
