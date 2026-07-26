# Authentication and onboarding UX study

Date: 23 July 2026

This study defines the authentication and getting-started contract for Oyrenoyret.
It combines Brilliant’s question-led setup, ChatGPT’s restrained
authentication, Codex’s inspectable progress model, and Notion’s quiet focus
treatment. The result is an original implementation using Oyrenoyret’s content,
identity, and safeguarding rules.

## Reference set

Current first-party product surfaces were inspected directly:

- Brilliant learner onboarding at
  https://brilliant.org/welcome/?cta_persona=learner
- Brilliant’s getting-started documentation at
  https://brilliant.org/help/using-brilliant/how-do-i-get-started-on-brilliant/
- ChatGPT authentication at https://chatgpt.com/auth/login
- OpenAI’s six-digit OTP and incomplete-signup recovery guidance at
  https://help.openai.com/en/articles/9889414-why-am-i-being-asked-to-verify-my-login
  and https://help.openai.com/en/articles/7426629-why-can-t-i-log-in-to-chatgpt
- Apple’s six-digit verification and recovery model at
  https://support.apple.com/en-us/102660
- Notion authentication and field focus behavior at https://www.notion.com/login
- Notion’s persistent account and temporary-code model at
  https://www.notion.com/help/account-settings
- Codex task and progress behavior in the current Codex desktop application

## Welcome-screen redesign study

Date: 25 July 2026

The welcome screen was reviewed separately after the first redesign made the
opening feel like a collection of dashboard cards. The relevant pattern is a
short self-selection setup, not a feature overview:

- Material Design describes self-selection as a short sequence that gives the
  user control while implicitly teaching how the experience will be
  personalized. It also advises against combining self-selection with a
  separate top-benefits presentation:
  https://m1.material.io/growth-communications/onboarding.html
- Intercom’s welcome-page guidance says the first screen should reduce
  uncertainty, explain what happens next, and keep the experience consistent
  with the product’s existing visual language:
  https://www.intercom.com/blog/welcome-page/
- Intercom’s first-use guidance treats a considered welcome message as a
  focused invitation to the user’s first value moment, not as a feature index:
  https://www.intercom.com/blog/product-tours-first-use-onboarding/
- Current onboarding examples consistently use one dominant message, a single
  brand or illustration moment, a short expectation-setting line, and one
  primary action. Dense stage summaries and multiple equal-weight surfaces are
  better reserved for checklists after account creation.

The resulting Oyrenoyret direction is deliberately card-free. It uses a flat,
editorial split layout on larger screens and an illustration-first stack on
mobile. The copy is benefit-led rather than a generic greeting, the brand mark
provides the only visual focal point, the three-minute expectation remains
visible, and the persistent footer contains the single action.

## Observed interaction rules

### Brilliant

- A welcome screen appears before progress begins.
- After the welcome action, three quiet progress segments appear at the top.
- Each screen asks one short question and keeps the main action in a persistent
  bottom area.
- Choice cards have a large hit target, visible selected state, and very little
  explanatory chrome.
- Progress within a segment advances after each answer instead of jumping only
  when the whole section is complete.

### ChatGPT

- Sign-in remains a distinct, compact authentication task rather than being
  visually mixed with product onboarding.
- The screen has one dominant action, short copy, restrained surfaces, and
  predictable recovery links.
- Form state, loading state, and failure feedback stay beside the task.

### Codex

- Long-running work is broken into visible, resumable stages.
- Progress is persisted after meaningful transitions, not only at the end.
- The final result is explicit and leads to one clear forward action.

### Notion focus treatment

The live Notion email field informed the quiet 8 px control geometry and
layout-stable focus behavior. Oyrenoyret deliberately uses its own treatment:
a crisp blue edge with a restrained, attached halo. It appears for pointer and
keyboard focus, adds no layout size, and avoids a detached outline.

## Oyrenoyret implementation contract

Authentication and onboarding are separate layouts:

- `/login` is a compact authentication page.
- `/welcome` is the full-height personalization section.
- `/welcome/signup` is the registration and account-completion section.
- `/welcome/onboarding` is the signed-in product tour.
- `/register` remains a compatibility redirect to the canonical welcome route.

Every onboarding step uses the same top-anchored content frame. Headings begin
at a stable position below the progress row, so validation messages, account
ownership notices, and other conditional content expand downward without
moving the question or input. Section names are communicated by progress and
are not repeated as decorative eyebrow text.

Getting started has three phases:

1. **Personalization:** motivation, age, and a realistic learning pace.
2. **Registration:** credentials, email-code verification, and guidelines.
3. **Onboarding:** feed, learning programs, preferences, and a final
   “Start learning” action.

The word “onboarding” refers only to the optional third phase, not to the
entire pipeline. The welcome screen intentionally hides progress. Progress appears only after
the learner selects “Get started.”

## Safety and account ownership

- Learners aged 16 and over create a self-managed account.
- Learners under 16 use a guardian-managed account. The parent or legal
  guardian supplies the account email and password and explicitly confirms
  their authority before activation.
- Age affects account ownership on the server; it is not merely presentation
  logic.
- Passwords are hashed, verification codes are HMAC-hashed, codes expire, and
  failed attempts and resend requests are limited.

## Persistence and recovery

- Section-one answers remain local until credentials are submitted. Leaving
  before that boundary starts a fresh onboarding flow next time.
- Submitting valid credentials creates the durable account and authenticated
  session. The credential action is explicitly labelled “Create account.”
  Account creation, email verification, guideline acceptance, and
  product-tour completion are independent persisted milestones.
- An unfinished account returns through ordinary login rather than a special
  draft-resume route.
- Email verification provides an adjacent correction action for returning to
  the credential form when the address is wrong.
- Verification uses one semantic OTP input with six visual cells. Paste,
  password-manager, mobile numeric keyboard, and `one-time-code` autofill
  continue to work. A complete six-digit value verifies automatically; the
  cells use the same focus halo as other fields, then communicate checking,
  invalid, and verified states with quiet fills instead of status outlines or
  an inserted error paragraph.
- Verification and current-rule acceptance are activation requirements. They
  are not labelled “Skip.” Verification offers “Do this later,” while the
  rules step offers “Not now” beside its primary footer action. The reading
  dialog uses a neutral “Close” action. Deferral is a navigation-only exit to
  the read-only workspace: it writes no milestone and never implies that the
  account is activated. The recovery banner remains the route back to
  completion.
- Uninterrupted signup keeps verification and guidelines inside the dedicated
  onboarding layout; neither stage is embedded in the dashboard.
- Returning signed-in users who have not verified their email or accepted the
  current guidelines see normal workspace content in read-only mode. A compact
  banner at the top explains the exact missing milestone. Email verification
  returns to the dedicated onboarding pipeline; rules open in a centered,
  dismissible reading dialog.
- The main product surface uses one `inert` interaction boundary while an
  account is not activated. This gives all interactive descendants a consistent
  disabled appearance and removes them from pointer and keyboard interaction.
  Navigation and the recovery banner remain outside the boundary.
- Server-side write access independently checks the same activation milestones
  and remains the final enforcement boundary.
- Accepting the guidelines enables participation and makes the optional product
  tour eligible.
- Product-tour progress is stored after every transition.
- Incomplete tours never resume as a modal. The workspace banner offers
  “Explore” and “Skip”; Explore returns to Section 3 of the onboarding pipeline.
- “Skip” stores a permanent dismissal and does not reappear.
- Rules acceptance is valid only when `guidelinesVersion` matches the current
  application version. A version change returns the account to effective
  read-only activation without resetting or replaying the product tour.
- `registrationStep` is written only as compatibility and reporting metadata.
  Email verification, current-version rule acceptance, and tour timestamps are
  the authoritative state.

## Interruption and session conclusions

The product does not attempt to infer progress from tab closure. Browser unload
events are not reliable, especially on mobile, and even session cookies may be
restored after a browser restart. End-of-page signals are appropriate for
best-effort analytics, not for account or consent transactions.

Each meaningful action therefore commits its milestone immediately on the
server. A closed tab, process crash, device sleep, expired session, explicit
logout, or later login all resolve to the same state:

| Durable milestones | Effective state | Workspace recovery |
| --- | --- | --- |
| No `User` record | Not registered | Start onboarding again |
| Account only | Email required | Disabled workspace + Verify email |
| Email verified | Current rules required | Disabled workspace + View rules |
| Email + current rules | Activated; tour pending | Full workspace + Explore/Skip |
| Tour skipped | Activated and dismissed | Full workspace; no tour prompt |
| Tour completed | Activated and onboarded | Full workspace; no tour prompt |
| Current rules version changes | Re-acceptance required | Disabled workspace + updated-rules dialog |

The authenticated session is only an identity transport. It must never become
the source of onboarding progress. Session expiry is enforced by the server;
logging in again simply re-derives the correct experience from milestones.

## Motion and accessibility

- Screen transitions use short opacity and 8–14 px translations.
- Product previews animate only the state being explained.
- Footer alignment is semantic rather than page-specific. The primary action
  is centered on welcome, moves to the trailing edge for Section 1, returns to
  center for Section 2 and the first tour step, then moves to the trailing edge
  when tour navigation becomes available.
- Footer motion runs only when that semantic alignment changes. Ordinary
  questions, validation updates, pending labels, and rerenders keep the action
  fixed.
- `prefers-reduced-motion` removes spatial page transitions.
- Choice cards expose radio or checkbox semantics.
- The progress control has an accessible label and numeric value.
- Choice-step actions remain disabled until a choice exists. Credential submit
  remains available so an explicit attempt can reveal validation. No field
  turns red before submission. After submission, the first invalid field is
  focused and marked; one error replaces the stable password-guidance line.
  Correcting it reveals the next invalid field, creating a guided correction
  sequence instead of an error wall.
- Focus remains visible without changing layout or creating a detached halo.

## Validation checklist

1. Welcome has no progress bar.
2. Every later screen shows three progress segments.
3. Bottom actions move only at documented section boundaries and remain fixed
   between ordinary question screens.
4. Age 15 produces guardian-managed copy and server data.
5. Age 16 produces self-managed copy and server data.
6. Empty, invalid, pending, failed, and successful form states are visible.
7. Leaving before credential submission starts a fresh flow; submitting
   credentials creates an account that can return through ordinary login.
8. Verification is single-use, expiring, attempt-limited, and resend-limited.
9. Unverified and rules-pending accounts can sign in and browse product
   content, but cannot perform state-changing actions. Verification and rules
   remain outside the dashboard.
10. Tour progress survives logout and login and resumes only in the onboarding
    pipeline after the user chooses Explore.
11. Skip and completion are idempotent and permanently persisted.
12. Azerbaijani, English, Turkish, and Russian contain the same message keys.
13. Focus uses the shared 8 px field radius, a crisp blue edge, and a soft
    attached halo without changing layout.
14. Verification offers a direct, translated way to correct the email address.
15. Deferring verification or rules changes no activation milestone and lands
    in the same read-only workspace state as closing the tab and signing in
    later.
15. Personalization asks only questions the current product can use; subject
    interests are not collected speculatively.
