import { useCallback, useEffect, useState } from 'react'
import { explain } from '../access'

/** Loads what an action would affect. A failed check blocks the action until it works. */
export function useImpact<T>(fetcher: () => Promise<T | null | undefined>, what: string) {
  const [state, setState] = useState<{ impact: T | null; loading: boolean; error: string | null }>({ impact: null, loading: true, error: null })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let live = true
    setState({ impact: null, loading: true, error: null })
    fetcher()
      .then((impact) => { if (live) setState({ impact: impact ?? null, loading: false, error: impact ? null : 'The check did not return anything.' }) })
      .catch((err) => { if (live) setState({ impact: null, loading: false, error: explain(err, what) }) })
    return () => { live = false }
    // One request per opening (and per retry)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  return { ...state, retry }
}
