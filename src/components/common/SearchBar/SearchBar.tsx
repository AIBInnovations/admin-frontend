import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SearchBarProps } from './types';

/**
 * SearchBar - Basic search input component
 * Minimal design with left icon and optional debounce
 */
export function SearchBar({
  value,
  onChange,
  placeholder = 'Search...',
  showClear = true,
  debounceMs = 0,
  width = 'md',
}: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value);

  // Sync with external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounce logic
  useEffect(() => {
    if (debounceMs > 0) {
      const timer = setTimeout(() => {
        onChange(localValue);
      }, debounceMs);
      return () => clearTimeout(timer);
    } else {
      onChange(localValue);
    }
  }, [localValue, debounceMs, onChange]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    if (debounceMs === 0) {
      onChange(newValue);
    }
  };

  const handleClear = () => {
    setLocalValue('');
    onChange('');
  };

  const widthClasses = {
    sm: 'max-w-xs',
    md: 'max-w-sm',
    lg: 'max-w-md',
    full: 'w-full',
  };

  return (
    <div className={cn('relative', widthClasses[width])}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        className="h-9 pl-9 pr-9"
      />
      {showClear && localValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
