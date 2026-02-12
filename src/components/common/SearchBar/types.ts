import { ReactNode } from 'react';

/**
 * Search bar props
 */
export interface SearchBarProps {
  /** Search query value */
  value: string;
  /** Change handler */
  onChange: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Whether to show clear button */
  showClear?: boolean;
  /** Debounce delay in ms */
  debounceMs?: number;
  /** Width variant */
  width?: 'sm' | 'md' | 'lg' | 'full';
}

/**
 * Filter configuration for a single filter
 */
export interface FilterConfig {
  /** Unique filter key */
  key: string;
  /** Filter label */
  label: string;
  /** Filter type */
  type: 'select';
  /** Filter options (for select type) */
  options: Array<{ label: string; value: string }>;
  /** Placeholder for select */
  placeholder?: string;
  /** Default value */
  defaultValue?: string;
}

/**
 * Search with filters props
 */
export interface SearchWithFiltersProps {
  /** Search query value */
  value: string;
  /** Search change handler */
  onChange: (value: string) => void;
  /** Search placeholder */
  placeholder?: string;
  /** Filter configurations */
  filters?: FilterConfig[];
  /** Active filters */
  activeFilters?: Record<string, any>;
  /** Filter change handler */
  onFiltersChange?: (filters: Record<string, any>) => void;
  /** Optional custom action button */
  action?: ReactNode;
}
