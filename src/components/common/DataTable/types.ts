import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

/**
 * Column definition for DataTable
 */
export interface ColumnDef<TData> {
  /** Unique identifier for the column */
  id: string;
  /** Column header text */
  header: string;
  /** Column width class (e.g., 'w-32', 'w-64') */
  width?: string;
  /** Whether the column can be sorted */
  sortable?: boolean;
  /** Cell renderer function */
  cell: (row: TData) => ReactNode;
  /** Optional header cell class */
  headerClassName?: string;
  /** Optional cell class */
  cellClassName?: string;
}

/**
 * Empty state configuration
 */
export interface EmptyStateConfig {
  /** Icon to display */
  icon?: LucideIcon;
  /** Main message */
  title: string;
  /** Optional description */
  description?: string;
  /** Optional action button */
  action?: ReactNode;
}

/**
 * Pagination configuration
 */
export interface PaginationConfig {
  /** Current page number (1-indexed) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Total count of items */
  totalCount: number;
  /** Page change handler */
  onPageChange: (page: number) => void;
  /** Items per page */
  pageSize?: number;
}

/**
 * DataTable props
 */
export interface DataTableProps<TData> {
  /** Array of data to display */
  data: TData[];
  /** Column definitions */
  columns: ColumnDef<TData>[];
  /** Loading state */
  isLoading?: boolean;
  /** Empty state configuration */
  emptyState?: EmptyStateConfig;
  /** Pagination configuration */
  pagination?: PaginationConfig;
  /** Optional row click handler */
  onRowClick?: (row: TData) => void;
  /** Optional row key extractor */
  getRowKey?: (row: TData) => string;
  /** Optional custom skeleton count */
  skeletonCount?: number;
}
