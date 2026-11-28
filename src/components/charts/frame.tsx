import { createContext, useContext, useEffect, useRef } from 'react'

/** A chart's picture for "Download PNG": an SVG to copy, with its size. */
export interface ChartPicture { svg: SVGSVGElement; width: number; height: number }

interface Frame {
  /** The card is in full screen: charts may grow. */
  expanded: boolean
  /** Charts hand the card a way to draw themselves for a PNG. */
  register: (draw: () => ChartPicture | null) => () => void
}

export const ChartFrame = createContext<Frame>({ expanded: false, register: () => () => {} })

export const useChartFrame = () => useContext(ChartFrame)

/** The height a chart should use: taller in full screen. */
export function useChartHeight(height: number): number {
  const { expanded } = useChartFrame()
  if (!expanded || typeof window === 'undefined') return height
  return Math.max(height, Math.min(window.innerHeight - 220, 900))
}

/** Lets the surrounding card export this chart as a PNG. */
export function useChartPicture(draw: () => ChartPicture | null) {
  const { register } = useChartFrame()
  const ref = useRef(draw)
  ref.current = draw
  useEffect(() => register(() => ref.current()), [register])
}
