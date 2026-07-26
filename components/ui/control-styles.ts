/**
 * Shared interaction contracts for form controls.
 *
 * Keeping these tokens here prevents inputs, selects, and buttons from drifting
 * apart when a page needs a different visual variant.
 */
export const controlFocusStyles =
  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/75 focus-visible:ring-offset-0';

export const fieldHeightStyles = 'h-11';

export const fieldTextStyles = 'px-3.5 py-2 text-[15px] leading-6';

export const fieldSizeStyles = {
  default: `${fieldHeightStyles} ${fieldTextStyles}`,
  compact: 'h-9 px-3.5 py-1.5 text-sm leading-5',
  prominent: 'h-12 px-4 py-2 text-lg leading-7',
} as const;

export const selectSizeStyles = {
  default: `${fieldHeightStyles} py-2 pl-3.5 pr-10 text-[15px] leading-6`,
  compact: 'h-9 py-1.5 pl-3.5 pr-10 text-sm leading-5',
  toolbar: 'h-8 py-1 pl-3 pr-9 text-xs leading-5',
} as const;

export const fieldMeasureStyles = {
  fluid: 'w-full',
  compact: 'w-full max-w-60',
} as const;

/**
 * Every standard field uses this single CSS contract. Element-specific classes
 * may only describe inherent behavior such as textarea resizing or select icons.
 */
export const fieldControlStyles = 'field-control';
export const fieldControlFrameStyles = 'field-control-frame';
