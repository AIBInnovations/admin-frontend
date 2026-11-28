import { toast } from 'sonner'
import { recordingsService, type Recording } from '@/services/recordings.service'
import { ConfirmDock, impactOf, must } from '@/components/forms/editor/ConfirmDock'

export function DeleteRecordingDock({ recording, onClose, onDone }: { recording: Recording | null; onClose: () => void; onDone: () => void }) {
  return (
    <ConfirmDock
      open={!!recording}
      onClose={onClose}
      title="Delete Recording"
      confirmLabel="Delete"
      busyLabel="Deleting..."
      tone="danger"
      blockedText="Cannot delete. Remove the following dependencies first:"
      loadImpact={recording ? () => impactOf(recordingsService.getDeleteImpact(recording._id)) : undefined}
      onConfirm={async () => {
        if (!recording) return
        must(await recordingsService.delete(recording._id), 'Failed to delete recording')
        toast.success('Recording deleted successfully')
        onDone()
      }}
    >
      <p>Are you sure you want to delete <span className="font-medium text-foreground">{recording?.title}</span>? This action cannot be undone.</p>
    </ConfirmDock>
  )
}
