# Spacing and interaction UX study

Date: 24 July 2026

## Research conclusion

Spacing is information architecture, not decoration. People infer which label,
description, field, and action belong together from proximity before they read
the words. A product therefore needs a constrained scale and ownership rules,
not page-by-page margin adjustments.

The reviewed systems converge on the same principles:

- Apple recommends grouping related items, giving essential information enough
  room, aligning components for scanning, and spacing text fields evenly so
  labels remain clearly associated with their inputs.
- Carbon uses a reusable 2/4/8-based scale and distinguishes component spacing
  from layout spacing. It explicitly recommends parent-owned stack gaps because
  proximity creates relationships and larger gaps create hierarchy.
- GOV.UK recommends waiting until submit or continue before revealing
  validation errors, then associating the error with its field.
- Apple treats text-input focus as a ring and collection selection as a
  highlight. This supports an input halo for OTP focus and a filled treatment
  for success, failure, and selected cards.
- Apple and W3C recommend semantic one-time-code fields that preserve paste and
  autofill. Six visual cells must not become six isolated inputs that block a
  full-code paste.
- Apple recommends brief, purposeful motion and honoring reduced-motion
  preferences. Motion should explain where a dialog or menu came from, not
  delay frequent actions.

Primary references:

- https://developer.apple.com/design/human-interface-guidelines/layout
- https://developer.apple.com/design/human-interface-guidelines/text-fields
- https://developer.apple.com/design/human-interface-guidelines/focus-and-selection
- https://developer.apple.com/design/human-interface-guidelines/motion
- https://developer.apple.com/documentation/security/enabling-password-autofill-on-an-html-input-element
- https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html
- https://design-system.service.gov.uk/patterns/validation/
- https://carbondesignsystem.com/elements/spacing/overview/

## Oyrenoyret spacing contract

The interface uses a 4/8/12/16/24/32 px rhythm:

| Relationship | Space | Typical use |
| --- | ---: | --- |
| Micro | 4 px | Badge detail, tightly coupled metadata |
| Text | 8 px | Heading to description, label to input |
| Related | 12 px | Compact related controls |
| Component | 16 px | Form items, card content groups |
| Section | 24 px | Page sections and main shell regions |
| Region | 32 px | Heading group to the primary task |

Exceptions need a semantic reason and belong in a shared primitive. Responsive
layouts may move to a neighboring token; they must not invent page-specific
numbers.

## Applied interaction contracts

### Verification

- One native six-digit input remains the semantic control.
- The six visual cells share the regular field halo on the active cell.
- Checking uses a restrained primary fill.
- Correct and incorrect results use success/destructive fills without status
  outlines; screen readers still receive a live verdict.
- The email and correction action stay in one wrapping line.
- Heading, email context, OTP, and resend action use text/region/section gaps
  according to their relationship.

### Registration validation

- No error state appears before the first Create account attempt.
- Submission focuses and reveals the first invalid field.
- Only one error is displayed in the reserved helper line.
- Correcting that field advances to the next invalid field.
- This prevents a wall of red while preserving precise, accessible feedback.

### Dialogs and menus

- Shared dialogs fade their backdrop and enter with a short opacity,
  translation, and scale transition.
- The sidebar account menu expands upward from its trigger, closes on outside
  press or Escape, and keeps Log out behind an intentional two-step action.
- Reduced-motion preferences remove spatial movement.

### Required activation steps

Email verification and current community-rule acceptance are not optional and
must not use “Skip.” The existing read-only account state is the explicit
deferral model: users may return later, but cannot interpret deferral as
activation or participation access.
