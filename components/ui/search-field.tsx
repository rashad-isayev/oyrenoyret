'use client';

import * as React from 'react';
import {
  PiMagnifyingGlass as SearchIcon,
  PiX as ClearIcon,
} from 'react-icons/pi';
import { Button } from '@/components/ui/button';
import { Input, type InputProps } from '@/components/ui/input';
import { cn } from '@/src/lib/utils';

export interface SearchFieldProps extends Omit<InputProps, 'type'> {
  /** Accessible label for the input when no visible label is present. */
  searchLabel: string;
  /** When provided, a clear action appears while the field has a value. */
  clearLabel?: string;
  onClear?: () => void;
  containerClassName?: string;
}

/**
 * The single search-input pattern used across feeds and collections.
 * Search icon placement, native cancel-button removal, and clear affordance are
 * owned here so pages only manage search state and results.
 */
const SearchField = React.forwardRef<HTMLInputElement, SearchFieldProps>(
  (
    {
      className,
      containerClassName,
      searchLabel,
      clearLabel = 'Clear search',
      onClear,
      value,
      defaultValue,
      ...props
    },
    ref,
  ) => {
    const hasValue =
      value !== undefined
        ? String(value).length > 0
        : defaultValue !== undefined && String(defaultValue).length > 0;

    return (
      <div className={cn('relative min-w-0', containerClassName)}>
        <SearchIcon
          className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          ref={ref}
          type="search"
          value={value}
          defaultValue={defaultValue}
          aria-label={searchLabel}
          className={cn(
            'border-transparent bg-secondary pl-10 shadow-none hover:border-transparent hover:bg-accent/70 focus-visible:bg-secondary [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden',
            onClear && 'pr-11',
            className,
          )}
          {...props}
        />
        {onClear && hasValue ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClear}
            className="absolute right-1.5 top-1/2 -translate-y-1/2"
            aria-label={clearLabel}
          >
            <ClearIcon className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : null}
      </div>
    );
  },
);
SearchField.displayName = 'SearchField';

export { SearchField };
