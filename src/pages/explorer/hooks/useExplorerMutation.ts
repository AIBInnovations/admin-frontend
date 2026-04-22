import { useState, useCallback } from 'react'
import { toast } from 'sonner'

interface MutationOptions<TResult> {
  name: string
  fn: () => Promise<TResult>
  onSuccess?: (result: TResult) => void | Promise<void>
  onError?: (error: Error) => void
  successMessage?: string
}

interface MutationResult {
  execute: () => Promise<void>
  loading: boolean
}

export function useExplorerMutation<TResult = unknown>({
  name,
  fn,
  onSuccess,
  onError,
  successMessage,
}: MutationOptions<TResult>): MutationResult {
  const [loading, setLoading] = useState(false)

  const execute = useCallback(async () => {
    const toastId = toast.loading(`${name}…`)
    setLoading(true)
    try {
      const result = await fn()
      toast.dismiss(toastId)
      toast.success(successMessage ?? name)
      await onSuccess?.(result)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      toast.dismiss(toastId)

      const details = JSON.stringify(
        {
          operation: name,
          message: error.message,
          timestamp: new Date().toISOString(),
        },
        null,
        2,
      )

      toast.error(`${name} failed`, {
        description: error.message,
        duration: Infinity,
        action: {
          label: 'Copy details',
          onClick: () => {
            navigator.clipboard.writeText(details).catch(() => {})
            toast.success('Error details copied')
          },
        },
      })

      onError?.(error)
    } finally {
      setLoading(false)
    }
  }, [fn, name, onSuccess, onError, successMessage])

  return { execute, loading }
}
