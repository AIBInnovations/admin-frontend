import { toast } from 'sonner'
import { workshopsService, type Workshop, type WorkshopDay } from '@/services/workshops.service'
import { ConfirmDock, impactOf, must } from '@/components/forms/editor/ConfirmDock'

interface DockProps { workshop: Workshop | null; onClose: () => void; onDone: () => void }

export function ArchiveWorkshopDock({ workshop, onClose, onDone }: DockProps) {
  return (
    <ConfirmDock
      open={!!workshop}
      onClose={onClose}
      title="Archive Workshop"
      confirmLabel="Archive"
      busyLabel="Archiving..."
      blockedText="Cannot archive. Remove dependencies first:"
      loadImpact={workshop ? () => impactOf(workshopsService.getDeleteImpact(workshop._id)) : undefined}
      onConfirm={async () => {
        if (!workshop) return
        must(await workshopsService.archive(workshop._id), 'Failed to archive workshop')
        toast.success('Workshop archived')
        onDone()
      }}
    >
      <p>Are you sure you want to archive <span className="font-medium text-foreground">{workshop?.title}</span>? It and its days are hidden from the app.</p>
    </ConfirmDock>
  )
}

export function CancelWorkshopDock({ workshop, onClose, onDone }: DockProps) {
  const registered = workshop?.enrollment_count ?? 0
  return (
    <ConfirmDock
      open={!!workshop}
      onClose={onClose}
      title="Cancel Workshop"
      confirmLabel="Cancel Workshop"
      busyLabel="Cancelling..."
      dismissLabel="Keep Workshop"
      tone="danger"
      onConfirm={async () => {
        if (!workshop) return
        const res = must(await workshopsService.cancel(workshop._id), 'Failed to cancel workshop')
        const pending = res.data?.refunds_pending ?? 0
        toast.success(pending > 0 ? `Workshop cancelled. ${pending} paid purchase${pending === 1 ? ' needs' : 's need'} a manual refund.` : 'Workshop cancelled')
        onDone()
      }}
    >
      <p>
        Cancel <span className="font-medium text-foreground">{workshop?.title}</span>? Every day's Zoom meeting will be deleted and all registrations cancelled
        {registered > 0 ? ` (${registered} student${registered === 1 ? '' : 's'})` : ''}.
      </p>
      <p>Paid students will need to be refunded manually. This cannot be undone.</p>
    </ConfirmDock>
  )
}

export function CancelDayDock({ workshopId, day, onClose, onDone }: { workshopId: string; day: WorkshopDay | null; onClose: () => void; onDone: () => void }) {
  return (
    <ConfirmDock
      open={!!day}
      onClose={onClose}
      title={day ? `Cancel Day ${day.day_number}` : 'Cancel day'}
      confirmLabel="Cancel day"
      busyLabel="Cancelling..."
      dismissLabel="Keep day"
      tone="danger"
      onConfirm={async () => {
        if (!day) return
        must(await workshopsService.cancelDay(workshopId, day.session_id), 'Failed to cancel day')
        toast.success(`Day ${day.day_number} cancelled`)
        onDone()
      }}
    >
      <p>
        Cancel <span className="font-medium text-foreground">{day?.title}</span>? Its Zoom meeting will be deleted. The rest of the workshop continues, and this day stops counting toward certificates.
      </p>
    </ConfirmDock>
  )
}

/** Publishing goes through the workshop's own API, which also publishes its days. */
export function PublishWorkshopDock({ workshop, action, onClose, onDone }: DockProps & { action: 'publish' | 'unpublish' }) {
  const publish = action === 'publish'
  const registered = workshop?.enrollment_count ?? 0
  return (
    <ConfirmDock
      open={!!workshop}
      onClose={onClose}
      title={publish ? 'Publish Workshop' : 'Unpublish Workshop'}
      confirmLabel={publish ? 'Publish' : 'Unpublish'}
      busyLabel={publish ? 'Publishing...' : 'Unpublishing...'}
      tone={publish ? 'default' : 'danger'}
      onConfirm={async () => {
        if (!workshop) return
        must(await workshopsService.update(workshop._id, { publish_status: publish ? 'published' : 'draft' }), `Failed to ${action}`)
        toast.success(publish ? 'Workshop published successfully' : 'Workshop unpublished successfully')
        onDone()
      }}
    >
      {publish ? (
        <p>Publish <span className="font-medium text-foreground">{workshop?.title}</span> and all its days? Students will be able to see it.</p>
      ) : (
        <p>
          Unpublish <span className="font-medium text-foreground">{workshop?.title}</span> and all its days? It will no longer be visible to users
          {registered > 0 ? `, including ${registered} registered student${registered === 1 ? '' : 's'}` : ''}.
        </p>
      )}
    </ConfirmDock>
  )
}
