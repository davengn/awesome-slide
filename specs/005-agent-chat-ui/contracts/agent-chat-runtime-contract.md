# Contract: Agent Chat Runtime

## Scope

Defines the local runtime boundary between the Awesome Slide app UI, Vite dev-server middleware, bundled `packages/core/skills` authoring workflows, and the active connection adapter owned by `specs/006-agent-model-connections`.

## Routes

### `GET /__agent-chat/session`

Returns current project-safe chat bootstrap data.

Response:

```json
{
  "session": {
    "id": "session_abc",
    "origin": "slide-workspace",
    "activeSlideId": "intro"
  },
  "activeConnection": {
    "connectionId": "local-codex",
    "displayName": "Codex",
    "type": "local-agent",
    "modelOrAgent": "codex",
    "status": "ready"
  },
  "runtime": {
    "mode": "interactive",
    "settingsRoute": "/settings/connections"
  },
  "availableSkillWorkflows": [
    {
      "id": "slide-authoring",
      "displayName": "Slide authoring",
      "contentHash": "sha256:..."
    }
  ],
  "suggestedActions": []
}
```

Rules:

- Does not return secrets or raw credential state.
- Returns a no-connection state with setup route metadata when no valid connection exists.
- Returns `mode: "read-only"` for static or read-only builds; file-changing run creation and proposal apply actions are blocked in that mode.
- Returns safe workflow metadata only. Full skill bodies from `packages/core/skills/*/SKILL.md` are not sent to the browser during bootstrap.
- If required bundled workflows are missing, returns a degraded non-writing mode with a `skill-unavailable` recovery error.

## Bundled Workflow Selection

The runtime maps user intent and suggested actions to workflow instructions shipped in `packages/core/skills`:

| Intent | Required workflows |
|--------|--------------------|
| Deictic current slide/page/element prompt | `current-slide`, `slide-authoring` |
| Edit copy, layout, alignment, selected element, source, or notes | `slide-authoring` |
| Create related slide or new deck content | `create-slide`, `slide-authoring` |
| Apply inspector comments | `apply-comments`, `slide-authoring` |
| Create or extract a theme | `create-theme`, `slide-authoring` |
| Apply an existing theme to a slide/deck | `slide-authoring` plus available theme summaries |

Rules:

- The runtime reads the versioned `SKILL.md` files from the package skills directory resolved by `@awesome-slide/core`, not from a duplicated copy in the spec.
- A run stores workflow IDs and hashes for UI/audit traceability.
- Full skill body text is included only in the server-to-adapter request and is not stored in local browser history or audit JSONL.
- A write-capable run is rejected with `skill-unavailable` if any required workflow cannot be loaded.

### `POST /__agent-chat/runs`

Starts a prompt run.

Request:

```json
{
  "sessionId": "session_abc",
  "prompt": "Tighten this slide and improve hierarchy.",
  "actionId": "improve-copy",
  "requestedWorkflowIds": ["slide-authoring"],
  "contextPreferences": [
    { "kind": "current-slide", "enabled": true },
    { "kind": "selected-elements", "enabled": true }
  ]
}
```

Response:

```json
{
  "runId": "run_123",
  "state": "queued",
  "eventUrl": "/__agent-chat/runs/run_123/events"
}
```

Validation:

- `prompt` must be non-empty after trimming.
- `requestedWorkflowIds` is optional. The server may override or add required workflows based on prompt, suggested action, and context.
- The session must not already have a queued, loading, streaming, or needs-review run.
- The active connection must be ready or degraded-but-usable.
- Context collection must complete without including hidden files, env files, stored credentials, or unrelated project files.
- Required bundled workflows must be loaded and hashed before the adapter is called.
- Empty decks, missing slides, parse-error slides, unsupported metadata formats, or read-only sources return categorized failures before any write-capable run starts.
- The route must return a run ID, event URL, or categorized failure quickly enough for the UI to keep the submitted prompt visible and actionable.
- If the adapter cannot start or does not emit an initial event inside the startup timeout, the runtime emits a `failed` event with `category: "timeout"` or `category: "model-failed"`.

### `GET /__agent-chat/runs/:runId/events`

Streams server-sent events for the run.

Event types:

- `queued`
- `progress`
- `token`
- `proposal`
- `diagnostic`
- `completed`
- `cancelled`
- `failed`

Rules:

- Events include monotonically increasing `sequence`.
- The stream closes after terminal events.
- Clients reconnect by requesting the same run ID; the server may replay retained events for an active run.
- A normal terminal stream close after `completed`, `cancelled`, or `failed` must not be treated as a new client error.
- A disconnect before any terminal or review event is converted by the client into a failed assistant turn with retry and edit-prompt actions.
- The runtime must not leave an accepted run active without a terminal or needs-review event; watchdog timeout is part of the route contract.

### `POST /__agent-chat/runs/:runId/cancel`

Cancels a queued, loading, or streaming run.

Response:

```json
{ "ok": true, "runId": "run_123", "state": "cancelled" }
```

Rules:

- Cancellation aborts adapter work where supported.
- Cancellation must not apply partial edits.
- Cancelling a run already in `needs-review` leaves the proposal pending until rejected or applied.

### `POST /__agent-chat/runs/:runId/retry`

Creates a new run from the same prompt and current context preferences.

Response:

```json
{ "runId": "run_124", "state": "queued", "eventUrl": "/__agent-chat/runs/run_124/events" }
```

Rules:

- Retry recollects context rather than reusing stale source snippets.
- Retry preserves the previous run in session history.

### `POST /__agent-chat/proposals/:proposalId/apply`

Applies all or selected operations from a valid proposal.

Request:

```json
{
  "operationIds": ["op_1", "op_3"],
  "confirmation": {
    "acceptedRiskLevel": "high"
  }
}
```

Response:

```json
{
  "ok": true,
  "transactionId": "apply_123",
  "writtenFiles": ["slides/intro/index.tsx"],
  "auditEntryId": "audit_123"
}
```

Validation:

- Proposal must be in `pending-review`.
- Selected operations must be valid and conflict-free.
- The shared proposal validator must run immediately before apply, even if validation already ran during proposal ingestion.
- Proposal source, deck, theme, and metadata version checks must still match current project state.
- High-risk operations require explicit confirmation.
- Writes must pass existing mutation guards.
- Static or read-only runtime mode rejects apply before transaction creation.

### `POST /__agent-chat/proposals/:proposalId/reject`

Rejects a pending proposal.

Response:

```json
{ "ok": true, "proposalId": "proposal_123", "state": "rejected" }
```

Rules:

- Rejecting a proposal performs no file writes.
- Rejected proposal summaries may remain visible in the current session.

### `GET /__agent-chat/audit`

Returns redacted audit summaries for applied agent changes in the current project.

Response:

```json
{
  "entries": [
    {
      "id": "audit_123",
      "timestamp": "2026-05-29T09:00:00.000Z",
      "visibleSummary": "Applied 2 operations to slides/intro/index.tsx",
      "appliedFiles": ["slides/intro/index.tsx"],
      "operationKinds": ["patch-slide-source"],
      "connection": {
        "displayName": "Codex",
        "modelOrAgent": "codex"
      }
    }
  ]
}
```

Rules:

- The response must not include raw provider secrets, hidden-file contents, raw diagnostics, or bulky generated artifacts.
- Entries are sorted newest first and bounded by request limit or runtime default.

## Adapter Boundary

The runtime calls the active connection through a provider-neutral interface:

```ts
type StartAgentChatRun = (request: {
  runId: string;
  prompt: string;
  context: AgentChatContext;
  workflows: Array<{
    id: string;
    contentHash: string;
    instructions: string;
  }>;
  connectionId: string;
  signal: AbortSignal;
}) => AsyncIterable<AgentChatEvent>;
```

Rules:

- The connection layer owns credential lookup and provider-specific request shaping.
- The chat runtime owns workflow selection, bundled skill loading, context redaction, proposal parsing, validation, preview, apply, and audit.
- Invalid adapter output is categorized as `invalid-agent-output`.
- Adapter output containing file-changing operations must be normalized, risk-classified, fingerprinted, and validated before a `proposal` event is emitted.
- Adapter output for slide source generation or edits must be validated against the `slide-authoring` workflow constraints before proposal emission.

## Error Shape

```json
{
  "error": "Connection is not configured.",
  "category": "connection-unavailable",
  "recoveryActions": ["change-connection", "retry"],
  "diagnostics": "redacted optional details"
}
```

Supported categories:

- `connection-unavailable`
- `authentication-failed`
- `model-failed`
- `timeout`
- `skill-unavailable`
- `invalid-agent-output`
- `patch-conflict`
- `validation-failure`
- `write-failure`
- `cancelled`
