# Contract: Agent Chat UI State

## Entry Points

- Slide workspace toolbar opens the agent panel for the current slide and page.
- Slide management toolbar or slide inspector opens the agent drawer for the selected slide, deck, or collection.
- No-connection and failed-connection states expose a route to connection settings defined by `specs/006-agent-model-connections`.

## Layout

- Desktop: right-side panel that does not cover the slide preview by default.
- Narrow screens: drawer with the same message, context, and preview controls.
- Static builds: panel can open in read-only/no-connection mode but cannot execute file-changing runs.

## State Mapping

| Run State | Required UI |
|-----------|-------------|
| `queued` | Message appears with queued indicator and cancel action. |
| `loading` | Progress copy appears while prior messages remain visible. |
| `streaming` | Assistant text streams separately from file-change preview. |
| `needs-review` | Proposal preview and apply/reject/refine controls are visually distinct from chat actions. |
| `completed` | Final assistant response remains in history. |
| `cancelled` | Cancelled status appears; no partial apply controls are shown. |
| `failed` | Categorized error with recovery actions appears. |

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
- Create related slide

Rules:

- Actions adapt to current context and disabled prerequisites.
- Broad or destructive actions require stronger confirmation before apply.
- Suggested actions populate the composer but do not send automatically unless the user confirms.

## Message Accessibility

- Message list has a programmatic label.
- New streamed content uses polite live-region behavior.
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
| `invalid-agent-output` | Retry, refine prompt, copy diagnostics. |
| `patch-conflict` | Refresh, retry, reject proposal. |
| `validation-failure` | Inspect diagnostics, refine prompt, reject proposal. |
| `write-failure` | Retry apply, copy diagnostics, refresh. |

## Refresh Expectations

- Applied source or metadata changes refresh the affected slide workspace or management view through existing file-change events.
- If refresh fails, the panel keeps the transaction result visible and exposes a refresh recovery action.
- Reject and cancel do not trigger file refresh unless the underlying source changed independently.
