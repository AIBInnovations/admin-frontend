import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'
import { explain } from '../access'

interface MutationOptions<TResult> {
  name: string
  fn: () => Promise<TResult>
  onSuccess?: (result: TResult) => void | Promise<void>
  onError?: (error: unknown) => void
  successMessage?: string
  /** What a 403 is about, e.g. "archiving videos". */
  what?: string
}

/** Runs one action at a time, says what happened, and answers whether it worked. */
export function useExplorerMutation<TResult = unknown>({ name, fn, onSuccess, onError, successMessage, what }: MutationOptions<TResult>) {
  const [loading, setLoading] = useState(false)
  const busy = useRef(false)

  const execute = useCallback(async (): Promise<boolean> => {
    if (busy.current) return false
    busy.current = true
    setLoading(true)
    try {
      const result = await fn()
      toast.success(successMessage ?? name)
      await onSuccess?.(result)
      return true
    } catch (err) {
      const message = explain(err, what ?? 'this')
      toast.error(`${name} did not work`, {
        description: message,
        duration: 12_000,
        action: {
          label: 'Copy details',
          onClick: () => {
            void navigator.clipboard
              ?.writeText(JSON.stringify({ operation: name, message, timestamp: new Date().toISOString() }, null, 2))
              .then(() => toast.success('Details copied'))
              .catch(() => {})
          },
        },
      })
      onError?.(err)
      return false
    } finally {
      busy.current = false
      setLoading(false)
    }
  }, [fn, name, onSuccess, onError, successMessage, what])

  return { execute, loading }
}
