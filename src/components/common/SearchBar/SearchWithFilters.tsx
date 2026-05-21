import { useState } from 'react';
import { Search, Check, ChevronsUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SearchWithFiltersProps, FilterConfig } from './types';

/**
 * SearchableFilter - Combobox-style filter with search
 */
function SearchableFilter({
  filter,
  value,
  onChange,
}: {
  filter: FilterConfig;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedOption = filter.options.find((opt) => opt.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-9 w-[180px] justify-between font-normal"
        >
          <span className="truncate">
            {selectedOption?.label || filter.placeholder || filter.label}
          </span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
        <Command>
          <CommandInput placeholder={`Search ${filter.label.toLowerCase()}...`} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {filter.options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === option.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/**
 * SearchWithFilters - Search input combined with filter dropdowns
 * Supports both regular selects and searchable combobox filters
 */
export function SearchWithFilters({
  value = '',
  onChange = () => {},
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

  const showHint = value.length > 0 && value.length < 3;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
      {/* Search input */}
      <div className="flex-1 sm:max-w-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="h-9 pl-9"
          />
        </div>
        {showHint && (
          <p className="mt-1 text-xs text-muted-foreground">
            Type {3 - value.length} more character{3 - value.length !== 1 ? 's' : ''} to search
          </p>
        )}
      </div>

      {/* Filters */}
      {filters.map((filter) =>
        filter.searchable ? (
          <SearchableFilter
            key={filter.key}
            filter={filter}
            value={activeFilters[filter.key] || filter.defaultValue || ''}
            onChange={(val) => handleFilterChange(filter.key, val)}
          />
        ) : (
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
        )
      )}

      {/* Optional action */}
      {action}
    </div>
  );
}
