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
import { Send, Users, BookOpen, UserCheck, X, Search, Loader2, ImagePlus, Trash2, Package, Layers, MousePointerClick, Video } from 'lucide-react'
import { toast } from 'sonner'
import { notificationsService } from '@/services/notifications.service'
import { subjectsService, type Subject } from '@/services/subjects.service'
import { packagesService, type Package as PackageType } from '@/services/packages.service'
import { packageTypesService, type PackageType as PkgType } from '@/services/packageTypes.service'
import { booksService, type Book } from '@/services/books.service'
import { seriesService, type Series } from '@/services/series.service'
import { liveSessionsService, type LiveSession } from '@/services/liveSessions.service'
import { usersService, type User } from '@/services/users.service'

type TargetAudience = 'all' | 'subject' | 'specific' | 'session'
type SubjectScope = 'subscribers' | 'package' | 'series'
type ClickAction = 'none' | 'external_url' | 'theory_package' | 'practical_package' | 'ebook' | 'live_session'

export function SendNotificationTab() {
  // Form state
  const [target, setTarget] = useState<TargetAudience>('all')
  const [subjectId, setSubjectId] = useState('')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  // Click action state (internal screen redirection)
  const [clickAction, setClickAction] = useState<ClickAction>('none')
  const [externalUrl, setExternalUrl] = useState('')
  const [selectedNavPackageId, setSelectedNavPackageId] = useState('')
  const [selectedBookId, setSelectedBookId] = useState('')
  const [selectedSessionId, setSelectedSessionId] = useState('')

  // Click action data
  const [navPackages, setNavPackages] = useState<PackageType[]>([])
  const [navPackageTypes, setNavPackageTypes] = useState<PkgType[]>([])
  const [navBooks, setNavBooks] = useState<Book[]>([])
  const [navSessions, setNavSessions] = useState<LiveSession[]>([])
  const [navPackagesLoading, setNavPackagesLoading] = useState(false)
  const [navBooksLoading, setNavBooksLoading] = useState(false)
  const [navSessionsLoading, setNavSessionsLoading] = useState(false)

  // Image upload state
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Subjects
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loadingSubjects, setLoadingSubjects] = useState(false)

  // Subject scope (depth targeting)
  const [subjectScope, setSubjectScope] = useState<SubjectScope>('subscribers')
  const [packageId, setPackageId] = useState('')
  const [seriesId, setSeriesId] = useState('')
  const [packages, setPackages] = useState<PackageType[]>([])
  const [series, setSeries] = useState<Series[]>([])
  const [loadingPackages, setLoadingPackages] = useState(false)
  const [loadingSeries, setLoadingSeries] = useState(false)

  // User search & selection
  const [userSearch, setUserSearch] = useState('')
  const [userResults, setUserResults] = useState<User[]>([])
  const [searchingUsers, setSearchingUsers] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<User[]>([])

  // Session selection
  const [sessions, setSessions] = useState<LiveSession[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [sessionId, setSessionId] = useState('')

  // Load sessions when target changes to 'session'
  useEffect(() => {
    if (target === 'session' && sessions.length === 0) {
      setLoadingSessions(true)
      liveSessionsService
        .getAll({ limit: 100, publish_status: 'published' })
        .then((res) => {
          if (res.success && res.data) {
            setSessions(res.data.entities || [])
          }
        })
        .catch(() => toast.error('Failed to load sessions'))
        .finally(() => setLoadingSessions(false))
    }
  }, [target, sessions.length])

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

  // Load packages & books for click action when needed
  useEffect(() => {
    if (clickAction === 'theory_package' || clickAction === 'practical_package') {
      if (navPackages.length === 0) {
        setNavPackagesLoading(true)
        Promise.all([
          packagesService.getAll({ is_active: true, limit: 100 } as any),
          packageTypesService.getAllPublic(),
        ]).then(([pkgRes, typesRes]) => {
          if (pkgRes.success && pkgRes.data) setNavPackages(pkgRes.data.entities || [])
          if (typesRes.success && typesRes.data) setNavPackageTypes(typesRes.data)
        }).catch(() => toast.error('Failed to load packages'))
          .finally(() => setNavPackagesLoading(false))
      }
    }
    if (clickAction === 'ebook') {
      if (navBooks.length === 0) {
        setNavBooksLoading(true)
        booksService.getAll({ limit: 100, is_available: true } as any)
          .then((res) => {
            if (res.success && res.data) setNavBooks((res.data.entities || []).filter((b: Book) => b.ebook))
          })
          .catch(() => toast.error('Failed to load books'))
          .finally(() => setNavBooksLoading(false))
      }
    }
    if (clickAction === 'live_session') {
      if (navSessions.length === 0) {
        setNavSessionsLoading(true)
        liveSessionsService.getAll({ limit: 100, status: 'scheduled' } as any)
          .then((res) => {
            if (res.success && res.data) setNavSessions(res.data.entities || [])
          })
          .catch(() => toast.error('Failed to load sessions'))
          .finally(() => setNavSessionsLoading(false))
      }
    }
  }, [clickAction])

  // Package filtering helpers for click action
  const getNavTypeName = (pkg: PackageType): string => {
    const ref = pkg.package_type_id as any
    if (typeof ref === 'object' && ref !== null && 'name' in ref) return ref.name.toLowerCase()
    return ''
  }

  const matchesNavType = (pkg: PackageType, typeName: string): boolean => {
    const name = getNavTypeName(pkg)
    if (name) return name === typeName
    const typeId = navPackageTypes.find((t) => t.name.toLowerCase() === typeName)?._id
    if (!typeId) return false
    const ref = pkg.package_type_id as any
    const pkgTypeId = typeof ref === 'object' && ref !== null ? ref._id : ref as string
    return pkgTypeId === typeId
  }

  const theoryNavPackages = navPackages.filter((p) => matchesNavType(p, 'theory'))
  const practicalNavPackages = navPackages.filter((p) => matchesNavType(p, 'practical'))

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

  // Image upload handlers
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      toast.error('Only JPEG and PNG images are supported')
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB')
      return
    }

    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setImageUrl(null) // Reset the uploaded URL since it's a new file
  }

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return imageUrl
    if (imageUrl) return imageUrl // Already uploaded

    setUploadingImage(true)
    try {
      // Get presigned URL
      const urlRes = await notificationsService.getImageUploadUrl(imageFile.type)
      if (!urlRes.success || !urlRes.data) {
        toast.error('Failed to get upload URL')
        return null
      }

      const { uploadUrl, imageUrl: publicUrl } = urlRes.data

      // Upload to S3 directly
      await fetch(uploadUrl, {
        method: 'PUT',
        body: imageFile,
        headers: { 'Content-Type': imageFile.type },
      })

      setImageUrl(publicUrl)
      return publicUrl
    } catch {
      toast.error('Failed to upload image')
      return null
    } finally {
      setUploadingImage(false)
    }
  }

  const removeImage = () => {
    setImageFile(null)
    setImageUrl(null)
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview)
      setImagePreview(null)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const resetForm = () => {
    setTitle('')
    setMessage('')
    setClickAction('none')
    setExternalUrl('')
    setSelectedNavPackageId('')
    setSelectedBookId('')
    setSelectedSessionId('')
    setSubjectId('')
    setSubjectScope('subscribers')
    setPackageId('')
    setSeriesId('')
    setPackages([])
    setSeries([])
    setSelectedUsers([])
    setUserSearch('')
    setUserResults([])
    setSessionId('')
    removeImage()
  }

  const canSend = () => {
    if (!title.trim() || !message.trim()) return false
    if (target === 'subject') {
      if (!subjectId) return false
      if (subjectScope === 'package' && !packageId) return false
      if (subjectScope === 'series' && !seriesId) return false
    }
    if (target === 'specific' && selectedUsers.length === 0) return false
    if (target === 'session' && !sessionId) return false
    // Validate click action requirements
    if (clickAction === 'external_url' && !externalUrl.trim()) return false
    if ((clickAction === 'theory_package' || clickAction === 'practical_package') && !selectedNavPackageId) return false
    if (clickAction === 'ebook' && !selectedBookId) return false
    if (clickAction === 'live_session' && !selectedSessionId) return false
    return true
  }

  const handleSend = async () => {
    if (!canSend()) return

    setSending(true)
    try {
      // Upload image first if one is selected
      let finalImageUrl: string | null = null
      if (imageFile) {
        finalImageUrl = await uploadImage()
        if (imageFile && !finalImageUrl) {
          setSending(false)
          return // Upload failed
        }
      }

      // Resolve click action to link fields
      const resolveLinkData = (): Partial<Pick<import('@/services/notifications.service').PushPayload, 'link_type' | 'external_url' | 'internal_route' | 'internal_params'>> => {
        switch (clickAction) {
          case 'theory_package':
            return { link_type: 'internal', internal_route: '/revision-series', internal_params: { packageId: selectedNavPackageId } }
          case 'practical_package':
            return { link_type: 'internal', internal_route: '/practical-series', internal_params: { packageId: selectedNavPackageId } }
          case 'ebook':
            return { link_type: 'internal', internal_route: '/ebook-store', internal_params: { bookId: selectedBookId } }
          case 'live_session':
            return { link_type: 'internal', internal_route: '/session/:id', internal_params: { id: selectedSessionId } }
          case 'external_url':
            return { link_type: 'external', external_url: externalUrl.trim() }
          default:
            return { link_type: 'none' }
        }
      }

      const linkData = resolveLinkData()
      const payload = {
        title: title.trim(),
        message: message.trim(),
        ...linkData,
        ...(finalImageUrl && { image_url: finalImageUrl }),
      }

      let response
      if (target === 'all') {
        response = await notificationsService.sendToAll(payload)
      } else if (target === 'subject') {
        if (subjectScope === 'package') {
          response = await notificationsService.sendToPackage({ ...payload, package_id: packageId })
        } else if (subjectScope === 'series') {
          response = await notificationsService.sendToSeries({ ...payload, series_id: seriesId })
        } else {
          response = await notificationsService.sendToSubject({ ...payload, subject_id: subjectId })
        }
      } else if (target === 'session') {
        response = await notificationsService.sendToSession({ ...payload, session_id: sessionId })
      } else {
        response = await notificationsService.sendToUsers({
          ...payload,
          user_ids: selectedUsers.map((u) => u._id),
        })
      }

      if (response.success && response.data) {
        const { sent, failed, total } = response.data
        toast.success(
          `Notification sent! ${sent}/${total} delivered${failed > 0 ? `, ${failed} failed` : ''}`
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
            <div className="grid grid-cols-4 gap-3">
              {([
                { value: 'all' as const, icon: Users, label: 'All Users', desc: 'Send to everyone' },
                { value: 'subject' as const, icon: BookOpen, label: 'By Subject', desc: 'Subject subscribers' },
                { value: 'session' as const, icon: Video, label: 'By Session', desc: 'Session enrollees' },
                { value: 'specific' as const, icon: UserCheck, label: 'Specific Users', desc: 'Pick individual users' },
              ]).map(({ value, icon: Icon, label, desc }) => (
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
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    target === value ? 'bg-primary/10' : 'bg-muted'
                  }`}>
                    <Icon className={`h-5 w-5 ${target === value ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Subject Selector + Scope */}
          {target === 'subject' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Subject</Label>
                {loadingSubjects ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading subjects...
                  </div>
                ) : (
                  <Select value={subjectId} onValueChange={(v) => { setSubjectId(v); setSubjectScope('subscribers'); setPackageId(''); setSeriesId('') }}>
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

              {/* Target Scope within Subject */}
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

              {/* Package Selector */}
              {subjectId && (subjectScope === 'package' || subjectScope === 'series') && (
                <div className="space-y-2">
                  <Label>Package</Label>
                  {loadingPackages ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading packages...
                    </div>
                  ) : packages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No packages found for this subject</p>
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

              {/* Series Selector */}
              {subjectId && subjectScope === 'series' && packageId && (
                <div className="space-y-2">
                  <Label>Series</Label>
                  {loadingSeries ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading series...
                    </div>
                  ) : series.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No series found for this package</p>
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

          {/* Session Selector */}
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

            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Image <span className="text-muted-foreground font-normal">(optional)</span></Label>
              {imagePreview ? (
                <div className="relative inline-block">
                  <img
                    src={imagePreview}
                    alt="Notification preview"
                    className="h-32 w-auto rounded-lg border object-cover"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                  {uploadingImage && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50">
                      <Loader2 className="h-6 w-6 animate-spin text-white" />
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-32 w-48 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                >
                  <ImagePlus className="h-8 w-8" />
                  <span className="text-xs">Click to upload</span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/jpg"
                onChange={handleImageSelect}
                className="hidden"
              />
              <p className="text-xs text-muted-foreground">
                Shown as a rich image in the push notification. Max 5MB, JPEG or PNG.
              </p>
            </div>

            {/* Click Action (internal screen redirection) */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <MousePointerClick className="h-3.5 w-3.5" />
                  Click Action <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Select
                  value={clickAction}
                  onValueChange={(v) => { setClickAction(v as ClickAction); setSelectedNavPackageId(''); setSelectedBookId(''); setSelectedSessionId(''); setExternalUrl('') }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Action</SelectItem>
                    <SelectItem value="external_url">External URL</SelectItem>
                    <SelectItem value="theory_package">Open Theory Package</SelectItem>
                    <SelectItem value="practical_package">Open Practical Package</SelectItem>
                    <SelectItem value="ebook">Open Ebook Store</SelectItem>
                    <SelectItem value="live_session">Open Live Session</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {clickAction === 'none' && 'No navigation when the notification is tapped.'}
                  {clickAction === 'external_url' && 'Opens an external URL in the browser.'}
                  {clickAction === 'theory_package' && 'Navigates to the selected theory package screen in the app.'}
                  {clickAction === 'practical_package' && 'Navigates to the selected practical package screen in the app.'}
                  {clickAction === 'ebook' && 'Opens the ebook store in the app.'}
                  {clickAction === 'live_session' && 'Opens the selected live session details in the app.'}
                </p>
              </div>

              {/* External URL input */}
              {clickAction === 'external_url' && (
                <div className="space-y-2">
                  <Label htmlFor="notif-external-url">External URL <span className="text-red-500">*</span></Label>
                  <Input
                    id="notif-external-url"
                    type="url"
                    placeholder="https://..."
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                  />
                </div>
              )}

              {/* Package selector */}
              {(clickAction === 'theory_package' || clickAction === 'practical_package') && (
                <div className="space-y-2">
                  <Label>
                    Select {clickAction === 'theory_package' ? 'Theory' : 'Practical'} Package <span className="text-red-500">*</span>
                  </Label>
                  {navPackagesLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading packages...
                    </div>
                  ) : (
                    <Select value={selectedNavPackageId} onValueChange={setSelectedNavPackageId}>
                      <SelectTrigger>
                        <SelectValue placeholder={`Select a ${clickAction === 'theory_package' ? 'theory' : 'practical'} package`} />
                      </SelectTrigger>
                      <SelectContent>
                        {(clickAction === 'theory_package' ? theoryNavPackages : practicalNavPackages).length === 0 ? (
                          <div className="px-3 py-2 text-sm text-muted-foreground">
                            No {clickAction === 'theory_package' ? 'theory' : 'practical'} packages found
                          </div>
                        ) : (
                          (clickAction === 'theory_package' ? theoryNavPackages : practicalNavPackages).map((pkg) => (
                            <SelectItem key={pkg._id} value={pkg._id}>
                              {pkg.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {/* Book selector */}
              {clickAction === 'ebook' && (
                <div className="space-y-2">
                  <Label>Select Book <span className="text-red-500">*</span></Label>
                  {navBooksLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading books...
                    </div>
                  ) : (
                    <Select value={selectedBookId} onValueChange={setSelectedBookId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a book" />
                      </SelectTrigger>
                      <SelectContent>
                        {navBooks.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-muted-foreground">No ebooks found</div>
                        ) : (
                          navBooks.map((book) => (
                            <SelectItem key={book._id} value={book._id}>
                              {book.title}{book.author ? ` — ${book.author}` : ''}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {/* Live session selector */}
              {clickAction === 'live_session' && (
                <div className="space-y-2">
                  <Label>Select Live Session <span className="text-red-500">*</span></Label>
                  {navSessionsLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading sessions...
                    </div>
                  ) : (
                    <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a live session" />
                      </SelectTrigger>
                      <SelectContent>
                        {navSessions.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-muted-foreground">No scheduled sessions found</div>
                        ) : (
                          navSessions.map((session) => (
                            <SelectItem key={session._id} value={session._id}>
                              {session.title}
                              {session.scheduled_start_time ? ` — ${new Date(session.scheduled_start_time).toLocaleDateString()}` : ''}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Send Button */}
          <div className="flex items-center justify-between border-t pt-6">
            <p className="text-sm text-muted-foreground">
              {target === 'all' && 'This will be sent to all active users'}
              {target === 'subject' && !subjectId && 'Select a subject first'}
              {target === 'subject' && subjectId && subjectScope === 'subscribers' && 'Sending to all subscribers of the selected subject'}
              {target === 'subject' && subjectId && subjectScope === 'package' && !packageId && 'Select a package'}
              {target === 'subject' && subjectId && subjectScope === 'package' && packageId && 'Sending to active purchasers of the selected package'}
              {target === 'subject' && subjectId && subjectScope === 'series' && !seriesId && 'Select a package and series'}
              {target === 'subject' && subjectId && subjectScope === 'series' && seriesId && 'Sending to users with access to the selected series'}
              {target === 'session' && !sessionId && 'Select a live session first'}
              {target === 'session' && sessionId && 'Sending to all confirmed enrollees of the selected session'}
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
                  {uploadingImage ? 'Uploading image...' : 'Sending...'}
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
