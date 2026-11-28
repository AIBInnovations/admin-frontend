import { toast } from 'sonner'
import { homeSectionsService, HomeSection } from '@/services/homeSections.service'
import { ConfirmDock, impactOf, must } from '@/components/forms/editor/ConfirmDock'

interface Props { section: HomeSection | null; onClose: () => void; onDone: () => void }

export function DeleteSectionDock({ section, onClose, onDone }: Props) {
  return (
    <ConfirmDock
      open={!!section}
      onClose={onClose}
      title="Delete Home Section"
      confirmLabel="Delete"
      busyLabel="Deleting..."
      tone="danger"
      blockedText="Cannot delete. Remove the following dependencies first:"
      loadImpact={section ? () => impactOf(homeSectionsService.getDeleteImpact(section._id)) : undefined}
      onConfirm={async () => {
        if (!section) return
        must(await homeSectionsService.delete(section._id), 'Failed to delete home section')
        toast.success('Home section deleted successfully')
        onDone()
      }}
    >
      <p>Are you sure you want to delete <span className="font-medium text-foreground">{section?.title || 'this section'}</span>? This action cannot be undone.</p>
    </ConfirmDock>
  )
}
