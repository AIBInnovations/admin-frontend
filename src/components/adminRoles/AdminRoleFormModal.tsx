import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Section } from '@/components/common/detail'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Field, Notice, ToggleRow } from '@/components/users/kit'
import { errText, focusFirstError, plural, unwrap } from '@/components/users/lib'
import { adminRolesService, type AdminRole } from '@/services/adminRoles.service'
import {
  ACTION_LABEL, ALL_PERMISSIONS, PERMISSION_AREAS, describeRole, grantedCount, isGranted, permissionList, setPermissions, unknownPermissions, type PermissionArea,
} from './permissions'

const schema = z.object({ name: z.string().trim().min(2, 'Name must be at least 2 characters').max(50, 'Keep the name under 50 characters') })
type Values = z.infer<typeof schema>

/** Without these an admin could not undo a change to their own role. */
const OWN_ROLE_MINIMUM = ['admin_roles.read', 'admin_roles.update']

interface AdminRoleFormModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  role?: AdminRole | null
  mode: 'create' | 'edit'
  /** The role of the admin who is signed in. */
  isOwnRole?: boolean
}

export function AdminRoleFormModal({ open, onClose, onSaved, role, mode, isOwnRole }: AdminRoleFormModalProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [conflict, setConflict] = useState(false)
  // What was ticked before "Full access" was turned on, to go back to
  const beforeFull = useRef<string[]>([])

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: '' }, shouldFocusError: false })

  useEffect(() => {
    if (!open) return
    const saved = mode === 'edit' && role ? permissionList(role.permissions) : []
    reset({ name: mode === 'edit' && role ? role.name : '' })
    setSelected(saved)
    beforeFull.current = saved.filter((p) => p !== '*')
    setQuery('')
    setPermissionError(null)
    setSubmitError(null)
    setConflict(false)
  }, [open, mode, role, reset])

  const full = selected.includes('*')
  const other = unknownPermissions(selected)
  const summary = useMemo(() => describeRole(selected), [selected])
  const count = grantedCount(selected)
  const busy = isSubmitting

  const change = (permissions: string[], on: boolean) => { setPermissionError(null); setSelected((prev) => setPermissions(prev, permissions, on)) }
  const toggleFull = (on: boolean) => {
    setPermissionError(null)
    if (on) { beforeFull.current = selected.filter((p) => p !== '*'); setSelected(['*', ...other]) } else setSelected(beforeFull.current)
  }

  const areas = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return PERMISSION_AREAS
    return PERMISSION_AREAS.map((a): PermissionArea => ({
      ...a,
      resources: a.group.toLowerCase().includes(q) ? a.resources : a.resources.filter((r) => r.label.toLowerCase().includes(q) || r.actions.some((x) => `${r.key}.${x}`.includes(q) || (ACTION_LABEL[x] ?? x).toLowerCase() === q)),
    })).filter((a) => a.resources.length > 0)
  }, [query])

  const save = async (data: Values, force = false) => {
    setSubmitError(null)
    if (selected.length === 0) {
      setPermissionError('At least one permission is required')
      document.getElementById('role-permissions')?.scrollIntoView({ block: 'start', behavior: 'smooth' })
      return
    }
    if (isOwnRole && OWN_ROLE_MINIMUM.some((p) => !isGranted(selected, p))) {
      setPermissionError('This is your own role. You cannot take away your own right to view and edit admin roles. Ask another admin to do it.')
      document.getElementById('role-permissions')?.scrollIntoView({ block: 'start', behavior: 'smooth' })
      return
    }
    try {
      if (mode === 'edit' && role) {
        if (!force) {
          const latest = unwrap(await adminRolesService.getById(role._id), 'The role could not be checked before saving.')
          if (latest.updatedAt && role.updatedAt && latest.updatedAt !== role.updatedAt) { setConflict(true); return }
        }
        unwrap(await adminRolesService.update(role._id, { name: data.name, permissions: selected }), 'Failed to update role')
        toast.success('Role updated successfully')
      } else {
        unwrap(await adminRolesService.create({ name: data.name, permissions: selected }), 'Failed to create role')
        toast.success('Role created successfully')
      }
      onSaved()
      onClose()
    } catch (err) {
      setSubmitError(errText(err, mode === 'create' ? 'Failed to create role' : 'Failed to update role'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !busy) onClose() }}>
      <DialogContent size="wide" backLabel="Admin Roles">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create Role' : 'Edit Role'}</DialogTitle>
          <DialogDescription>{mode === 'create' ? 'Define a new admin role with permissions.' : 'Update role permissions below.'}</DialogDescription>
        </DialogHeader>

        <form ref={formRef} noValidate onSubmit={handleSubmit((d) => save(d), () => focusFirstError(formRef.current))} className="space-y-6">
          {isOwnRole && <Notice tone="warning" title="This is your own role">Changes apply to you too, from your next action. You cannot remove your own right to edit roles.</Notice>}
          {conflict && (
            <Notice tone="warning" title="Someone else changed this role after you opened it">
              <p>Close this page to see their change, or save yours over it.</p>
              <Button type="button" size="sm" className="mt-2.5" disabled={busy} onClick={handleSubmit((d) => save(d, true))}>Save mine anyway</Button>
            </Notice>
          )}

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="min-w-0 space-y-6">
              <Section title="Role">
                <Field id="role-name" label="Role Name" required error={errors.name?.message}>
                  <Input placeholder="e.g., Content Manager" autoComplete="off" maxLength={50} disabled={busy} {...register('name')} />
                </Field>
              </Section>

              <Section id="role-permissions" title={<>Permissions<span className="ml-0.5 text-danger" aria-hidden="true">*</span></>} description={`${plural(count, 'permission')} selected of ${ALL_PERMISSIONS.length}`} className="scroll-mt-4">
                <div className="space-y-5">
                  {permissionError && <p role="alert" className="text-sm text-danger">{permissionError}</p>}
                  <div className="rounded-lg border border-border">
                    <ToggleRow id="role-full" label="Full access" description="Everything in the panel, including anything added later. For owners only." checked={full} onChange={toggleFull} disabled={busy} />
                  </div>

                  <div className="relative">
                    <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input aria-label="Search permissions" placeholder="Search permissions" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault() }} />
                  </div>

                  {areas.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No permission matches "{query.trim()}". <button type="button" onClick={() => setQuery('')} className="font-medium text-primary underline underline-offset-2">Clear search</button></p>}
                  {areas.map((area) => {
                    const keys = area.resources.flatMap((r) => r.actions.map((x) => `${r.key}.${x}`))
                    const on = keys.filter((k) => isGranted(selected, k)).length
                    const id = `area-${area.group}`
                    return (
                      <fieldset key={area.group} disabled={busy || full} className="overflow-hidden rounded-lg border border-border">
                        <legend className="sr-only">{area.group}</legend>
                        <div className="flex items-center gap-2.5 border-b border-border bg-muted/40 px-4 py-2.5">
                          <Checkbox id={id} checked={on === keys.length ? true : on > 0 ? 'indeterminate' : false} onCheckedChange={() => change(keys, on !== keys.length)} disabled={busy || full} aria-label={`Select all ${area.group}`} />
                          <label htmlFor={id} className="text-sm font-semibold">{area.group}</label>
                          <span className="ml-auto text-xs tabular-nums text-muted-foreground">{on} of {keys.length}</span>
                        </div>
                        <ul className="divide-y divide-border">
                          {area.resources.map((r) => {
                            const rowKeys = r.actions.map((x) => `${r.key}.${x}`)
                            const missesRead = r.actions.includes('read') && !isGranted(selected, `${r.key}.read`) && rowKeys.some((k) => isGranted(selected, k))
                            return (
                              <li key={r.key} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                  <p className="text-sm">{r.label}</p>
                                  {missesRead && <p className="text-xs text-warning">Without View, these pages stay hidden.</p>}
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {r.actions.map((x) => {
                                    const key = `${r.key}.${x}`
                                    const checked = isGranted(selected, key)
                                    return (
                                      <label key={key} title={key} className={cn('inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-[13px] transition-colors has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60', checked ? 'border-primary/40 bg-accent text-accent-foreground' : 'border-border text-muted-foreground hover:border-primary/40')}>
                                        <Checkbox checked={checked} onCheckedChange={(c) => change([key], c === true)} disabled={busy || full} aria-label={`${ACTION_LABEL[x] ?? x} ${r.label}`} />
                                        <span aria-hidden="true">{ACTION_LABEL[x] ?? x}</span>
                                      </label>
                                    )
                                  })}
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      </fieldset>
                    )
                  })}

                  {other.length > 0 && (
                    <fieldset disabled={busy} className="overflow-hidden rounded-lg border border-border">
                      <legend className="sr-only">Other permissions</legend>
                      <div className="border-b border-border bg-muted/40 px-4 py-2.5"><p className="text-sm font-semibold">Other</p><p className="text-xs text-muted-foreground">Saved on this role, but no page uses them. Kept unless you untick them.</p></div>
                      <ul className="flex flex-wrap gap-1.5 p-4">
                        {other.map((p) => (
                          <li key={p}>
                            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-2.5 py-1 font-mono text-xs">
                              <Checkbox checked onCheckedChange={() => setSelected((prev) => prev.filter((x) => x !== p))} aria-label={p} /><span className="break-all">{p}</span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    </fieldset>
                  )}
                </div>
              </Section>
            </div>

            <aside aria-label="What this role can do" className="lg:sticky lg:top-4 lg:self-start">
              <Section title="What this role can do">
                {full ? <p className="text-sm">Everything in the panel.</p> : summary.length === 0 ? <p className="text-sm text-muted-foreground">Nothing yet. Tick at least one permission.</p> : (
                  <dl className="max-h-[60dvh] space-y-3 overflow-y-auto overscroll-contain">
                    {summary.map((a) => (
                      <div key={a.group}>
                        <dt className="text-[13px] font-semibold">{a.group}</dt>
                        <dd className="mt-0.5 space-y-0.5 text-[13px] text-muted-foreground">
                          {a.lines.map((l) => <p key={l.label}><span className="text-foreground">{l.label}:</span> {l.all ? 'everything' : l.actions.map((x) => (ACTION_LABEL[x] ?? x).toLowerCase()).join(', ')}</p>)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
                {!full && (isGranted(selected, 'admin_roles.update') || isGranted(selected, 'admin_users.update') || isGranted(selected, 'admin_users.create')) && (
                  <p className="mt-3 border-t border-border pt-3 text-xs text-warning">This role can change admins or roles, so it can give itself more access.</p>
                )}
              </Section>
            </aside>
          </div>

          <DialogFooter className="sm:items-center">
            {submitError && <p role="alert" className="min-w-0 flex-1 text-[13px] text-danger">{submitError}</p>}
            <Button type="button" variant="outline" className="bg-card" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 aria-hidden="true" className="animate-spin" />}
              {busy ? (mode === 'create' ? 'Creating…' : 'Updating…') : mode === 'create' ? 'Create Role' : 'Update Role'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
