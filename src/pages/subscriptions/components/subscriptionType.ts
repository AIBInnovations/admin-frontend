import { Package, Video, BookOpen, CalendarRange, FileText, type LucideIcon } from 'lucide-react'
import type { Tone } from '@/components/common/detail'
import type { ExpiryStatus } from '@/lib/relativeTime'
import type { SubscriptionType } from '@/services/subscriptions.service'

/** Per-type label and icon for the subscriptions list. */
export const TYPE_META: Record<SubscriptionType, { label: string; icon: LucideIcon }> = {
  package: { label: 'Package', icon: Package },
  session: { label: 'Session', icon: Video },
  workshop: { label: 'Workshop', icon: CalendarRange },
  ebook: { label: 'eBook', icon: BookOpen },
  form: { label: 'Form', icon: FileText },
}

export const EXPIRY_TONE: Record<ExpiryStatus, Tone> = { expired: 'danger', soon: 'warning', ok: 'success', lifetime: 'info' }
