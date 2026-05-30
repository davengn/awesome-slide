# Tasks: Agent Chat Architecture Refactor

**Input**: Design documents from `/Users/ducduy/Projects/awesome-slide/specs/007-agent-chat-architecture-refactor/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Included because the feature specification requires automated coverage for lifecycle, credential redaction, fixture isolation, cancellation, replay, proposal apply, and final quality gates.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested as an independent increment after the shared foundation is complete.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the runtime module boundary and shared test scaffolding.

- [X] T001 Create the runtime module directory and export barrel in `/Users/ducduy/Projects/awesome-slide/packages/core/src/agent-runtime/index.ts`
- [X] T002 [P] Define shared runtime DTOs and state unions in `/Users/ducduy/Projects/awesome-slide/packages/core/src/agent-runtime/contracts.ts`
- [X] T003 [P] Align browser-safe chat type mirrors with runtime contracts in `/Users/ducduy/Projects/awesome-slide/packages/core/src/app/lib/agent-chat-types.ts`
- [X] T004 [P] Add reusable runtime test fixtures and builders in `/Users/ducduy/Projects/awesome-slide/packages/core/src/agent-runtime/test-helpers.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the shared runtime primitives that every user story depends on.

**Critical**: No user story implementation should begin until this phase is complete.

- [X] T005 [P] Implement diagnostic and credential redaction helpers in `/Users/ducduy/Projects/awesome-slide/packages/core/src/agent-runtime/redaction.ts`
- [X] T006 [P] Add redaction coverage for credentials, home paths, hidden files, and diagnostics in `/Users/ducduy/Projects/awesome-slide/packages/core/src/agent-runtime/redaction.test.ts`
- [X] T007 [P] Implement runtime event normalization, sequence assignment, terminal detection, and SSE serialization in `/Users/ducduy/Projects/awesome-slide/packages/core/src/agent-runtime/events.ts`
- [X] T008 [P] Add event protocol tests for replay ordering, terminal semantics, and redacted payloads in `/Users/ducduy/Projects/awesome-slide/packages/core/src/agent-runtime/events.test.ts`
- [X] T009 [P] Implement bounded local persistence for conversations, messages, runs, proposals, and audit summaries in `/Users/ducduy/Projects/awesome-slide/packages/core/src/agent-runtime/storage.ts`
- [X] T010 [P] Add storage tests for `.awesome-slide/agent-chat/` paths, history bounds, and redacted persistence in `/Users/ducduy/Projects/awesome-slide/packages/core/src/agent-runtime/storage.test.ts`
- [X] T011 [P] Implement workflow loading from shipped skill files in `/Users/ducduy/Projects/awesome-slide/packages/core/src/agent-runtime/workflows.ts`
- [X] T012 [P] Add workflow selection and content-hash tests in `/Users/ducduy/Projects/awesome-slide/packages/core/src/agent-runtime/workflows.test.ts`
- [X] T013 [P] Implement bounded slide, deck, theme, notes, and source context capture in `/Users/ducduy/Projects/awesome-slide/packages/core/src/agent-runtime/context.ts`
- [X] T014 [P] Add context tests for truncation, hidden-file exclusion, and safe browser labels in `/Users/ducduy/Projects/awesome-slide/packages/core/src/agent-runtime/context.test.ts`
- [X] T015 Implement prompt package assembly with workflow refs, capability rules, output contracts, and no-tools provider instructions in `/Users/ducduy/Projects/awesome-slide/packages/core/src/agent-runtime/prompts.ts`
- [X] T016 Add prompt assembly tests for local-agent, provider, write-capable, and read-only prompt packages in `/Users/ducduy/Projects/awesome-slide/packages/core/src/agent-runtime/prompts.test.ts`
- [X] T017 Implement selected connection snapshot resolution and safe capability normalization in `/Users/ducduy/Projects/awesome-slide/packages/core/src/agent-runtime/connections.ts`
- [X] T018 Add connection snapshot tests for deleted, invalid, ready, degraded, and fixture connections in `/Users/ducduy/Projects/awesome-slide/packages/core/src/agent-runtime/connections.test.ts`
- [X] T019 [P] Implement runtime read-only and mutation guards for chat run creation, local scanning, credential writes, and proposal apply in `/Users/ducduy/Projects/awesome-slide/packages/core/src/http/request-guard.ts`
- [X] T020 Compose the foundational runtime facade exports in `/Users/ducduy/Projects/awesome-slide/packages/core/src/agent-runtime/index.ts`

**Checkpoint**: Runtime contracts, redaction, events, storage, prompt assembly, connection snapshots, and mutation guards are ready for story work.

---

## Phase 3: User Story 1 - Functional In-App Chat Run (Priority: P1)

**Goal**: A slide creator can send a prompt, see real runtime-owned progress, and reach a terminal assistant state without browser-owned execution.

**Independent Test**: Use a deterministic ready connection to send a prompt from the slide page, observe queued/progress/text/proposal events, reload-safe event history, and verify the assistant turn reaches `completed` or `needs-review`.

### Tests for User Story 1

- [X] T021 [P] [US1] Add route contract tests for session bootstrap, run creation, read-only run creation blocking, SSE replay, pre-terminal stream failure reconciliation, 500ms queued/progress/failure emission, and terminal close behavior in `/Users/ducduy/Projects/awesome-slide/packages/core/src/http/agent-chat-api.test.ts`
- [X] T022 [P] [US1] Add run service tests for create, emit, subscribe, finish, active-run discovery, one-active-run locking, pre-terminal disconnect failure or reattach, and 500ms accepted-run response guarantees in `/Users/ducduy/Projects/awesome-slide/packages/core/src/agent-runtime/runs.test.ts`
- [X] T023 [P] [US1] Add browser client tests for create-run, event streaming, reconnect cursors, stream disconnect recovery, blocked connection errors, and terminal resolution in `/Users/ducduy/Projects/awesome-slide/packages/core/src/app/lib/agent-chat-client.test.ts`
- [X] T024 [P] [US1] Add reducer tests for 100ms visible user/assistant state, queued, text delta, proposal, completed, failed, blocked-connection prompt preservation, and composer release states in `/Users/ducduy/Projects/awesome-slide/packages/core/src/app/lib/agent-chat-state.test.ts`

### Implementation for User Story 1

- [X] T025 [US1] Implement runtime-owned run lifecycle, event fanout, replay cursors, pre-terminal disconnect reconciliation, active-run discovery, and terminal cleanup in `/Users/ducduy/Projects/awesome-slide/packages/core/src/agent-runtime/runs.ts`
- [X] T026 [US1] Implement a deterministic runtime fixture adapter gated by `AWESOME_SLIDE_E2E=1` in `/Users/ducduy/Projects/awesome-slide/packages/core/src/agent-runtime/e2e-fixture.ts`
- [X] T027 [US1] Refactor session, create-run, event-stream, and recent-run routes to delegate to `agent-runtime` in `/Users/ducduy/Projects/awesome-slide/packages/core/src/http/agent-chat-api.ts`
- [X] T028 [US1] Update chat browser client methods for session bootstrap, create-run, SSE replay, blocked connection failures, terminal close, and categorized route errors in `/Users/ducduy/Projects/awesome-slide/packages/core/src/app/lib/agent-chat-client.ts`
- [X] T029 [US1] Update chat state reducer to consume runtime events and preserve editable prompts on blocked connection failures instead of browser-owned timers or local-only pending state in `/Users/ducduy/Projects/awesome-slide/packages/core/src/app/lib/agent-chat-state.ts`
- [X] T030 [US1] Update panel orchestration to use runtime sessions, active run ids, event cursors, blocked-connection recovery, and prompt preservation in `/Users/ducduy/Projects/awesome-slide/packages/core/src/app/components/agent-chat/AgentChatPanel.tsx`
- [X] T031 [US1] Update message rendering for normalized runtime event content in `/Users/ducduy/Projects/awesome-slide/packages/core/src/app/components/agent-chat/ChatMessageList.tsx`
- [X] T032 [US1] Update run status rendering for queued, progress, failed, cancelled, completed, and needs-review states in `/Users/ducduy/Projects/awesome-slide/packages/core/src/app/components/agent-chat/RunStatusCard.tsx`

**Checkpoint**: User Story 1 is independently functional with fixture-backed run lifecycle and browser rendering through runtime contracts.

---

## Phase 4: User Story 2 - Reliable Connection Execution (Priority: P1)

**Goal**: Local CLI and BYOK provider connections test and execute through one runtime path with safe server-side credential handling.

**Independent Test**: Configure a deterministic fixture, Codex CLI, Claude Code, or environment-variable BYOK provider and verify the next chat run uses the selected connection snapshot and capability flags.

### Tests for User Story 2

- [X] T033 [P] [US2] Add executable connection tests for capability normalization, server-only secret refs, unsupported providers, and degraded status in `/Users/ducduy/Projects/awesome-slide/packages/core/src/agent-runtime/connections.test.ts`
- [X] T034 [P] [US2] Add Codex CLI and Claude Code invocation tests for command, args, stdin mode, cwd, env redaction, and cancellation hooks in `/Users/ducduy/Projects/awesome-slide/packages/core/src/agent-runtime/local-agents.test.ts`
- [X] T035 [P] [US2] Add local stream parser tests for text deltas, JSON frames, stderr diagnostics, malformed output, empty output, and nonzero exits in `/Users/ducduy/Projects/awesome-slide/packages/core/src/agent-runtime/local-stream-parsers.test.ts`
- [X] T036 [P] [US2] Add provider adapter tests for OpenAI, Anthropic, Google, OpenRouter, and DeepSeek streaming normalization and HTTP error classification in `/Users/ducduy/Projects/awesome-slide/packages/core/src/agent-runtime/provider-adapters.test.ts`
- [X] T037 [P] [US2] Add connection API tests for bootstrap payload redaction, active connection selection, test-run failures, and read-only blocking for local scanning and credential writes in `/Users/ducduy/Projects/awesome-slide/packages/core/src/http/agent-connections-api.test.ts`
- [X] T038 [P] [US2] Add secret resolution tests for environment references and browser-safe display hints in `/Users/ducduy/Projects/awesome-slide/packages/core/src/http/agent-secrets.test.ts`

### Implementation for User Story 2

- [X] T039 [US2] Implement Codex CLI and Claude Code runtime definitions with explicit capabilities and no generic fallback in `/Users/ducduy/Projects/awesome-slide/packages/core/src/agent-runtime/local-agents.ts`
- [X] T040 [US2] Implement local agent stream parsers and exit-status normalization in `/Users/ducduy/Projects/awesome-slide/packages/core/src/agent-runtime/local-stream-parsers.ts`
- [X] T041 [US2] Implement server-side BYOK provider adapters with streaming normalization and categorized errors in `/Users/ducduy/Projects/awesome-slide/packages/core/src/agent-runtime/provider-adapters.ts`
- [X] T042 [US2] Wire runtime execution dispatch across fixture, local-agent, and provider adapters in `/Users/ducduy/Projects/awesome-slide/packages/core/src/agent-runtime/index.ts`
- [X] T043 [US2] Refactor connection bootstrap, settings, active connection, and test-run routes to delegate execution checks to the runtime in `/Users/ducduy/Projects/awesome-slide/packages/core/src/http/agent-connections-api.ts`
- [X] T044 [US2] Convert existing connection adapter utilities into discovery and compatibility helpers without production generic execution fallback in `/Users/ducduy/Projects/awesome-slide/packages/core/src/http/agent-connection-adapters.ts`
- [X] T045 [US2] Ensure credential reads and display hints flow through the existing safe secret helper in `/Users/ducduy/Projects/awesome-slide/packages/core/src/http/agent-secrets.ts`
- [X] T046 [US2] Update browser connection client handling for runtime capability flags, categorized failures, and secret-free payloads in `/Users/ducduy/Projects/awesome-slide/packages/core/src/app/lib/agent-connection-client.ts`

**Checkpoint**: User Story 2 is independently functional with executable connection snapshots and no raw credentials in browser or persisted runtime state.

---

## Phase 5: User Story 3 - Preview, Apply, And Refresh Slide Output (Priority: P1)

**Goal**: File-changing model output becomes a validated proposal that can be previewed, applied transactionally, and refreshed from source metadata.

**Independent Test**: Run a prompt that creates or updates a slide, inspect the proposal, apply selected operations, verify source files change, and confirm preview refresh targets are returned.

### Tests for User Story 3

- [X] T047 [P] [US3] Add structured output parser tests for valid envelopes, invalid prose, unsupported operations, risk levels, and generated-file summaries in `/Users/ducduy/Projects/awesome-slide/packages/core/src/agent-runtime/proposal-output.test.ts`
- [X] T048 [US3] Add apply/reject route contract tests for validation, transaction success, rollback failure, conflict, read-only apply blocking, refresh payload, and audit id response in `/Users/ducduy/Projects/awesome-slide/packages/core/src/http/agent-chat-api.test.ts`
- [X] T049 [P] [US3] Add proposal transaction tests for fingerprints, TSX parseability, mutation guards, high-risk confirmation, and rollback behavior in `/Users/ducduy/Projects/awesome-slide/packages/core/src/editing/agent-proposals.test.ts`
- [X] T050 [P] [US3] Add file refresh target tests for written slide, deck, theme, asset, and management-index changes in `/Users/ducduy/Projects/awesome-slide/packages/core/src/agent-runtime/file-refresh.test.ts`

### Implementation for User Story 3

- [X] T051 [US3] Implement structured proposal envelope parsing and generated-file summaries in `/Users/ducduy/Projects/awesome-slide/packages/core/src/agent-runtime/proposal-output.ts`
- [X] T052 [US3] Integrate proposal parsing, validation events, and needs-review terminal state into runtime execution in `/Users/ducduy/Projects/awesome-slide/packages/core/src/agent-runtime/index.ts`
- [X] T053 [US3] Implement refresh target derivation from source-of-truth file metadata in `/Users/ducduy/Projects/awesome-slide/packages/core/src/agent-runtime/file-refresh.ts`
- [X] T054 [US3] Extend proposal validation and transactional apply semantics around existing edit helpers in `/Users/ducduy/Projects/awesome-slide/packages/core/src/editing/agent-proposals.ts`
- [X] T055 [US3] Wire proposal apply and reject routes through runtime validation, audit write, and refresh payload responses in `/Users/ducduy/Projects/awesome-slide/packages/core/src/http/agent-chat-api.ts`
- [X] T056 [US3] Update proposal preview rendering for structured operations, validation status, risk, and source diffs in `/Users/ducduy/Projects/awesome-slide/packages/core/src/app/components/agent-chat/ProposalPreview.tsx`
- [X] T057 [US3] Update proposal controls for selected operations, high-risk confirmation, apply, reject, conflict, and expired states in `/Users/ducduy/Projects/awesome-slide/packages/core/src/app/components/agent-chat/ProposalControls.tsx`
- [X] T058 [US3] Update generated-file summary rendering from runtime `file_summary` events in `/Users/ducduy/Projects/awesome-slide/packages/core/src/app/components/agent-chat/FilesFromTurn.tsx`
- [X] T059 [US3] Integrate apply refresh targets with existing Vite watcher and HMR paths in `/Users/ducduy/Projects/awesome-slide/packages/core/src/vite/routes/watchers.ts`
- [X] T060 [US3] Ensure management route metadata stays the source of truth after proposal apply in `/Users/ducduy/Projects/awesome-slide/packages/core/src/http/management-api.ts`

**Checkpoint**: User Story 3 is independently functional with proposal preview/apply and source-driven refresh.

---

## Phase 6: User Story 4 - Reattach, Cancel, Retry, And Recover (Priority: P2)

**Goal**: Reloads, cancellation, retry, provider failures, and child-process failures recover without losing visible chat state.

**Independent Test**: Start a long run, reload the slide page, reconnect after the last sequence id, cancel the run, and retry from the failed or cancelled assistant turn.

### Tests for User Story 4

- [ ] T061 [P] [US4] Add run recovery tests for replay after sequence id, live reattach, cancellation idempotency, 2s cancelled terminal emission, retry links, watchdog failure, and terminal reconciliation in `/Users/ducduy/Projects/awesome-slide/packages/core/src/agent-runtime/runs.test.ts`
- [ ] T062 [P] [US4] Add browser client tests for active-run discovery, cancel, retry, SSE disconnect recovery, and tool-result submission failures in `/Users/ducduy/Projects/awesome-slide/packages/core/src/app/lib/agent-chat-client.test.ts`
- [ ] T063 [P] [US4] Add reducer tests for reload hydration, missed event replay, 2s cancel release, retry creation, and duplicate text prevention in `/Users/ducduy/Projects/awesome-slide/packages/core/src/app/lib/agent-chat-state.test.ts`

### Implementation for User Story 4

- [ ] T064 [US4] Extend run service recovery with persisted summaries, abort handles, watchdog terminal failure, retry links, and replay-safe subscriptions in `/Users/ducduy/Projects/awesome-slide/packages/core/src/agent-runtime/runs.ts`
- [ ] T065 [US4] Wire active-run listing, cancel, retry, and tool-result routes to runtime ownership in `/Users/ducduy/Projects/awesome-slide/packages/core/src/http/agent-chat-api.ts`
- [ ] T066 [US4] Update browser client methods for active-run listing, cancel, retry, and optional tool-result submission in `/Users/ducduy/Projects/awesome-slide/packages/core/src/app/lib/agent-chat-client.ts`
- [ ] T067 [US4] Update chat state hydration and event de-duplication for reload and reconnect in `/Users/ducduy/Projects/awesome-slide/packages/core/src/app/lib/agent-chat-state.ts`
- [ ] T068 [US4] Update composer controls for active-run locks, cancel, retry, reload recovery, and terminal-state actions in `/Users/ducduy/Projects/awesome-slide/packages/core/src/app/components/agent-chat/ChatComposer.tsx`
- [ ] T069 [US4] Update assistant turn actions for retry, cancel status, diagnostics, and recovery actions in `/Users/ducduy/Projects/awesome-slide/packages/core/src/app/components/agent-chat/AgentTurnCard.tsx`

**Checkpoint**: User Story 4 is independently functional with reload recovery, cancellation, and retry through runtime-owned runs.

---

## Phase 7: User Story 5 - Replace Broken 005/006 Runtime Pieces (Priority: P2)

**Goal**: Delete or isolate obsolete runtime paths so future work builds on the new architecture rather than duplicated browser, route, simulation, or generic fallback behavior.

**Independent Test**: Static review and focused tests verify production code no longer depends on `simulate-*` prompt prefixes, browser-only pending state, non-streaming provider calls, or generic unknown local-agent execution.

### Tests for User Story 5

- [ ] T070 [P] [US5] Add production guard tests proving `simulate-*` prompts and fixture adapters are unavailable without `AWESOME_SLIDE_E2E=1` in `/Users/ducduy/Projects/awesome-slide/packages/core/src/http/agent-chat-api.test.ts`
- [ ] T071 [P] [US5] Add adapter tests proving unknown local agents return `incompatible-protocol` instead of generic execution in `/Users/ducduy/Projects/awesome-slide/packages/core/src/http/agent-connection-adapters.test.ts`
- [ ] T072 [P] [US5] Add browser state tests proving pending-run recovery uses runtime reattach rather than local-only timers in `/Users/ducduy/Projects/awesome-slide/packages/core/src/app/lib/agent-chat-state.test.ts`

### Implementation for User Story 5

- [ ] T073 [US5] Remove production prompt-prefix simulation branches and one-shot provider chat execution from `/Users/ducduy/Projects/awesome-slide/packages/core/src/http/agent-chat-api.ts`
- [ ] T074 [US5] Delete or convert the old route-owned run helper into a thin compatibility wrapper around `agent-runtime` in `/Users/ducduy/Projects/awesome-slide/packages/core/src/http/agent-chat-runs.ts`
- [ ] T075 [US5] Remove production generic local-agent fallback behavior from `/Users/ducduy/Projects/awesome-slide/packages/core/src/http/agent-connection-adapters.ts`
- [ ] T076 [US5] Convert browser chat storage to UI preferences and bounded compatibility state only in `/Users/ducduy/Projects/awesome-slide/packages/core/src/app/lib/agent-chat-storage.ts`
- [ ] T077 [US5] Update chat action helpers to call runtime client APIs instead of owning timers, fake completions, or proposal fabrication in `/Users/ducduy/Projects/awesome-slide/packages/core/src/app/lib/agent-chat-actions.ts`
- [ ] T078 [US5] Ensure connection lists hide fixture entries unless `AWESOME_SLIDE_E2E=1` is active in `/Users/ducduy/Projects/awesome-slide/packages/core/src/app/lib/agent-connections.ts`
- [ ] T079 [US5] Keep the Open Design responsibility mapping visible in implementation review notes in `/Users/ducduy/Projects/awesome-slide/specs/007-agent-chat-architecture-refactor/plan.md`

**Checkpoint**: User Story 5 is independently verifiable by tests and static review of removed obsolete 005/006 runtime behavior.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Finish documentation, package discipline, and final validation gates.

- [ ] T080 [P] Update manual validation instructions after implementation in `/Users/ducduy/Projects/awesome-slide/specs/007-agent-chat-architecture-refactor/quickstart.md`
- [X] T081 [P] Add a patch changeset for `@awesome-slide/core` in `/Users/ducduy/Projects/awesome-slide/.changeset/agent-chat-runtime-refactor.md`
- [ ] T082 Run `pnpm check` and fix reported format, lint, and import issues in `/Users/ducduy/Projects/awesome-slide/packages/core/src/`
- [ ] T083 Run `pnpm typecheck` and fix TypeScript errors in `/Users/ducduy/Projects/awesome-slide/packages/core/src/`
- [ ] T084 Run `pnpm test` and fix failing unit or integration tests in `/Users/ducduy/Projects/awesome-slide/packages/core/src/`
- [ ] T085 Run `pnpm build` and fix package build issues in `/Users/ducduy/Projects/awesome-slide/packages/core/`
- [ ] T086 Run `pnpm run test:e2e` and align 008 fixture expectations if needed in `/Users/ducduy/Projects/awesome-slide/specs/008-agent-chat-playwright-e2e/`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup**: No dependencies.
- **Phase 2 Foundational**: Depends on Phase 1 and blocks all user stories.
- **Phase 3 User Story 1**: Depends on Phase 2. This is the MVP runtime slice.
- **Phase 4 User Story 2**: Depends on Phase 2 and can proceed alongside US1 after shared contracts are stable, but full manual validation benefits from US1 route wiring.
- **Phase 5 User Story 3**: Depends on Phase 2 and can use the US1 fixture path for independent verification.
- **Phase 6 User Story 4**: Depends on Phase 3 because it extends run lifecycle behavior.
- **Phase 7 User Story 5**: Depends on Phases 3 through 6 because it removes or converts obsolete paths after replacement behavior exists.
- **Phase 8 Polish**: Depends on the desired implementation scope being complete.

### User Story Dependencies

- **US1 (P1)**: MVP. Delivers functional in-app chat run using the deterministic runtime path.
- **US2 (P1)**: Can be built after foundation and integrates with US1 for end-to-end local/provider execution.
- **US3 (P1)**: Can be built after foundation and uses US1 run events to test proposal preview/apply.
- **US4 (P2)**: Builds on US1 run service and route wiring.
- **US5 (P2)**: Runs after replacement paths exist so broken 005/006 behavior can be safely deleted or guarded.

### Within Each User Story

- Write story tests before implementation tasks in the same phase.
- Implement runtime modules before route adapters.
- Implement route adapters before browser client/state updates.
- Implement browser client/state before React component wiring.
- Stop at each checkpoint and verify the story's independent test before moving to lower-priority work.

---

## Parallel Opportunities

- Setup tasks T002, T003, and T004 can run in parallel after T001 creates the runtime boundary.
- Foundational tests and helpers marked `[P]` can be developed in parallel by file.
- US1 tests T021 through T024 can be written in parallel before T025.
- US2 tests T033 through T038 can be written in parallel, and implementation tasks T039 through T041 can proceed in parallel before T042 dispatch integration.
- US3 parser, proposal, and refresh tests T047, T049, and T050 can run in parallel before proposal integration.
- US4 tests T061 through T063 can run in parallel before recovery implementation.
- US5 tests T070 through T072 can run in parallel before deleting obsolete behavior.

## Parallel Example: User Story 1

```bash
Task: "Add route contract tests for session bootstrap, run creation, read-only run creation blocking, SSE replay, pre-terminal stream failure reconciliation, 500ms queued/progress/failure emission, and terminal close behavior in /Users/ducduy/Projects/awesome-slide/packages/core/src/http/agent-chat-api.test.ts"
Task: "Add run service tests for create, emit, subscribe, finish, active-run discovery, one-active-run locking, pre-terminal disconnect failure or reattach, and 500ms accepted-run response guarantees in /Users/ducduy/Projects/awesome-slide/packages/core/src/agent-runtime/runs.test.ts"
Task: "Add browser client tests for create-run, event streaming, reconnect cursors, stream disconnect recovery, blocked connection errors, and terminal resolution in /Users/ducduy/Projects/awesome-slide/packages/core/src/app/lib/agent-chat-client.test.ts"
Task: "Add reducer tests for 100ms visible user/assistant state, queued, text delta, proposal, completed, failed, blocked-connection prompt preservation, and composer release states in /Users/ducduy/Projects/awesome-slide/packages/core/src/app/lib/agent-chat-state.test.ts"
```

## Parallel Example: User Story 2

```bash
Task: "Add Codex CLI and Claude Code invocation tests for command, args, stdin mode, cwd, env redaction, and cancellation hooks in /Users/ducduy/Projects/awesome-slide/packages/core/src/agent-runtime/local-agents.test.ts"
Task: "Add local stream parser tests for text deltas, JSON frames, stderr diagnostics, malformed output, empty output, and nonzero exits in /Users/ducduy/Projects/awesome-slide/packages/core/src/agent-runtime/local-stream-parsers.test.ts"
Task: "Add provider adapter tests for OpenAI, Anthropic, Google, OpenRouter, and DeepSeek streaming normalization and HTTP error classification in /Users/ducduy/Projects/awesome-slide/packages/core/src/agent-runtime/provider-adapters.test.ts"
```

## Parallel Example: User Story 3

```bash
Task: "Add structured output parser tests for valid envelopes, invalid prose, unsupported operations, risk levels, and generated-file summaries in /Users/ducduy/Projects/awesome-slide/packages/core/src/agent-runtime/proposal-output.test.ts"
Task: "Add proposal transaction tests for fingerprints, TSX parseability, mutation guards, high-risk confirmation, and rollback behavior in /Users/ducduy/Projects/awesome-slide/packages/core/src/editing/agent-proposals.test.ts"
Task: "Add file refresh target tests for written slide, deck, theme, asset, and management-index changes in /Users/ducduy/Projects/awesome-slide/packages/core/src/agent-runtime/file-refresh.test.ts"
```

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3 for fixture-backed in-app chat runs.
3. Validate US1 independently through route, runtime, client, reducer, and panel behavior.
4. Stop and review ownership boundaries before adding real local/provider execution.

### Incremental Delivery

1. Add US1 to make chat function through runtime-owned runs.
2. Add US2 to make real connection execution reliable and secret-safe.
3. Add US3 to make file-changing output useful through proposals and refresh.
4. Add US4 for recovery, cancel, retry, and reload resilience.
5. Add US5 to remove obsolete broken behavior once replacements exist.

### Review Focus

- Route files stay thin and delegate to `packages/core/src/agent-runtime/`.
- Browser code renders runtime state and sends commands; it does not own provider execution, local CLI execution, proposal parsing, or terminal reconciliation.
- Deterministic fixture behavior is available only behind `AWESOME_SLIDE_E2E=1`.
- File writes go through proposals and existing Awesome Slide file/edit/management helpers.
- Every payload crossing into browser state is redacted and uses safe relative labels.
