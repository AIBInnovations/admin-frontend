import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { SideDrawerProps } from './types';

/**
 * SideDrawer - Slide-in panel from left or right
 * Used for filters, details, and supplementary content
 */
export function SideDrawer({
  open,
  onClose,
  title,
  children,
  footer,
  side = 'right',
}: SideDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side={side} className="flex flex-col">
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
