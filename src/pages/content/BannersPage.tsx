import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Pencil, Trash2, Image, ExternalLink, GripVertical } from 'lucide-react'
import { mockBanners } from '@/lib/mock-data'

export function BannersPage() {
  return (
    <div>
      <PageHeader
        title="Banners"
        description="Manage homepage banners and promotions"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Content' }, { label: 'Banners' }]}
        action={<Button><Plus className="mr-2 h-4 w-4" />Add Banner</Button>}
      />

      {/* Banner Cards Grid */}
      <div className="grid grid-cols-2 gap-6">
        {mockBanners.map((banner) => (
          <Card key={banner._id} className="overflow-hidden">
            <CardContent className="p-0">
              {/* Image Placeholder */}
              <div className="flex h-48 items-center justify-center bg-muted">
                <Image className="h-12 w-12 text-muted-foreground" />
              </div>

              {/* Banner Info */}
              <div className="space-y-3 p-4">
                {/* Header row with title and status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold">{banner.title}</h3>
                    <p className="text-xs text-muted-foreground">{banner.subtitle}</p>
                  </div>
                  <Badge variant={banner.is_active ? 'default' : 'outline'} className="shrink-0 text-[10px]">
                    {banner.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                {/* Details */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium">Date Range:</span>
                    <span>
                      {new Date(banner.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {' \u2013 '}
                      {new Date(banner.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    <span className="truncate">{banner.click_url}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <GripVertical className="h-3 w-3 shrink-0" />
                    <span>Display Order: {banner.display_order}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 border-t border-border pt-3">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Pencil className="mr-2 h-3.5 w-3.5" />Edit
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 text-red-600 hover:text-red-600">
                    <Trash2 className="mr-2 h-3.5 w-3.5" />Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
