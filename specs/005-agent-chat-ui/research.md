# Research: In-App Agent Chat

## Decision: Build the chat as a `@awesome-slide/core` runtime feature

**Rationale**: The chat needs live slide state, current selection, theme metadata, slide management context, and local write access. Those all already converge in `packages/core/src/app`, `packages/core/src/http`, and the Vite middleware layer.

**Alternatives considered**:

- Separate app package: rejected because it would duplicate runtime state and add cross-app integration.
- CLI-only workflow: rejected because the spec requires in-app preview/apply behavior.

## Decision: Depend on the active connection adapter from `specs/006-agent-model-connections`

**Rationale**: The chat should not know provider protocols, credential storage, or local-agent discovery. It only needs an active connection reference, status, streaming response capability, cancellation, and structured proposal output.

**Alternatives considered**:

- Implement provider calls directly in chat: rejected because it violates the connection spec boundary.
- Require a single bundled provider: rejected because Awesome Slide should support local-first and hosted-model workflows.

## Decision: Use explicit bounded `AgentChatContext`

**Rationale**: The draft spec requires contextual prompts without leaking hidden files, secrets, or unrelated project files. A bounded context object can include current slide ID, page index, selected element descriptors, deck/folder metadata, theme IDs, notes inclusion, and limited source excerpts while making every included context visible as removable chips.

**Alternatives considered**:

- Send whole project files by default: rejected for privacy, performance, and relevance.
- Send only a rendered screenshot: rejected because copy/layout/source edits need semantic source and metadata.

## Decision: Model chat runs as a cancellable state machine with streamed events

**Rationale**: The UI must represent loading, queued, streaming, completed, cancelled, failed, and needs-review states. A run state machine keeps UI behavior deterministic and makes cancellation semantics testable.

**Alternatives considered**:

- Ad hoc component-local flags: rejected because preview/apply, retry, refine, and cancellation need shared transitions.
- Poll-only updates: rejected because streaming response text and proposal progress should appear promptly.

## Decision: Use local run routes plus server-sent events for streaming

**Rationale**: Local Vite middleware already owns mutation routes. A `POST /__agent-chat/runs` plus `GET /__agent-chat/runs/:id/events` contract keeps request creation, stream consumption, cancellation, and retry explicit without coupling to Vite HMR internals.

**Alternatives considered**:

- Reuse Vite HMR WebSocket: rejected because agent run semantics and cancellation should not depend on dev-server implementation details.
- Single blocking POST response: rejected because it cannot show streaming and progress states cleanly.

## Decision: Represent file changes as structured proposals first, patch fallback second

**Rationale**: Existing edit and management helpers can validate targeted operations such as metadata patches, source edits, page changes, slide creation, speaker notes updates, and theme application. Structured operations support selective apply, risk labeling, preview rendering, and audit summaries. Raw patches remain a fallback for edits that cannot be expressed structurally.

**Alternatives considered**:

- Raw unified diff only: rejected because selected apply and semantic validation become harder.
- Direct agent writes: rejected by the spec and by project safety expectations.

## Decision: Require preview and validation before writes

**Rationale**: File-changing responses must enter `needs-review` with preview artifacts before any mutation. Preflight validation should parse TSX/source changes, validate metadata/deck IDs, detect patch conflicts, classify destructive or broad edits, and block writes when cancelled.

**Alternatives considered**:

- Apply then show undo: rejected because the spec requires review before writes.
- Always run full project typecheck before preview: rejected as too slow for common interactions; typecheck remains a focused/final validation option.

## Decision: Keep chat history short and local by default

**Rationale**: The feature only needs current-project continuity. Browser storage can keep message summaries and context preferences, while project-local ignored audit JSONL records applied changes without storing secrets or bulky generated artifacts.

**Alternatives considered**:

- Cloud-synced chat history: rejected as a non-goal.
- Git-tracked chat transcripts: rejected because prompts may contain sensitive or noisy context.

## Decision: Integrate the UI as a desktop side panel and narrow-screen drawer

**Rationale**: The slide route already has a slide canvas, thumbnail rail, inspector, and design panel; the management route has a sidebar and inspector. A dedicated agent panel/drawer can preserve the slide preview by default on desktop and match the spec's responsive requirement.

**Alternatives considered**:

- Full-screen chat route: rejected because it hides the slide/deck context users are editing.
- Modal-only chat: rejected because long-running streamed work and preview review need persistent space.

## Decision: Test domain logic with Vitest and validate UI in the demo app

**Rationale**: The repo already uses Vitest and has no dedicated React component testing harness. High-risk behavior can be covered through pure state, context, proposal, route, and file/audit tests, with responsive and accessibility flows verified in the demo runtime.

**Alternatives considered**:

- Add a new UI testing dependency immediately: rejected unless implementation reveals an unavoidable gap.
- Manual-only validation: rejected because state transitions, cancellation, and proposal safety need repeatable tests.
