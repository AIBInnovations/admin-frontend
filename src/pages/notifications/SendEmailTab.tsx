import { useState, useEffect, useCallback, useRef } from 'react'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Mail,
  Users,
  BookOpen,
  UserCheck,
  X,
  Search,
  Loader2,
  Paperclip,
  Trash2,
  Eye,
  Send,
} from 'lucide-react'
import { toast } from 'sonner'
import { notificationsService, type EmailAttachment } from '@/services/notifications.service'
import { subjectsService, type Subject } from '@/services/subjects.service'
import { usersService, type User } from '@/services/users.service'

type TargetAudience = 'all' | 'subject' | 'specific'

interface PendingAttachment {
  file: File
  filename: string
  url: string | null // null until uploaded
  uploading: boolean
}

export function SendEmailTab() {
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

  // Email template fields
  const [emailSubject, setEmailSubject] = useState('')
  const [header, setHeader] = useState('')
  const [body, setBody] = useState('')
  const [footer, setFooter] = useState('')

  // Attachments
  const [attachments, setAttachments] = useState<PendingAttachment[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Preview
  const [previewOpen, setPreviewOpen] = useState(false)

  // Send state
  const [sending, setSending] = useState(false)

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

  // ── Attachments ──────────────────────────────────────────────────────────
  const handleAttachmentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    if (attachments.length + files.length > 5) {
      toast.error('Maximum 5 attachments allowed')
      return
    }

    const tooBig = files.find((f) => f.size > 25 * 1024 * 1024)
    if (tooBig) {
      toast.error(`"${tooBig.name}" exceeds the 25 MB limit`)
      return
    }

    const newItems: PendingAttachment[] = files.map((f) => ({
      file: f,
      filename: f.name,
      url: null,
      uploading: false,
    }))
    setAttachments((prev) => [...prev, ...newItems])

    // Reset input so the same file can be re-selected after removal
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const uploadAttachment = async (index: number): Promise<string | null> => {
    const item = attachments[index]
    if (!item || item.url) return item?.url ?? null

    setAttachments((prev) =>
      prev.map((a, i) => (i === index ? { ...a, uploading: true } : a))
    )

    try {
      const urlRes = await notificationsService.getAttachmentUploadUrl(item.file.type, item.filename)
      if (!urlRes.success || !urlRes.data) {
        toast.error(`Failed to get upload URL for "${item.filename}"`)
        return null
      }

      const { uploadUrl, fileUrl } = urlRes.data

      await fetch(uploadUrl, {
        method: 'PUT',
        body: item.file,
        headers: { 'Content-Type': item.file.type },
      })

      setAttachments((prev) =>
        prev.map((a, i) => (i === index ? { ...a, url: fileUrl, uploading: false } : a))
      )
      return fileUrl
    } catch {
      toast.error(`Failed to upload "${item.filename}"`)
      setAttachments((prev) =>
        prev.map((a, i) => (i === index ? { ...a, uploading: false } : a))
      )
      return null
    }
  }

  // ── Validation ────────────────────────────────────────────────────────────
  const canSend = () => {
    if (!emailSubject.trim() || !body.trim()) return false
    if (target === 'subject' && !subjectId) return false
    if (target === 'specific' && selectedUsers.length === 0) return false
    return true
  }

  // ── Preview HTML ─────────────────────────────────────────────────────────
  const buildPreviewHtml = () => {
    const headerHtml = header.trim()
      ? `<div style="background-color:#1e40af;color:#ffffff;padding:24px;text-align:center;">${header}</div>`
      : ''
    const footerHtml = footer.trim()
      ? `<div style="background-color:#f9fafb;padding:16px 24px;text-align:center;color:#6b7280;font-size:13px;border-top:1px solid #e5e7eb;">${footer}</div>`
      : ''
    return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:20px auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    ${headerHtml}
    <div style="padding:24px;color:#333333;line-height:1.6;">${body || '<p style="color:#9ca3af;">Body will appear here…</p>'}</div>
    ${footerHtml}
  </div>
</body></html>`
  }

  // ── Send ──────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!canSend()) return
    setSending(true)

    try {
      // Upload all pending attachments
      const uploadedAttachments: EmailAttachment[] = []
      for (let i = 0; i < attachments.length; i++) {
        const item = attachments[i]
        const url = item.url ?? (await uploadAttachment(i))
        if (!url) {
          setSending(false)
          return // upload failure already toasted
        }
        uploadedAttachments.push({ url, filename: item.filename })
      }

      const payload = {
        subject: emailSubject.trim(),
        body: body.trim(),
        ...(header.trim() && { header: header.trim() }),
        ...(footer.trim() && { footer: footer.trim() }),
        ...(uploadedAttachments.length > 0 && { attachments: uploadedAttachments }),
      }

      let response
      if (target === 'all') {
        response = await notificationsService.sendEmailToAll(payload)
      } else if (target === 'subject') {
        response = await notificationsService.sendEmailToSubject({ ...payload, subject_id: subjectId })
      } else {
        response = await notificationsService.sendEmailToUsers({
          ...payload,
          user_ids: selectedUsers.map((u) => u._id),
        })
      }

      if (response.success && response.data) {
        const { sent, failed, total } = response.data
        toast.success(`Email sent! ${sent}/${total} delivered${failed > 0 ? `, ${failed} failed` : ''}`)
        resetForm()
      } else {
        toast.error(response.message || 'Failed to send email')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to send email')
    } finally {
      setSending(false)
    }
  }

  const resetForm = () => {
    setEmailSubject('')
    setHeader('')
    setBody('')
    setFooter('')
    setAttachments([])
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
            <Mail className="h-5 w-5" />
            Send Email
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

          {/* ── Email template ── */}
          <div className="space-y-5 border-t pt-6">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Email Template
            </p>

            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="email-subject">
                Subject <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email-subject"
                placeholder="e.g. New Live Session Available — Don't Miss It!"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground">{emailSubject.length}/200</p>
            </div>

            {/* Header */}
            <div className="space-y-2">
              <Label htmlFor="email-header">
                Header{' '}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                id="email-header"
                placeholder="e.g. <strong>PGME</strong> · Your Medical Education Partner"
                value={header}
                onChange={(e) => setHeader(e.target.value)}
                maxLength={2000}
                rows={2}
              />
              <p className="text-xs text-muted-foreground">
                Displayed at the top of the email in a highlighted banner. Supports HTML.
              </p>
            </div>

            {/* Body */}
            <div className="space-y-2">
              <Label htmlFor="email-body">
                Body <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="email-body"
                placeholder={`e.g. <p>Dear Student,</p>\n<p>Dr. Sharma is going live on <strong>Anatomy</strong> at 5 PM today. Join now to ask questions in real time!</p>\n<p>Best,<br>The PGME Team</p>`}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={50000}
                rows={10}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Main email content. Supports HTML tags for formatting.{' '}
                <span className="font-medium">{body.length.toLocaleString()}</span>/50,000
              </p>
            </div>

            {/* Footer */}
            <div className="space-y-2">
              <Label htmlFor="email-footer">
                Footer{' '}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                id="email-footer"
                placeholder="e.g. © 2025 PGME. All rights reserved. · You are receiving this because you are enrolled in PGME."
                value={footer}
                onChange={(e) => setFooter(e.target.value)}
                maxLength={2000}
                rows={2}
              />
              <p className="text-xs text-muted-foreground">
                Shown at the bottom of the email in a muted footer strip. Supports HTML.
              </p>
            </div>

            {/* Attachments */}
            <div className="space-y-3">
              <Label>
                Attachments{' '}
                <span className="text-muted-foreground font-normal">(optional, max 5 × 25 MB)</span>
              </Label>

              {attachments.length > 0 && (
                <ul className="space-y-2">
                  {attachments.map((att, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm"
                    >
                      <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">{att.filename}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {(att.file.size / 1024 / 1024).toFixed(1)} MB
                      </span>
                      {att.uploading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
                      ) : att.url ? (
                        <span className="text-xs text-emerald-600 shrink-0">Uploaded</span>
                      ) : (
                        <span className="text-xs text-muted-foreground shrink-0">Pending</span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeAttachment(i)}
                        className="shrink-0 rounded p-0.5 hover:bg-muted"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {attachments.length < 5 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                >
                  <Paperclip className="h-4 w-4" />
                  Attach file
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleAttachmentSelect}
                className="hidden"
              />
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="flex items-center justify-between border-t pt-6">
            <p className="text-sm text-muted-foreground">
              {target === 'all' && 'Will be sent to all active users with an email address'}
              {target === 'subject' && subjectId && 'Sending to users subscribed to the selected subject'}
              {target === 'subject' && !subjectId && 'Select a subject first'}
              {target === 'specific' &&
                selectedUsers.length > 0 &&
                `Sending to ${selectedUsers.length} selected user${selectedUsers.length > 1 ? 's' : ''}`}
              {target === 'specific' && selectedUsers.length === 0 && 'Search and select users first'}
            </p>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPreviewOpen(true)}
                disabled={!body.trim()}
              >
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </Button>

              <Button onClick={handleSend} disabled={!canSend() || sending} size="lg">
                {sending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Email
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Preview Modal ── */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Email Preview
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg border bg-muted/30 px-4 py-2 text-sm">
              <span className="font-medium text-muted-foreground">Subject: </span>
              {emailSubject || <span className="italic text-muted-foreground">No subject</span>}
            </div>
            <div
              className="rounded-lg border overflow-hidden"
              dangerouslySetInnerHTML={{ __html: buildPreviewHtml() }}
            />
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {attachments.map((a, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1 rounded bg-muted px-2 py-1 text-xs"
                  >
                    <Paperclip className="h-3 w-3" />
                    {a.filename}
                  </span>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
