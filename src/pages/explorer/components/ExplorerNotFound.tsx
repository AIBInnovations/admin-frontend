import { ErrorState } from '@/components/common/detail'
import { EXPLORER_BASE } from '../parseExplorerPath'

/** Shown for a moment while an address that does not exist is redirected. */
export function ExplorerNotFound() {
  return (
    <div className="p-6">
      <ErrorState title="This address does not exist" message="Taking you to the nearest place that does." back={{ label: 'Go to Explorer', href: EXPLORER_BASE }} />
    </div>
  )
}
