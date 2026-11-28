/** "1 video", "2 videos", "1,240 videos". */
export function plural(n: number, one: string, many = `${one}s`): string {
  return `${new Intl.NumberFormat('en-IN').format(n)} ${n === 1 ? one : many}`
}

/** 95 -> "1:35", 3725 -> "1:02:05" */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds || 0))
  const pad = (n: number) => String(n).padStart(2, '0')
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`
}

/** Total length in words: "45 min", "2 h 10 min". */
export function hours(seconds: number): string {
  const min = Math.round((seconds || 0) / 60)
  if (min < 60) return `${min} min`
  return min % 60 === 0 ? `${Math.floor(min / 60)} h` : `${Math.floor(min / 60)} h ${min % 60} min`
}

export function fileSize(mb: number | null | undefined): string {
  if (mb == null || Number.isNaN(mb)) return 'Size not known'
  if (mb < 1) return `${Math.max(1, Math.round(mb * 1024))} KB`
  return `${mb.toFixed(1)} MB`
}
