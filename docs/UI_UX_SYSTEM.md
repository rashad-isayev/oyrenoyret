# Oyrenoyret UI/UX system

The current source of truth is
[`CHATGPT_CODEX_UI_STUDY.md`](./CHATGPT_CODEX_UI_STUDY.md). ChatGPT defines the
general product shell and interaction grammar; Codex defines long-running task,
editor, activity, and review patterns.

## Product direction

Oyrenoyret is neutral, direct, and task-first. The canvas is white or black;
nearby surface tones provide structure. The interface shows one dominant next
action, uses semantic color only when color carries meaning, and keeps product
chrome quiet enough for learning content to lead.

- Primary decisions use the blue accent fill; neutral actions use gray surfaces.
- Icon actions are circles.
- Navigation selection is neutral, not brand-colored.
- Standard panels use 12–16 px radii; floating composers use 28 px.
- Shadows are limited to overlays, drawers, menus, and floating controls.
- Motion explains hover, selection, opening, closing, or progress only.
- Status color is semantic and centralized: success, information, warning, and
  danger must use `Badge` variants instead of local palette classes.

## Layout architecture

| Surface | Navigation | Content behavior |
| --- | --- | --- |
| Public | 64 px glass header | Centered hero and wide product preview |
| Authentication | Minimal product mark | Centered 440 px task column |
| Signed-in desktop | 260 px sidebar | 960 px standard content column |
| Context-heavy page | Sidebar + 300 px rail | Rail returns to flow below desktop |
| Mobile product | 60 px top bar + 296 px drawer | One column with 16 px inset |
| Studio/editor | 64 px compact top bar | 960 px working column |

`DashboardShell` owns width, `PageHeader` owns heading and actions,
`PageBody`/`PageSection` own vertical rhythm, and `EmptyState` owns all
no-content presentations. Collection controls use `SearchField`,
`CollectionToolbar`, and `CollectionToolbarActions`.

## Visual tokens

- Light canvas/text: `#ffffff` / `#0d0d0d`.
- Dark canvas/sidebar/text: `#000000` / `#0d0d0d` / `#f4f4f5`.
- Elevated dark surface: `#212121`; secondary dark surface: `#303030`.
- Light secondary surfaces: `#f4f4f4` and `#e8e8e8`.
- Muted text: `#5d5d5d` and `#8f8f8f`.
- Focus: a crisp blue field edge with a soft attached halo; it never changes
  layout or uses a detached outline. Status colors remain semantic.
- Labels remain visible above controls in sentence case. They share a 14px/20px
  rhythm, become blue only while their field is active, and become destructive
  only when that field is invalid.
- Optional status sits beside the label in quieter text. Hints and specific
  errors have dedicated positions and connect to controls with
  `aria-describedby`; placeholders never replace labels.
- Fields in multi-column layouts are top-anchored. Adding helper or error
  content to one field must never redistribute another field's label-to-control
  spacing or move its control vertically.
- UI font: operating-system sans stack; brand wordmark: Comfortaa.

Use semantic utilities (`bg-background`, `bg-secondary`, `text-foreground`,
`text-muted-foreground`, `border-border`) instead of local neutral colors.

## Spatial rhythm

Spacing follows a constrained 4/8/12/16/24/32 px rhythm. Proximity expresses
meaning: 4–8 px joins labels and supporting text, 12–16 px separates related
controls, 24 px separates sections, and 32 px separates major regions.

- Parent layout primitives own space between siblings; leaf components do not
  add arbitrary outer margins.
- `DashboardShell` and `PageBody` use 24 px between top-level regions.
- `PageSection` uses 16 px between related content blocks.
- Field labels, controls, hints, and errors use one stable 8 px internal gap.
- Heading descriptions sit 8 px below their headings. An address or other
  continuation of that sentence remains in the same text group before a
  32 px transition to the primary control.
- Validation feedback replaces reserved helper space so fields do not jump.
- Responsive changes may move one step on the scale, but do not introduce
  one-off values.

## Control ownership

Pages may choose a semantic variant and width, but may not redefine a shared
control's height, radius, focus ring, icon placement, or padding.

| Purpose | Primitive | Rule |
| --- | --- | --- |
| Primary decision | `Button` primary | blue-filled pill, 36–44 px |
| Neutral decision | `Button` secondary/ghost | gray or transparent pill, 36–44 px |
| Inline text action | `Button` link/inline | sentence-level action without a separate visual block |
| Icon action | `Button` icon sizes | circle, 36–44 px |
| Text value | `Input` | 44 px, 12 px radius |
| Prominent numeric value | `Field measure="compact"` + `Input fieldSize="prominent"` | 48 px, shared 240 px measure and universal halo |
| Query | `SearchField` | shared leading icon and clear action |
| Multiline | `Textarea` | 15/24 px text rhythm |
| Choice | `Select` | same surface as Input |
| Boolean | `Switch`, `Checkbox` | inverse-neutral selected state |
| Modes | `Tabs` | rounded segmented group |
| Editor title | `DocumentTitleInput` | borderless 28–32 px title |
| Status | `Badge` | semantic success/info/warning/danger tone and shared size |
| Inline feedback | `Notice` | semantic persistent message; shared title, spacing, and tone |
| Modal behavior | `useModalSurface` | body lock, focus containment, Escape, focus restoration |

## Review checklist

1. One primary action and one dominant content stream are obvious.
2. Required actions are reachable without hover.
3. Mobile targets are 44 px minimum; drawer rows are 48 px.
4. Light and dark states retain hierarchy and contrast.
5. Focus, selected, disabled, loading, empty, error, and success states work.
6. Menus/dialogs/drawers close predictably and restore context.
7. Review at 390 px and 1280 px with translated labels.
8. Editors and admin work keep results, status, and next action inspectable.
9. No page introduces a raw neutral palette, local status color, or private
   control geometry when a semantic token or shared primitive owns that role.

## Getting-started alignment

- Progress, step content, product previews, and footer actions share one 680px
  alignment rail.
- The phases are named Personalization, Registration, and Onboarding.
  “Onboarding” refers only to the optional platform tour.
- The header contains only the full-width progress rail. Back is a textual
  secondary action on the left of the persistent footer; the forward primary
  action remains on the right. No logo substitutes for a missing back action.
- The welcome action begins in the exact footer center and animates into the
  right action column when onboarding starts. Respect reduced-motion settings.
- Back always moves to the immediately previous onboarding step. Verification
  returns to the preserved credentials form; resubmitting updates the same
  inactive registration and issues a fresh code instead of creating a duplicate.
- Every step owns the full rail; page-specific form widths are not allowed.
- Every onboarding heading requires a concise supporting description directly
  beneath it; a title may never stand alone.
- Intentionally compact controls may use a narrower inner width, but their
  label, control, helper text, and feedback must share the same inner edges.
