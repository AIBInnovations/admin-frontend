import { useEffect, useRef } from 'react'
import type { PackageDetailModule } from '@/services/packages.service'

const POLL_INTERVAL = 10_000 // 10 seconds
const TERMINAL_STATUSES = new Set(['ready', 'failed', 'upcoming'])

function hasActiveProcessing(module: PackageDetailModule | undefined): boolean {
  if (!module) return false
  return module.videos.some((v) => !TERMINAL_STATUSES.has(v.processing_status))
}

/**
 * Polls the refetch callback every 10s while the focused module has videos
 * in a non-terminal processing state (uploading or processing).
 * Stops automatically once all videos reach a terminal state.
 */
export function useProcessingPoll(
  module: PackageDetailModule | undefined,
  refetch: () => void,
) {
  const refetchRef = useRef(refetch)
  refetchRef.current = refetch

  useEffect(() => {
    if (!hasActiveProcessing(module)) return

    const id = setInterval(() => {
      refetchRef.current()
    }, POLL_INTERVAL)

    return () => clearInterval(id)
  }, [module])
}
