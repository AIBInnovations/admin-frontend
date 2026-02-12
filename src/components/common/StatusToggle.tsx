import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface StatusToggleProps {
  /** Current checked state */
  checked: boolean;
  /** Change handler */
  onCheckedChange: (checked: boolean) => void;
  /** Label for active state */
  activeLabel?: string;
  /** Label for inactive state */
  inactiveLabel?: string;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Disabled state */
  disabled?: boolean;
  /** Optional className */
  className?: string;
}

/**
 * StatusToggle - Reusable active/inactive toggle component
 * Combines Switch with status label for consistent UI
 */
export function StatusToggle({
  checked,
  onCheckedChange,
  activeLabel = 'Active',
  inactiveLabel = 'Inactive',
  size = 'md',
  disabled = false,
  className,
}: StatusToggleProps) {
  const sizeClasses = {
    sm: 'scale-75',
    md: 'scale-100',
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className={sizeClasses[size]}
      />
      <span className="text-xs text-muted-foreground">
        {checked ? activeLabel : inactiveLabel}
      </span>
    </div>
  );
}
