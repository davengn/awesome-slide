# Data Model: In-App Agent Chat

## AgentChatSession

Project-scoped conversation container for the current local browser profile.

Fields:

- `id: string`: stable session ID generated client-side.
- `projectKey: string`: non-secret identifier for the current Awesome Slide project.
- `origin: 'slide-workspace' | 'slide-management'`: surface where the session started.
- `activeSlideId?: SlideId`: current slide at session start or latest context refresh.
- `activeDeckId?: DeckId`: current deck when launched from management.
- `messages: AgentChatMessage[]`: short retained message list.
- `contextPreferences: ContextPreference[]`: user-selected context chips and exclusions.
- `currentRunId?: string`: run currently queued, loading, streaming, or needs-review.
- `createdAt: string`: ISO 8601 timestamp.
- `updatedAt: string`: ISO 8601 timestamp.

Validation and retention:

- Session summaries are stored locally and capped to the most recent 50 visible messages or 256KB serialized size, whichever limit is reached first.
- Generated artifacts and raw model diagnostics are not retained in the session by default.
- Session records must not include API keys, environment values, or hidden-file contents.
- A session has at most one queued, loading, streaming, or needs-review run; additional prompt text remains draft content until the active run is cancelled, fails, completes, or enters review.
- If run creation fails before a server run ID is available, the submitted prompt remains visible and the assistant/status turn becomes failed without setting `currentRunId`.

## AgentChatMessage

Visible message or status entry in a chat session.

Fields:

- `id: string`
- `sessionId: string`
- `role: 'user' | 'assistant' | 'status'`
- `content: MessagePart[]`
- `runId?: string`
- `proposalId?: string`
- `state: 'draft' | 'queued' | 'loading' | 'streaming' | 'completed' | 'cancelled' | 'failed' | 'needs-review'`
- `error?: AgentChatError`
- `createdAt: string`
- `completedAt?: string`

Rules:

- A user message may create one active run.
- An assistant message may attach at most one current proposal, though that proposal may contain many operations.
- Failed and cancelled messages preserve prior conversation content.

## MessagePart

Atomic renderable chunk within a message.

Fields:

- `type: 'text' | 'progress' | 'proposal-summary' | 'diagnostic' | 'run-status' | 'file-list'`
- `text?: string`
- `data?: unknown`

Rules:

- `text` is rendered as plain text or safe markdown subset only.
- Diagnostics must be redacted before persistence or copy-to-clipboard.
- `run-status` parts render compact queued/running/done/error cards for the current turn.
- `file-list` parts render generated or modified files from the current turn without embedding bulky artifact contents in session history.

## SkillWorkflowRef

Safe reference to the bundled authoring workflow instructions used for a run.

Fields:

- `id: 'current-slide' | 'slide-authoring' | 'create-slide' | 'apply-comments' | 'create-theme'`
- `displayName: string`
- `skillPath: string`: repository-relative path under `packages/core/skills/<id>/SKILL.md`
- `contentHash: string`: deterministic hash of the skill file content used for this run
- `role: 'context-resolution' | 'authoring-reference' | 'creation-workflow' | 'comment-workflow' | 'theme-workflow'`

Rules:

- The runtime reads workflow instructions from the bundled skill files shipped with `@awesome-slide/core`; it must not maintain a stale hard-coded copy of the skill body.
- `slide-authoring` is attached to every operation that writes `slides/<id>/index.tsx`.
- `current-slide` is attached when a prompt depends on the current slide, current page, or selected element.
- Missing or unreadable required workflows produce `category: 'skill-unavailable'` and block write-capable execution.
- Full skill body text is sent only to the active adapter request and is not persisted in browser session history or audit entries.

## ContextPreference

User-visible context chip selection.

Fields:

- `id: string`
- `kind: 'current-slide' | 'selected-elements' | 'deck' | 'folder' | 'theme' | 'speaker-notes' | 'source-excerpt' | 'rendered-snapshot'`
- `enabled: boolean`
- `required: boolean`
- `label: string`
- `budgetBytes?: number`

Rules:

- Required context is limited to non-secret identity metadata needed for the active surface.
- Optional context can be added or removed before sending a prompt.
- Hidden files, `.env*`, ignored secret paths, and unrelated project files are excluded unless a later explicit expansion flow is specified.

## AgentChatContext

Bounded context payload sent to the active connection adapter.

Fields:

- `project: { name?: string; rootLabel?: string }`
- `slide?: { id: SlideId; title?: string; pageIndex?: number; pageCount?: number; status?: string }`
- `selection?: SelectedElementDescriptor[]`
- `collection?: { folderId?: FolderId; deckId?: DeckId; slideIds?: SlideId[] }`
- `theme?: { activeThemeId?: string; availableThemeIds: string[]; summaries: ThemeSummary[] }`
- `notes?: { included: boolean; currentPage?: string; deckSummary?: string }`
- `source?: { excerpts: SourceExcerpt[]; totalBytes: number; truncated: boolean }`
- `workflows: SkillWorkflowRef[]`
- `limits: { maxBytes: number; generatedAt: string }`

Validation:

- Default serialized payload should stay under 128KB.
- Source excerpts are limited by per-file and total budgets.
- Context summaries must be deterministic so audit entries can record what the agent saw without storing full prompt payloads.

## SelectedElementDescriptor

Sanitized description of the active inspected element.

Fields:

- `slideId: SlideId`
- `pageIndex: number`
- `tagName?: string`
- `textPreview?: string`
- `sourceLocation?: { line: number; column?: number }`
- `bounds?: { x: number; y: number; width: number; height: number }`
- `editableProperties: string[]`

Rules:

- Text previews are trimmed and length-capped.
- Descriptors do not include raw React internals or DOM attributes that may contain secrets.
- When no inspector selection exists, the selected-elements context chip is disabled or marked unavailable and no empty selection array is sent as active context.

## SuggestedAction

Contextual prompt starter shown in the panel.

Fields:

- `id: 'improve-copy' | 'shorten-content' | 'redesign-layout' | 'apply-theme' | 'generate-speaker-notes' | 'fix-alignment' | 'apply-comments' | 'create-related-slide' | 'create-theme'`
- `label: string`
- `promptTemplate: string`
- `defaultContextKinds: ContextPreference['kind'][]`
- `workflowIds: SkillWorkflowRef['id'][]`
- `scope: 'selection' | 'slide' | 'deck'`
- `riskLevel: 'low' | 'medium' | 'high'`

Rules:

- Broad deck-wide actions default to the high-risk double-confirmation flow before apply.
- Actions with missing prerequisites, such as no selected element, are disabled or adapted to slide scope.
- Actions that create or modify slide source include `slide-authoring`; creation includes `create-slide`; inspector comment processing includes `apply-comments`; theme creation includes `create-theme`.

## AgentConnectionRef

Snapshot of the active adapter selection used for a run.

Fields:

- `connectionId: string`
- `displayName: string`
- `type: 'local-agent' | 'manual-agent' | 'api-provider'`
- `modelOrAgent: string`
- `status: 'ready' | 'needs-setup' | 'testing' | 'degraded' | 'failed' | 'offline'`

Rules:

- Full connection configuration and secrets remain owned by `specs/006-agent-model-connections`.
- Each run stores only the safe display snapshot needed for UI and audit.

## AgentChatRun

Single prompt execution.

Fields:

- `id: string`
- `sessionId: string`
- `prompt: string`
- `actionId?: SuggestedAction['id']`
- `context: AgentChatContext`
- `connection: AgentConnectionRef`
- `workflows: SkillWorkflowRef[]`
- `state: 'queued' | 'loading' | 'streaming' | 'needs-review' | 'completed' | 'cancelled' | 'failed'`
- `events: AgentChatEvent[]`
- `proposalId?: string`
- `clientRequestId?: string`
- `lastEventAt?: string`
- `timeoutAt?: string`
- `startedAt: string`
- `finishedAt?: string`

State transitions:

- `queued -> loading -> streaming -> completed`
- `queued|loading|streaming -> needs-review` when a file-changing proposal is produced.
- `queued|loading|streaming -> cancelled` when cancellation succeeds.
- `queued|loading|streaming|needs-review -> failed` when adapter, parsing, validation, or persistence fails.
- `needs-review -> completed` after reject, or after an apply transaction finishes.
- Any accepted run that has no startup event, heartbeat, terminal event, or review event before `timeoutAt` transitions to `failed` with `category: 'timeout'`.
- Terminal and review transitions clear the active stream subscription and release the composer.

## AgentChatEvent

Ordered streamed event emitted by the local runtime.

Fields:

- `sequence: number`
- `runId: string`
- `type: 'queued' | 'token' | 'progress' | 'proposal' | 'diagnostic' | 'completed' | 'cancelled' | 'failed'`
- `payload: unknown`
- `createdAt: string`

Rules:

- Sequence numbers are strictly increasing within a run.
- Failed events include a categorized `AgentChatError`.
- Accepted runs must emit at least one `queued`, `progress`, or `token` event within the startup budget, then either continue heartbeats/progress or reach `needs-review`, `completed`, `cancelled`, or `failed`.

## AgentEditProposal

Reviewable set of changes produced by an agent run.

Fields:

- `id: string`
- `runId: string`
- `summary: string`
- `scope: 'selection' | 'slide' | 'deck' | 'project'`
- `riskLevel: 'low' | 'medium' | 'high'`
- `sourceFingerprints: Record<string, string>`
- `contextFingerprint?: string`
- `operations: AgentOperation[]`
- `previewArtifacts: PreviewArtifact[]`
- `workflowRefs: SkillWorkflowRef[]`
- `validation: ProposalValidation`
- `state: 'pending-review' | 'applied' | 'partially-applied' | 'rejected' | 'expired' | 'conflict'`
- `createdAt: string`

Rules:

- Every file-changing response must produce a proposal before write.
- High-risk proposals include destructive, deck-wide, delete, or theme replacement operations and require the high-risk double-confirmation flow.
- `partially-applied` is allowed only when the user explicitly selected a subset; failed partial writes are not reported as success.
- The runtime validates the proposal before emitting it to the UI and validates it again immediately before apply.
- Source, deck, theme, and metadata fingerprints captured at proposal generation are compared before apply; mismatches set `state: 'expired' | 'conflict'`.
- Proposals that create or update Awesome Slide source must reference the workflow instructions used to generate the operations so review, apply, and audit can explain which bundled workflow guided the output.

## AgentOperation

Atomic proposed change.

Fields:

- `id: string`
- `kind: 'patch-slide-source' | 'patch-slide-metadata' | 'update-speaker-notes' | 'create-slide' | 'reorder-pages' | 'apply-theme' | 'update-deck' | 'raw-patch'`
- `target: OperationTarget`
- `description: string`
- `payload: unknown`
- `requiresConfirmation: boolean`
- `validationState: 'pending' | 'valid' | 'invalid' | 'conflict'`
- `reversible: boolean`

Rules:

- Structured operation kinds are preferred over `raw-patch`.
- Operations that target slide source must validate syntax before apply.
- Operations that target folders, decks, or slide metadata must validate IDs and schema constraints.

## PreviewArtifact

User-reviewable representation of proposed changes.

Fields:

- `id: string`
- `kind: 'operation-list' | 'source-diff' | 'rendered-before-after' | 'diagnostics'`
- `operationIds: string[]`
- `summary: string`
- `contentRef?: string`
- `inlineContent?: string`
- `truncated: boolean`

Rules:

- At least one artifact is required before apply.
- Rendered previews reuse existing slide canvas behavior where feasible.
- Large artifacts are held in memory or temporary runtime storage and excluded from session persistence.

## ProposalValidation

Preflight validation summary.

Fields:

- `status: 'pending' | 'valid' | 'invalid' | 'conflict'`
- `checks: ValidationCheck[]`
- `validatedAt?: string`

Rules:

- Invalid or conflicting proposals cannot be applied.
- Validation failures are mapped to user-facing recovery actions.

## ValidationCheck

Individual validation result.

Fields:

- `id: string`
- `kind: 'skill-workflow' | 'tsx-parse' | 'metadata-schema' | 'theme-exists' | 'deck-exists' | 'source-conflict' | 'mutation-guard' | 'typecheck'`
- `status: 'pass' | 'warn' | 'fail' | 'skipped'`
- `message: string`

## ApplyTransaction

Explicit write attempt for approved proposal operations.

Fields:

- `id: string`
- `proposalId: string`
- `selectedOperationIds: string[]`
- `state: 'applying' | 'applied' | 'failed' | 'rolled-back'`
- `writtenFiles: string[]`
- `auditEntryId?: string`
- `startedAt: string`
- `finishedAt?: string`
- `error?: AgentChatError`

Rules:

- Cancellation before apply prevents transaction creation.
- The transaction writes through existing guarded local mutation paths.
- On failure, UI refreshes from persisted state and does not show false success.

## AgentAuditEntry

Deterministic local record for applied changes.

Fields:

- `id: string`
- `timestamp: string`
- `prompt: string`
- `contextSummary: string`
- `proposalSummary: string`
- `appliedFiles: string[]`
- `operationKinds: AgentOperation['kind'][]`
- `connection: AgentConnectionRef`
- `workflowRefs: SkillWorkflowRef[]`
- `validationSummary: string`
- `visibleSummary: string`

Rules:

- Audit entries omit secrets, raw API keys, full generated artifacts, and hidden-file contents.
- Entries are append-only JSONL by default.
- A redacted summary is readable through the chat audit/history UI without exposing raw prompt payloads or hidden-file contents.

## AgentChatError

Categorized failure shape used by messages, runs, proposals, and transactions.

Fields:

- `category: 'connection-unavailable' | 'authentication-failed' | 'model-failed' | 'timeout' | 'skill-unavailable' | 'invalid-agent-output' | 'patch-conflict' | 'validation-failure' | 'write-failure' | 'cancelled'`
- `message: string`
- `recoveryActions: Array<'retry' | 'edit-prompt' | 'change-connection' | 'copy-diagnostics' | 'reject' | 'refresh'>`
- `diagnostics?: string`

Rules:

- Diagnostics are redacted before display or copy.
- Error categories map directly to the draft spec's required user recovery states.
