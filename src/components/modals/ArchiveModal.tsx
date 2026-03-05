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
import { Archive, Loader2 } from 'lucide-react';

interface ArchiveModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title?: string;
  itemName?: string;
  blocked?: boolean;
  blockReason?: string;
  isLoadingImpact?: boolean;
}

export function ArchiveModal({
  open,
  onClose,
  onConfirm,
  title = 'Archive Item',
  itemName,
  blocked = false,
  blockReason,
  isLoadingImpact = false,
}: ArchiveModalProps) {
  const [isArchiving, setIsArchiving] = useState(false);

  const handleConfirm = async () => {
    if (isArchiving || blocked || isLoadingImpact) return;

    try {
      setIsArchiving(true);
      await onConfirm();
      onClose();
    } catch (error) {
      // Error handling done by parent
    } finally {
      setIsArchiving(false);
    }
  };

  const handleClose = () => {
    if (!isArchiving) {
      onClose();
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-amber-500" />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              {isLoadingImpact && (
                <div className="flex items-center gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Checking dependencies...</span>
                </div>
              )}

              {!isLoadingImpact && blocked && (
                <p className="text-sm font-medium text-destructive">
                  {blockReason || 'Cannot archive this item.'}
                </p>
              )}

              {!isLoadingImpact && !blocked && (
                <>
                  <p className="text-sm">
                    Are you sure you want to archive{' '}
                    {itemName ? <span className="font-semibold">{itemName}</span> : 'this item'}?
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Archived items are hidden from the app and will be permanently deleted after 30 days.
                    You can restore them from the Archives page at any time before that.
                  </p>
                </>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isArchiving}>
            {blocked ? 'Close' : 'Cancel'}
          </Button>
          {!blocked && (
            <Button
              variant="default"
              className="bg-amber-600 hover:bg-amber-700"
              onClick={handleConfirm}
              disabled={isArchiving || isLoadingImpact}
            >
              {isArchiving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Archive
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
