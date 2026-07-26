'use client';

import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/src/lib/utils';
import { getAvatarSrc, getStableAvatarVariant, isAvatarVariant } from '@/src/lib/avatar';
import { UserHoverCard } from '@/src/components/users/user-hover-card';

/**
 * Profile avatar for logged-in users.
 */

interface ProfileAvatarProps {
  userId: string;
  firstName?: string | null;
  lastName?: string | null;
  avatarVariant?: string | null;
  className?: string;
  size?: 'sm' | 'md';
  showHoverCard?: boolean;
  href?: string;
  title?: string;
  ariaLabel?: string;
  disabled?: boolean;
  static?: boolean;
}

export function ProfileAvatar({
  userId,
  firstName,
  lastName,
  avatarVariant,
  className,
  size = 'sm',
  showHoverCard = true,
  href,
  title = 'View profile',
  ariaLabel,
  disabled = false,
  static: isStatic = false,
}: ProfileAvatarProps) {
  const sizeClass = size === 'sm' ? 'h-8 w-8 text-xs' : 'h-9 w-9 text-sm';
  const resolvedVariant = isAvatarVariant(avatarVariant)
    ? avatarVariant
    : getStableAvatarVariant(userId);
  const src = getAvatarSrc(resolvedVariant);
  const resolvedHref = href ?? `/u/${userId}`;

  const rootClassName = cn(
    'relative flex items-center justify-center overflow-hidden rounded-full font-medium text-white ring-1 ring-black/5',
    sizeClass,
    !disabled && !isStatic && 'transition-opacity hover:opacity-90',
    disabled && 'cursor-not-allowed opacity-60',
    className,
  );
  const avatarImage = (
    <>
      <Image
        src={src}
        alt="Avatar"
        fill
        sizes={size === 'sm' ? '32px' : '36px'}
        className="object-cover"
      />
    </>
  );
  const avatar = disabled ? (
    <span className={rootClassName} aria-disabled="true" title={title}>
      {avatarImage}
    </span>
  ) : isStatic ? (
    <span className={rootClassName} aria-hidden="true">
      {avatarImage}
    </span>
  ) : (
    <Link
      href={resolvedHref}
      aria-label={ariaLabel}
      className={rootClassName}
      title={title}
    >
      {avatarImage}
    </Link>
  );

  if (!showHoverCard) return avatar;

  const fallbackName = [firstName, lastName].filter(Boolean).join(' ').trim() || 'User';
  return (
    <UserHoverCard
      lookupId={userId}
      fallbackName={fallbackName}
      avatarVariant={avatarVariant}
      href={resolvedHref}
    >
      {avatar}
    </UserHoverCard>
  );
}
