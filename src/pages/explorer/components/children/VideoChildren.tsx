import { useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Tags, Star, Plus, X, MessageSquare } from 'lucide-react'
import { ExplorerEmptyState } from '../ExplorerEmptyState'
import { ChildrenListSkeleton } from '../ExplorerSkeleton'
import { StarDisplay } from '../../ui/StarDisplay'
import { toast } from 'sonner'
import { useExplorerMutation } from '../../hooks/useExplorerMutation'
import { videosService } from '@/services/videos.service'
import { videoTagsService, type VideoTag } from '@/services/videoTags.service'
import type { PackageDetailVideo } from '@/services/packages.service'
import type { VideoReview } from '@/services/videoReviews.service'

interface VideoChildrenProps {
  video: PackageDetailVideo | undefined
  videoTags?: VideoTag[]
  videoReviews?: VideoReview[]
  videoReviewsTotal?: number
  loading: boolean
  onRefresh?: () => void
}

export function VideoChildren({ video, videoTags, videoReviews, videoReviewsTotal, loading, onRefresh }: VideoChildrenProps) {
  const videoId = video?._id ?? ''

  return (
    <Tabs defaultValue="tags" className="flex flex-col flex-1">
      <div className="border-b border-slate-100">
        <TabsList className="h-auto rounded-none bg-transparent border-b-0 px-4 sm:px-6 pt-1 gap-4">
          <TabsTrigger value="tags" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-2 gap-1.5 text-sm">
            <Tags className="w-3.5 h-3.5" />
            Tags {videoTags && `(${videoTags.length})`}
          </TabsTrigger>
          <TabsTrigger value="reviews" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-2 gap-1.5 text-sm">
            <Star className="w-3.5 h-3.5" />
            Reviews {videoReviewsTotal != null && `(${videoReviewsTotal})`}
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="tags" className="mt-0 flex-1">
        <TagsTab videoId={videoId} assigned={videoTags ?? []} loading={loading && !videoTags} onRefresh={onRefresh} />
      </TabsContent>

      <TabsContent value="reviews" className="mt-0 flex-1">
        <ReviewsTab reviews={videoReviews ?? []} loading={loading && !videoReviews} />
      </TabsContent>
    </Tabs>
  )
}

// ─── Tags ────────────────────────────────────────────────────────────────────

function TagsTab({ videoId, assigned, loading, onRefresh }: {
  videoId: string
  assigned: VideoTag[]
  loading: boolean
  onRefresh?: () => void
}) {
  const [allTags, setAllTags] = useState<VideoTag[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState('')

  useEffect(() => {
    videoTagsService.getAll({ limit: 200, sort_by: 'name', sort_order: 'asc' }).then((res) => {
      if (res.success && res.data) setAllTags(res.data.entities)
    })
  }, [])

  const [busy, setBusy] = useState(false)
  const assignedIds = new Set(assigned.map((t) => t._id))
  const available = allTags.filter((t) => !assignedIds.has(t._id))

  async function doAssign(tagId: string) {
    setPickerOpen(false)
    setBusy(true)
    try {
      await videosService.assignTags(videoId, [tagId])
      toast.success('Tag assigned')
      onRefresh?.()
    } catch (e) {
      toast.error('Failed to assign tag', { description: e instanceof Error ? e.message : String(e) })
    } finally {
      setBusy(false)
    }
  }

  async function doRemove(tagId: string) {
    setBusy(true)
    try {
      await videosService.removeTags(videoId, [tagId])
      toast.success('Tag removed')
      onRefresh?.()
    } catch (e) {
      toast.error('Failed to remove tag', { description: e instanceof Error ? e.message : String(e) })
    } finally {
      setBusy(false)
    }
  }

  const createMut = useExplorerMutation({
    name: 'Create tag',
    fn: async () => {
      const res = await videoTagsService.create({ name: newName.trim(), category: newCategory.trim() || undefined })
      if (res.success && res.data) {
        await videosService.assignTags(videoId, [res.data._id])
      }
    },
    onSuccess: () => { setNewName(''); setNewCategory(''); onRefresh?.() },
    successMessage: 'Tag created & assigned',
  })

  if (loading) return <ChildrenListSkeleton />

  return (
    <div className="px-4 sm:px-6 py-4 space-y-5">
      {/* Assigned tags */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Assigned tags</span>
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 gap-1.5 border-slate-200 text-slate-600 hover:bg-slate-50" disabled={!videoId}>
                <Plus className="w-3.5 h-3.5" /> Add tag
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-0">
              <Command>
                <CommandInput placeholder="Search tags…" />
                <CommandList>
                  <CommandEmpty>No tags found.</CommandEmpty>
                  <CommandGroup>
                    {available.map((t) => (
                      <CommandItem key={t._id} value={`${t.name} ${t.category ?? ''}`} onSelect={() => void doAssign(t._id)}>
                        {t.name}
                        {t.category && <span className="ml-1 text-xs text-slate-400">· {t.category}</span>}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {assigned.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {assigned.map((t) => (
              <span key={t._id} className="inline-flex items-center gap-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium pl-2.5 pr-1 py-1">
                {t.name}
                {t.category && <span className="text-indigo-400">· {t.category}</span>}
                <button
                  type="button"
                  className="ml-0.5 rounded-full hover:bg-indigo-100 p-0.5 disabled:opacity-50"
                  onClick={() => void doRemove(t._id)}
                  disabled={busy}
                  title="Remove"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No tags assigned yet.</p>
        )}
      </div>

      {/* Create new tag */}
      <div className="space-y-2 border-t border-slate-100 pt-4">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Create a new tag</span>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input className="h-8 text-sm" placeholder="Tag name" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <Input className="h-8 text-sm sm:w-40" placeholder="Category (optional)" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
          <Button size="sm" className="h-8 gap-1.5 shrink-0" disabled={newName.trim().length < 2 || createMut.loading || !videoId} onClick={createMut.execute}>
            <Plus className="w-3.5 h-3.5" /> Create & add
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Reviews ───────────────────────────────────────────────────────────────────

function ReviewsTab({ reviews, loading }: { reviews: VideoReview[]; loading: boolean }) {
  const [onlyRating, setOnlyRating] = useState(false)
  const [onlyFeedback, setOnlyFeedback] = useState(false)

  const filtered = reviews.filter((r) => {
    if (onlyRating && r.rating == null) return false
    if (onlyFeedback && !r.feedback) return false
    return true
  })

  const rated = reviews.filter((r) => r.rating != null)
  const avg = rated.length > 0 ? rated.reduce((s, r) => s + (r.rating ?? 0), 0) / rated.length : null

  if (loading) return <ChildrenListSkeleton />

  return (
    <div>
      <div className="flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-slate-100 flex-wrap">
        {avg != null && (
          <div className="flex items-center gap-1.5">
            <StarDisplay rating={avg} />
            <span className="text-sm font-semibold text-slate-700">{avg.toFixed(1)}</span>
            <span className="text-xs text-slate-400">({rated.length} rated)</span>
          </div>
        )}
        <div className="flex items-center gap-1 ml-auto">
          <FilterPill active={onlyRating} onClick={() => setOnlyRating((x) => !x)}>Has rating</FilterPill>
          <FilterPill active={onlyFeedback} onClick={() => setOnlyFeedback((x) => !x)}>Has feedback</FilterPill>
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="divide-y divide-slate-50">
          {filtered.map((r) => <ReviewRow key={r._id} review={r} />)}
        </div>
      ) : (
        <ExplorerEmptyState
          icon={MessageSquare}
          title={reviews.length === 0 ? 'No reviews yet' : 'No reviews match'}
          description={reviews.length === 0 ? 'Student ratings and feedback for this video appear here.' : 'Try clearing the filters.'}
        />
      )}
    </div>
  )
}

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${active ? 'bg-primary text-primary-foreground' : 'bg-gray-100 text-muted-foreground hover:bg-gray-200'}`}
    >
      {children}
    </button>
  )
}

function ReviewRow({ review }: { review: VideoReview }) {
  const dateIso = review.feedback_submitted_at || review.rating_submitted_at || review.createdAt
  const date = dateIso ? new Date(dateIso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
  return (
    <div className="px-4 sm:px-6 py-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-700 truncate">{review.user?.name ?? 'User'}</p>
          {date && <p className="text-xs text-slate-400">{date}</p>}
        </div>
        {review.rating != null ? <StarDisplay rating={review.rating} /> : <span className="text-xs text-slate-400">No rating</span>}
      </div>
      {review.feedback && <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">{review.feedback}</p>}
    </div>
  )
}
