# Contract: Agent Runtime API

## Scope

Defines browser-facing route behavior for the refactored agent runtime. Existing route prefixes may remain for compatibility, but route handlers delegate to `packages/core/src/agent-runtime/`.

## Session Bootstrap

```text
GET /__agent-chat/session?slideId=<slideId>
```

Returns:

```json
{
  "conversation": {
    "conversationId": "conv_...",
    "activeRunId": null,
    "activeSlideId": "intro",
    "messages": []
  },
  "activeConnection": {
    "connectionId": "conn_...",
    "displayName": "Codex CLI",
    "type": "local-agent",
    "provider": "codex",
    "modelId": "gpt-5",
    "status": "ready",
    "capabilities": {
      "streaming": true,
      "cancellation": true,
      "structuredProposals": true,
      "toolCalls": true,
      "localFileContext": true,
      "writeCapable": true,
      "supportedModalities": ["text"]
    }
  },
  "runtime": {
    "mode": "interactive",
    "settingsRoute": "/settings/connections",
    "settingsModalTarget": "execution-model"
  },
  "suggestedActions": []
}
```

Rules:

- The payload is safe for browser state.
- Raw credential references, API keys, env values, and absolute hidden paths are never returned.
- If an active run exists, `activeRunId` is returned so the UI can reattach.

## Create Run

```text
POST /__agent-chat/runs
```

Request:

```json
{
  "conversationId": "conv_...",
  "prompt": "Create a product intro slide",
  "actionId": "create-related-slide",
  "contextPreferences": [],
  "clientContext": {
    "slideId": "intro",
    "selectedElementIds": []
  }
}
```

Response:

```json
{
  "runId": "run_...",
  "state": "queued",
  "eventUrl": "/__agent-chat/runs/run_.../events"
}
```

Rules:

- Empty prompts return `400`.
- Read-only runtime returns `403`.
- Missing or unusable connection returns `503` with categorized recovery actions.
- Accepted runs emit a queued/progress or failure event within 500ms.
- The runtime stores the prompt, connection snapshot, context snapshot, and prompt package before adapter execution begins.

## Stream Run Events

```text
GET /__agent-chat/runs/:runId/events?after=<sequence>
Last-Event-ID: <sequence>
```

SSE frame:

```text
id: 7
event: message
data: {"sequence":7,"runId":"run_...","type":"text_delta","payload":{"text":"..."},"createdAt":"..."}
```

Rules:

- `after` and `Last-Event-ID` replay only events with greater sequence.
- Without a cursor, all available events are replayed before live attachment.
- Terminal `completed`, `cancelled`, and `failed` events close the stream after delivery.
- Stream close by the browser does not cancel the run.

## Active Runs

```text
GET /__agent-chat/runs?conversationId=<conversationId>
```

Returns active or recent run summaries for reattach:

```json
{
  "runs": [
    {
      "runId": "run_...",
      "conversationId": "conv_...",
      "state": "running",
      "lastSequence": 12,
      "startedAt": "...",
      "connection": { "displayName": "Codex CLI", "type": "local-agent" }
    }
  ]
}
```

## Cancel Run

```text
POST /__agent-chat/runs/:runId/cancel
```

Response:

```json
{ "ok": true, "runId": "run_...", "state": "cancelled" }
```

Rules:

- Cancellation is idempotent for already-terminal runs.
- The runtime aborts provider fetches or child processes before terminal reconciliation.
- A `cancelled` event is emitted exactly once.

## Retry Run

```text
POST /__agent-chat/runs/:runId/retry
```

Request:

```json
{
  "reuseContext": true,
  "promptOverride": "Try again with fewer words"
}
```

Rules:

- Retry creates a new run linked to the original run id.
- It uses a fresh connection snapshot and fresh source fingerprints.
- It may reuse or refresh context according to request policy.

## Submit Tool Result

```text
POST /__agent-chat/runs/:runId/tool-result
```

Request:

```json
{
  "toolCallId": "tool_...",
  "result": { "answer": "Use the concise version" }
}
```

Rules:

- Supported only for runtime definitions with host-mediated tool-result capability.
- If the live route is no longer valid, the UI may send the answer as a normal follow-up prompt.

## Apply Proposal

```text
POST /__agent-chat/proposals/:proposalId/apply
```

Request:

```json
{
  "operationIds": ["op_1", "op_2"],
  "confirmedHighRisk": false
}
```

Rules:

- Runtime revalidates fingerprints and mutation guards immediately before write.
- Selected apply is transactional for selected operations.
- Partial success is reported as failure unless every selected operation succeeds.
- Successful apply writes an audit entry and emits/returns generated-file summaries.
- Successful apply returns changed file identifiers, source version hints, and refresh targets so the browser refreshes slide/deck views from file metadata rather than assistant text.
- The runtime uses existing Awesome Slide file/edit/management helpers and Vite refresh paths for writes and preview invalidation.

Response:

```json
{
  "transactionId": "tx_...",
  "proposalId": "proposal_...",
  "state": "applied",
  "writtenFiles": ["slides/product-intro/index.tsx"],
  "refresh": {
    "slides": ["product-intro"],
    "decks": ["deck_1"],
    "sourceVersions": {
      "slides/product-intro/index.tsx": "mtime-or-hash"
    }
  },
  "auditEntryId": "audit_..."
}
```

## Reject Proposal

```text
POST /__agent-chat/proposals/:proposalId/reject
```

Rules:

- Proposal state becomes `rejected`.
- No source files are modified.

## Audit History

```text
GET /__agent-chat/audit?limit=50
```

Rules:

- Returns redacted audit summaries only.
- Does not return raw prompts when they contain secret-like values.
