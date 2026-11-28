import { useEffect, useLayoutEffect, useRef, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

/** True when the admin asked the system for less motion. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(QUERY).matches)
  useEffect(() => {
    const m = window.matchMedia?.(QUERY)
    if (!m) return
    const on = () => setReduced(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return reduced
}

const ease = (t: number) => 1 - (1 - t) ** 3

/** Old values laid onto the new length, so a chart can morph between granularities. */
function resample(from: (number | null)[], n: number): (number | null)[] {
  if (from.length === n) return from
  if (!from.length) return new Array(n).fill(0)
  if (n === 1) return [from[from.length - 1]]
  return Array.from({ length: n }, (_, i) => {
    const pos = (i / (n - 1)) * (from.length - 1)
    const a = from[Math.floor(pos)]
    const b = from[Math.ceil(pos)]
    if (a === null || b === null) return a ?? b
    return a + (b - a) * (pos - Math.floor(pos))
  })
}

/**
 * Numbers that glide to their new values (420ms, ease-out) instead of jumping.
 * The first values appear at once; with reduced motion every change is instant.
 * A null stays a gap.
 */
export function useTween(target: (number | null)[], duration = 420): (number | null)[] {
  const reduced = usePrefersReducedMotion()
  const [shown, setShown] = useState(target)
  const shownRef = useRef(target)
  const first = useRef(true)
  const key = target.join('|')
  useLayoutEffect(() => {
    if (first.current || reduced) {
      first.current = false
      shownRef.current = target
      setShown(target)
      return
    }
    const from = resample(shownRef.current, target.length)
    const start = performance.now()
    let raf = 0
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const k = ease(t)
      const next = target.map((v, i) => (v === null ? null : from[i] === null || from[i] === undefined ? v : (from[i] as number) + (v - (from[i] as number)) * k))
      shownRef.current = next
      setShown(next)
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [key, reduced, duration]) // `key` stands for the values
  return shown
}

/** Figures that have already counted up in this visit: they never count again. */
const counted = new Set<string>()

/**
 * A number that counts up from zero the first time it scrolls into view, once
 * per visit, and only with motion allowed. Later changes show at once. The
 * final value is always what screen readers get.
 */
export function CountUp({ value, format, id, duration = 700 }: { value: number; format: (n: number) => string; id: string; duration?: number }) {
  const reduced = usePrefersReducedMotion()
  const ref = useRef<HTMLSpanElement>(null)
  const [shown, setShown] = useState<number>(() => (reduced || counted.has(id) ? value : 0))

  useEffect(() => {
    // Counted before (or a newer value arrived mid-count): show the value as it is
    if (reduced || counted.has(id)) { setShown(value); return }
    const el = ref.current
    if (!el) return
    let raf = 0
    const run = () => {
      counted.add(id)
      const start = performance.now()
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration)
        setShown(t < 1 ? value * ease(t) : value)
        if (t < 1) raf = requestAnimationFrame(step)
      }
      raf = requestAnimationFrame(step)
    }
    if (typeof IntersectionObserver === 'undefined') { run(); return () => cancelAnimationFrame(raf) }
    const io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) { io.disconnect(); run() } }, { threshold: 0.4 })
    io.observe(el)
    return () => { io.disconnect(); cancelAnimationFrame(raf) }
  }, [value, id, reduced, duration])

  return (
    // The final value, invisible, holds the width from the first frame, so a
    // counting number never re-wraps the line it sits on.
    <span ref={ref} className="inline-grid">
      <span aria-hidden="true" className="[grid-area:1/1]">{format(shown)}</span>
      <span aria-hidden="true" className="invisible [grid-area:1/1]">{format(value)}</span>
      <span className="sr-only">{format(value)}</span>
    </span>
  )
}
