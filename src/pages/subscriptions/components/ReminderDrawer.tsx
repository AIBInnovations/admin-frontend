import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import type { ReminderItem, ReminderSendResult } from '@/services/subscriptions.service'
import { ReminderPanel } from './ReminderPanel'

/** "Send reminder now" in a slide-out drawer (narrow screens, a student's page). Open while `items` is set. */
export function ReminderDrawer({ items, canSend, onClose, onSent, side = 'right' }: {
  items: ReminderItem[] | null
  canSend: boolean
  onClose: () => void
  onSent?: (result: ReminderSendResult) => void
  side?: 'left' | 'right'
}) {
  const open = !!items && items.length > 0
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      {/* p-0 + [&>button]:hidden: the panel brings its own padding and close button */}
      <SheetContent side={side} aria-describedby={undefined} className="w-full gap-0 p-0 sm:max-w-md [&>button]:hidden">
        <SheetTitle className="sr-only">Send reminder now</SheetTitle>
        {open && (
          <div className="h-full">
            <ReminderPanel key={items!.map((i) => i.purchase_id).join(',')} items={items!} canSend={canSend} onClose={onClose} onSent={onSent} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
