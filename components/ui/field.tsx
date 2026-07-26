'use client';

import * as React from 'react';
import { cn } from '@/src/lib/utils';
import { fieldMeasureStyles } from '@/components/ui/control-styles';

type FieldProps = React.HTMLAttributes<HTMLDivElement> & {
  invalid?: boolean;
  measure?: keyof typeof fieldMeasureStyles;
};

const Field = React.forwardRef<HTMLDivElement, FieldProps>(
  ({ className, invalid = false, measure = 'fluid', ...props }, ref) => (
    <div
      ref={ref}
      className={cn('form-field', fieldMeasureStyles[measure], className)}
      data-invalid={invalid || undefined}
      {...props}
    />
  ),
);
Field.displayName = 'Field';

const FieldLabel = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label ref={ref} className={cn('form-field-label', className)} {...props} />
));
FieldLabel.displayName = 'FieldLabel';

const FieldOptional = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => (
  <span className={cn('form-field-optional', className)} {...props} />
);
FieldOptional.displayName = 'FieldOptional';

const FieldDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('form-field-support', className)} {...props} />
));
FieldDescription.displayName = 'FieldDescription';

const FieldError = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    role="alert"
    aria-live="polite"
    className={cn('form-field-error', className)}
    {...props}
  />
));
FieldError.displayName = 'FieldError';

export { Field, FieldDescription, FieldError, FieldLabel, FieldOptional };
