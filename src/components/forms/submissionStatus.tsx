import { StatusPill, type Tone } from '@/components/common/detail'

const STATUS: Record<string, { tone: Tone; label: string }> = {
  none: { tone: 'neutral', label: 'Not Paid' },
  pending: { tone: 'warning', label: 'Pending' },
  paid: { tone: 'success', label: 'Paid' },
  expired: { tone: 'danger', label: 'Expired' },
  canceled: { tone: 'danger', label: 'Canceled' },
}

export function SubmissionPayment({ status }: { status?: string | null }) {
  const s = STATUS[status || 'none'] ?? { tone: 'neutral' as Tone, label: status || 'Unknown' }
  return <StatusPill tone={s.tone}>{s.label}</StatusPill>
}
