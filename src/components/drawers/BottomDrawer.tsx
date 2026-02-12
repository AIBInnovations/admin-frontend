import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { BottomDrawerProps } from './types';

/**
 * BottomDrawer - Slide-up panel from bottom
 * Mobile-friendly for actions and supplementary content
 */
export function BottomDrawer({
  open,
  onClose,
  title,
  children,
  footer,
}: BottomDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="flex flex-col">
        {title && (
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>
        )}
        <div className="flex-1 overflow-y-auto py-4">{children}</div>
        {footer && <SheetFooter>{footer}</SheetFooter>}
      </SheetContent>
    </Sheet>
  );
}
