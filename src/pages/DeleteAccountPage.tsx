import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle } from 'lucide-react';
import { apiService } from '@/services/api.service';

const deleteAccountSchema = z.object({
  phone_number: z
    .string()
    .trim()
    .nonempty('Phone number is required')
    .regex(/^[0-9]{10}$/, 'Phone number must be exactly 10 digits'),
});

type DeleteAccountFormData = z.infer<typeof deleteAccountSchema>;

export function DeleteAccountPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DeleteAccountFormData>({
    resolver: zodResolver(deleteAccountSchema),
    defaultValues: {
      phone_number: '',
    },
  });

  const onSubmit = async (data: DeleteAccountFormData) => {
    try {
      setError(null);
      await apiService.post('account-deletion-requests', {
        phone_number: `91${data.phone_number}`,
      });
      setSuccess(true);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(errorMessage);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-2xl font-bold text-white">P</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">Delete Your Account</CardTitle>
          <CardDescription className="text-center">
            Request permanent deletion of your PGME account and all associated data
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <Alert className="border-green-200 bg-green-50 text-green-800">
              <AlertDescription>
                Your account deletion request has been submitted successfully. Your account and all
                associated data will be permanently deleted within 30 days.
              </AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="phone_number">Phone Number</Label>
                <div className="flex">
                  <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
                    +91
                  </span>
                  <Input
                    id="phone_number"
                    type="tel"
                    placeholder="Enter 10 digit phone number"
                    className="rounded-l-none"
                    maxLength={10}
                    disabled={isSubmitting}
                    {...register('phone_number')}
                  />
                </div>
                {errors.phone_number && (
                  <p className="text-sm text-red-500">{errors.phone_number.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" variant="destructive" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Deletion Request'
                )}
              </Button>
            </form>
          )}

          <div className="mt-6 flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
            <p className="text-sm text-amber-800">
              This action is irreversible. All your data including courses, progress, purchases, and
              personal information will be permanently deleted.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
