export const DISCUSSION_CONTEXT_TAG_IDS = [
  'question',
  'explanation',
  'feedback',
  'study-together',
  'idea',
  'resource',
  'experience',
  'reflection',
  'debate',
  'motivation',
] as const;

export type DiscussionContextTagId =
  (typeof DISCUSSION_CONTEXT_TAG_IDS)[number];

export const MIN_DISCUSSION_CONTEXT_TAGS = 1;
export const MAX_DISCUSSION_CONTEXT_TAGS = 5;

const contextTagSet = new Set<string>(DISCUSSION_CONTEXT_TAG_IDS);
const contextTagCopyKeys: Record<
  DiscussionContextTagId,
  | 'question'
  | 'explanation'
  | 'feedback'
  | 'studyTogether'
  | 'idea'
  | 'resource'
  | 'experience'
  | 'reflection'
  | 'debate'
  | 'motivation'
> = {
  question: 'question',
  explanation: 'explanation',
  feedback: 'feedback',
  'study-together': 'studyTogether',
  idea: 'idea',
  resource: 'resource',
  experience: 'experience',
  reflection: 'reflection',
  debate: 'debate',
  motivation: 'motivation',
};

export const DISCUSSION_CONTEXT_TAG_ALIASES: Record<
  DiscussionContextTagId,
  readonly string[]
> = {
  question: ['question', 'sual', 'soru', 'vopros'],
  explanation: ['explanation', 'izah', 'aciklama', 'obyasnenie'],
  feedback: [
    'feedback',
    'rey',
    'rəy',
    'geri-bildirim',
    'obratnaya-svyaz',
  ],
  'study-together': [
    'study-together',
    'study-group',
    'birlikde-oyrenek',
    'birlikdə-öyrənək',
    'birlikte-calisalim',
    'uchimsya-vmeste',
  ],
  idea: ['idea', 'fikir', 'ideya'],
  resource: ['resource', 'resurs', 'kaynak'],
  experience: ['experience', 'tecrube', 'təcrübə', 'deneyim', 'opyt'],
  reflection: ['reflection', 'dusunce', 'düşüncə', 'yansima', 'refleksiya'],
  debate: ['debate', 'mubahise', 'mübahisə', 'tartisma', 'diskussiya'],
  motivation: ['motivation', 'motivasiya', 'motivasyon', 'motivatsiya'],
};

export function isDiscussionContextTagId(
  value: string,
): value is DiscussionContextTagId {
  return contextTagSet.has(value);
}

export function normalizeDiscussionContextTags(
  value: unknown,
): DiscussionContextTagId[] {
  return normalizeKnownDiscussionContextTags(value).slice(
    0,
    MAX_DISCUSSION_CONTEXT_TAGS,
  );
}

/**
 * Filters may combine any proper subset of the available tags. Selecting the
 * complete set is equivalent to selecting no specific tag, which is the
 * canonical "All" state used by both the client and API. Multiple selected
 * tags use inclusive OR semantics: a discussion matches when it contains at
 * least one selected tag.
 */
export function normalizeDiscussionContextTagFilter(
  value: unknown,
): DiscussionContextTagId[] {
  const tags = normalizeKnownDiscussionContextTags(value);
  return tags.length === DISCUSSION_CONTEXT_TAG_IDS.length ? [] : tags;
}

export function matchesDiscussionContextTagFilter(
  discussionTags: unknown,
  selectedTags: unknown,
): boolean {
  const filter = normalizeDiscussionContextTagFilter(selectedTags);
  if (filter.length === 0) return true;

  const discussionTagSet = new Set(
    normalizeKnownDiscussionContextTags(discussionTags),
  );
  return filter.some((tag) => discussionTagSet.has(tag));
}

function normalizeKnownDiscussionContextTags(
  value: unknown,
): DiscussionContextTagId[] {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .map((tag) => String(tag).trim().toLowerCase())
        .filter(isDiscussionContextTagId),
    ),
  );
}

export function getDiscussionContextTagOptions(
  copy: Record<
    | 'question'
    | 'explanation'
    | 'feedback'
    | 'studyTogether'
    | 'idea'
    | 'resource'
    | 'experience'
    | 'reflection'
    | 'debate'
    | 'motivation',
    { label: string; tag: string; description: string }
  >,
) {
  return DISCUSSION_CONTEXT_TAG_IDS.map((id) => {
    const localized = copy[contextTagCopyKeys[id]];
    return {
      id,
      ...localized,
      aliases: DISCUSSION_CONTEXT_TAG_ALIASES[id],
    };
  });
}
