'use client';

import * as React from 'react';
import { PiCaretDown as ChevronDown } from 'react-icons/pi';
import { cn } from '@/src/lib/utils';
import {
  fieldControlStyles,
  selectSizeStyles,
} from '@/components/ui/control-styles';

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  placeholder?: string;
  fieldSize?: keyof typeof selectSizeStyles;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, placeholder, fieldSize = 'default', ...props }, ref) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          data-ui-control="select"
          data-field-size={fieldSize}
          className={cn(
            fieldControlStyles,
            'cursor-pointer',
            selectSizeStyles[fieldSize],
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {children}
        </select>
        <ChevronDown
          className={cn(
            'pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground',
            fieldSize === 'toolbar' ? 'right-3' : 'right-3.5',
          )}
          aria-hidden
        />
      </div>
    );
  }
);
Select.displayName = 'Select';

const SelectItem = ({
  value,
  children,
  ...props
}: React.OptionHTMLAttributes<HTMLOptionElement>) => (
  <option value={value} {...props}>
    {children}
  </option>
);

export { Select, SelectItem };
