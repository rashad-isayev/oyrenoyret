'use client';

import type { ChangeEvent } from 'react';
import { Input, type InputProps } from '@/components/ui/input';

type IntegerInputProps = Omit<
  InputProps,
  'type' | 'inputMode' | 'pattern' | 'value' | 'onChange'
> & {
  value: string;
  min?: number;
  max?: number;
  onValueChange: (value: number | undefined, draft: string) => void;
};

/**
 * A controlled, non-negative integer field that preserves incomplete drafts.
 *
 * Consumers receive both the editable string and a parsed value only when it
 * falls within the configured range. This lets users type multi-digit values
 * without an intermediate digit being rejected by domain validation.
 */
export function IntegerInput({
  value,
  min = 0,
  max,
  maxLength,
  onValueChange,
  ...props
}: IntegerInputProps) {
  const digitLimit =
    maxLength ??
    (max === undefined ? undefined : Math.max(1, String(Math.trunc(max)).length));

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const draft = event.target.value
      .replace(/\D/g, '')
      .slice(0, digitLimit);
    const parsed = draft === '' ? undefined : Number(draft);
    const isValid =
      parsed !== undefined &&
      Number.isSafeInteger(parsed) &&
      parsed >= min &&
      (max === undefined || parsed <= max);

    onValueChange(isValid ? parsed : undefined, draft);
  };

  return (
    <Input
      {...props}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={value}
      maxLength={digitLimit}
      onChange={handleChange}
    />
  );
}
