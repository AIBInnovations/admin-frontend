import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, XCircle, Loader2, AlertOctagon, Video } from 'lucide-react';
import {
  publishService,
  EntityType,
  PublishInfo,
  PublishOptions,
  UnpublishOptions,
} from '@/services/publish.service';
import { toast } from 'sonner';

interface PublishConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: EntityType;
  entityId: string;
  action: 'publish' | 'unpublish';
  onSuccess: () => void;
}

/** Pretty-print entity type for display */
function formatEntityType(type: string): string {
  const map: Record<string, string> = {
    package: 'Package',
    series: 'Series',
    module: 'Module',
    video: 'Video',
    document: 'Document',
    livesession: 'Live Session',
    workshop: 'Workshop',
    book: 'Book',
    form: 'Form',
    banner: 'Banner',
    homesection: 'Home Section',
  };
  return map[type] || type;
}

/** Get draft child entries from children_summary */
function getDraftChildren(summary: PublishInfo['children_summary']) {
  const entries: Array<{ label: string; count: number }> = [];
  if (summary.draft_series > 0) entries.push({ label: 'draft series', count: summary.draft_series });
  if (summary.draft_modules > 0) entries.push({ label: 'draft modules', count: summary.draft_modules });
  if (summary.draft_videos > 0) entries.push({ label: 'draft videos', count: summary.draft_videos });
  if (summary.draft_documents > 0) entries.push({ label: 'draft documents', count: summary.draft_documents });
  return entries;
}

/** Get published child entries from children_summary */
function getPublishedChildren(summary: PublishInfo['children_summary']) {
  const entries: Array<{ label: string; count: number }> = [];
  if (summary.published_series > 0) entries.push({ label: 'published series', count: summary.published_series });
  if (summary.published_modules > 0) entries.push({ label: 'published modules', count: summary.published_modules });
  if (summary.published_videos > 0) entries.push({ label: 'published videos', count: summary.published_videos });
  if (summary.published_documents > 0) entries.push({ label: 'published documents', count: summary.published_documents });
  return entries;
}

/** Check if there are any draft children */
function hasDraftChildren(summary: PublishInfo['children_summary']): boolean {
  return getDraftChildren(summary).length > 0;
}

/** Check if there are any published children */
function hasPublishedChildren(summary: PublishInfo['children_summary']): boolean {
  return getPublishedChildren(summary).length > 0;
}

export function PublishConfirmModal({
  open,
  onOpenChange,
  entityType,
  entityId,
  action,
  onSuccess,
}: PublishConfirmModalProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<PublishInfo | null>(null);

  const fetchPublishInfo = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await publishService.getPublishInfo(entityType, entityId);
      setInfo(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load publish information');
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    if (open) {
      fetchPublishInfo();
    } else {
      // Reset state when modal closes
      setInfo(null);
      setError(null);
      setLoading(true);
      setSubmitting(false);
    }
  }, [open, fetchPublishInfo]);

  const handleAction = async (options: PublishOptions | UnpublishOptions = {}) => {
    setSubmitting(true);
    try {
      if (action === 'publish') {
        await publishService.publish(entityType, entityId, options as PublishOptions);
        toast.success(`${formatEntityType(entityType)} published successfully`);
      } else {
        await publishService.unpublish(entityType, entityId, options as UnpublishOptions);
        toast.success(`${formatEntityType(entityType)} unpublished successfully`);
      }
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || `Failed to ${action}`);
    } finally {
      setSubmitting(false);
    }
  };

  const entityName = info?.entity?.name || formatEntityType(entityType);
  const isPublish = action === 'publish';

  return (
    <Dialog open={open} onOpenChange={(val) => !submitting && onOpenChange(val)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isPublish ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            )}
            {isPublish ? 'Publish' : 'Unpublish'} {formatEntityType(entityType)}
          </DialogTitle>
          <DialogDescription>
            Review the details below before proceeding.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Checking publish status...</span>
            </div>
          )}

          {/* Error state */}
          {!loading && error && (
            <div className="flex flex-col items-center gap-3 py-6">
              <XCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-destructive text-center">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchPublishInfo}>
                Retry
              </Button>
            </div>
          )}

          {/* Content */}
          {!loading && !error && info && (
            <>
              {isPublish ? (
                <PublishContent
                  info={info}
                  entityType={entityType}
                  entityName={entityName}
                  submitting={submitting}
                  onAction={handleAction}
                  onCancel={() => onOpenChange(false)}
                />
              ) : (
                <UnpublishContent
                  info={info}
                  entityType={entityType}
                  entityName={entityName}
                  submitting={submitting}
                  onAction={handleAction}
                  onCancel={() => onOpenChange(false)}
                />
              )}
            </>
          )}
        </div>

        {/* Show footer only during loading or error states (content renders its own buttons) */}
        {(loading || error) && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Publish scenarios
// ---------------------------------------------------------------------------

interface ScenarioProps {
  info: PublishInfo;
  entityType: EntityType;
  entityName: string;
  submitting: boolean;
  onAction: (options?: PublishOptions | UnpublishOptions) => void;
  onCancel: () => void;
}

function PublishContent({ info, entityType, entityName, submitting, onAction, onCancel }: ScenarioProps) {
  // Hard block: failed videos
  if (info.failed_videos > 0) {
    return (
      <>
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertOctagon className="h-5 w-5 text-destructive" />
            <span className="text-sm font-semibold text-destructive">Cannot Publish</span>
          </div>
          <p className="text-sm text-muted-foreground">
            This {formatEntityType(entityType).toLowerCase()} has{' '}
            <span className="font-semibold text-destructive">{info.failed_videos} failed video{info.failed_videos > 1 ? 's' : ''}</span>.
            Please fix or remove the failed videos before publishing.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            OK
          </Button>
        </DialogFooter>
      </>
    );
  }

  const hasUnpubAncestors = info.unpublished_ancestors.length > 0;
  const hasDrafts = hasDraftChildren(info.children_summary);
  const draftEntries = getDraftChildren(info.children_summary);
  const hasInactiveEntity = !info.entity.is_active;
  const hasInactiveChildren = info.children_summary.inactive_items > 0;
  const hasProcessing = info.processing_videos > 0;
  const hasAnyConflict = hasUnpubAncestors || hasDrafts || hasInactiveEntity || hasInactiveChildren || hasProcessing;

  // Simple confirmation — no conflicts
  if (!hasAnyConflict) {
    return (
      <>
        <p className="text-sm">
          Are you sure you want to publish <span className="font-semibold">{entityName}</span>?
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={() => onAction()} disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Publish
          </Button>
        </DialogFooter>
      </>
    );
  }

  // Conflicts present — render warnings
  return (
    <>
      {/* Processing videos warning */}
      {hasProcessing && (
        <WarningBox variant="info">
          <div className="flex items-center gap-2">
            <Video className="h-4 w-4 text-blue-500" />
            <span className="text-sm">
              <span className="font-semibold">{info.processing_videos}</span> video{info.processing_videos > 1 ? 's are' : ' is'} still processing.
              You can publish now, but those videos will not be available until processing completes.
            </span>
          </div>
        </WarningBox>
      )}

      {/* Unpublished ancestors */}
      {hasUnpubAncestors && (
        <WarningBox variant="warning">
          <p className="text-sm font-medium mb-2">Unpublished ancestors detected:</p>
          <div className="space-y-1">
            {info.parent_chain.map((ancestor) => (
              <div key={`${ancestor.type}-${ancestor.id}`} className="flex items-center gap-2 text-sm">
                {ancestor.publish_status === 'published' ? (
                  <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                )}
                <span className="text-muted-foreground">{formatEntityType(ancestor.type)}:</span>
                <span className="font-medium truncate">{ancestor.name}</span>
                <Badge variant={ancestor.publish_status === 'published' ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                  {ancestor.publish_status}
                </Badge>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            This content will not be visible to users until all ancestors are published.
          </p>
        </WarningBox>
      )}

      {/* Draft children */}
      {hasDrafts && (
        <WarningBox variant="warning">
          <p className="text-sm font-medium mb-2">Draft children found:</p>
          <ul className="space-y-1">
            {draftEntries.map((entry, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                <span><span className="font-semibold">{entry.count}</span> {entry.label}</span>
              </li>
            ))}
          </ul>
        </WarningBox>
      )}

      {/* Inactive entity */}
      {hasInactiveEntity && (
        <WarningBox variant="warning">
          <p className="text-sm">
            <span className="font-semibold">{entityName}</span> is currently <Badge variant="secondary" className="text-[10px] px-1.5 py-0 mx-1">inactive</Badge>.
            Publishing while inactive means it will not appear in the app.
          </p>
        </WarningBox>
      )}

      {/* Inactive children in cascade */}
      {hasInactiveChildren && (
        <WarningBox variant="warning">
          <p className="text-sm">
            <span className="font-semibold">{info.children_summary.inactive_items}</span> child item{info.children_summary.inactive_items > 1 ? 's are' : ' is'} inactive
            and will not be visible even after publishing.
          </p>
        </WarningBox>
      )}

      {/* Action buttons — build based on which conflicts are present */}
      <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
        <div className="flex flex-wrap gap-2 justify-end">
          <Button variant="outline" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>

          {/* "Publish Only" — always available when not hard-blocked */}
          <Button
            variant="secondary"
            onClick={() => onAction()}
            disabled={submitting}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Publish Only
          </Button>

          {/* Publish Entire Chain — when unpublished ancestors exist */}
          {hasUnpubAncestors && (
            <Button
              onClick={() => onAction({ publish_ancestors: true, cascade: hasDrafts })}
              disabled={submitting}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Publish Entire Chain
            </Button>
          )}

          {/* Publish All — when draft children exist but no ancestor issues */}
          {hasDrafts && !hasUnpubAncestors && (
            <Button
              onClick={() =>
                onAction({
                  cascade: true,
                  activate_all: hasInactiveChildren || undefined,
                })
              }
              disabled={submitting}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {hasInactiveChildren ? 'Publish All + Activate All' : 'Publish All'}
            </Button>
          )}

          {/* Publish + Set Active — when entity itself is inactive */}
          {hasInactiveEntity && !hasUnpubAncestors && !hasDrafts && (
            <Button
              onClick={() => onAction({ activate_all: true })}
              disabled={submitting}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Publish + Set Active
            </Button>
          )}
        </div>
      </DialogFooter>
    </>
  );
}

// ---------------------------------------------------------------------------
// Unpublish scenarios
// ---------------------------------------------------------------------------

function UnpublishContent({ info, entityType, entityName, submitting, onAction, onCancel }: ScenarioProps) {
  const pubChildren = getPublishedChildren(info.children_summary);
  const hasPubChildren = pubChildren.length > 0;
  const hasPurchases = info.active_purchases > 0;
  const hasEnrollments = info.active_enrollments > 0;
  const hasAnyConflict = hasPubChildren || hasPurchases || hasEnrollments;

  // Simple confirmation
  if (!hasAnyConflict) {
    return (
      <>
        <p className="text-sm">
          Are you sure you want to unpublish <span className="font-semibold">{entityName}</span>?
          It will no longer be visible to users.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => onAction()} disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Unpublish
          </Button>
        </DialogFooter>
      </>
    );
  }

  return (
    <>
      {/* Published children */}
      {hasPubChildren && (
        <WarningBox variant="warning">
          <p className="text-sm font-medium mb-2">Published children will be affected:</p>
          <ul className="space-y-1">
            {pubChildren.map((entry, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                <span><span className="font-semibold">{entry.count}</span> {entry.label}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground mt-2">
            These children are currently published. Unpublishing the parent may make them inaccessible.
          </p>
        </WarningBox>
      )}

      {/* Active purchases */}
      {hasPurchases && (
        <WarningBox variant="danger">
          <div className="flex items-center gap-2">
            <AlertOctagon className="h-4 w-4 text-destructive shrink-0" />
            <p className="text-sm">
              <span className="font-semibold text-destructive">{info.active_purchases}</span> user{info.active_purchases > 1 ? 's have' : ' has'} active
              purchase{info.active_purchases > 1 ? 's' : ''} for this {formatEntityType(entityType).toLowerCase()}.
              Unpublishing will revoke their access.
            </p>
          </div>
        </WarningBox>
      )}

      {/* Active enrollments */}
      {hasEnrollments && (
        <WarningBox variant="danger">
          <div className="flex items-center gap-2">
            <AlertOctagon className="h-4 w-4 text-destructive shrink-0" />
            <p className="text-sm">
              <span className="font-semibold text-destructive">{info.active_enrollments}</span> user{info.active_enrollments > 1 ? 's have' : ' has'} active
              enrollment{info.active_enrollments > 1 ? 's' : ''} for this {formatEntityType(entityType).toLowerCase()}.
              Unpublishing will affect their access.
            </p>
          </div>
        </WarningBox>
      )}

      {/* Action buttons */}
      <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
        <div className="flex flex-wrap gap-2 justify-end">
          <Button variant="outline" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>

          <Button
            variant="destructive"
            onClick={() => onAction()}
            disabled={submitting}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Unpublish Only
          </Button>

          {hasPubChildren && (
            <Button
              variant="destructive"
              onClick={() => onAction({ cascade: true })}
              disabled={submitting}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Unpublish All Below
            </Button>
          )}

          {!hasPubChildren && (hasPurchases || hasEnrollments) && (
            <Button
              variant="destructive"
              onClick={() => onAction()}
              disabled={submitting}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Unpublish Anyway
            </Button>
          )}
        </div>
      </DialogFooter>
    </>
  );
}

// ---------------------------------------------------------------------------
// Warning box helper
// ---------------------------------------------------------------------------

function WarningBox({
  variant,
  children,
}: {
  variant: 'info' | 'warning' | 'danger';
  children: React.ReactNode;
}) {
  const styles = {
    info: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30',
    warning: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30',
    danger: 'border-destructive/50 bg-destructive/5',
  };

  return (
    <div className={`rounded-lg border p-3 ${styles[variant]}`}>
      {children}
    </div>
  );
}
