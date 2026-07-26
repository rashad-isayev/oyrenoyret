# Discussions and live-conversation UX study

## Product conclusion

OyrenOyret discussions should be a hybrid of a forum directory and a live
conversation room:

- The directory stays durable and searchable. Every discussion has a clear
  title, a short context preview, one or more controlled tags, its author,
  message count, and latest activity.
- Opening a discussion enters one chronological conversation. Messages belong
  directly to the discussion; there are no nested replies, subthreads,
  reply-detail routes, or reply dialogs.
- The discussion’s opening post remains visually distinct as the persistent
  room context. The message timeline and composer stay lightweight.
- A right rail is not part of the application layout. Related or trending
  content must be presented in the primary page flow when it becomes valuable,
  never as a route-triggered third column.

This combines the discoverability of forum topics with the immediacy requested
for peer learning. Discord’s official forum guidance likewise distinguishes
durable, titled, tagged topics from free-range chat and recommends list view for
text-heavy discussions:
https://support.discord.com/hc/en-us/articles/6208479917079-Forum-Channels-FAQ

Slack’s official guidance shows why threads are useful when a channel contains
many competing subjects. OyrenOyret does not need that second hierarchy because
the discussion itself already isolates one subject:
https://slack.com/help/articles/115000769927-Use-threads-to-organize-discussions-in-channels

Discourse Chat demonstrates useful live-room details—chronological messages,
presence, typing state, moderation, files, and reconnection—but its optional
thread sidebar is deliberately excluded from this product:
https://meta.discourse.org/t/discourse-chat/230881

## Information architecture

### Discussion directory

The directory answers three questions in one scan:

1. What is this room about?
2. Who started it and how recently was it active?
3. Is there already a conversation worth joining?

Rows therefore prioritize title, context preview, tags, author, latest activity,
and message count. Popularity voting is not used as a competing visual signal.
Search and controlled context tags remain the primary retrieval tools.

### Discussion room

The room uses four stable regions:

1. A compact header with back navigation, title, connection state, and message
   count.
2. A scrollable timeline.
3. A “new messages” affordance that appears only when the reader is away from
   the bottom.
4. A persistent composer with an explicit Send action and Ctrl/Command + Enter
   shortcut.

Consecutive messages from the same author within five minutes are visually
grouped. The author remains available to assistive technology. Hover actions
do not reserve permanent horizontal space, while keyboard focus reveals the
same controls.

## Real-time behavior

Message creation remains a normal authenticated HTTP write. The room opens an
authenticated Server-Sent Events connection for server-to-client revision
events. MDN documents SSE as a widely supported fit for one-way server push:
https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events

The stream:

- sends no private message content itself;
- announces only that the canonical authorized snapshot changed;
- reconnects automatically;
- publishes visible connecting, live, and reconnecting states;
- emits heartbeats to prevent idle intermediaries from silently buffering the
  connection;
- closes after a bounded lifetime so platform infrastructure can recycle it;
- uses database revisions, so updates work across multiple application
  instances rather than depending on one process’s memory.

The current revision provider polls at a bounded two-second interval. If traffic
outgrows database-backed revisions, it can be replaced by managed pub/sub
without changing the browser event contract or message-write endpoint.

## Scroll and interruption rules

- Initial entry and messages sent by the current user move to the latest
  message.
- Incoming messages auto-scroll only when the reader is already near the
  bottom.
- When the reader is reviewing earlier context, the viewport is never stolen.
  A count-labelled new-message button returns them to the latest activity.
- Reduced-motion preferences disable smooth scrolling and nonessential motion.

## Durability and lifecycle

Established conversations are durable knowledge, not disposable chat.
Automatic read-only archival now defaults to 30 inactive days instead of 24
hours. Empty discussions can still be removed and refunded after 24 inactive
hours. Both thresholds remain configurable independently.

The migration preserves every existing message while removing the obsolete
self-referential parent relationship and accepted-answer field. Historical
credit transactions are retained.

## Moderation and access

- Account activation and suspension rules are still enforced by the existing
  server-side write gate.
- Authors can delete their own messages; moderators can remove content with a
  reason; every visible message can be reported.
- Removed content remains subject to the existing author/admin visibility
  policy.
- The live stream applies the same removed-discussion visibility boundary as
  the snapshot endpoint.
- Archived and removed rooms expose no active composer.

## Accessibility and responsive behavior

- The timeline uses `role="log"` with additions announced politely.
- Connection state is textual and does not rely on color.
- Every icon-only action has an accessible label.
- The room owns one internal scroll region, keeping its header and composer
  available on desktop and mobile.
- The layout remains a two-column application shell: primary navigation and
  content. No breakpoint can resurrect a right rail.
