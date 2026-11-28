import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AlertCircle, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DataTableProps } from './types';
import { DataTablePagination } from './DataTablePagination';

/**
 * DataTable - Reusable table component with loading states, pagination, and empty states
 * Follows Notion/Obsidian minimal design principles
 */
export function DataTable<TData>({
  data,
  columns,
  isLoading = false,
  emptyState,
  error = null,
  onRetry,
  pagination,
  onRowClick,
  getRowKey,
  skeletonCount = 5,
}: DataTableProps<TData>) {
  const hasData = data.length > 0;
  // A failed refresh keeps the rows already on screen.
  const showError = !isLoading && !!error && !hasData;
  const showEmpty = !isLoading && !hasData && !error;
  const showData = !isLoading && hasData;

  return (
    <div className="space-y-4">
      {/* Results count. While the first page loads its line is held, so the table does not jump down. */}
      {pagination && showData && (
        <div className="text-sm text-muted-foreground">
          Showing {data.length} of {pagination.totalCount} results
        </div>
      )}
      {pagination && isLoading && !hasData && (
        <div aria-hidden="true" className="flex h-5 items-center"><Skeleton className="h-3.5 w-40" /></div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((column) => (
                <TableHead
                  key={column.id}
                  className={cn(column.width, column.headerClassName)}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Loading skeletons */}
            {isLoading &&
              Array.from({ length: skeletonCount }).map((_, i) => (
                <TableRow key={`skeleton-${i}`} className="hover:bg-transparent">
                  {columns.map((column) => (
                    <TableCell key={column.id} className="h-12">
                      <Skeleton className="h-4 w-3/4" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {showError && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length} className="py-12 text-center">
                  <div role="alert" className="flex flex-col items-center gap-3">
                    <AlertCircle aria-hidden="true" className="h-7 w-7 text-danger" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">This list could not be loaded</p>
                      <p className="mt-1 text-sm text-muted-foreground">{error}</p>
                    </div>
                    {onRetry && (
                      <Button variant="outline" size="sm" onClick={onRetry}>
                        <RotateCw className="h-3.5 w-3.5" />
                        Try again
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}

            {/* Empty state */}
            {showEmpty && (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center"
                >
                  <div className="flex flex-col items-center justify-center gap-3">
                    {emptyState?.icon && (
                      <emptyState.icon className="h-10 w-10 text-muted-foreground opacity-50" />
                    )}
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {emptyState?.title || 'No data'}
                      </p>
                      {emptyState?.description && (
                        <p className="text-sm text-muted-foreground">
                          {emptyState.description}
                        </p>
                      )}
                    </div>
                    {emptyState?.action}
                  </div>
                </TableCell>
              </TableRow>
            )}

            {/* Data rows */}
            {showData &&
              data.map((row, index) => {
                const key = getRowKey ? getRowKey(row) : `row-${index}`;
                const isClickable = !!onRowClick;

                return (
                  <TableRow
                    key={key}
                    onClick={(e) => {
                      if (!onRowClick) return;
                      const target = e.target as HTMLElement;
                      if (target.closest('button, [role="menuitem"], [role="switch"], input, a, [data-no-row-click]')) return;
                      onRowClick(row);
                    }}
                    tabIndex={isClickable ? 0 : undefined}
                    onKeyDown={isClickable ? (e) => {
                      // Keyboard users open a row with Enter, like a link
                      if (e.key !== 'Enter' || e.target !== e.currentTarget) return;
                      e.preventDefault();
                      onRowClick!(row);
                    } : undefined}
                    className={cn(
                      'h-12',
                      isClickable && 'cursor-pointer transition-colors hover:bg-accent/50 focus-visible:bg-accent/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[hsl(var(--ring))]'
                    )}
                  >
                    {columns.map((column) => (
                      <TableCell
                        key={column.id}
                        className={cn(column.cellClassName)}
                      >
                        {column.cell(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && !isLoading && hasData && (
        <DataTablePagination {...pagination} />
      )}
    </div>
  );
}
