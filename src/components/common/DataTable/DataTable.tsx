import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
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
  pagination,
  onRowClick,
  getRowKey,
  skeletonCount = 5,
}: DataTableProps<TData>) {
  const hasData = data.length > 0;
  const showEmpty = !isLoading && !hasData;
  const showData = !isLoading && hasData;

  return (
    <div className="space-y-4">
      {/* Results count */}
      {pagination && showData && (
        <div className="text-sm text-muted-foreground">
          Showing {data.length} of {pagination.totalCount} results
        </div>
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
                    onClick={() => onRowClick?.(row)}
                    className={cn(
                      'h-12',
                      isClickable && 'cursor-pointer'
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
