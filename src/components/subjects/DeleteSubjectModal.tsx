import { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Subject, DeleteImpact } from '@/services/subjects.service';

interface DeleteSubjectModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  subject: Subject | null;
  deleteImpact?: DeleteImpact | null;
  isLoadingImpact?: boolean;
}

export function DeleteSubjectModal({
  open,
  onClose,
  onConfirm,
  subject,
  deleteImpact,
  isLoadingImpact = false,
}: DeleteSubjectModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Reset confirmation text when modal opens/closes
  useEffect(() => {
    if (open) {
      setConfirmText('');
    }
  }, [open]);

  const hasPackages = (deleteImpact?.packages_count ?? 0) > 0;
  const needsConfirmation = hasPackages;

  const handleConfirm = async () => {
    try {
      setIsDeleting(true);
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const canConfirm = needsConfirmation
    ? confirmText === subject?.name
    : true;

  if (!subject) return null;

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Delete Subject
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{subject.name}</strong>?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {/* Loading Impact */}
          {isLoadingImpact && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Impact Warning */}
          {!isLoadingImpact && hasPackages && deleteImpact && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Warning:</strong> This subject has associated content that will also be affected:
                <ul className="mt-2 ml-4 list-disc space-y-1">
                  {deleteImpact.packages_count > 0 && (
                    <li>{deleteImpact.packages_count} package(s)</li>
                  )}
                  {deleteImpact.series_count > 0 && (
                    <li>{deleteImpact.series_count} series</li>
                  )}
                  {deleteImpact.modules_count > 0 && (
                    <li>{deleteImpact.modules_count} module(s)</li>
                  )}
                  {deleteImpact.videos_count > 0 && (
                    <li>{deleteImpact.videos_count} video(s)</li>
                  )}
                </ul>
                <p className="mt-2 text-sm">
                  This action cannot be undone.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* No Impact Message */}
          {!isLoadingImpact && !hasPackages && (
            <Alert>
              <AlertDescription>
                This subject has no associated packages and can be safely deleted.
              </AlertDescription>
            </Alert>
          )}

          {/* Confirmation Input */}
          {needsConfirmation && !isLoadingImpact && (
            <div className="space-y-2">
              <Label htmlFor="confirm-delete">
                Type <strong>{subject.name}</strong> to confirm
              </Label>
              <Input
                id="confirm-delete"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={`Type "${subject.name}" to confirm`}
                disabled={isDeleting}
              />
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              if (canConfirm) {
                handleConfirm();
              }
            }}
            disabled={!canConfirm || isDeleting || isLoadingImpact}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Subject'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
