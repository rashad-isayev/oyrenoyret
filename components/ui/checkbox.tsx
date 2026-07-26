'use client';

import * as React from 'react';
import { PiCheckBold as Check } from 'react-icons/pi';
import { cn } from '@/src/lib/utils';

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, ...props }, ref) => {
    return (
      <label className="relative inline-flex cursor-pointer items-center">
        <input
          type="checkbox"
          ref={ref}
          checked={checked}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          className="peer sr-only"
          {...props}
        />
        <span
          className={cn(
            'flex h-4 w-4 shrink-0 items-center justify-center rounded border border-input',
            'bg-background transition-colors duration-150',
            'peer-focus-visible:ring-1 peer-focus-visible:ring-ring/75 peer-focus-visible:ring-offset-0',
            'peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
            'peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground',
            className
          )}
        >
          <Check
            className={cn(
              'h-3 w-3 transition-opacity',
              checked ? 'opacity-100' : 'opacity-0'
            )}
          />
        </span>
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export { Checkbox };
