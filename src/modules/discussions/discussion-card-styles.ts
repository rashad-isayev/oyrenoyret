/**
 * Shared visual contract for discussion summaries and opening-post surfaces.
 * Structural spacing stays with each use case; color, border, radius, and
 * interaction treatment remain consistent across the directory and room.
 */
export const DISCUSSION_CARD_SURFACE =
  'rounded-xl border border-border/60 bg-card/35';

export const DISCUSSION_CARD_INTERACTIVE =
  'outline-none transition-[border-color,background-color] duration-200 hover:border-foreground/15 hover:bg-secondary/75 focus-visible:border-ring/50 focus-visible:bg-secondary/60 focus-visible:ring-2 focus-visible:ring-ring/25';

/**
 * Shared avatar/action rail and content column used by room headers and
 * timeline messages. Keeping both on the same grid prevents subtle horizontal
 * drift as controls or message states change.
 */
export const DISCUSSION_ROOM_ROW_GRID =
  'grid grid-cols-[2rem_minmax(0,1fr)] gap-x-2.5 px-3';
