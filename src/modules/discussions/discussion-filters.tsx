'use client';

import type { RefObject } from 'react';
import { SearchField } from '@/components/ui/search-field';
import { useI18n } from '@/src/i18n/i18n-provider';
import { getDiscussionContextTagOptions } from './discussion-context-tags';
import { cn } from '@/src/lib/utils';

interface DiscussionFiltersProps {
  inputRef: RefObject<HTMLInputElement | null>;
  query: string;
  selectedTags: string[];
  onQueryChange: (value: string) => void;
  onSelectedTagsChange: (tags: string[]) => void;
  onSubmit: () => void;
  onClear: () => void;
}

export function DiscussionFilters({
  inputRef,
  query,
  selectedTags,
  onQueryChange,
  onSelectedTagsChange,
  onSubmit,
  onClear,
}: DiscussionFiltersProps) {
  const { messages } = useI18n();
  const copy = messages.discussions.page;
  const contextTags = getDiscussionContextTagOptions(
    messages.discussions.contextTags,
  );

  return (
    <section className="space-y-2.5" aria-label={copy.searchLabel}>
      <SearchField
        ref={inputRef}
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            onSubmit();
          }
        }}
        placeholder={copy.placeholder}
        searchLabel={copy.searchLabel}
        clearLabel={messages.discussions.list.clear}
        onClear={onClear}
      />

      <div className="flex min-w-0 items-center">
        <div
          className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="group"
          aria-label={copy.subjects}
        >
          <button
            type="button"
            aria-pressed={selectedTags.length === 0}
            onClick={() => onSelectedTagsChange([])}
            className={cn(
              'h-8 shrink-0 rounded-full border px-3 text-xs font-medium transition-[color,background-color,border-color] duration-200',
              selectedTags.length === 0
                ? 'border-transparent bg-foreground text-background'
                : 'border-border/60 bg-secondary/35 text-muted-foreground hover:border-foreground/15 hover:bg-secondary hover:text-foreground',
            )}
          >
            {copy.allContexts}
          </button>
          {contextTags.map((tag) => {
            const selected = selectedTags.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  if (selected) {
                    onSelectedTagsChange(
                      selectedTags.filter(
                        (selectedTag) => selectedTag !== tag.id,
                      ),
                    );
                    return;
                  }

                  const nextTags = [...selectedTags, tag.id];
                  onSelectedTagsChange(
                    nextTags.length === contextTags.length ? [] : nextTags,
                  );
                }}
                className={cn(
                  'h-8 shrink-0 rounded-full border px-3 text-xs font-medium transition-[color,background-color,border-color] duration-200',
                  selected
                    ? 'border-transparent bg-primary text-primary-foreground'
                    : 'border-border/60 bg-secondary/35 text-muted-foreground hover:border-foreground/15 hover:bg-secondary hover:text-foreground',
                )}
              >
                #{tag.tag}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
