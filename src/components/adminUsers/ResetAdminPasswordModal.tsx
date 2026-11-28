import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Section } from '@/components/common/detail'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Field, Notice } from '@/components/users/kit'
import { errText, focusFirstError } from '@/components/users/lib'
import type { AdminUser } from '@/services/adminUsers.service'
import { passwordRule } from './AdminUserFormModal'

const schema = z.object({ new_password: passwordRule, confirm_password: z.string().min(1, 'Type the password again') })
  .refine((d) => d.new_password === d.confirm_password, { message: 'Passwords do not match', path: ['confirm_password'] })
type Values = z.infer<typeof schema>

interface ResetAdminPasswordModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (newPassword: string) => Promise<void>
  adminUser: AdminUser | null
}

export function ResetAdminPasswordModal({ open, onClose, onConfirm, adminUser }: ResetAdminPasswordModalProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [error, setError] = useState<string | null>(null)
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { new_password: '', confirm_password: '' }, shouldFocusError: false })

  useEffect(() => { if (open) { reset({ new_password: '', confirm_password: '' }); setError(null) } }, [open, reset])

  const onSubmit = async (data: Values) => {
    setError(null)
    try {
      await onConfirm(data.new_password)
      reset({ new_password: '', confirm_password: '' })
      onClose()
    } catch (err) {
      setError(errText(err, 'Failed to reset password'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !isSubmitting) onClose() }}>
      <DialogContent backLabel="Admin Users">
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
          <DialogDescription>Set a new password for <span className="font-medium text-foreground">{adminUser?.name}</span> ({adminUser?.email})</DialogDescription>
        </DialogHeader>
        <form ref={formRef} noValidate onSubmit={handleSubmit(onSubmit, () => focusFirstError(formRef.current))} className="space-y-6">
          <Notice tone="warning">The old password stops working at once. Give the new one to the admin yourself; it is not emailed.</Notice>
          <Section title="New password">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="new_password" label="New Password" required error={errors.new_password?.message} hint="At least 8 characters with uppercase, lowercase, and a number">
                <Input type="password" placeholder="Enter new password" autoComplete="new-password" disabled={isSubmitting} {...register('new_password')} />
              </Field>
              <Field id="confirm_password" label="Confirm Password" required error={errors.confirm_password?.message}>
                <Input type="password" placeholder="Confirm new password" autoComplete="new-password" disabled={isSubmitting} {...register('confirm_password')} />
              </Field>
            </div>
          </Section>
          <DialogFooter className="sm:items-center">
            {error && <p role="alert" className="min-w-0 flex-1 text-[13px] text-danger">{error}</p>}
            <Button type="button" variant="outline" className="bg-card" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 aria-hidden="true" className="animate-spin" />}
              {isSubmitting ? 'Resetting…' : 'Reset Password'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
