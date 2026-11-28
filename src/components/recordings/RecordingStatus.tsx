import { StatusPill, type Tone } from '@/components/common/detail'

const TONE: Record<string, Tone> = { ready: 'success', failed: 'danger', processing: 'warning', uploading: 'info' }

/** Uploading, processing, ready, failed. */
export function RecordingStatus({ status }: { status: string }) {
  const s = status || 'unknown'
  return <StatusPill tone={TONE[s] ?? 'neutral'}>{s.charAt(0).toUpperCase() + s.slice(1)}</StatusPill>
}
