import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { ExtendValidityPanel } from './ExtendValidityPanel'
import type { SubscriptionRecord } from '@/services/subscriptions.service'

interface ExtendValidityDrawerProps {
  /** Record to edit; drawer is open while non-null. */
  record: SubscriptionRecord | null
  canExtend: boolean
  onClose: () => void
  /** Called after a successful extend with the new expiry ISO string. */
  onExtended: (newExpiry: string) => void
  /** Side the drawer slides from. Default: left. */
  side?: 'left' | 'right'
}

/** The Extend-validity panel hosted in a slide-out drawer (Sheet). */
export function ExtendValidityDrawer({
  record,
  canExtend,
  onClose,
  onExtended,
  side = 'left',
}: ExtendValidityDrawerProps) {
  return (
    <Sheet open={!!record} onOpenChange={(open) => !open && onClose()}>
      {/* p-0 + [&>button]:hidden: PanelShell supplies its own padding and close (X). */}
      <SheetContent side={side} className="p-0 gap-0 w-full sm:max-w-md [&>button]:hidden">
        <SheetTitle className="sr-only">Extend validity</SheetTitle>
        {record && (
          <div className="h-full">
            <ExtendValidityPanel
              key={record.purchase_id}
              record={record}
              canExtend={canExtend}
              onClose={onClose}
              onExtended={onExtended}
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
