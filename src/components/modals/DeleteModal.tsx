import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, ShieldX, Loader2 } from 'lucide-react';
import { DeleteModalProps } from './types';

/**
 * DeleteModal - Reusable delete confirmation modal
 * Supports impact analysis, blocking state, and type-to-confirm for dangerous operations
 */
export function DeleteModal({
  open,
  onClose,
  onConfirm,
  title = 'Delete Item',
  itemName,
  warning,
  requireConfirmation = false,
  isLoadingImpact = false,
  blocked = false,
}: DeleteModalProps) {
  const [confirmationText, setConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const isConfirmed = !requireConfirmation || confirmationText === itemName;
  const canDelete = isConfirmed && !isDeleting && !isLoadingImpact && !blocked;

  const handleConfirm = async () => {
    if (!canDelete) return;

    try {
      setIsDeleting(true);
      await onConfirm();
      onClose();
      setConfirmationText('');
    } catch (error) {
      // Error handling is done by the parent component
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      onClose();
      setConfirmationText('');
    }
  };

  // Split warning details into blocking and non-blocking
  const blockingDetails = warning?.details?.filter((d) => d.blocking) || [];
  const nonBlockingDetails = warning?.details?.filter((d) => !d.blocking) || [];

  return (
    <AlertDialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {blocked ? (
              <ShieldX className="h-5 w-5 text-destructive" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-destructive" />
            )}
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              {/* Loading impact */}
              {isLoadingImpact && (
                <div className="flex items-center gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Checking dependencies...</span>
                </div>
              )}

              {/* Blocked state — show blocking dependencies */}
              {!isLoadingImpact && blocked && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-destructive">
                    Cannot delete. Remove the following dependencies first:
                  </p>
                  {blockingDetails.length > 0 && (
                    <ul className="space-y-1 text-sm">
                      {blockingDetails.map((detail, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                          <span className="font-medium">
                            {detail.count} {detail.label}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {nonBlockingDetails.length > 0 && (
                    <>
                      <p className="text-sm text-muted-foreground mt-2">
                        Also associated:
                      </p>
                      <ul className="space-y-1 text-sm">
                        {nonBlockingDetails.map((detail, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            <span className="text-muted-foreground">
                              {detail.count} {detail.label}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}

              {/* Non-blocked with warnings — show info and allow deletion */}
              {!isLoadingImpact && !blocked && warning && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground">
                    {warning.message}
                  </p>
                  {warning.details && warning.details.length > 0 && (
                    <ul className="space-y-1 text-sm">
                      {warning.details.map((detail, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          <span>
                            {detail.count} {detail.label}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="text-sm text-muted-foreground">
                    This action cannot be undone.
                  </p>
                </div>
              )}

              {/* No impact message */}
              {!isLoadingImpact && !blocked && !warning && itemName && (
                <p className="text-sm">
                  Are you sure you want to delete <span className="font-semibold">{itemName}</span>?
                  This action cannot be undone.
                </p>
              )}

              {/* Confirmation input — only show when not blocked */}
              {!isLoadingImpact && !blocked && requireConfirmation && itemName && (
                <div className="space-y-2">
                  <Label htmlFor="confirmation" className="text-sm font-medium">
                    Type <span className="font-mono font-semibold">{itemName}</span> to confirm
                  </Label>
                  <Input
                    id="confirmation"
                    value={confirmationText}
                    onChange={(e) => setConfirmationText(e.target.value)}
                    placeholder="Type item name to confirm"
                    disabled={isDeleting}
                  />
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isDeleting}
          >
            {blocked ? 'Close' : 'Cancel'}
          </Button>
          {!blocked && (
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={!canDelete}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
