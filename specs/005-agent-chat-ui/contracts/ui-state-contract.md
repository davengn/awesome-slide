# Contract: Agent Chat UI State

## Entry Points

- Slide workspace toolbar opens the agent panel for the current slide and page.
- Slide management toolbar or slide inspector opens the agent drawer for the selected slide, deck, or collection.
- No-connection and failed-connection states expose a route to connection settings defined by `specs/006-agent-model-connections`.

## Layout

- Desktop: Open Design-style rail beside the slide workspace that does not cover the slide preview by default.
- Narrow screens: drawer with the same message, context, and preview controls.
- Static builds: panel can open in read-only/no-connection mode but cannot execute file-changing runs.

## Open Design Reference Anatomy

- Rail width targets 420-456px on desktop and sits under the app toolbar beside the slide canvas.
- Top area includes `Chat` and `Comments` tabs, with Chat active for this feature.
- Message turns are compact, readable, and separated by role without oversized cards.
- Running work appears as inline status/tool cards with queued, running, done, output, and error states.
- Status cards include the active workflow label, for example `Slide authoring`, `Create slide`, `Apply comments`, or `Create theme`.
- Generated or modified files from the current turn appear in a files tray with open/download-style actions where applicable.
- Composer is pinned to the bottom, preserves drafts, supports paste/drop affordances when implemented, and keeps send/cancel controls reachable.

## State Mapping

| Run State | Required UI |
|-----------|-------------|
| request-starting | User prompt appears immediately; assistant/status turn shows local submission progress. |
| `queued` | Message appears with queued indicator and cancel action. |
| `loading` | Progress copy appears while prior messages remain visible. |
| `streaming` | Assistant text streams separately from file-change preview. |
| `needs-review` | Proposal preview and apply/reject/refine controls are visually distinct from chat actions. |
| `completed` | Final assistant response remains in history. |
| `cancelled` | Cancelled status appears; no partial apply controls are shown. |
| `failed` | Categorized error with recovery actions appears. |

Rules:

- Run creation failure moves the local assistant/status turn to `failed` and keeps the composer usable.
- SSE disconnect before terminal or review state moves the active turn to `failed`; terminal stream close does not.
- Terminal and needs-review states clear active-run UI locks.
- If a required bundled workflow cannot be loaded, the state moves to `failed` with `skill-unavailable` before any model request or write-capable proposal.

## Context Controls

Context chips must show visible, removable context:

- `Current slide`
- `Selected elements`
- `Deck`
- `Theme`
- `Speaker notes`
- `Source excerpt`
- `Rendered snapshot`

Rules:

- Users can add/remove optional context before sending.
- Required identity context is visible even when not removable.
- Context controls show truncation or disabled states when data is unavailable.

## Suggested Actions

Required action set:

- Improve copy
- Shorten content
- Redesign layout
- Apply theme
- Generate speaker notes
- Fix alignment
- Apply comments
- Create related slide
- Create theme

Rules:

- Actions adapt to current context and disabled prerequisites.
- Actions show the workflow they will use before sending when the workflow is more specific than generic slide authoring.
- Broad or destructive actions require the high-risk double-confirmation flow before apply.
- Suggested actions populate the composer but do not send automatically unless the user confirms.

## Message Accessibility

- Message list has a programmatic label.
- New streamed content uses polite live-region behavior.
- Errors use `role="alert"` or an equivalent live announcement and appear near the failed turn or composer action.
- Composer, context chips, preview controls, and error actions are reachable by keyboard.
- Focus moves predictably when the panel/drawer opens and returns to the invoking control when closed.
- Apply/reject controls have explicit labels and visible focus states.

## Error Recovery Controls

| Error Category | Recovery Controls |
|----------------|-------------------|
| `connection-unavailable` | Change connection, retry after setup. |
| `authentication-failed` | Change connection, copy diagnostics. |
| `model-failed` | Retry, edit prompt, copy diagnostics. |
| `timeout` | Retry, cancel, edit prompt. |
| `skill-unavailable` | Refresh, copy diagnostics, retry after reinstall or skill sync. |
| `invalid-agent-output` | Retry, refine prompt, copy diagnostics. |
| `patch-conflict` | Refresh, retry, reject proposal. |
| `validation-failure` | Inspect diagnostics, refine prompt, reject proposal. |
| `write-failure` | Retry apply, copy diagnostics, refresh. |

## Refresh Expectations

- Applied source or metadata changes refresh the affected slide workspace or management view through existing file-change events.
- If refresh fails, the panel keeps the transaction result visible and exposes a refresh recovery action.
- Reject and cancel do not trigger file refresh unless the underlying source changed independently.
- The panel should prefer scoped viewer or management refresh over full page reload; full reload is a last-resort recovery action.

## Audit History

- A visible history or audit control opens recent redacted apply records for the current project.
- Each record shows timestamp, summary, affected files, operation kinds, and safe agent/model display metadata.
- Audit history excludes raw secrets, hidden-file contents, raw diagnostics, and bulky generated artifacts.
