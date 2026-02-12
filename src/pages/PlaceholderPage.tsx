import { PageHeader } from '@/components/common/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Construction, type LucideIcon } from 'lucide-react'

interface PlaceholderPageProps {
  title: string
  description: string
  icon?: LucideIcon
  breadcrumbs?: { label: string; href?: string }[]
}

export function PlaceholderPage({
  title,
  description,
  icon: Icon = Construction,
  breadcrumbs,
}: PlaceholderPageProps) {
  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={breadcrumbs}
      />
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(var(--muted))]">
            <Icon className="h-8 w-8 text-[hsl(var(--muted-foreground))]" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">Coming Soon</h3>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
            This page is under construction. Check back soon!
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
