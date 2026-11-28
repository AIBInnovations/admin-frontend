import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { explain } from '../access'

/**
 * Centralised UX wrapper for the 3-step presigned uploads that each entity
 * service already implements (`uploadThumbnail`, `uploadEbook`, document
 * `upload`/`replaceFile`, …). It owns progress + toast + busy state so every
 * panel media control behaves identically; the actual HTTP stays in the
 * service so per-entity confirm payloads remain correct.
 */
export function useMediaUpload() {
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)

  const run = useCallback(
    async <R>(
      label: string,
      fn: (onProgress: (percent: number) => void) => Promise<R>,
    ): Promise<R | undefined> => {
      setUploading(true)
      setProgress(0)
      const toastId = toast.loading(`${label}…`)
      try {
        const result = await fn((p) => setProgress(p))
        toast.dismiss(toastId)
        toast.success(`${label}: done`)
        return result
      } catch (err) {
        toast.dismiss(toastId)
        const message = explain(err, 'uploading files')
        toast.error(`${label} did not work`, { description: message })
        return undefined
      } finally {
        setUploading(false)
        setProgress(0)
      }
    },
    [],
  )

  return { run, progress, uploading }
}
