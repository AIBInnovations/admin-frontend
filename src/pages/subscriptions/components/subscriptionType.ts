import { Package, Video, BookOpen, type LucideIcon } from 'lucide-react'
import type { SubscriptionType } from '@/services/subscriptions.service'

/** Per-type label, icon and badge colour for the subscriptions list. */
export const TYPE_META: Record<SubscriptionType, { label: string; icon: LucideIcon; badge: string }> = {
  package: { label: 'Package', icon: Package, badge: 'bg-indigo-100 text-indigo-700' },
  session: { label: 'Session', icon: Video, badge: 'bg-violet-100 text-violet-700' },
  ebook: { label: 'eBook', icon: BookOpen, badge: 'bg-teal-100 text-teal-700' },
}
