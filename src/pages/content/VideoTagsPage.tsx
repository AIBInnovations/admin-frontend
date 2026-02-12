import { PlaceholderPage } from '@/pages/PlaceholderPage'
import { Tags } from 'lucide-react'

export function VideoTagsPage() {
  return (
    <PlaceholderPage
      title="Video Tags"
      description="Manage tags for video categorization"
      icon={Tags}
      breadcrumbs={[
        { label: 'Dashboard', href: '/' },
        { label: 'Content' },
        { label: 'Video Tags' },
      ]}
    />
  )
}
