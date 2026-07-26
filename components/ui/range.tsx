'use client';

import * as React from 'react';
import { cn } from '@/src/lib/utils';

type RangeProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type'
>;

const Range = React.forwardRef<HTMLInputElement, RangeProps>(
  (
    {
      className,
      min = 0,
      max = 100,
      value,
      defaultValue,
      onChange,
      style,
      ...props
    },
    ref,
  ) => {
    const [internalValue, setInternalValue] = React.useState(() =>
      Number(defaultValue ?? min),
    );
    const numericMin = Number(min);
    const numericMax = Number(max);
    const numericValue = Number(value ?? internalValue);
    const span = Math.max(1, numericMax - numericMin);
    const progress = Math.min(
      100,
      Math.max(0, ((numericValue - numericMin) / span) * 100),
    );

    return (
      <input
        {...props}
        ref={ref}
        type="range"
        min={min}
        max={max}
        value={value ?? internalValue}
        onChange={(event) => {
          setInternalValue(Number(event.currentTarget.value));
          onChange?.(event);
        }}
        data-ui-control="range"
        className={cn('range-control', className)}
        style={
          {
            ...style,
            '--range-progress': `${progress}%`,
          } as React.CSSProperties
        }
      />
    );
  },
);
Range.displayName = 'Range';

export { Range };
