# Notion UI/UX reference study

> Historical note: this study is superseded by
> [`CHATGPT_CODEX_UI_STUDY.md`](./CHATGPT_CODEX_UI_STUDY.md). It remains as a
> record of the earlier design direction and is no longer the implementation
> source of truth.

Date: 22 July 2026

This study defines what “Notion-like” means for Oyrenoyret. The goal is not to
copy Notion’s identity or features. The goal is to adopt the interaction and
layout qualities that make its product feel calm, direct, and predictable.

## Reference set

The study used current and official Notion material wherever possible:

- Notion Help: Navigate with the sidebar
  https://www.notion.com/en-gb/help/navigate-with-the-sidebar
- Notion Help: Style and customize your page
  https://www.notion.com/help/customize-and-style-your-content
- Notion Help: Keyboard shortcuts
  https://www.notion.com/help/keyboard-shortcuts
- Notion Help: Views, filters, sorts, and groups
  https://www.notion.com/help/views-filters-and-sorts
- Notion Help: Notion for mobile
  https://www.notion.com/help/notion-for-mobile
- Notion product design: Updating the design of Notion pages, March 2026
  https://www.notion.com/en-gb/blog/updating-the-design-of-notion-pages

Secondary visual/token references were used only to quantify details that the
official product documentation does not publish, and were checked against
current screenshots:

- Dembrandt’s observed Notion tokens
  https://www.dembrandt.com/explorer/notion
- Refero’s Notion style analysis
  https://styles.refero.design/style/f58e99d1-940d-4254-8822-5d856bba6505

## What creates the Notion experience

### 1. The interface behaves like a document, not a dashboard theme

Notion’s main canvas is almost completely flat. Content, not chrome, creates
the page hierarchy. Borders are used for functional grouping, while shadow is
mostly reserved for menus, dialogs, and floating previews.

Implication for Oyrenoyret:

- Remove atmospheric gradients, blurred color glows, and decorative grids from
  signed-in product pages.
- Avoid placing every section inside a raised card.
- Prefer headings, dividers, list rows, and compact databases to stacked tiles.

### 2. Navigation is hierarchical, compact, and stateful

The current Notion sidebar has a workspace switcher, top-level product entry
points, collapsible content sections, nested pages, and persistent utilities at
the bottom. Desktop controls appear on hover; mobile replaces hover affordances
with permanently visible actions.

Implication for Oyrenoyret:

- Use a 240 px warm-gray sidebar without an outer application frame.
- Use 30–32 px navigation rows, 4–6 px radii, and 13–14 px labels.
- Keep the active state gray, not brand-colored.
- Reserve the blue accent for creation and confirmation actions.
- Let section actions appear on hover where they are optional.

### 3. Density changes with content relationships

Notion’s March 2026 page redesign formalizes content rhythm. Adjacent list
items become compact as a group, while paragraphs and mixed content receive
more separation. The rhythm responds to neighboring content rather than using
one large gap everywhere.

Implication for Oyrenoyret:

- Repeated rows use 4–8 px internal vertical rhythm.
- Page sections use 24–32 px separation.
- Descriptive prose uses relaxed line height and clearer paragraph spacing.
- Lists should read as one object instead of a grid of unrelated cards.

### 4. Color is semantic and mostly neutral

The recognizable product palette is warm off-white, white, charcoal, soft
gray, muted red, and a small amount of blue. Colorful tags are pale and used to
encode metadata, never to decorate large backgrounds.

Reference direction:

- Main text: `#37352f`
- Canvas: `#ffffff`
- Sidebar / secondary surface: approximately `#f7f6f3`
- Hover: translucent charcoal, approximately 4–8% opacity
- Divider: translucent charcoal, approximately 9–16% opacity
- Primary action: Notion-like blue, approximately `#2383e2`
- Destructive: muted red, approximately `#eb5757`

### 5. Shape is restrained

Notion uses small radii in the product UI. Large marketing mockups can be more
rounded, but application buttons, inputs, row selections, and menus are compact.

- Small row/hover target: 4–5 px
- Buttons and inputs: 6–8 px
- Cards and large popovers: 8–12 px
- Tags and avatars: pills/circles

### 6. Typography is practical

The product UI uses an Inter/system-like sans serif, regular weight for most
labels, and semibold only for decisions or headings. Page titles are strong but
not oversized. Supporting information stays readable rather than becoming very
small uppercase decoration.

Oyrenoyret product scale:

- Navigation and controls: 14 px / 20 px, weight 400–500
- Metadata: 12 px / 16 px
- Body: 15–16 px / 24 px
- Section heading: 16–20 px, weight 600
- Page title: 30–36 px, weight 700, tight tracking

### 7. Interaction is quiet and fast

Notion uses short transitions, mostly opacity and background changes. Menus and
peek panels add a small scale or translation. Page navigation does not produce
large entrance animation. Observed timing values cluster around 120, 180, 280,
and 420 ms.

Motion rules for Oyrenoyret:

- Hover/focus: 120 ms
- Menus and dialogs: 160–180 ms
- Mobile drawer and contextual pane: 220–280 ms
- Never animate layout simply for decoration.
- Respect `prefers-reduced-motion`.

### 8. Databases are a core visual pattern

Notion exposes alternate views, filters, sorting, search, and creation in one
compact toolbar. Rows are information-dense and open into a side or center peek.

Implication for Oyrenoyret:

- Catalog, library, discussions, events, and administration should share a
  collection-toolbar pattern.
- Grids remain available where imagery or subjects benefit from them, but list
  view becomes the default for high-information areas.
- Filter/search controls should look like toolbar actions until activated.

### 9. Mobile is a deliberate recomposition

Notion collapses desktop columns into a single stream. Hover-only controls
become visible actions, and navigation becomes a full-height drawer or takeover.

Implication for Oyrenoyret:

- Do not merely shrink desktop cards.
- Use one content column, compact sticky page chrome, and visible overflow or
  add controls.
- Preserve 40–44 px touch targets even when desktop rows are denser.

## Gap audit of the previous Oyrenoyret refresh

| Previous choice | Why it missed the reference | Replacement |
| --- | --- | --- |
| Indigo atmosphere and gradients | Decorative, brand-heavy, visually louder than Notion | Warm neutral canvas with blue only for actions |
| 12–16 px radii everywhere | Too soft and generic SaaS-like | 4–8 px product radii, 10–12 px only for larger overlays |
| Shadows on most cards | Makes every element compete for elevation | Flat lists and border-only grouping |
| 20 px card padding by default | Produces oversized, low-information screens | 8–16 px based on content relationship |
| Large eyebrow labels | Adds marketing hierarchy to utility pages | Plain 12 px section labels or normal headings |
| Broad page entrance animation | Calls attention to chrome | Short, local state transitions only |
| Grouped but static navigation | Does not feel hierarchical or content-aware | Compact rows, collapsible sections, quiet active state |
| Permanent contextual rails | Reduces document focus | Use only where context is essential; otherwise open a pane |
| Tile-first dashboard | Feels like an analytics template | Document home with recents, upcoming work, and compact views |
| Centered decorative auth panel | More branded than task-focused | Simple split or centered form with restrained illustration |

## Implementation contract

All following interface work must meet these rules:

1. Product pages default to white and warm neutral surfaces.
2. No product gradient unless it communicates a real state or data value.
3. Active navigation uses a neutral fill; blue is reserved for primary action.
4. Page content should be understandable with shadows disabled.
5. Collections use shared toolbar, row, property, empty, and loading patterns.
6. Desktop optional controls may reveal on hover; equivalent mobile controls
   must remain visible.
7. Motion must communicate an opening, closing, selection, or reordering event.
8. Every page must pass a 390 px mobile and 1280 px desktop visual review.
