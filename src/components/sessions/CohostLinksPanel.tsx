import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  UserPlus, Users, Copy, Trash2, Link as LinkIcon, Loader2, ShieldAlert,
  CheckCircle2, Clock, Ban, Mail, ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  liveSessionsService,
  CohostLink,
  CohostLinkStatus,
  CohostLinkType,
} from '@/services/liveSessions.service'

interface Props {
  sessionId: string
  sessionStatus: string
  hasZoomMeeting: boolean
}

function statusVariant(status: CohostLinkStatus) {
  switch (status) {
    case 'active':
      return { variant: 'secondary' as const, label: 'Active', icon: Clock }
    case 'claimed':
      return { variant: 'default' as const, label: 'Claimed', icon: CheckCircle2 }
    case 'expired':
      return { variant: 'outline' as const, label: 'Expired', icon: Clock }
    case 'revoked':
      return { variant: 'destructive' as const, label: 'Revoked', icon: Ban }
  }
}

function typeVariant(type: CohostLinkType) {
  return type === 'licensed'
    ? { className: 'bg-blue-100 text-blue-800 hover:bg-blue-100', label: 'Licensed' }
    : { className: 'bg-purple-100 text-purple-800 hover:bg-purple-100', label: 'Guest' }
}

export function CohostLinksPanel({ sessionId, sessionStatus, hasZoomMeeting }: Props) {
  const [links, setLinks] = useState<CohostLink[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [createMode, setCreateMode] = useState<'licensed' | 'guest' | 'bulk'>('guest')

  // Single-create form state
  const [label, setLabel] = useState('')
  const [zoomEmail, setZoomEmail] = useState('')
  const [creating, setCreating] = useState(false)

  // Bulk-create form state
  const [bulkCount, setBulkCount] = useState('5')
  const [bulkPrefix, setBulkPrefix] = useState('Panelist')

  const [revokingToken, setRevokingToken] = useState<string | null>(null)

  const sessionDisabled = sessionStatus === 'cancelled' || sessionStatus === 'completed' || !hasZoomMeeting

  const fetchLinks = useCallback(async () => {
    try {
      setLoading(true)
      const res = await liveSessionsService.listCohostLinks(sessionId)
      if (res.success && res.data) {
        setLinks(res.data.links || [])
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load cohost links')
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    fetchLinks()
  }, [fetchLinks])

  function resetForm() {
    setLabel('')
    setZoomEmail('')
    setBulkCount('5')
    setBulkPrefix('Panelist')
  }

  async function handleCreate(type: 'licensed' | 'guest') {
    if (!label.trim()) {
      toast.error('Label is required')
      return
    }
    if (type === 'licensed' && !zoomEmail.trim()) {
      toast.error('Zoom email is required for licensed cohost links')
      return
    }

    try {
      setCreating(true)
      const res = await liveSessionsService.createCohostLink(sessionId, {
        type,
        label: label.trim(),
        ...(type === 'licensed' ? { zoom_email: zoomEmail.trim() } : {}),
      })
      if (res.success && res.data) {
        toast.success('Cohost link created')
        await fetchLinks()
        setCreateOpen(false)
        resetForm()
        // Auto-copy the URL for immediate sharing
        await copyToClipboard(res.data.link.share_url, 'Link copied to clipboard')
      } else {
        toast.error(res.message || 'Failed to create cohost link')
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || 'Failed to create cohost link')
    } finally {
      setCreating(false)
    }
  }

  async function handleBulkCreate() {
    const n = parseInt(bulkCount, 10)
    if (!Number.isFinite(n) || n < 1 || n > 50) {
      toast.error('Count must be between 1 and 50')
      return
    }
    if (!bulkPrefix.trim()) {
      toast.error('Label prefix is required')
      return
    }

    try {
      setCreating(true)
      const res = await liveSessionsService.createCohostLinksBulk(sessionId, {
        count: n,
        label_prefix: bulkPrefix.trim(),
      })
      if (res.success && res.data) {
        toast.success(`${res.data.links.length} cohost links created`)
        await fetchLinks()
        setCreateOpen(false)
        resetForm()
      } else {
        toast.error(res.message || 'Failed to create cohost links')
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || 'Failed to create cohost links')
    } finally {
      setCreating(false)
    }
  }

  async function handleRevoke(token: string) {
    try {
      setRevokingToken(token)
      const res = await liveSessionsService.revokeCohostLink(sessionId, token)
      if (res.success) {
        toast.success('Cohost link revoked')
        await fetchLinks()
      } else {
        toast.error(res.message || 'Failed to revoke link')
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || 'Failed to revoke link')
    } finally {
      setRevokingToken(null)
    }
  }

  async function copyToClipboard(text: string, successMsg = 'Copied') {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(successMsg)
    } catch {
      toast.error('Failed to copy. Select and copy manually.')
    }
  }

  const activeCount = links.filter((l) => l.status === 'active' || l.status === 'claimed').length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Cohost Links
            </CardTitle>
            <CardDescription>
              Generate shareable links for teachers or external guests to join as cohost.
              Independent of faculty assignment.
            </CardDescription>
          </div>

          <Dialog
            open={createOpen}
            onOpenChange={(open) => {
              setCreateOpen(open)
              if (!open) resetForm()
            }}
          >
            <DialogTrigger asChild>
              <Button disabled={sessionDisabled}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add cohost link
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create cohost link</DialogTitle>
                <DialogDescription>
                  Choose link type. Licensed = auto-cohost on join (needs PGME-org Zoom email).
                  Guest = registrant link, host must promote them in-meeting.
                </DialogDescription>
              </DialogHeader>

              <Tabs
                value={createMode}
                onValueChange={(v) => setCreateMode(v as typeof createMode)}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="guest">Guest</TabsTrigger>
                  <TabsTrigger value="licensed">Licensed</TabsTrigger>
                  <TabsTrigger value="bulk">Bulk guest</TabsTrigger>
                </TabsList>

                <TabsContent value="guest" className="space-y-4 pt-4">
                  <div className="rounded-md bg-purple-50 p-3 text-sm text-purple-900">
                    External guest. No Zoom account needed. Joins as participant — host
                    clicks <strong>Make Co-host</strong> once in-meeting. Participant name
                    shows as <code>[COHOST] {label || '<label>'}</code> so they stand out.
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="guest-label">Label *</Label>
                    <Input
                      id="guest-label"
                      placeholder="Dr. Sharma"
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      maxLength={80}
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
                      Cancel
                    </Button>
                    <Button onClick={() => handleCreate('guest')} disabled={creating}>
                      {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Create guest link
                    </Button>
                  </DialogFooter>
                </TabsContent>

                <TabsContent value="licensed" className="space-y-4 pt-4">
                  <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-900">
                    <strong>Licensed seat required.</strong> Email must belong to a paid Zoom
                    user on PGME's Zoom org. Auto-cohost on join (no manual step). If Zoom
                    rejects the email, fall back to a guest link.
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="licensed-label">Label *</Label>
                    <Input
                      id="licensed-label"
                      placeholder="Dr. Sharma"
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      maxLength={80}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="licensed-email">Zoom email *</Label>
                    <Input
                      id="licensed-email"
                      type="email"
                      placeholder="cohost@pgme.in"
                      value={zoomEmail}
                      onChange={(e) => setZoomEmail(e.target.value)}
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
                      Cancel
                    </Button>
                    <Button onClick={() => handleCreate('licensed')} disabled={creating}>
                      {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Create licensed link
                    </Button>
                  </DialogFooter>
                </TabsContent>

                <TabsContent value="bulk" className="space-y-4 pt-4">
                  <div className="rounded-md bg-purple-50 p-3 text-sm text-purple-900">
                    Create multiple guest links at once. Labels auto-numbered:{' '}
                    <code>{bulkPrefix || 'Panelist'} 1</code>,{' '}
                    <code>{bulkPrefix || 'Panelist'} 2</code>, ...
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="bulk-count">Count *</Label>
                      <Input
                        id="bulk-count"
                        type="number"
                        min={1}
                        max={50}
                        value={bulkCount}
                        onChange={(e) => setBulkCount(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bulk-prefix">Label prefix *</Label>
                      <Input
                        id="bulk-prefix"
                        placeholder="Panelist"
                        value={bulkPrefix}
                        onChange={(e) => setBulkPrefix(e.target.value)}
                        maxLength={60}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
                      Cancel
                    </Button>
                    <Button onClick={handleBulkCreate} disabled={creating}>
                      {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Create {bulkCount || 'N'} guest links
                    </Button>
                  </DialogFooter>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>

        {sessionDisabled ? (
          <div className="mt-3 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <ShieldAlert className="h-4 w-4" />
            {!hasZoomMeeting
              ? 'Session has no Zoom meeting attached — cohost links unavailable.'
              : `Cannot manage cohost links for ${sessionStatus} sessions.`}
          </div>
        ) : null}
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : links.length === 0 ? (
          <div className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
            <LinkIcon className="mx-auto mb-2 h-8 w-8 opacity-40" />
            No cohost links yet. Click <strong>Add cohost link</strong> to create one.
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-center gap-3 text-sm text-muted-foreground">
              <span>{links.length} total</span>
              <span>•</span>
              <span>{activeCount} active</span>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Link</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {links.map((link) => {
                  const statusInfo = statusVariant(link.status)
                  const typeInfo = typeVariant(link.type)
                  const StatusIcon = statusInfo.icon
                  const canRevoke = link.status === 'active' || link.status === 'claimed'

                  return (
                    <TableRow key={link.token}>
                      <TableCell>
                        <div className="font-medium">{link.label}</div>
                        {link.zoom_email ? (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {link.zoom_email}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={typeInfo.className}>
                          {typeInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusInfo.variant} className="gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {statusInfo.label}
                        </Badge>
                        {link.claimed_at ? (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {new Date(link.claimed_at).toLocaleString()}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <code className="max-w-[220px] truncate rounded bg-muted px-2 py-1 text-xs">
                            {link.share_url}
                          </code>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => copyToClipboard(link.share_url)}
                                  disabled={link.status === 'revoked'}
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Copy link</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  asChild
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  disabled={link.status === 'revoked'}
                                >
                                  <a href={link.share_url} target="_blank" rel="noreferrer">
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </a>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Open in new tab</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {canRevoke ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                disabled={revokingToken === link.token}
                              >
                                {revokingToken === link.token ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Revoke this cohost link?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Anyone clicking this link after revocation will see a "link
                                  unavailable" page.{' '}
                                  {link.type === 'licensed'
                                    ? "The email will also be removed from the Zoom meeting's alternative_hosts list."
                                    : 'The Zoom registrant will be cancelled.'}{' '}
                                  This cannot be undone — you'll need to issue a new link.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRevoke(link.token)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Revoke
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </>
        )}
      </CardContent>
    </Card>
  )
}
