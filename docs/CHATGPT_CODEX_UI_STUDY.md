# ChatGPT and Codex UI/UX reference study

Date: 24 July 2026

This is the primary interface reference for Oyrenoyret. It records the current
visual and interaction rules observed in ChatGPT and Codex, then translates
them into a reusable product contract. The goal is close behavioral and visual
alignment without copying OpenAI trademarks or removing the educational
identity and safety requirements of Oyrenoyret.

## Reference set

The study used current first-party sources:

- Live ChatGPT web interface at https://chatgpt.com/ in desktop and mobile
  viewports, in light and dark appearance modes.
- Current Codex product page and first-party interface captures at
  https://openai.com/codex/.
- Current ChatGPT product overview at https://chatgpt.com/overview/.
- Current ChatGPT release notes at
  https://help.openai.com/en/articles/6825453-chatgpt-release-notes.
- Current OpenAI Codex manual at
  https://developers.openai.com/codex/codex-manual.md.
- Current ChatGPT/Codex product behavior visible in the Codex desktop app,
  including tasks, activity updates, changed-file review, approvals, settings,
  browser work, and responsive task controls.

## Measured interface anatomy

The measurements below were taken from the live UI at a 1280 × 720 desktop
viewport and a 390 × 844 mobile viewport.

| Element | Desktop | Mobile |
| --- | ---: | ---: |
| Primary sidebar | 260 px wide | 296 px drawer |
| Sidebar row | 36 px high, 10 px radius | 46–48 px high, 16 px radius |
| Top controls | 36 px pill | 44 px pill/circle |
| Main horizontal inset | centered fluid canvas | 16 px |
| Primary composer | 768 × 54 px, 28 px radius | 358 × 54 px, 28 px radius |
| Composer icon target | 44 × 44 px | 44 × 44 px |
| Welcome heading | 24/28 px, regular | 24/28 px, regular |
| Suggestion chip | 36 px high, full pill | 36 px high, full pill |
| Settings dialog | about 448 px wide, 16 px radius | near-full-width takeover |
| Dialog/list row | 60–62 px, 20–22 px radius | 48–60 px |

Observed live colors:

- Light main surface: `#ffffff`.
- Light primary text: `#0d0d0d`.
- Light secondary/chip surface: approximately `#e8e8e8` to `#f4f4f4`.
- Light muted text: approximately `#5d5d5d` and `#8f8f8f`.
- Dark main surface: `#000000`.
- Dark sidebar: `#0d0d0d`.
- Dark elevated surface: `#212121`.
- Dark user/secondary surface: `#303030`.
- Dark border: approximately `#3b3b3b`.
- Primary dark text: approximately `#f4f4f5`.

The live font stack begins with the operating-system UI font
(`-apple-system-body`, `ui-sans-serif`, system UI, Segoe UI, Helvetica, Arial).
Control copy is generally 14 px and medium weight; body copy is 15–17 px;
metadata is 12–13 px. Large product headings use regular or semibold weight,
not display-heavy bold styling.

## The rules that create the ChatGPT experience

### 1. One dominant task per screen

The center of the screen presents the next useful action. Supporting chrome is
quiet and peripheral. Empty space is part of the hierarchy.

For Oyrenoyret, each page gets one clear title, one primary decision, and one
content stream. Toolbars, filters, and secondary actions stay compact.

### 2. Neutral chrome around a blue primary action

Oyrenoyret deliberately keeps a blue accent for the single primary decision on
each screen. Neutral gray communicates hover, selection, grouping, disabled
state, and secondary actions. Other color is reserved for errors, success,
live status, difficulty, voting, and other real meaning.

### 3. Shape communicates purpose

- Decisions and compact chips are pills.
- Icon actions are circles.
- Navigation rows use 10 px desktop and 16 px mobile radii.
- Inputs and ordinary content containers use 12–16 px radii.
- Composers use a 28 px radius.
- Dialogs and mobile sheets use 16 px or larger functional radii.

Rounding is consistent, not decorative: the same purpose always has the same
shape.

### 4. Borders are quiet; elevation is scarce

Most separation comes from whitespace, a neighboring surface tone, or one
low-contrast border. Shadows are reserved for floating composers, dialogs,
menus, glass controls, and drawers. Ordinary cards use no visible elevation or
only a one-pixel ambient shadow.

### 5. Sidebar behavior changes by viewport

Desktop keeps navigation visible at 260 px. Rows are compact and the current
location uses a neutral fill. Mobile removes the sidebar from the layout and
opens a 296 px drawer over a dimmed canvas. Mobile rows expand to 46–48 px and
all important controls remain visible.

### 6. Controls are direct and reversible

Labels use plain language. Menus open beside their trigger, dialogs preserve
context behind a dim layer, Escape closes temporary surfaces, and focus returns
to the trigger. Settings display the current value next to the setting name.

### 7. Motion explains state

Hover and press feedback takes roughly 120–150 ms. Menus and dialogs use
150–180 ms. Drawers use about 220–250 ms. Motion changes opacity, background,
or a short translation; it does not animate pages for decoration. Reduced
motion removes spatial transitions.

## The rules that distinguish Codex

Codex applies the ChatGPT shell to long-running work:

- A centered, rounded composer starts a task.
- User requests appear as compact message surfaces.
- Agent work reads as a chronological activity stream, not a dashboard.
- Tool activity is summarized into short, inspectable rows.
- Results lead with the outcome and keep detail expandable.
- Changed files collapse into a single review row with additions, deletions,
  and a clear forward action.
- Navigation prioritizes new work, search, plugins, scheduled work, projects,
  and recent/pinned tasks.
- Editors keep a wide reading column, a quiet sticky toolbar, and review or
  publish actions at the edge of the working context.

For Oyrenoyret, feeds, discussions, material editing, practice-test authoring,
admin work, and notifications use the same progression: request or heading,
work/content stream, compact status, and one clear next action.

## The OpenAI editorial and marketing grammar

The OpenAI and ChatGPT product pages use a different density from the signed-in
product, but not a different design language:

- Navigation is quiet, horizontally balanced, and visually subordinate to the
  page message.
- Hero copy is large, regular-weight, and given enough vertical space to read
  as the single decision on the screen.
- Sections alternate between editorial copy and large product evidence rather
  than stacking many small cards.
- A restrained atmospheric color or gradient may establish a product chapter;
  it does not become a permanent application background.
- Calls to action are compact pills with direct verbs. One filled action leads;
  alternatives remain outlined or textual.
- Product imagery is framed as evidence of a workflow, not decoration.
- Mobile reduces the header to menu, brand, and one account action, then turns
  the hero actions into a clear vertical sequence.

Oyrenoyret applies this grammar to public, legal, resource, authentication, and
onboarding pages while keeping the signed-in learning workspace denser and more
operational.

## Current product-architecture findings

The July 2026 ChatGPT desktop experience groups Chat, Work, and Codex under one
global product switcher, unifies recent work, supports pinning and projects, and
lets long-running work continue across devices. This reinforces four durable
principles for Oyrenoyret:

1. A user should keep one stable shell while changing the kind of work.
2. Recent, active, scheduled, and completed work should be understandable as
   states of one system rather than separate visual products.
3. Context should stay visible or recoverable when work opens an editor, detail
   view, review surface, or mobile drawer.
4. Navigation should expose durable places and current work; page dashboards
   should not duplicate the entire information architecture.

Oyrenoyret keeps learning, studio, community, and administration as sidebar
sections instead of copying ChatGPT's product switcher. The taxonomy is
different, but the stable-shell and recoverable-context behavior is the same.

## Finalized conclusions

The target is a shared interaction grammar, not a pixel copy or a collection of
page-specific ChatGPT motifs.

1. **Hierarchy:** every screen has one title, one dominant content stream, and
   at most one primary filled action.
2. **System ownership:** page widths, spacing, controls, statuses, overlays,
   focus, and motion are owned by reusable primitives and semantic tokens.
3. **Neutrality:** layout and selection use neutral surfaces; blue represents a
   primary decision; success, information, warning, and danger colors carry
   explicit meaning only.
4. **Continuity:** feeds, editors, dialogs, drawers, previews, and review flows
   preserve context, contain focus, and restore the user's place when closed.
5. **Responsive behavior:** desktop is compact; mobile enlarges targets,
   replaces rails with modal drawers, stacks decisions, and never depends on
   hover.
6. **Evidence over decoration:** marketing and empty states show the workflow or
   the next useful action rather than adding card walls, ornamental gradients,
   or redundant metrics.
7. **Accessibility is structural:** correct landmarks, names, tab
   relationships, focus containment, reduced motion, contrast, and translated
   label expansion are part of the component contract.

All implementation decisions in the UI/UX phase should be evaluated against
these conclusions before any page-level styling exception is introduced.

## Component-by-component contract

| Platform element | ChatGPT/Codex rule | Oyrenoyret implementation |
| --- | --- | --- |
| Global canvas | Pure neutral surface | Semantic light/dark tokens in `app/globals.css` |
| Sidebar | 260 px, 36 px rows, neutral active fill | `AppSidebar` |
| Mobile navigation | 296 px drawer, 48 px rows, dim overlay | `AppShell`, `SiteHeader` |
| Page column | Centered, readable, generous empty space | `DashboardShell` |
| Page heading | 28 px semibold, short supporting copy | `PageHeader` |
| Sections | 24–40 px page rhythm, compact related rows | `PageBody`, `PageSection` |
| Primary action | One visually dominant decision | Blue-filled `Button primary` |
| Secondary action | Gray or outlined pill | `Button secondary/outline` |
| Icon action | Circular 36–44 px target | icon button sizes |
| Input/select | 44 px, 12 px radius, subtle border | shared field primitives |
| Multiline/editor | 15 px body, 24 px line height | `Textarea`, editors |
| Search | One leading-icon field pattern | `SearchField` |
| Tabs | Compact rounded segmented control | `Tabs` |
| Card/panel | 12–16 px radius, quiet border/surface | `Card`, `.card-frame` |
| Settings group | Soft gray 16 px panel | `.settings-panel` |
| Dialog | 16 px, restrained shadow, 45% scrim | `AlertDialog` |
| Modal behavior | Focus containment, body lock, Escape, focus restoration | `useModalSurface` |
| Popover/toast | 16 px floating surface | `HoverCard`, `Sonner` |
| Status | Semantic success/info/warning/danger, never local palette classes | `Badge` |
| Inline feedback | Semantic persistent notice with shared hierarchy | `Notice` |
| Empty state | Centered icon, short recovery path | `EmptyState` |
| Loading | Geometry-preserving neutral skeletons | `PageSkeleton` |
| Editor | Wide thread-like canvas, sticky rounded toolbar | material editors |
| Marketing/auth | Centered task, large whitespace, pill CTAs | public and auth layouts |

## Accessibility and quality rules

1. Interactive controls have an accessible name and visible focus treatment.
2. Standard touch targets are at least 44 px; mobile navigation is 48 px.
3. Hover is never the only way to reach a required action.
4. Text and controls meet contrast requirements in both appearance modes.
5. Dialogs close with Escape, restore focus, and remain scrollable on small
   screens.
6. Loading, empty, disabled, error, success, selected, unread, and live states
   must all remain legible without relying on color alone.
7. Every representative surface is reviewed at 390 px and 1280 px, in light
   and dark mode.
8. Azerbaijani, English, Turkish, and Russian labels are checked for expansion.

## Deliberate product differences

Oyrenoyret keeps its own logo, Comfortaa wordmark, educational vocabulary,
curriculum structure, credits, moderation, and semantic subject/status colors.
These are product identity and safety features. Everything around them—layout,
control geometry, hierarchy, density, states, navigation behavior, motion, and
appearance modes—follows this ChatGPT/Codex contract.
