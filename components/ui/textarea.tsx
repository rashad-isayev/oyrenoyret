'use client';

import * as React from 'react';
import { cn } from '@/src/lib/utils';
import {
  fieldControlStyles,
  fieldTextStyles,
} from '@/components/ui/control-styles';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

/** Shared multiline field. Use className only for contextual min/max height. */
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      data-ui-control="textarea"
      data-field-size="default"
      className={cn(
        fieldControlStyles,
        fieldTextStyles,
        'min-h-28 resize-y',
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';

export { Textarea };
