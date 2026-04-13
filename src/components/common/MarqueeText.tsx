import { useRef, useEffect } from 'react'

/**
 * MarqueeText — renders text that automatically scrolls left-and-back
 * when it overflows its container, like a marquee. If the text fits,
 * it just sits still.
 *
 * Usage: drop-in replacement for `<span className="truncate">`.
 */
export function MarqueeText({ children }: { children: React.ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const outer = outerRef.current
    const inner = innerRef.current
    if (!outer || !inner) return

    const update = () => {
      // Pause animation so we can measure the real text width
      inner.style.animation = 'none'
      void inner.offsetWidth // force reflow

      const overflow = inner.scrollWidth - outer.clientWidth

      if (overflow > 2) {
        const px = overflow + 12 // small extra breathing room
        // Speed: ~30 px/s, minimum 4 s per cycle
        const seconds = Math.max(4, px / 30)
        inner.style.setProperty('--marquee-distance', `-${px}px`)
        inner.style.animation = `marquee-text ${seconds.toFixed(1)}s linear infinite`
      } else {
        inner.style.removeProperty('--marquee-distance')
        // no overflow → no animation
      }
    }

    update()

    const ro = new ResizeObserver(update)
    ro.observe(outer)
    return () => ro.disconnect()
  }) // runs after every render so children changes are picked up

  return (
    <div
      ref={outerRef}
      style={{ overflow: 'hidden', flex: '1 1 0%', minWidth: 0 }}
    >
      <span
        ref={innerRef}
        style={{ display: 'inline-block', whiteSpace: 'nowrap' }}
      >
        {children}
      </span>
    </div>
  )
}
