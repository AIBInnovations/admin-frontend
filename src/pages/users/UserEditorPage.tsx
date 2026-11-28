import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { DetailSkeleton, ErrorState, Section } from '@/components/common/detail'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EditorBar, Field, personName } from '@/components/users/kit'
import { errText, focusFirstError, unwrap, useEditorGuard, useResource } from '@/components/users/lib'
import { istToday } from '@/components/common/DateRangeFilter'
import { usersService, type CreateUserData, type UpdateUserData, type UserDetail } from '@/services/users.service'

const blank = z.literal('')
const makeSchema = (original: UserDetail | null) => z.object({
  phone_number: z.string().refine((s) => (original && s === (original.phone_number || '')) || /^\d{10}$/.test(s), 'Must be 10 digits'),
  name: z.string().trim().max(100, 'Keep the name under 100 characters').refine((s) => s === '' ? !original?.name : s.length >= 2, original?.name ? 'Enter at least 2 characters. A saved name cannot be removed.' : 'Min 2 characters'),
  email: z.string().trim().refine((s) => s === '' ? !original?.email : z.string().email().safeParse(s).success, original?.email ? 'Enter a valid email. A saved email cannot be removed.' : 'Invalid email'),
  gender: z.enum(['male', 'female', 'other']).or(blank),
  date_of_birth: z.string().refine((s) => s === '' ? !original?.date_of_birth : s <= istToday(), original?.date_of_birth ? 'Enter a past date. A saved date of birth cannot be removed.' : 'The date is in the future'),
  address: z.string().max(500, 'Keep the address under 500 characters'),
  ug_college: z.string().max(200, 'Keep it under 200 characters'),
  pg_college: z.string().max(200, 'Keep it under 200 characters'),
  affiliated_organisation: z.string().max(200, 'Keep it under 200 characters'),
  current_designation: z.string().max(200, 'Keep it under 200 characters'),
  skip_onboarding: z.boolean(),
})
type Values = z.infer<ReturnType<typeof makeSchema>>

const EMPTY: Values = {
  phone_number: '', name: '', email: '', gender: '', date_of_birth: '', address: '', ug_college: '', pg_college: '',
  affiliated_organisation: '', current_designation: '', skip_onboarding: false,
}

const fromUser = (u: UserDetail): Values => ({
  phone_number: u.phone_number || '', name: u.name || '', email: u.email || '', gender: u.gender || '',
  date_of_birth: u.date_of_birth ? u.date_of_birth.split('T')[0] : '', address: u.address || '', ug_college: u.ug_college || '', pg_college: u.pg_college || '',
  affiliated_organisation: u.affiliated_organisation || '', current_designation: u.current_designation || '', skip_onboarding: false,
})

/** The API accepts an empty value for these, which clears them. */
const CLEARABLE = new Set(['address', 'ug_college', 'pg_college', 'affiliated_organisation', 'current_designation'])

/** /users/new and /users/:userId/edit */
export function UserEditorPage() {
  const { userId } = useParams<{ userId: string }>()
  const mode = userId ? 'edit' : 'create'
  const { data: user, loading, error, status, reload } = useResource<UserDetail | null>(
    async () => (userId ? unwrap(await usersService.getById(userId), 'User not found') : null), [userId],
  )

  if (mode === 'edit' && !user) {
    if (loading) return <DetailSkeleton />
    const gone = status === 404 || status === 400
    return <ErrorState title={gone ? 'User not found' : 'This user could not be loaded'} message={gone ? 'The account may have been deleted, or the link is wrong.' : error ?? undefined} onRetry={gone ? undefined : () => reload()} back={{ label: 'Back to Users', href: '/users' }} />
  }
  return <UserForm key={userId ?? 'new'} user={user} mode={mode} />
}

function UserForm({ user, mode }: { user: UserDetail | null; mode: 'create' | 'edit' }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const schema = useMemo(() => makeSchema(user), [user])
  const { register, handleSubmit, control, setError, reset, formState: { errors, isSubmitting, isDirty, dirtyFields } } = useForm<Values>({
    resolver: zodResolver(schema), defaultValues: user ? fromUser(user) : EMPTY, shouldFocusError: false,
  })
  useEffect(() => { if (user) reset(fromUser(user)) }, [user, reset])
  const leave = useEditorGuard(isDirty && !isSubmitting)
  const backHref = user ? `/users/${user._id}` : '/users'

  const onSubmit = async (data: Values) => {
    setSubmitError(null)
    try {
      if (mode === 'create') {
        const { skip_onboarding, ...fields } = data
        const payload = { ...Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== '')), skip_onboarding } as unknown as CreateUserData
        const created = unwrap(await usersService.createUser(payload), 'Failed to create user')
        toast.success('User created successfully')
        leave(created.user_id ? `/users/${created.user_id}` : '/users', { replace: true })
        return
      }
      // Only what changed, so an edit made elsewhere at the same time is not overwritten
      const changed: Record<string, unknown> = {}
      for (const key of Object.keys(dirtyFields) as (keyof Values)[]) {
        if (key === 'skip_onboarding') continue
        if (data[key] === '' && !CLEARABLE.has(key)) continue
        changed[key] = data[key]
      }
      if (Object.keys(changed).length === 0) { leave(backHref); return }
      unwrap(await usersService.updateUser(user!._id, changed as UpdateUserData), 'Failed to update user')
      toast.success('User updated successfully')
      leave(backHref)
    } catch (err) {
      const message = errText(err, mode === 'create' ? 'Failed to create user' : 'Failed to update user')
      if (/phone/i.test(message)) { setError('phone_number', { message }); focusFirstError(formRef.current) }
      else if (/email/i.test(message)) { setError('email', { message }); focusFirstError(formRef.current) }
      setSubmitError(message)
    }
  }

  const title = mode === 'create' ? 'Add New User' : 'Edit User'
  return (
    <form ref={formRef} onSubmit={handleSubmit(onSubmit, () => focusFirstError(formRef.current))} noValidate className="relative mx-auto max-w-[880px]">
      <div className="space-y-6">
        <PageHeader
          title={title}
          description={mode === 'create' ? 'Create a new user account. Phone number is required for authentication.' : 'Update user profile information.'}
          breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Users', href: '/users' }, ...(user ? [{ label: personName(user), href: backHref }] : []), { label: title }]}
        />
        <Section title="Contact" description={mode === 'edit' ? 'The student signs in with this phone number.' : undefined}>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="phone_number" label="Phone Number" required error={errors.phone_number?.message} className="sm:col-span-2">
              <Input inputMode="numeric" autoComplete="off" placeholder="10-digit phone number" disabled={isSubmitting} className="font-mono sm:max-w-[320px]" {...register('phone_number')} />
            </Field>
            <Field id="name" label="Name" error={errors.name?.message}>
              <Input autoComplete="off" placeholder="Full name" disabled={isSubmitting} {...register('name')} />
            </Field>
            <Field id="email" label="Email" error={errors.email?.message}>
              <Input type="email" autoComplete="off" placeholder="user@example.com" disabled={isSubmitting} {...register('email')} />
            </Field>
          </div>
        </Section>

        <Section title="Personal">
          <div className="grid gap-5 sm:grid-cols-2">
            <Controller name="gender" control={control} render={({ field }) => (
              <Field id="gender" label="Gender" error={errors.gender?.message}>
                <GenderSelect value={field.value} onChange={field.onChange} disabled={isSubmitting} />
              </Field>
            )} />
            <Field id="date_of_birth" label="Date of Birth" error={errors.date_of_birth?.message}>
              <Input type="date" max={istToday()} disabled={isSubmitting} {...register('date_of_birth')} />
            </Field>
            <Field id="address" label="Address" error={errors.address?.message} className="sm:col-span-2">
              <Input autoComplete="off" placeholder="Full address" disabled={isSubmitting} {...register('address')} />
            </Field>
          </div>
        </Section>

        <Section title="Education and work">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="ug_college" label="UG College" error={errors.ug_college?.message}><Input placeholder="Undergraduate college" disabled={isSubmitting} {...register('ug_college')} /></Field>
            <Field id="pg_college" label="PG College" error={errors.pg_college?.message}><Input placeholder="Postgraduate college" disabled={isSubmitting} {...register('pg_college')} /></Field>
            <Field id="affiliated_organisation" label="Organisation" error={errors.affiliated_organisation?.message}><Input placeholder="Affiliated organisation" disabled={isSubmitting} {...register('affiliated_organisation')} /></Field>
            <Field id="current_designation" label="Designation" error={errors.current_designation?.message}><Input placeholder="Current designation" disabled={isSubmitting} {...register('current_designation')} /></Field>
          </div>
        </Section>

        {mode === 'create' && (
          <Section title="Onboarding">
            <div className="flex items-start gap-2.5">
              <Controller name="skip_onboarding" control={control} render={({ field }) => (
                <Checkbox id="skip_onboarding" checked={field.value} onCheckedChange={(c) => field.onChange(c === true)} disabled={isSubmitting} className="mt-0.5" />
              )} />
              <Label htmlFor="skip_onboarding" className="cursor-pointer text-sm font-normal">Mark onboarding as completed</Label>
            </div>
          </Section>
        )}
      </div>
      <EditorBar
        cancelHref={backHref} saving={isSubmitting} error={submitError}
        submitLabel={mode === 'create' ? 'Create User' : 'Update User'} savingLabel={mode === 'create' ? 'Creating…' : 'Updating…'}
      />
    </form>
  )
}

function GenderSelect({ value, onChange, disabled, ...aria }: { value: string; onChange: (v: string) => void; disabled?: boolean; id?: string }) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger {...aria}><SelectValue placeholder="Select gender" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="male">Male</SelectItem>
        <SelectItem value="female">Female</SelectItem>
        <SelectItem value="other">Other</SelectItem>
      </SelectContent>
    </Select>
  )
}
