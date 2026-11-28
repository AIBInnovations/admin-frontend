import { toast } from 'sonner'
import { liveSessionsService, LiveSession } from '@/services/liveSessions.service'
import { ConfirmDock, impactOf, must } from '@/components/forms/editor/ConfirmDock'

interface DockProps { session: LiveSession | null; onClose: () => void; onDone: () => void }

/** "Archive this session?", with what else it touches. */
export function ArchiveSessionDock({ session, onClose, onDone }: DockProps) {
  return (
    <ConfirmDock
      open={!!session}
      onClose={onClose}
      title="Archive Session"
      confirmLabel="Archive"
      busyLabel="Archiving..."
      blockedText="Cannot archive. Remove dependencies first:"
      loadImpact={session ? () => impactOf(liveSessionsService.getDeleteImpact(session._id)) : undefined}
      onConfirm={async () => {
        if (!session) return
        must(await liveSessionsService.archive(session._id), 'Failed to archive session')
        toast.success('Session archived successfully')
        onDone()
      }}
    >
      <p>Are you sure you want to archive <span className="font-medium text-foreground">{session?.title}</span>?</p>
      <p>Archived items are hidden from the app and will be permanently deleted after 30 days. You can restore them from the Archives page at any time before that.</p>
    </ConfirmDock>
  )
}

/** Cancelling deletes the Zoom meeting and notifies students, so it asks first. */
export function CancelSessionDock({ session, onClose, onDone }: DockProps) {
  const enrolled = session?.enrollment_count ?? 0
  return (
    <ConfirmDock
      open={!!session}
      onClose={onClose}
      title="Cancel Session"
      confirmLabel="Cancel Session"
      busyLabel="Cancelling..."
      dismissLabel="Keep Session"
      tone="danger"
      onConfirm={async () => {
        if (!session) return
        must(await liveSessionsService.cancel(session._id), 'Failed to cancel session')
        onDone()
      }}
    >
      {session?.repeat?.weekly && (
        <p>This is a weekly series: cancelling it cancels every class still to come{session.classes_total ? ` (${session.classes_total} in all)` : ''}.</p>
      )}
      <p>
        Cancel <span className="font-medium text-foreground">{session?.title}</span>? {session?.zoom_meeting_id ? 'Its Zoom meeting is deleted and' : 'Its'} co-host links stop working.
        {enrolled > 0 ? ` ${enrolled} enrolled student${enrolled === 1 ? ' is' : 's are'} notified.` : ''}
      </p>
      <p>{session && !session.is_free ? 'Paid students need to be refunded separately. ' : ''}This cannot be undone.</p>
    </ConfirmDock>
  )
}
