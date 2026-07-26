import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/src/lib/utils';
import { controlFocusStyles } from '@/components/ui/control-styles';

/**
 * Button variants - use semantically:
 *
 * - primary:   Main CTAs (submit, sign up, continue, primary actions)
 * - secondary: Secondary actions (view more, less prominent)
 * - outline:   Tertiary/cancel/back (previous, alternative options)
 * - ghost:     Minimal/inline (inside cards, subtle, no border)
 * - danger:    Dangerous actions (delete, remove, irreversible)
 * - destructive: Alias of `danger` for compatibility
 * - secondary-primary: Primary-tinted secondary (back/catalog nav: primary text, pastel primary bg)
 */
export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'link'
  | 'danger'
  | 'destructive'
  | 'secondary-primary';

export type ButtonSize =
  | 'sm'
  | 'md'
  | 'lg'
  | 'inline'
  | 'icon-xs'
  | 'icon-sm'
  | 'icon'
  | 'icon-wide';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'border border-transparent bg-primary text-primary-foreground shadow-[0_1px_2px_rgb(0_0_0/0.10)] hover:bg-primary/90 active:bg-primary/80',
  secondary:
    'border border-transparent bg-secondary text-secondary-foreground hover:bg-accent active:bg-border/80',
  outline:
    'border border-border/70 bg-background text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.025)] hover:bg-secondary active:bg-accent',
  ghost: 'border border-transparent text-muted-foreground hover:bg-secondary hover:text-foreground active:bg-accent',
  link: 'border border-transparent text-primary underline-offset-4 hover:underline',
  danger:
    'border border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90',
  destructive:
    'border border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90',
  'secondary-primary':
    'border border-transparent bg-primary/10 text-primary hover:bg-primary/15 active:bg-primary/20',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-9 rounded-full px-3.5 text-sm',
  md: 'h-10 rounded-full px-4 text-sm',
  lg: 'h-11 rounded-full px-5 text-sm',
  inline: 'h-auto rounded-sm p-0 text-sm',
  'icon-xs': 'h-8 w-8 shrink-0 rounded-full p-0',
  'icon-sm': 'h-10 w-10 shrink-0 rounded-full p-0 sm:h-9 sm:w-9',
  icon: 'h-11 w-11 shrink-0 rounded-full p-0 sm:h-10 sm:w-10',
  'icon-wide': 'h-10 w-10 shrink-0 rounded-full p-0 sm:w-10',
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      asChild = false,
      children,
      ...props
    },
    ref
  ) => {
    const base =
      'inline-flex touch-manipulation items-center justify-center gap-2 whitespace-nowrap font-medium transition-[color,background-color,border-color,box-shadow,transform] duration-200 aria-pressed:bg-primary/10 aria-pressed:text-primary data-[active=true]:bg-primary/10 data-[active=true]:text-primary active:scale-[0.98] motion-reduce:transform-none disabled:pointer-events-none disabled:opacity-45 disabled:shadow-none [&_svg]:shrink-0';

    const styles = cn(
      base,
      controlFocusStyles,
      variantStyles[variant],
      sizeStyles[size],
      className,
    );

    const Component = asChild ? Slot : 'button';
    return (
      <Component
        ref={ref}
        className={styles}
        {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
      >
        {children}
      </Component>
    );
  }
);
Button.displayName = 'Button';

export { Button };
