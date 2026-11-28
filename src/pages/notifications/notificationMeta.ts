import { Bell, Mail, MessageSquare, Smartphone, type LucideIcon } from 'lucide-react'
import type { Tone } from '@/components/common/detail'

export const TYPE_META: Record<string, { label: string; icon: LucideIcon }> = {
  push: { label: 'Push', icon: Bell },
  in_app: { label: 'In-App', icon: Smartphone },
  email: { label: 'Email', icon: Mail },
  sms: { label: 'SMS', icon: MessageSquare },
}
export const typeMeta = (type: string) => TYPE_META[type] ?? { label: type || 'Unknown', icon: Bell }

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Unknown')
const STATUS: Record<string, Tone> = { pending: 'warning', sent: 'info', read: 'success', failed: 'danger' }
const DELIVERY: Record<string, Tone> = { queued: 'neutral', sent: 'info', delivered: 'success', failed: 'danger' }

export const statusMeta = (status: string): { label: string; tone: Tone } => ({ label: cap(status), tone: STATUS[status] ?? 'neutral' })
export const deliveryMeta = (status: string): { label: string; tone: Tone } => ({ label: cap(status), tone: DELIVERY[status] ?? 'neutral' })
