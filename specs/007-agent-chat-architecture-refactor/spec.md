# Feature Specification: Agent Chat Architecture Refactor

**Feature Branch**: `007-agent-chat-architecture-refactor`
**Created**: 2026-05-30
**Status**: Draft
**Input**: User description: "The work done so far with 005-agent-chat-ui and 006-agent-model-connections is failure because ai chat and connection is not working then I decide to refactor these parts with the architecture learn from open design project. Read the Open Design chat architecture analysis and portable architecture documents to plan a new 007 refactor and upgrade Awesome Slide, make it functional, and do not hesitate to eliminate the broken parts."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Functional In-App Chat Run (Priority: P1)

As a slide creator, I want to send a prompt from the Awesome Slide chat rail and see a real run progress to a terminal state so the chat no longer feels stuck or decorative.

**Why this priority**: This is the core failure in the current 005/006 work. Without a reliable run lifecycle, the UI and settings work do not matter.

**Independent Test**: Use a deterministic ready connection to send a prompt from the slide page, observe queued/progress/text/proposal events, and verify the assistant turn reaches completed or needs-review.

**Acceptance Scenarios**:

1. **Given** an active ready connection, **When** the user sends a prompt, **Then** the app creates a run, streams visible events, releases the composer on terminal state, and stores enough event history for reload recovery.
2. **Given** no valid connection, **When** the user sends a prompt, **Then** the run is blocked before model execution with a categorized recovery state and the prompt remains editable.
3. **Given** a run whose event stream fails before terminal state, **When** the stream disconnects, **Then** the runtime resolves the run as failed or reattaches by event id instead of leaving the turn pending.

---

### User Story 2 - Reliable Connection Execution (Priority: P1)

As a user with a local CLI agent or BYOK model provider, I want Awesome Slide to test and execute the selected connection through one runtime path so connection setup actually powers chat generation.

**Why this priority**: The current split leaves connection setup and chat execution loosely coupled. The refactor must make the active connection executable, cancellable, and safe.

**Independent Test**: Configure a deterministic fixture, a local CLI command, or an environment-variable BYOK provider and verify the next chat run uses the selected connection snapshot and capability flags.

**Acceptance Scenarios**:

1. **Given** a selected local CLI connection, **When** the user sends a prompt, **Then** the runtime launches the configured adapter in the project workspace and normalizes stdout, structured events, diagnostics, errors, and exit status.
2. **Given** a selected BYOK provider, **When** the user sends a prompt, **Then** the runtime resolves the credential server-side, streams through a provider adapter, and never exposes the raw key in browser state, route payloads, logs, or audit records.
3. **Given** an unsupported or incompatible connection, **When** the user tests or uses it, **Then** the runtime reports a categorized failure and does not fall back to simulated success.

---

### User Story 3 - Preview, Apply, And Refresh Slide Output (Priority: P1)

As a cautious creator, I want file-changing agent output to become a validated proposal that I can preview and apply so generated slides are real source files, not just assistant prose.

**Why this priority**: A working chat must produce usable slide changes. The system must preserve the 005 safety goals while replacing broken generation plumbing.

**Independent Test**: Run a prompt that creates or updates a slide, inspect the proposal, apply it, and verify the slide source changes and the preview refreshes.

**Acceptance Scenarios**:

1. **Given** a run returns structured edit output, **When** the runtime parses it, **Then** it creates a proposal with operations, validation status, file fingerprints, preview artifacts, and generated-file summaries.
2. **Given** a valid proposal, **When** the user applies all or selected operations, **Then** all selected writes succeed as one transaction or fail with rollback/error reporting.
3. **Given** source files changed after proposal generation, **When** the user tries to apply, **Then** the proposal becomes conflict/expired and no stale write occurs.

---

### User Story 4 - Reattach, Cancel, Retry, And Recover (Priority: P2)

As a user running long agent work, I want reloads, cancellation, retry, and provider/process failures to be recoverable without losing the visible chat state.

**Why this priority**: Open Design's architecture shows that active runs must belong to the execution host, not only React state.

**Independent Test**: Start a long run, reload the slide page, reconnect to events after the last sequence id, cancel the run, and retry from the failed/cancelled assistant turn.

**Acceptance Scenarios**:

1. **Given** an active run, **When** the browser reloads, **Then** the UI can discover the active run and replay missed events.
2. **Given** a user cancels a run, **When** the runtime receives cancellation, **Then** the child process or provider stream is aborted and a terminal cancelled event is emitted.
3. **Given** a failed assistant turn, **When** the user retries, **Then** the runtime creates a new run linked to the original prompt and context snapshot.

---

### User Story 5 - Replace Broken 005/006 Runtime Pieces (Priority: P2)

As a maintainer, I want the new architecture to remove or isolate broken implementation paths so future tasks build on a smaller, coherent runtime.

**Why this priority**: Keeping the existing oversized route handlers and simulation branches as production behavior would make the refactor fail again.

**Independent Test**: Static review and focused tests verify production code no longer depends on prompt-prefix simulations, browser-only pending state, non-streaming provider calls, or ad hoc local CLI handling inside the chat route.

**Acceptance Scenarios**:

1. **Given** the 007 implementation is complete, **When** production routes run, **Then** test-only fixture behavior is available only behind an explicit E2E flag.
2. **Given** existing 005/006 UI components remain useful, **When** they call runtime APIs, **Then** they consume the new contracts without owning provider, local process, or run lifecycle details.
3. **Given** code paths are obsolete, **When** they duplicate or conflict with 007 runtime ownership, **Then** they are deleted or converted into thin compatibility adapters.

### Edge Cases

- Active connection id points to a deleted or invalid connection.
- Connection status is ready but credential resolution fails at run time.
- Provider stream emits malformed frames, no text, no terminal event, or rate-limit/auth errors.
- Local CLI cannot spawn, exits nonzero, writes stderr only, emits unsupported structured JSON, or ignores cancellation.
- Browser closes the SSE stream while the run continues.
- User reloads after proposal creation but before apply.
- Proposal apply targets a missing slide, changed source fingerprint, invalid TSX, unsupported theme, or read-only build.
- Deterministic fixture is accidentally reachable outside `AWESOME_SLIDE_E2E=1`.
- Context would exceed budget or include hidden/secret-bearing files.
- Two prompts are submitted while one run is still queued, streaming, or needs review.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 007 MUST supersede the 005/006 runtime ownership model. 005 and 006 remain reference material for UI, settings, and safety requirements, but broken execution paths may be deleted.
- **FR-002**: The Vite-side Awesome Slide runtime MUST own chat run lifecycle: run ids, status, event history, replay, cancellation, terminal reconciliation, active-run discovery, and cleanup.
- **FR-003**: Browser UI MUST interact with chat through stable runtime contracts instead of directly executing providers, local CLIs, proposal parsing, or run timers.
- **FR-004**: Existing `/__agent-chat` and `/__agent-connections` routes SHOULD remain compatible where practical, but their implementation MUST delegate to focused runtime modules rather than one oversized route file.
- **FR-005**: Every accepted prompt MUST create a visible user turn and assistant run state within 100ms in the browser, and the runtime MUST emit queued/progress or a categorized failure within 500ms after accepting the run.
- **FR-006**: Production runtime MUST NOT treat prompt prefixes such as `simulate-*` as behavior. Deterministic behavior for tests MUST be isolated behind `AWESOME_SLIDE_E2E=1`.
- **FR-007**: The runtime MUST normalize local-agent and provider output into one chat event protocol with sequence ids, timestamps, replay support, and terminal events.
- **FR-008**: The event protocol MUST support queued, start/progress, text delta, thinking/status, tool call, tool result, proposal, file summary, diagnostic, error, completed, cancelled, and failed semantics.
- **FR-009**: API/BYOK execution MUST resolve credentials server-side through safe references and stream through provider adapters; raw credentials MUST NOT be returned to the browser, stored in project settings, included in prompt context, or written to audit logs.
- **FR-010**: Local CLI execution MUST use per-agent runtime definitions for command, args, stdin mode, parser, capabilities, cancellation, model/reasoning support, and environment redaction.
- **FR-011**: The first implementation slice MUST support Codex CLI and Claude Code as local-agent definitions, with unsupported agents reported as incompatible rather than executed through a generic unsafe fallback.
- **FR-012**: Provider adapters MUST initially support the already planned BYOK providers that are present in the registry, but they MUST stream or normalize provider output rather than using one-shot non-streaming calls for chat.
- **FR-013**: Prompt assembly MUST be separate from transport. It MUST combine bounded slide/deck/theme context, selected workflow instructions from `packages/core/skills`, connection capability constraints, and explicit no-tools rules for tool-free provider paths.
- **FR-014**: Direct provider mode MUST not claim local file/tool capabilities unless the runtime has a real host-mediated tool/proposal path for that provider.
- **FR-015**: File-changing output MUST become a structured proposal before writes. Assistant prose alone MUST NOT be applied as source changes.
- **FR-016**: Proposal validation MUST check source fingerprints, TSX parseability where relevant, metadata/theme/deck existence, read-only mode, and mutation guard constraints before apply.
- **FR-017**: Proposal apply MUST write through existing Awesome Slide file/management helpers where possible and refresh slide/deck views from source-of-truth file metadata, including changed file identifiers and source-version hints.
- **FR-018**: Active runs MUST be discoverable after browser reload, and event streaming MUST support replay by last seen sequence id.
- **FR-019**: Cancellation MUST be routed to the runtime owner and abort the provider stream or child process before emitting a terminal cancelled event.
- **FR-020**: The runtime MUST persist project-scoped conversations, messages, run summaries, proposals, and audit entries under ignored `.awesome-slide/agent-chat/` storage or an equivalent local store.
- **FR-021**: Persistence MUST be bounded and redacted: no raw API keys, hidden-file contents, secret-like diagnostics, or bulky preview artifacts in message history.
- **FR-022**: The UI MUST prevent multiple simultaneous active runs in one session unless the previous run is terminal or the pending proposal has been resolved.
- **FR-023**: Errors MUST be categorized across connection unavailable, authentication failed, quota/rate limit, unsupported model, provider offline, missing executable, incompatible protocol, timeout, parser error, invalid proposal, validation failure, patch conflict, write failure, and cancelled.
- **FR-024**: Static/read-only runtime mode MUST expose chat status and settings recovery but block run creation, local scanning, credential writes, and proposal apply.
- **FR-025**: The refactor MUST preserve the useful 005/006 UI affordances: chat rail/drawer, connection settings, quick switcher, context chips, status cards, proposals, generated-file summaries, and audit controls.
- **FR-026**: The refactor MUST remove or convert obsolete 005/006 code that duplicates runtime ownership, including simulation branches, direct provider calls embedded in chat routes, generic local-agent fallbacks, and browser-only stuck-run recovery.
- **FR-027**: The deterministic E2E fixture required by 008 MUST exercise the same runtime contracts as real connections and MUST be unreachable without the E2E environment flag.
- **FR-028**: Implementation in `packages/core` MUST include a patch changeset before completion.
- **FR-029**: Implementation tasks MUST preserve the Open Design source-reference responsibility mapping documented in the 007 plan instead of reintroducing route-owned or browser-owned execution behavior.

### Key Entities *(include if feature involves data)*

- **Agent Connection**: Safe connection metadata, type, provider, model/reasoning preferences, capabilities, status, and secret reference.
- **Chat Conversation**: Project-scoped message container with active run references and bounded history.
- **Chat Message**: User, assistant, or status record with event-derived content, terminal state, proposal links, and redacted diagnostics.
- **Chat Run**: Execution unit with run id, connection snapshot, context snapshot, prompt package, state, event log, abort handle, timestamps, and terminal outcome.
- **Run Event**: Sequenced event emitted by local agents, provider adapters, runtime status, tool handling, proposal parsing, or terminal reconciliation.
- **Prompt Package**: Composed instructions, workflow refs, context summary, transcript, capability rules, and safety constraints sent to the adapter.
- **Edit Proposal**: Validated file-changing output with operations, previews, source fingerprints, risk, state, and apply/reject history.
- **Audit Entry**: Redacted record of prompt, connection, workflow, context summary, proposal, applied files, validation summary, and timestamp.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A deterministic ready connection can create or update a slide through chat, produce a proposal, apply it, and render a nonblank slide preview in the 008 E2E flow.
- **SC-002**: No accepted prompt remains queued, loading, or streaming beyond the configured watchdog without transitioning to completed, needs-review, cancelled, or failed.
- **SC-003**: Cancelling an active local-agent or provider run emits a terminal cancelled event and releases the composer within 2 seconds in automated tests.
- **SC-004**: Reloading the browser during an active run can replay prior events and continue from the latest sequence id without duplicating assistant text.
- **SC-005**: Connection bootstrap, settings payloads, chat payloads, persisted messages, diagnostics, and audit entries contain no raw API key values in unit tests.
- **SC-006**: Production tests verify `simulate-*` prompt branches and deterministic fixture behavior are unavailable unless `AWESOME_SLIDE_E2E=1` is set.
- **SC-007**: `pnpm check`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and the 008 Playwright command pass before this refactor is considered complete.

## Assumptions

- The implementation is local-first and remains inside `@awesome-slide/core`; no daemon package or published runtime dependency is added in the initial refactor.
- The Vite dev server acts as Awesome Slide's local execution host, analogous to the Open Design daemon.
- Environment-variable credential references are acceptable for the first functional BYOK slice; OS keychain support can remain a later enhancement unless already implemented safely.
- The first reliable local-agent adapters are Codex CLI and Claude Code because they match the studied Open Design runtime patterns and are enough to prove the architecture.
- Direct browser-to-provider streaming is intentionally not used for the first refactor because server-side provider adapters give one event protocol and keep credentials out of browser state.
- Existing 005/006 visual components and type models may be reused, but runtime code may be deleted or reorganized when it conflicts with 007 ownership.
