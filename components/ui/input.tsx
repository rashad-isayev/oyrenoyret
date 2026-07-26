'use client';

import * as React from 'react';
import { cn } from '@/src/lib/utils';
import {
  fieldControlStyles,
  fieldSizeStyles,
} from '@/components/ui/control-styles';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  fieldSize?: keyof typeof fieldSizeStyles;
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, fieldSize = 'default', ...props }, ref) => {
    return (
      <input
        type={type}
        data-ui-control="input"
        data-field-size={fieldSize}
        className={cn(
          fieldControlStyles,
          fieldSizeStyles[fieldSize],
          type === 'number' && 'input-number',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
