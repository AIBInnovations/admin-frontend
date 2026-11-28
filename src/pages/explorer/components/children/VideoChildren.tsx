import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { MessageSquare, Plus, Star, Tags, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { formatDay } from '@/lib/format'
import { cn } from '@/lib/utils'
import { videosService } from '@/services/videos.service'
import { videoTagsService, type VideoTag } from '@/services/videoTags.service'
import type { VideoReview } from '@/services/videoReviews.service'
import { useExplorerAccess } from '../../access'
import type { ExplorerData } from '../../hooks/useExplorerData'
import { useExplorerMutation } from '../../hooks/useExplorerMutation'
import { useUrlState } from '../../hooks/useUrlState'
import { StarDisplay } from '../../ui/StarDisplay'
import { ExplorerEmptyState, NoAccess } from '../ExplorerEmptyState'
import { ChildrenListSkeleton } from '../ExplorerSkeleton'
import { StudentLink, openableRow } from '@/components/students/StudentLink'
import { useAuth } from '@/contexts/AuthContext'
import { FolderTabs, type FolderTab } from './shared'

export function VideoChildren({ data }: { data: ExplorerData }) {
  const { can } = useExplorerAccess()
  const [tab, setTab] = useUrlState('tab', 'tags')
  if (!can('video', 'read')) return <NoAccess what="videos" />
  const tabs: FolderTab[] = [
    { value: 'tags', label: 'Tags', count: data.videoTags?.length, icon: Tags },
    { value: 'reviews', label: 'Reviews', count: data.videoReviewsTotal, icon: Star },
  ]
  return (
    <Tabs value={tab === 'reviews' ? 'reviews' : 'tags'} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
      <FolderTabs tabs={tabs} label="About this video" />
      <TabsContent value="tags" className="mt-0 min-h-0 flex-1 overflow-y-auto data-[state=inactive]:hidden">
        {data.currentVideo && data.videoTags ? <TagsTab videoId={data.currentVideo._id} assigned={data.videoTags} onRefresh={data.refetch} /> : <ChildrenListSkeleton count={3} />}
      </TabsContent>
      <TabsContent value="reviews" className="mt-0 min-h-0 flex-1 overflow-y-auto data-[state=inactive]:hidden">
        {data.videoReviews ? <ReviewsTab reviews={data.videoReviews} total={data.videoReviewsTotal ?? data.videoReviews.length} /> : <ChildrenListSkeleton count={3} />}
      </TabsContent>
    </Tabs>
  )
}

// ── Tags ─────────────────────────────────────────────────────────────────
function TagsTab({ videoId, assigned, onRefresh }: { videoId: string; assigned: VideoTag[]; onRefresh: () => Promise<void> }) {
  const { can, has } = useExplorerAccess()
  const canEdit = can('video', 'update')
  const canPick = canEdit && has('video_tags.read')
  const canCreate = canEdit && has('video_tags.create')
  const [all, setAll] = useState<VideoTag[]>([])
  const [picker, setPicker] = useState(false)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [pending, setPending] = useState<{ id: string; add: boolean } | null>(null)

  useEffect(() => {
    if (!canPick) return
    let live = true
    videoTagsService.getAll({ page: 1, limit: 200, sort_by: 'name', sort_order: 'asc' }).then((res) => { if (live && res.data) setAll(res.data.entities) }).catch(() => {})
    return () => { live = false }
  }, [canPick, assigned])

  const assignedIds = new Set(assigned.map((t) => t._id))
  const available = all.filter((t) => !assignedIds.has(t._id))

  const change = useExplorerMutation({
    name: pending?.add ? 'Add tag' : 'Remove tag',
    what: 'tagging videos',
    fn: () => (pending!.add ? videosService.assignTags(videoId, [pending!.id]) : videosService.removeTags(videoId, [pending!.id])),
    onSuccess: () => onRefresh(),
    successMessage: pending?.add ? 'Tag added' : 'Tag removed',
  })
  useEffect(() => {
    if (pending) void change.execute().finally(() => setPending(null))
    // Runs once per choice
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending])

  const createTag = useExplorerMutation({
    name: 'Create tag',
    what: 'creating tags',
    fn: async () => {
      const res = await videoTagsService.create({ name: name.trim(), category: category.trim() || undefined })
      if (res.data) await videosService.assignTags(videoId, [res.data._id])
    },
    onSuccess: () => { setName(''); setCategory(''); return onRefresh() },
    successMessage: 'Tag created and added',
  })

  return (
    <div className="space-y-6 p-4">
      <section aria-label="Assigned tags" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-foreground">Assigned tags</h3>
          {canPick && (
            <Popover open={picker} onOpenChange={setPicker}>
              <PopoverTrigger asChild><Button size="sm" variant="outline"><Plus className="h-3.5 w-3.5" /> Add tag</Button></PopoverTrigger>
              <PopoverContent align="end" className="w-64 p-0">
                <Command>
                  <CommandInput placeholder="Search tags" />
                  <CommandList>
                    <CommandEmpty>No tags found.</CommandEmpty>
                    <CommandGroup>
                      {available.map((t) => (
                        <CommandItem key={t._id} value={`${t.name} ${t.category ?? ''} ${t._id}`} onSelect={() => { setPicker(false); setPending({ id: t._id, add: true }) }}>
                          {t.name}{t.category && <span className="ml-1 text-xs text-muted-foreground">{t.category}</span>}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}
        </div>
        {assigned.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
            {assigned.map((t) => (
              <li key={t._id} className="inline-flex max-w-full items-center gap-1 rounded-full bg-accent py-1 pl-3 pr-1 text-xs font-medium text-accent-foreground">
                <span className="truncate">{t.name}{t.category && <span className="font-normal text-muted-foreground"> · {t.category}</span>}</span>
                {canEdit
                  ? <button type="button" aria-label={`Remove tag ${t.name}`} disabled={change.loading} onClick={() => setPending({ id: t._id, add: false })} className="rounded-full p-1 transition-colors hover:bg-card disabled:opacity-50"><X aria-hidden="true" className="h-3 w-3" /></button>
                  : <span className="w-2" />}
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted-foreground">No tags assigned yet.</p>}
      </section>

      {canCreate && (
        <form className="space-y-3 border-t border-border pt-5" onSubmit={(e) => { e.preventDefault(); if (name.trim().length >= 2) void createTag.execute() }}>
          <h3 className="text-sm font-semibold text-foreground">Create a new tag</h3>
          <div className="flex flex-col gap-2 @lg:flex-row">
            <Input aria-label="Tag name" className="h-9 text-sm" placeholder="Tag name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input aria-label="Category (optional)" className="h-9 text-sm @lg:w-44" placeholder="Category (optional)" value={category} onChange={(e) => setCategory(e.target.value)} />
            <Button type="submit" size="sm" className="h-9 shrink-0" disabled={name.trim().length < 2 || createTag.loading}><Plus className="h-3.5 w-3.5" /> {createTag.loading ? 'Creating…' : 'Create and add'}</Button>
          </div>
        </form>
      )}
    </div>
  )
}

// ── Reviews ──────────────────────────────────────────────────────────────
function ReviewsTab({ reviews, total }: { reviews: VideoReview[]; total: number }) {
  const [onlyRating, setOnlyRating] = useState(false)
  const [onlyFeedback, setOnlyFeedback] = useState(false)
  const filtered = reviews.filter((r) => (!onlyRating || r.rating != null) && (!onlyFeedback || !!r.feedback))
  const rated = reviews.filter((r) => r.rating != null)
  const average = rated.length > 0 ? rated.reduce((s, r) => s + (r.rating ?? 0), 0) / rated.length : null

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        {average != null && (
          <p className="flex items-center gap-1.5 text-sm">
            <StarDisplay rating={average} /><span className="font-semibold tabular-nums">{average.toFixed(1)}</span><span className="text-xs text-muted-foreground">({rated.length} rated)</span>
          </p>
        )}
        <div className="ml-auto flex gap-1.5">
          <Pill on={onlyRating} onClick={() => setOnlyRating((x) => !x)}>Has rating</Pill>
          <Pill on={onlyFeedback} onClick={() => setOnlyFeedback((x) => !x)}>Has feedback</Pill>
        </div>
      </div>
      {filtered.length > 0 ? (
        <>
          <ul className="divide-y divide-border">{filtered.map((r) => <ReviewRow key={r._id} review={r} />)}</ul>
          {total > reviews.length && <p className="px-4 py-3 text-center text-[13px] text-muted-foreground">The latest {reviews.length} of {total} reviews.</p>}
        </>
      ) : (
        <ExplorerEmptyState
          icon={MessageSquare}
          title={reviews.length === 0 ? 'No reviews yet' : 'No reviews match'}
          description={reviews.length === 0 ? 'Student ratings and feedback for this video appear here.' : 'Turn the filters off to see all of them.'}
          action={reviews.length === 0 ? undefined : { label: 'Clear filters', onClick: () => { setOnlyRating(false); setOnlyFeedback(false) } }}
        />
      )}
    </>
  )
}

function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" aria-pressed={on} onClick={onClick} className={cn('h-7 rounded-full px-3 text-xs font-medium transition-colors', on ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground')}>{children}</button>
}

function ReviewRow({ review }: { review: VideoReview }) {
  const date = review.feedback_submitted_at || review.rating_submitted_at || review.createdAt
  const navigate = useNavigate()
  const location = useLocation()
  // The row opens the review; the name opens the student
  const { hasPermission } = useAuth()
  const row = openableRow(hasPermission('videos.read') ? () => navigate(`/feedback/${review._id}`, { state: { from: location.pathname + location.search } }) : undefined, 'px-4 py-3')
  return (
    <li {...row}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm"><StudentLink student={review.user} fallback="Unnamed student" from="Content library" /></p>
          {date && <p className="text-xs text-muted-foreground">{formatDay(date)}</p>}
        </div>
        {review.rating != null ? <StarDisplay rating={review.rating} /> : <span className="text-xs text-muted-foreground">No rating</span>}
      </div>
      {review.feedback && <p className="mt-1.5 whitespace-pre-wrap break-words text-sm text-foreground/85">{review.feedback}</p>}
    </li>
  )
}
