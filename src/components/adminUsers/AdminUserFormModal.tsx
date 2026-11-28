import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { describeRole, permissionList } from '@/components/adminRoles/permissions'
import { Section } from '@/components/common/detail'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Field, Notice, SearchSelect } from '@/components/users/kit'
import { errText, focusFirstError, unwrap, useResource } from '@/components/users/lib'
import { adminRolesService, type AdminRole } from '@/services/adminRoles.service'
import { adminUsersService, type AdminUser, type AdminUserFormData } from '@/services/adminUsers.service'

/** The API's password rule. */
export const passwordRule = z.string().min(8, 'Minimum 8 characters').regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Must contain uppercase, lowercase, and a number')

const makeSchema = (mode: 'create' | 'edit') => z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Keep the name under 100 characters'),
  email: z.string().trim().email('Invalid email'),
  phone: z.string().trim().refine((s) => s === '' || /^\d{10}$/.test(s), 'Must be 10 digits'),
  password: z.string().superRefine((s, ctx) => {
    if (s === '' && mode === 'edit') return
    const check = passwordRule.safeParse(s)
    if (!check.success) ctx.addIssue({ code: 'custom', message: s === '' ? 'Password is required' : check.error.issues[0].message })
  }),
  role_id: z.string().min(1, 'Role is required'),
})
type Values = z.infer<ReturnType<typeof makeSchema>>
const EMPTY: Values = { name: '', email: '', phone: '', password: '', role_id: '' }

interface AdminUserFormModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  adminUser?: AdminUser | null
  mode: 'create' | 'edit'
  /** The admin is editing their own account. */
  isSelf?: boolean
}

export function AdminUserFormModal({ open, onClose, onSaved, adminUser, mode, isSelf }: AdminUserFormModalProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const schema = useMemo(() => makeSchema(mode), [mode])
  const roles = useResource<AdminRole[]>(async () => (open ? unwrap(await adminRolesService.getAll({ limit: 50 })).entities : []), [open])
  const { register, handleSubmit, reset, setValue, setError, watch, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: EMPTY, shouldFocusError: false })
  const roleId = watch('role_id')
  const role = roles.data?.find((r) => r._id === roleId)
  const savedRoleName = adminUser?.role_id && typeof adminUser.role_id === 'object' ? adminUser.role_id.name : undefined

  useEffect(() => {
    if (!open) return
    setSubmitError(null)
    reset(mode === 'edit' && adminUser
      ? { name: adminUser.name, email: adminUser.email, phone: adminUser.phone || '', password: '', role_id: adminUser.role_id && typeof adminUser.role_id === 'object' ? adminUser.role_id._id : String(adminUser.role_id ?? '') }
      : EMPTY)
  }, [open, mode, adminUser, reset])

  const onSubmit = async (data: Values) => {
    setSubmitError(null)
    const payload: AdminUserFormData = { name: data.name, email: data.email, phone: data.phone || undefined, password: data.password || undefined, role_id: data.role_id }
    try {
      if (mode === 'create') {
        unwrap(await adminUsersService.create(payload), 'Failed to create admin user')
        toast.success('Admin user created successfully')
      } else {
        // Your own role is never part of your own edit
        const { role_id, ...rest } = payload
        unwrap(await adminUsersService.update(adminUser!._id, isSelf ? rest : { ...rest, role_id }), 'Failed to update admin user')
        toast.success('Admin user updated successfully')
      }
      onSaved()
      onClose()
    } catch (err) {
      const message = errText(err, mode === 'create' ? 'Failed to create admin user' : 'Failed to update admin user')
      if (/email/i.test(message)) { setError('email', { message }); focusFirstError(formRef.current) }
      setSubmitError(message)
    }
  }

  const summary = role ? describeRole(permissionList(role.permissions)) : []
  const full = role ? permissionList(role.permissions).includes('*') : false
  const busy = isSubmitting
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !busy) onClose() }}>
      <DialogContent backLabel="Admin Users">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Add Admin User' : 'Edit Admin User'}</DialogTitle>
          <DialogDescription>{mode === 'create' ? 'Create a new admin user account.' : 'Update admin user details below.'}</DialogDescription>
        </DialogHeader>
        <form ref={formRef} noValidate onSubmit={handleSubmit(onSubmit, () => focusFirstError(formRef.current))} className="space-y-6">
          {isSelf && <Notice tone="info" title="This is your account">You cannot change your own role. Ask another admin.</Notice>}
          <Section title="Account">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="au-name" label="Name" required error={errors.name?.message} className="sm:col-span-2"><Input placeholder="Full name" autoComplete="off" disabled={busy} {...register('name')} /></Field>
              <Field id="au-email" label="Email" required error={errors.email?.message} className="sm:col-span-2"><Input type="email" placeholder="admin@example.com" autoComplete="off" disabled={busy} {...register('email')} /></Field>
              <Field id="au-phone" label="Phone" error={errors.phone?.message} hint="Used for the sign-in code. Without it the admin signs in with the password only."><Input inputMode="numeric" placeholder="10-digit number" autoComplete="off" className="font-mono" disabled={busy} {...register('phone')} /></Field>
              <Field id="au-role" label="Role" required error={errors.role_id?.message}>
                <SearchSelect
                  value={roleId} onChange={(id) => setValue('role_id', id, { shouldDirty: true, shouldValidate: true })} disabled={busy || isSelf}
                  options={(roles.data || []).map((r) => ({ value: r._id, label: r.name }))} loading={roles.loading} error={roles.error} onRetry={() => roles.reload()}
                  placeholder="Select role" searchPlaceholder="Search roles..." emptyText="No roles found." missingLabel={savedRoleName ?? 'Deleted role'}
                />
              </Field>
            </div>
            {role && (
              <p className="mt-4 rounded-lg bg-muted/60 px-3.5 py-2.5 text-[13px] text-muted-foreground">
                <span className="font-medium text-foreground">{role.name}</span> {full ? 'can do everything in the panel.' : summary.length ? `can work in: ${summary.map((a) => a.group).join(', ')}.` : 'has no permissions yet.'}
              </p>
            )}
          </Section>
          <Section title="Password">
            <Field id="au-password" label="Password" required={mode === 'create'} error={errors.password?.message} hint={mode === 'edit' ? 'Leave empty to keep the current password' : 'At least 8 characters with uppercase, lowercase, and a number'}>
              <Input type="password" autoComplete="new-password" placeholder={mode === 'edit' ? 'Leave blank to keep current' : 'Minimum 8 characters'} disabled={busy} className="sm:max-w-[360px]" {...register('password')} />
            </Field>
          </Section>
          <DialogFooter className="sm:items-center">
            {submitError && <p role="alert" className="min-w-0 flex-1 text-[13px] text-danger">{submitError}</p>}
            <Button type="button" variant="outline" className="bg-card" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 aria-hidden="true" className="animate-spin" />}
              {busy ? (mode === 'create' ? 'Adding…' : 'Updating…') : mode === 'create' ? 'Add Admin' : 'Update Admin'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
