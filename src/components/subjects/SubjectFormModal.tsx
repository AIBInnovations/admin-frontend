import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { Subject, SubjectFormData } from '@/services/subjects.service';

// Validation schema
const subjectSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be at most 100 characters'),
  description: z.string().max(500, 'Description must be at most 500 characters').optional().or(z.literal('')),
  display_order: z.number().int().positive().optional().or(z.nan()),
  is_active: z.boolean(),
});

type SubjectFormValues = z.infer<typeof subjectSchema>;

interface SubjectFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: SubjectFormData) => Promise<void>;
  subject?: Subject | null;
  mode: 'create' | 'edit';
}

export function SubjectFormModal({ open, onClose, onSubmit, subject, mode }: SubjectFormModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      name: '',
      description: '',
      display_order: undefined,
      is_active: true,
    },
  });

  const isActive = watch('is_active');

  // Reset form when modal opens/closes or subject changes
  useEffect(() => {
    if (open) {
      if (mode === 'edit' && subject) {
        reset({
          name: subject.name,
          description: subject.description || '',
          display_order: subject.display_order,
          is_active: subject.is_active,
        });
      } else {
        reset({
          name: '',
          description: '',
          display_order: undefined,
          is_active: true,
        });
      }
    }
  }, [open, mode, subject, reset]);

  const handleFormSubmit = async (data: SubjectFormValues) => {
    try {
      const formData: SubjectFormData = {
        name: data.name,
        description: data.description || undefined,
        display_order: data.display_order || undefined,
        is_active: data.is_active,
      };

      await onSubmit(formData);
      onClose();
    } catch (error) {
      // Error is handled by parent component
      console.error('Form submission error:', error);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create Subject' : 'Edit Subject'}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Add a new subject to organize your content.'
              : 'Update the subject details below.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g., Cardiology, Anatomy"
              disabled={isSubmitting}
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          {/* Description Field */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Brief description of the subject..."
              rows={4}
              disabled={isSubmitting}
              {...register('description')}
            />
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description.message}</p>
            )}
          </div>

          {/* Display Order Field */}
          <div className="space-y-2">
            <Label htmlFor="display_order">Display Order</Label>
            <Input
              id="display_order"
              type="number"
              placeholder="Auto-assigned if left empty"
              min={1}
              disabled={isSubmitting}
              {...register('display_order', { valueAsNumber: true })}
            />
            {errors.display_order && (
              <p className="text-sm text-red-500">{errors.display_order.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Leave empty to auto-assign the next available order
            </p>
          </div>

          {/* Active Status Field */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="is_active" className="text-base">Active Status</Label>
              <p className="text-sm text-muted-foreground">
                {isActive
                  ? 'Subject is visible to users'
                  : 'Subject is hidden from users'}
              </p>
            </div>
            <Switch
              id="is_active"
              checked={isActive}
              onCheckedChange={(checked) => setValue('is_active', checked)}
              disabled={isSubmitting}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {mode === 'create' ? 'Creating...' : 'Updating...'}
                </>
              ) : (
                <>{mode === 'create' ? 'Create Subject' : 'Update Subject'}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
