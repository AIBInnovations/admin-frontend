import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchWithFiltersProps } from './types';

/**
 * SearchWithFilters - Search input combined with filter dropdowns
 * Provides a unified toolbar for search and filtering
 */
export function SearchWithFilters({
  value,
  onChange,
  placeholder = 'Search...',
  filters = [],
  activeFilters = {},
  onFiltersChange,
  action,
}: SearchWithFiltersProps) {
  const handleFilterChange = (key: string, filterValue: string) => {
    if (onFiltersChange) {
      onFiltersChange({
        ...activeFilters,
        [key]: filterValue,
      });
    }
  };

  return (
    <div className="flex items-center gap-4">
      {/* Search input */}
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-9 pl-9"
        />
      </div>

      {/* Filters */}
      {filters.map((filter) => (
        <Select
          key={filter.key}
          value={activeFilters[filter.key] || filter.defaultValue || ''}
          onValueChange={(value) => handleFilterChange(filter.key, value)}
        >
          <SelectTrigger className="h-9 w-[180px]">
            <SelectValue placeholder={filter.placeholder || filter.label} />
          </SelectTrigger>
          <SelectContent>
            {filter.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}

      {/* Optional action */}
      {action}
    </div>
  );
}
