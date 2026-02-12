import { PlaceholderPage } from '@/pages/PlaceholderPage'
import { FileText } from 'lucide-react'

export function DocumentsPage() {
  return (
    <PlaceholderPage
      title="Documents"
      description="Manage PDF notes and study materials"
      icon={FileText}
      breadcrumbs={[
        { label: 'Dashboard', href: '/' },
        { label: 'Content' },
        { label: 'Documents' },
      ]}
    />
  )
}
