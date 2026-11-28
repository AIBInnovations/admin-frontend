import { useCallback, useEffect, useRef, useState } from 'react'
import { ExternalLink, Link as LinkIcon, Loader2, Mail, RotateCw, Trash2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CopyButton, Section, StatusPill, apiErrorMessage, type Tone } from '@/components/common/detail'
import { liveSessionsService, CohostLink, CohostLinkStatus } from '@/services/liveSessions.service'
import { ConfirmDock, must } from '@/components/forms/editor/ConfirmDock'
import { Field, Note, TextInput, UnitInput } from '@/components/forms/editor/fields'
import { Tag } from '@/components/forms/editor/list'
import { focusFirstInvalid } from '@/components/forms/editor/EditorPage'
import { istDateTime } from '@/components/forms/editor/ist'

interface Props {
  sessionId: string
  sessionStatus: string
  hasZoomMeeting: boolean
  canUpdate: boolean
}

const STATUS: Record<CohostLinkStatus, { tone: Tone; label: string }> = {
  active: { tone: 'info', label: 'Active' },
  claimed: { tone: 'success', label: 'Claimed' },
  expired: { tone: 'neutral', label: 'Expired' },
  revoked: { tone: 'danger', label: 'Revoked' },
}

type Mode = 'guest' | 'licensed' | 'bulk'

export function CohostLinksPanel({ sessionId, sessionStatus, hasZoomMeeting, canUpdate }: Props) {
  const [links, setLinks] = useState<CohostLink[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [revoking, setRevoking] = useState<CohostLink | null>(null)
  const call = useRef(0)

  const closed = sessionStatus === 'cancelled' || sessionStatus === 'completed' || !hasZoomMeeting

  const load = useCallback(async () => {
    const n = ++call.current
    setLoading(true)
    setError(null)
    try {
      const res = await liveSessionsService.listCohostLinks(sessionId)
      if (n !== call.current) return
      if (!res.success) throw new Error(res.message || 'Failed to load cohost links')
      setLinks(res.data?.links || [])
    } catch (e) {
      if (n === call.current) setError(apiErrorMessage(e, 'Failed to load cohost links'))
    } finally {
      if (n === call.current) setLoading(false)
    }
  }, [sessionId])
  useEffect(() => { load(); return () => { call.current += 1 } }, [load])

  const activeCount = links.filter((l) => l.status === 'active' || l.status === 'claimed').length

  return (
    <Section
      title="Cohost Links"
      description="Generate shareable links for teachers or external guests to join as cohost. Independent of faculty assignment."
      action={canUpdate && !adding ? <Button size="sm" disabled={closed} onClick={() => setAdding(true)}><UserPlus aria-hidden="true" />Add cohost link</Button> : undefined}
      flush
    >
      {(closed || adding) && <div className="space-y-4 px-5 pb-5">
        {closed && (
          <Note tone="warning">
            {!hasZoomMeeting ? 'This session has no Zoom meeting attached, so cohost links are unavailable.' : `Cannot manage cohost links for ${sessionStatus} sessions.`}
          </Note>
        )}
        {adding && (
          <AddLinks
            sessionId={sessionId}
            onClose={() => setAdding(false)}
            onCreated={async (created) => {
              setAdding(false)
              await load()
              if (created.length !== 1) return
              try {
                await navigator.clipboard.writeText(created[0].share_url)
                toast.success('Link copied to clipboard')
              } catch { /* the copy button in the table still works */ }
            }}
          />
        )}
      </div>}

      {loading && links.length === 0 ? (
        <div className="space-y-2 px-5 pb-5"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
      ) : error && links.length === 0 ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 px-5 pb-5 text-sm text-danger">{error}<Button variant="outline" size="sm" onClick={load}><RotateCw />Try again</Button></div>
      ) : links.length === 0 ? (
        <div className="px-5 pb-8 text-center text-sm text-muted-foreground">
          <LinkIcon aria-hidden="true" className="mx-auto mb-2 h-7 w-7 opacity-50" />
          No cohost links yet.{!closed && canUpdate && ' Use Add cohost link to create one.'}
        </div>
      ) : (
        <>
          <p className="px-5 pb-3 text-[13px] tabular-nums text-muted-foreground" aria-live="polite">{links.length} total, {activeCount} active</p>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">Label</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Link</TableHead>
                <TableHead className="w-24 pr-5 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.map((link) => (
                <TableRow key={link.token} className="hover:bg-transparent">
                  <TableCell className="pl-5">
                    <p className="text-sm font-medium">{link.label}</p>
                    {link.zoom_email && <p className="flex items-center gap-1 text-xs text-muted-foreground"><Mail aria-hidden="true" className="h-3 w-3" />{link.zoom_email}</p>}
                  </TableCell>
                  <TableCell><Tag>{link.type === 'licensed' ? 'Licensed' : 'Guest'}</Tag></TableCell>
                  <TableCell>
                    <StatusPill tone={STATUS[link.status]?.tone ?? 'neutral'}>{STATUS[link.status]?.label ?? link.status}</StatusPill>
                    {link.claimed_at && <p className="mt-1 whitespace-nowrap text-xs text-muted-foreground">{istDateTime(link.claimed_at)}</p>}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <code className="block max-w-[220px] truncate rounded bg-muted px-2 py-1 text-xs">{link.share_url}</code>
                      {link.status !== 'revoked' && (
                        <>
                          <CopyButton value={link.share_url} label="link" />
                          <a href={link.share_url} target="_blank" rel="noreferrer" aria-label={`Open the link for ${link.label} in a new tab`} className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                            <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                          </a>
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    {canUpdate && (link.status === 'active' || link.status === 'claimed') && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-danger hover:bg-danger-soft hover:text-danger" aria-label={`Revoke the link for ${link.label}`} onClick={() => setRevoking(link)}><Trash2 /></Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}

      <ConfirmDock
        open={!!revoking}
        onClose={() => setRevoking(null)}
        title="Revoke this cohost link?"
        confirmLabel="Revoke"
        busyLabel="Revoking..."
        tone="danger"
        onConfirm={async () => {
          if (!revoking) return
          must(await liveSessionsService.revokeCohostLink(sessionId, revoking.token), 'Failed to revoke link')
          toast.success('Cohost link revoked')
          await load()
        }}
      >
        <p>
          Anyone opening the link for <span className="font-medium text-foreground">{revoking?.label}</span> will see a "link unavailable" page.{' '}
          {revoking?.type === 'licensed' ? "The email is also removed from the Zoom meeting's alternative hosts." : 'The Zoom registrant is cancelled.'}
        </p>
        <p>This cannot be undone. You would need to issue a new link.</p>
      </ConfirmDock>
    </Section>
  )
}

/** The form opens inside the section, not over the page. */
function AddLinks({ sessionId, onClose, onCreated }: { sessionId: string; onClose: () => void; onCreated: (links: CohostLink[]) => void }) {
  const [mode, setMode] = useState<Mode>('guest')
  const [label, setLabel] = useState('')
  const [email, setEmail] = useState('')
  const [count, setCount] = useState('5')
  const [prefix, setPrefix] = useState('Panelist')
  const [busy, setBusy] = useState(false)
  const [tried, setTried] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const root = useRef<HTMLFormElement>(null)

  const n = Number(count)
  const problems = {
    label: mode !== 'bulk' && !label.trim() ? 'Label is required' : undefined,
    email: mode === 'licensed' ? (!email.trim() ? 'Zoom email is required for licensed cohost links' : !/^\S+@\S+\.\S+$/.test(email.trim()) ? 'Enter a valid email' : undefined) : undefined,
    count: mode === 'bulk' && (!Number.isInteger(n) || n < 1 || n > 50) ? 'Count must be between 1 and 50' : undefined,
    prefix: mode === 'bulk' && !prefix.trim() ? 'Label prefix is required' : undefined,
  }
  const show = (k: keyof typeof problems) => (tried ? problems[k] : undefined)

  useEffect(() => { root.current?.querySelector<HTMLInputElement>('input')?.focus() }, [mode])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    setTried(true); setFailure(null)
    if (Object.values(problems).some(Boolean)) { focusFirstInvalid(root.current); return }
    setBusy(true)
    try {
      if (mode === 'bulk') {
        const res = must(await liveSessionsService.createCohostLinksBulk(sessionId, { count: n, label_prefix: prefix.trim() }), 'Failed to create cohost links')
        const made = res.data?.links ?? []
        toast.success(`${made.length} cohost link${made.length === 1 ? '' : 's'} created`)
        onCreated(made)
      } else {
        const res = must(await liveSessionsService.createCohostLink(sessionId, { type: mode, label: label.trim(), ...(mode === 'licensed' ? { zoom_email: email.trim() } : {}) }), 'Failed to create cohost link')
        toast.success('Cohost link created')
        onCreated(res.data ? [res.data.link] : [])
      }
    } catch (err) {
      setFailure(apiErrorMessage(err, 'Failed to create cohost link'))
      setBusy(false)
    }
  }

  return (
    <form ref={root} noValidate onSubmit={submit} className="space-y-4 rounded-md border border-border bg-background p-4" aria-label="Create cohost link">
      <div>
        <h3 className="text-sm font-semibold">Create cohost link</h3>
        <p className="mt-0.5 text-[13px] text-muted-foreground">Choose link type. Licensed joins as cohost automatically and needs a PGME-org Zoom email. Guest is a registrant link; the host promotes them in the meeting.</p>
      </div>
      <Tabs value={mode} onValueChange={(v) => { setMode(v as Mode); setTried(false); setFailure(null) }}>
        <TabsList>
          <TabsTrigger value="guest" type="button">Guest</TabsTrigger>
          <TabsTrigger value="licensed" type="button">Licensed</TabsTrigger>
          <TabsTrigger value="bulk" type="button">Bulk guest</TabsTrigger>
        </TabsList>
        <TabsContent value="guest" className="space-y-4 pt-3">
          <Note>External guest. No Zoom account needed. Joins as participant; the host clicks <strong>Make Co-host</strong> once in the meeting. The name shows as <code>[COHOST] {label || 'label'}</code> so they stand out.</Note>
          <Field id="guest-label" label="Label" required error={show('label')} className="max-w-[420px]">
            {(c) => <TextInput {...c} placeholder="Dr. Sharma" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={80} disabled={busy} />}
          </Field>
        </TabsContent>
        <TabsContent value="licensed" className="space-y-4 pt-3">
          <Note><strong>Licensed seat required.</strong> The email must belong to a paid Zoom user on PGME's Zoom org. They become cohost on join. If Zoom rejects the email, use a guest link instead.</Note>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="licensed-label" label="Label" required error={show('label')}>
              {(c) => <TextInput {...c} placeholder="Dr. Sharma" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={80} disabled={busy} />}
            </Field>
            <Field id="licensed-email" label="Zoom email" required error={show('email')}>
              {(c) => <TextInput {...c} type="email" placeholder="cohost@pgme.in" value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy} />}
            </Field>
          </div>
        </TabsContent>
        <TabsContent value="bulk" className="space-y-4 pt-3">
          <Note>Create multiple guest links at once. Labels are numbered: <code>{prefix || 'Panelist'} 1</code>, <code>{prefix || 'Panelist'} 2</code>, and so on.</Note>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="bulk-count" label="Count" required error={show('count')}>
              {(c) => <UnitInput {...c} suffix="links" min={1} max={50} step={1} inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} disabled={busy} />}
            </Field>
            <Field id="bulk-prefix" label="Label prefix" required error={show('prefix')}>
              {(c) => <TextInput {...c} placeholder="Panelist" value={prefix} onChange={(e) => setPrefix(e.target.value)} maxLength={60} disabled={busy} />}
            </Field>
          </div>
        </TabsContent>
      </Tabs>
      {failure && <Note tone="danger">{failure}</Note>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" className="bg-card" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button type="submit" disabled={busy}>
          {busy && <Loader2 aria-hidden="true" className="animate-spin" />}
          {mode === 'guest' ? 'Create guest link' : mode === 'licensed' ? 'Create licensed link' : `Create ${count || 'N'} guest link${count === '1' ? '' : 's'}`}
        </Button>
      </div>
    </form>
  )
}
