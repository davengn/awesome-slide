# Data Model: Agent Chat Architecture Refactor

## Agent Runtime Project

Represents the local Awesome Slide project served by the Vite runtime.

**Fields**:

- `projectId`: Stable project key, usually derived from the project root.
- `rootPath`: Server-only absolute path. Never returned raw to browser except redacted labels.
- `slidesRoot`, `themesRoot`, `assetsRoot`: Server-only source directories from `ApiContext`.
- `runtimeMode`: `interactive` or `read-only`.
- `storageRoot`: `.awesome-slide/agent-chat/`.

**Relationships**:

- Owns conversations, runs, proposals, audit entries, and runtime storage.
- Reads connection settings from the existing agent-connections store.

**Validation Rules**:

- Runtime mutations are blocked when `runtimeMode` is `read-only`.
- Browser responses expose labels, ids, and safe relative paths only.

## Agent Connection Snapshot

Immutable safe copy of the selected connection at run start.

**Fields**:

- `connectionId`
- `displayName`
- `type`: `local-agent`, `manual-agent`, `api-provider`, or `fixture`
- `provider`
- `modelId`
- `reasoningEffort`
- `capabilities`
- `status`
- `settingsTarget`

**Relationships**:

- Attached to every chat run and audit entry.
- Derived from connection settings, but excludes secret references in browser payloads.

**Validation Rules**:

- Raw `credentialRef`, API key values, env values, and full manual paths are server-only.
- Runs require `ready` or explicitly allowed `degraded` status.

## Chat Conversation

Project-scoped container for visible chat state.

**Fields**:

- `conversationId`
- `projectId`
- `origin`: `slide-workspace` or `slide-management`
- `activeSlideId`
- `activeDeckId`
- `messageIds`
- `activeRunId`
- `createdAt`
- `updatedAt`

**Relationships**:

- Has many chat messages.
- May have one active non-terminal run.

**Validation Rules**:

- A conversation cannot start a second active run until the current run is terminal or its proposal is resolved.
- Persisted message history is bounded by count and serialized byte size.

## Chat Message

User, assistant, or status record derived from prompt submission and run events.

**Fields**:

- `messageId`
- `conversationId`
- `role`
- `parts`
- `state`
- `runId`
- `proposalId`
- `error`
- `createdAt`
- `completedAt`

**Relationships**:

- Assistant messages are linked to one run.
- Proposal messages link to one edit proposal.

**Validation Rules**:

- Diagnostics are redacted before persistence.
- Bulky preview contents are stored by reference or omitted from message history.

## Chat Run

Durable unit of model or agent execution.

**Fields**:

- `runId`
- `conversationId`
- `prompt`
- `promptPackageId`
- `connectionSnapshot`
- `contextSnapshotId`
- `state`: `queued`, `running`, `needs-review`, `completed`, `failed`, or `cancelled`
- `eventCursor`
- `startedAt`
- `finishedAt`
- `terminalReason`

**Relationships**:

- Has many run events.
- References one prompt package and one context snapshot.
- May create one or more proposals.
- Owns an in-memory abort handle while active.

**State Transitions**:

```text
queued -> running -> needs-review -> completed
queued -> running -> completed
queued -> running -> failed
queued -> running -> cancelled
queued -> cancelled
needs-review -> completed
needs-review -> failed
```

**Validation Rules**:

- Every accepted run emits an initial event.
- Terminal events set `finishedAt`, clear active abort handles, and release UI active-run locks.
- Non-terminal runs are recoverable by event replay.

## Run Event

Sequenced event emitted by runtime, adapter, parser, proposal validator, or terminal reconciler.

**Fields**:

- `sequence`
- `runId`
- `type`
- `payload`
- `createdAt`
- `source`: `runtime`, `provider`, `local-agent`, `proposal`, `tool`, or `fixture`

**Core Types**:

- `queued`
- `started`
- `progress`
- `text_delta`
- `thinking_delta`
- `tool_call`
- `tool_result`
- `proposal`
- `file_summary`
- `diagnostic`
- `error`
- `completed`
- `cancelled`
- `failed`

**Validation Rules**:

- Sequence is monotonic per run.
- Replay returns all events after the requested sequence.
- `completed`, `cancelled`, and `failed` are terminal.

## Prompt Package

Runtime-composed prompt sent to an adapter.

**Fields**:

- `promptPackageId`
- `userPrompt`
- `systemInstructions`
- `workflowRefs`
- `contextSnapshotId`
- `transcriptSummary`
- `capabilityInstructions`
- `outputContract`
- `createdAt`

**Relationships**:

- References workflow instruction records loaded from `packages/core/skills`.
- References one context snapshot.

**Validation Rules**:

- Tool-free provider paths receive explicit no-tools instructions.
- File-changing workflows include structured proposal output requirements.
- Oversized context is visibly truncated before prompt creation.

## Workflow Reference

Versioned skill instruction selected for a run.

**Fields**:

- `workflowId`: `current-slide`, `slide-authoring`, `create-slide`, `apply-comments`, or `create-theme`
- `sourcePath`
- `contentHash`
- `summary`
- `instructions`

**Validation Rules**:

- Missing or unreadable required workflow files produce a non-writing runtime error.
- Workflow content is loaded from shipped skill files, not stale copies in code.

## Context Snapshot

Bounded source and metadata context captured before run start.

**Fields**:

- `contextSnapshotId`
- `projectSummary`
- `slide`
- `selection`
- `collection`
- `theme`
- `notes`
- `sourceExcerpts`
- `limits`
- `truncated`
- `redactionSummary`
- `createdAt`

**Validation Rules**:

- Hidden files, `.env*`, credential-like values, and unrelated project files are excluded by default.
- Snapshot records truncation instead of silently exceeding budget.

## Local Agent Process

In-memory runtime handle for a spawned CLI.

**Fields**:

- `runId`
- `runtimeId`: `codex` or `claude-code` initially
- `command`
- `args`
- `cwd`
- `stdinMode`
- `parser`
- `pid`
- `startedAt`
- `abortedAt`

**Validation Rules**:

- Command and env are redacted in diagnostics.
- Cancellation sends the configured abort behavior and then emits a terminal event.
- Unsupported runtime ids cannot execute through generic fallback.

## Provider Stream

Runtime-owned BYOK provider request.

**Fields**:

- `runId`
- `provider`
- `modelId`
- `credentialStorage`
- `streamParser`
- `requestStartedAt`
- `usage`

**Validation Rules**:

- API key values are resolved server-side only.
- Provider errors are mapped to normalized connection/chat categories.
- Stream parser emits terminal failure when upstream disconnects without end.

## Edit Proposal

Reviewable file-changing output.

**Fields**:

- `proposalId`
- `runId`
- `summary`
- `scope`
- `riskLevel`
- `operations`
- `previewArtifacts`
- `validation`
- `fingerprints`
- `state`
- `createdAt`
- `updatedAt`

**Relationships**:

- Has many operations.
- May produce one apply transaction and one audit entry.

**State Transitions**:

```text
pending-review -> applied
pending-review -> rejected
pending-review -> conflict
pending-review -> expired
pending-review -> failed
```

**Validation Rules**:

- Source fingerprints are checked immediately before apply.
- High-risk operations require confirmation.
- Text-only assistant output cannot create a write proposal.

## Agent Operation

Single proposed source mutation.

**Fields**:

- `operationId`
- `kind`: `patch-slide-source`, `patch-slide-metadata`, `update-speaker-notes`, `create-slide`, `reorder-pages`, `apply-theme`, `update-deck`, or `raw-patch`
- `target`
- `description`
- `payload`
- `requiresConfirmation`
- `validationState`
- `reversible`

**Validation Rules**:

- Operations must target known slide/deck/theme paths or existing management API surfaces.
- Selected apply succeeds only when every selected operation succeeds.

## File Snapshot

Pre-turn or pre-apply source metadata.

**Fields**:

- `snapshotId`
- `relativePath`
- `hash`
- `mtime`
- `size`
- `capturedAt`

**Relationships**:

- Used by proposals to detect conflicts and compute produced files.

**Validation Rules**:

- Full source content is stored only when required for rollback and remains local/redacted.

## File Refresh Target

Source-of-truth refresh instruction returned after successful proposal apply.

**Fields**:

- `relativePath`
- `slideId`
- `deckId`
- `sourceVersion`: Hash, mtime, or equivalent source version token.
- `refreshKind`: `slide`, `deck`, `theme`, `asset`, or `management-index`

**Relationships**:

- Produced by an apply transaction.
- Consumed by chat UI, management UI, and preview refresh logic.

**Validation Rules**:

- Refresh targets are derived from actual written files and management metadata.
- Assistant text cannot create refresh targets unless a validated proposal write succeeded.
- Paths are browser-safe relative labels, not raw absolute filesystem paths.

## Audit Entry

Redacted record of applied agent changes.

**Fields**:

- `auditId`
- `timestamp`
- `promptSummary`
- `contextSummary`
- `connectionSnapshot`
- `workflowRefs`
- `proposalSummary`
- `operationKinds`
- `appliedFiles`
- `validationSummary`

**Validation Rules**:

- No raw credentials, hidden-file contents, or bulky generated artifacts.
- Written only after apply transaction success.

## Deterministic Fixture Mode

Test-only runtime adapter for 008 Playwright coverage.

**Fields**:

- `enabled`: derived from `AWESOME_SLIDE_E2E=1`
- `scenario`
- `connectionState`
- `eventScript`
- `proposalTemplate`

**Validation Rules**:

- Unavailable unless the E2E flag is set.
- Uses the same runtime contracts, event protocol, proposal validation, and apply path as real adapters.
