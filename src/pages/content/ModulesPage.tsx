import { PlaceholderPage } from '@/pages/PlaceholderPage'
import { FileText } from 'lucide-react'

export function ModulesPage() {
  return (
    <PlaceholderPage
      title="Modules"
      description="Manage learning modules and their content"
      icon={FileText}
      breadcrumbs={[
        { label: 'Dashboard', href: '/' },
        { label: 'Content' },
        { label: 'Modules' },
      ]}
    />
  )
}
