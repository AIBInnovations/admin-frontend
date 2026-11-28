import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ExternalLink, Video as VideoIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DetailHeader, DetailSkeleton, ErrorState, FactGrid, Section, StatusPill, Timeline } from '@/components/common/detail'
import { StarDisplay } from '@/components/videoReviews/StarDisplay'
import { relativeTime } from '@/lib/relativeTime'
import { useAuth } from '@/contexts/AuthContext'
import { feedbackService, type Assignee } from '@/services/feedback.service'
import { AverageRating, RatingBars, RatingTrend } from './components/figures'
import { FollowUpPanel } from './components/FollowUpPanel'
import { ReviewList } from './components/ReviewList'
import { StaleNotice } from './components/StaleNotice'
import { useRemote } from './remote'
import { activityTitle, activityTone, explorerHref, facultyName, istDayTime, pathText, plural, STATUS_LABEL, STATUS_TONE } from './lib'

/** One review: what the student said, what is being done about it, and what others say about the same video. */
export function FeedbackDetailPage() {
  const { reviewId = '' } = useParams()
  const location = useLocation()
  const { hasPermission } = useAuth()
  const from = (location.state as { from?: string } | null)?.from
  const back = { label: from && !from.startsWith('/feedback') ? 'Back' : 'Feedback', href: from || '/feedback' }

  const { data, setData, loading, error, refresh } = useRemote(`detail:${reviewId}`, () => feedbackService.detail(reviewId))
  const [assignees, setAssignees] = useState<Assignee[]>([])
  useEffect(() => {
    let live = true
    feedbackService.assignees().then((a) => { if (live) setAssignees(a) }).catch(() => {})
    return () => { live = false }
  }, [])

  // Moving between reviews: never show the previous one under the new address
  const current = data?.review._id === reviewId ? data : null
  if (!current) {
    if (error && !loading) {
      const missing = error.status === 404 || error.status === 400
      return (
        <ErrorState
          title={missing ? 'This feedback does not exist' : error.status === 403 ? 'You cannot see this feedback' : 'This feedback could not be loaded'}
          message={missing ? 'It may have been removed with the student account.' : error.message}
          onRetry={missing ? undefined : refresh}
          back={{ label: 'Back to feedback', href: '/feedback' }}
        />
      )
    }
    return <DetailSkeleton />
  }

  const { review: r, others, video_summary: figures, trend } = current
  const inExplorer = hasPermission('subjects.read') ? explorerHref(r, r.video?._id) : null
  const videoTitle = r.video?.title || 'Deleted video'

  return (
    <div className="space-y-6">
      <DetailHeader
        back={back}
        title={<>{r.rating === null ? 'Comment' : `${plural(r.rating, 'star')}`} on {videoTitle}</>}
        status={<StatusPill tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</StatusPill>}
        subtitle={<>{facultyName(r.faculty)} · received <time dateTime={r.createdAt}>{istDayTime(r.createdAt)}</time></>}
      />
      <StaleNotice error={error?.message} onRetry={refresh} />

      {/* On a phone: the review, what to do about it, then the rest */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:grid-rows-[auto_1fr] xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <Section title="Review">
            <div className="flex flex-wrap items-center gap-2">
              {r.rating === null ? <span className="text-sm text-muted-foreground">No rating given</span> : <><StarDisplay rating={r.rating} size="md" /><span className="text-sm font-medium">{r.rating} out of 5</span></>}
            </div>
            {r.feedback
              ? <blockquote className="mt-3 whitespace-pre-wrap break-words text-base leading-relaxed">{r.feedback}</blockquote>
              : <p className="mt-3 text-sm text-muted-foreground">The student left no comment.</p>}
            <FactGrid
              className="mt-5 border-t border-border pt-5"
              facts={[
                {
                  label: 'Student',
                  value: r.user
                    ? hasPermission('users.read') ? <Link className="text-primary hover:underline" to={`/users/${r.user._id}`}>{r.user.name || 'Unnamed student'}</Link> : r.user.name || 'Unnamed student'
                    : 'Deleted student',
                },
                r.user?.student_id ? { label: 'Student ID', value: r.user.student_id, mono: true, copy: r.user.student_id } : null,
                r.user?.phone_number ? { label: 'Phone', value: r.user.phone_number, mono: true, copy: r.user.phone_number } : null,
                r.user?.email ? { label: 'Email', value: r.user.email, copy: r.user.email } : null,
                r.rating_submitted_at ? { label: 'Rated', value: istDayTime(r.rating_submitted_at) } : null,
                r.feedback_submitted_at ? { label: 'Commented', value: istDayTime(r.feedback_submitted_at) } : null,
              ]}
            />
          </Section>
        </div>

        <div className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <div className="lg:sticky lg:top-0">
            <FollowUpPanel review={r} assignees={assignees} canUpdate={hasPermission('videos.update')} onSaved={setData} onReload={refresh} />
          </div>
        </div>

        <div className="min-w-0 space-y-6 lg:col-start-1 lg:row-start-2">
          <Section
            title="Video"
            action={r.video && (
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm"><Link to={`/feedback/videos/${r.video._id}`}>All feedback for this video</Link></Button>
                {inExplorer && <Button asChild variant="outline" size="sm"><Link to={inExplorer}><ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />Open in Explorer</Link></Button>}
              </div>
            )}
          >
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="flex aspect-video w-full shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted sm:w-44">
                {r.video?.thumbnail_url ? <img src={r.video.thumbnail_url} alt="" className="h-full w-full object-cover" /> : <VideoIcon aria-hidden="true" className="h-6 w-6 text-muted-foreground" />}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="break-words text-sm font-semibold">{videoTitle}{r.video?.archived && <span className="font-normal text-muted-foreground"> (archived)</span>}</p>
                <p className="break-words text-[13px] text-muted-foreground">{pathText(r) || 'The video is no longer part of a course.'}</p>
                <p className="text-sm">
                  {r.faculty && !r.faculty.deleted ? <Link className="text-primary hover:underline" to={`/feedback/faculty/${r.faculty._id}`}>{r.faculty.name}</Link> : facultyName(r.faculty)}
                </p>
                {r.faculty_at_review && <p className="text-[13px] text-muted-foreground">When this review came in, the video was taught by {r.faculty_at_review.name}.</p>}
                <div className="pt-1"><AverageRating value={figures.average} count={figures.rating_count} /></div>
              </div>
            </div>
            {figures.rating_count > 1 && (
              <div className="mt-5 grid gap-6 border-t border-border pt-5 lg:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-[13px] font-medium text-muted-foreground">All ratings of this video</h3>
                  <RatingBars figures={figures} hrefFor={r.video ? (n) => `/feedback/videos/${r.video!._id}?status=all&rating=${n}` : undefined} />
                </div>
                <div className="min-w-0">
                  <h3 className="mb-2 text-[13px] font-medium text-muted-foreground">Average by month</h3>
                  <RatingTrend points={trend} />
                </div>
              </div>
            )}
          </Section>

          <Section title="History">
            <Timeline entries={[
              ...[...r.activity].reverse().map((a, i) => ({
                id: `${a.at}-${i}`,
                title: activityTitle(a),
                meta: <time dateTime={a.at} title={istDayTime(a.at)}>{istDayTime(a.at)} ({relativeTime(a.at)})</time>,
                body: a.note || undefined,
                tone: activityTone(a),
              })),
              { id: 'received', title: `${r.user?.name || 'A student'} sent this review`, meta: <time dateTime={r.createdAt}>{istDayTime(r.createdAt)}</time> },
            ]} />
          </Section>

          <Section
            title="Other reviews of this video"
            description={others.total ? undefined : 'Nobody else has reviewed it yet.'}
            flush
            action={others.total > others.reviews.length && r.video ? <Button asChild variant="outline" size="sm"><Link to={`/feedback/videos/${r.video._id}`}>Show all {others.total}</Link></Button> : undefined}
          >
            {others.total > 0 && <div className="border-t border-border"><ReviewList reviews={others.reviews} hideVideo hideFaculty empty={{ title: 'No other reviews' }} /></div>}
          </Section>
        </div>
      </div>
    </div>
  )
}
