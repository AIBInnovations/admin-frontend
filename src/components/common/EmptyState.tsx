import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface EmptyStateProps {
  /** Icon to display */
  icon?: LucideIcon;
  /** Main title */
  title: string;
  /** Optional description */
  description?: string;
  /** Optional action button or element */
  action?: ReactNode;
}

/**
 * EmptyState - Consistent empty state display component
 * Used in tables, lists, and other data displays
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      {Icon && (
        <Icon className="h-12 w-12 text-muted-foreground opacity-50" />
      )}
      <div className="space-y-1 text-center">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
