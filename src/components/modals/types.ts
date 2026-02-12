import { ReactNode } from 'react';

/**
 * Base modal props
 */
export interface BaseModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Close handler */
  onClose: () => void;
}

/**
 * Form modal props
 */
export interface FormModalProps extends BaseModalProps {
  /** Modal title */
  title: string;
  /** Optional description */
  description?: string;
  /** Form content */
  children: ReactNode;
  /** Submit handler */
  onSubmit: () => void | Promise<void>;
  /** Whether form is submitting */
  isSubmitting?: boolean;
  /** Submit button text */
  submitLabel?: string;
  /** Modal width */
  width?: 'sm' | 'md' | 'lg';
}

/**
 * Delete impact details
 */
export interface DeleteImpactDetail {
  /** Label for the impacted item type */
  label: string;
  /** Count of impacted items */
  count: number;
}

/**
 * Delete warning configuration
 */
export interface DeleteWarningConfig {
  /** Warning message */
  message: string;
  /** Array of impact details */
  details?: DeleteImpactDetail[];
}

/**
 * Delete modal props
 */
export interface DeleteModalProps extends BaseModalProps {
  /** Modal title */
  title?: string;
  /** Name of the item being deleted */
  itemName?: string;
  /** Delete confirmation handler */
  onConfirm: () => Promise<void>;
  /** Optional warning configuration */
  warning?: DeleteWarningConfig;
  /** Whether to require typing item name to confirm */
  requireConfirmation?: boolean;
  /** Whether delete impact is loading */
  isLoadingImpact?: boolean;
}
