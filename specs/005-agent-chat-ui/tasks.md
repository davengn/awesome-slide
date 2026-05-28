# Tasks: In-App Agent Chat

**Input**: Design documents from `/specs/005-agent-chat-ui/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md, contracts/

**Tests**: Included because the specification requires reliability and safety tests for state transitions, context redaction, validation failures, cancellation, and apply behavior.

**Organization**: Tasks are grouped by prioritized user story so each story can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files and does not depend on incomplete tasks
- **[Story]**: Maps implementation work to a user story from spec.md
- All task descriptions include exact repository paths

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare ignored runtime storage and module entry points without changing behavior.

- [x] T001 Add `.awesome-slide/agent-chat/` to `.gitignore` for local audit and temporary preview storage
- [x] T002 Create the agent chat component barrel in `packages/core/src/app/components/agent-chat/index.ts`
- [x] T003 Create the agent chat API route module placeholder in `packages/core/src/http/agent-chat-api.ts`
- [x] T004 Create the agent chat proposal module placeholder in `packages/core/src/editing/agent-proposals.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Define shared tests, types, state, storage, runtime route skeletons, active connection boundaries, and validation helpers used by every user story.

**Critical**: No user story work should begin until this phase is complete.

### Foundational Tests

- [x] T005 [P] Add reducer tests for queued, loading, streaming, completed, failed, cancelled, and needs-review transitions in `packages/core/src/app/lib/agent-chat-state.test.ts`
- [x] T006 [P] Add route contract tests for `GET /__agent-chat/session`, active connection bootstrap, no-connection bootstrap, `POST /__agent-chat/runs`, event streaming, and cancel in `packages/core/src/http/agent-chat-api.test.ts`
- [x] T007 [P] Add proposal helper tests for normalization, risk classification, validation state, and common single-slide sub-200ms validation budget in `packages/core/src/editing/agent-proposals.test.ts`

### Foundational Implementation

- [x] T008 [P] Define `AgentChatSession`, `AgentChatMessage`, `AgentChatRun`, `AgentEditProposal`, `AgentOperation`, `AgentConnectionRef`, runtime mode, and `AgentChatError` types in `packages/core/src/app/lib/agent-chat-types.ts`
- [x] T009 [P] Define server-side route request and response types, active connection bootstrap metadata, no-connection metadata, and static read-only metadata in `packages/core/src/http/agent-chat-types.ts`
- [x] T010 [P] Define the required suggested action registry in `packages/core/src/app/lib/agent-chat-actions.ts`
- [x] T011 [P] Define error category to recovery action mapping in `packages/core/src/app/lib/agent-chat-errors.ts`
- [x] T012 Implement the chat run reducer and terminal state guards in `packages/core/src/app/lib/agent-chat-state.ts`
- [x] T013 Implement project-scoped local session retention and size caps in `packages/core/src/app/lib/agent-chat-storage.ts`
- [x] T014 Implement bounded context payload builders with secret and hidden-file exclusion hooks in `packages/core/src/app/lib/agent-chat-context.ts`
- [x] T015 Implement fetch and server-sent event client helpers in `packages/core/src/app/lib/agent-chat-client.ts`
- [x] T016 Implement in-memory run and event registry with abort controller support in `packages/core/src/http/agent-chat-runs.ts`
- [x] T017 Implement append-only redacted audit helpers in `packages/core/src/files/agent-audit.ts`
- [x] T018 Implement proposal normalization, risk classification, validation result helpers, and single-slide validation timing instrumentation in `packages/core/src/editing/agent-proposals.ts`
- [x] T019 Implement the provider-neutral active connection bridge, static read-only bootstrap branch, no-connection bootstrap branch, and initial route registration shell in `packages/core/src/http/agent-chat-api.ts`
- [x] T020 Register `registerAgentChatRoutes` with the existing Vite API plugin in `packages/core/src/vite/api-plugin.ts`
- [x] T021 Re-export shared agent chat component modules from `packages/core/src/app/components/agent-chat/index.ts`

**Checkpoint**: Foundation ready; user story implementation can now begin.

---

## Phase 3: User Story 1 - Current Slide Chat (Priority: P1, MVP)

**Goal**: A creator can open chat from the slide workspace, see the active agent/model connection or no-connection recovery route, send a prompt for the current slide, see loading and streaming messages, cancel a run, and use a desktop panel or narrow-screen drawer before any file write occurs.

**Independent Test**: Start `pnpm dev:demo`, open a slide, open the agent panel or drawer, confirm active connection display or setup route, send a non-file-changing prompt, confirm queued, streaming, completed, retry, and cancel states preserve prior messages and do not write files.

### Implementation for User Story 1

- [x] T022 [P] [US1] Create the desktop panel shell with open, close, labelled region, and focus return behavior in `packages/core/src/app/components/agent-chat/AgentChatPanel.tsx`
- [x] T023 [P] [US1] Create the narrow-screen drawer wrapper with the same labelled region and focus behavior in `packages/core/src/app/components/agent-chat/AgentChatDrawer.tsx`
- [x] T024 [P] [US1] Create the accessible message stream renderer with polite live-region support in `packages/core/src/app/components/agent-chat/ChatMessageList.tsx`
- [x] T025 [P] [US1] Create the prompt composer with send, retry, and cancel controls in `packages/core/src/app/components/agent-chat/ChatComposer.tsx`
- [x] T026 [US1] Connect panel state to `agent-chat-state.ts`, `agent-chat-storage.ts`, and `agent-chat-client.ts` in `packages/core/src/app/components/agent-chat/AgentChatPanel.tsx`
- [x] T027 [US1] Implement session bootstrap and run creation using active connection, no-connection, and static read-only metadata in `packages/core/src/http/agent-chat-api.ts`
- [x] T028 [US1] Implement server-sent event replay and terminal event closure in `packages/core/src/http/agent-chat-api.ts`
- [x] T029 [US1] Implement browser-side event streaming, abort handling, and retry creation in `packages/core/src/app/lib/agent-chat-client.ts`
- [x] T030 [US1] Render active connection display, no-connection settings route, and static read-only copy in `packages/core/src/app/components/agent-chat/AgentChatPanel.tsx`
- [x] T031 [US1] Add the slide workspace agent button with responsive panel/drawer placement in `packages/core/src/app/routes/slide.tsx`
- [x] T032 [US1] Ensure cancelled runs cannot attach proposals or apply controls in `packages/core/src/app/lib/agent-chat-state.ts`
- [x] T033 [US1] Preserve existing slide preview layout while the desktop panel is open in `packages/core/src/app/routes/slide.tsx`

**Checkpoint**: User Story 1 is fully functional and testable independently.

---

## Phase 4: User Story 2 - Context-Aware Prompting (Priority: P1)

**Goal**: A creator can see and adjust slide, deck, selected element, theme, notes, source excerpt, and snapshot context before sending a prompt.

**Independent Test**: Open chat from a slide and from management, toggle context chips, select an inspected element, send a prompt, and confirm the runtime receives a bounded context summary without hidden files or secrets.

### Tests for User Story 2

- [x] T034 [P] [US2] Add context collector tests for current slide, deck, theme, notes, selected elements, size caps, and hidden-file exclusion in `packages/core/src/app/lib/agent-chat-context.test.ts`
- [x] T035 [P] [US2] Add local session retention tests for message cap, serialized size cap, and secret exclusion in `packages/core/src/app/lib/agent-chat-storage.test.ts`

### Implementation for User Story 2

- [x] T036 [P] [US2] Create context chip controls with enabled, disabled, required, and truncation states in `packages/core/src/app/components/agent-chat/ContextChips.tsx`
- [x] T037 [P] [US2] Create contextual suggested action controls in `packages/core/src/app/components/agent-chat/SuggestedActions.tsx`
- [x] T038 [US2] Collect current slide ID, page index, page count, title, source state, and theme context in `packages/core/src/app/lib/agent-chat-context.ts`
- [x] T039 [US2] Collect selected element descriptors from the inspector selection state in `packages/core/src/app/routes/slide.tsx`
- [x] T040 [US2] Collect folder, deck, and slide collection context from management data in `packages/core/src/app/routes/home.tsx`
- [x] T041 [US2] Wire context chips and suggested actions into the panel composer in `packages/core/src/app/components/agent-chat/AgentChatPanel.tsx`
- [x] T042 [US2] Add the slide management agent drawer entry point in `packages/core/src/app/routes/home.tsx`
- [x] T043 [US2] Preserve prompt-seeded slide creation handoff by opening chat with the seed prompt in `packages/core/src/app/routes/home.tsx`
- [x] T044 [US2] Include deterministic context summaries in run records without storing raw large artifacts in `packages/core/src/app/lib/agent-chat-storage.ts`

**Checkpoint**: User Story 2 is fully functional and testable independently.

---

## Phase 5: User Story 5 - Selective Review and Apply (Priority: P1)

**Goal**: A cautious user can review file-changing proposals, apply all changes, apply selected operations, reject proposals, retry, refine, and receive a deterministic audit trail.

**Independent Test**: Prompt for a copy edit, confirm a proposal appears before any write, apply one selected operation, reject another proposal, and verify only approved files changed and an audit entry was appended.

### Tests for User Story 5

- [x] T045 [P] [US5] Add proposal validation tests for operation lists, raw patch fallback, selected apply, stale source conflicts, invalid TSX, and sub-200ms common single-slide proposal validation in `packages/core/src/editing/agent-proposals.test.ts`
- [x] T046 [P] [US5] Add audit JSONL tests for append-only writes, redaction, and applied file summaries in `packages/core/src/files/agent-audit.test.ts`
- [x] T047 [P] [US5] Add apply and reject route tests for selected operations, high-risk confirmation, conflict errors, and write failures in `packages/core/src/http/agent-chat-api.test.ts`

### Implementation for User Story 5

- [x] T048 [P] [US5] Create proposal preview rendering for operation list, source diff, diagnostics, and truncation states in `packages/core/src/app/components/agent-chat/ProposalPreview.tsx`
- [x] T049 [P] [US5] Create visually distinct apply all, apply selected, reject, retry, and refine controls in `packages/core/src/app/components/agent-chat/ProposalControls.tsx`
- [x] T050 [US5] Parse `proposal` stream events into pending review state in `packages/core/src/app/lib/agent-chat-state.ts`
- [x] T051 [US5] Validate `patch-slide-source`, `patch-slide-metadata`, and `raw-patch` operations in `packages/core/src/editing/agent-proposals.ts`
- [x] T052 [US5] Implement `POST /__agent-chat/proposals/:proposalId/apply` with selected operation writes in `packages/core/src/http/agent-chat-api.ts`
- [x] T053 [US5] Implement `POST /__agent-chat/proposals/:proposalId/reject` with no file writes in `packages/core/src/http/agent-chat-api.ts`
- [x] T054 [US5] Write successful apply audit entries through `packages/core/src/files/agent-audit.ts`
- [x] T055 [US5] Refresh slide and management views after applied source or metadata changes in `packages/core/src/app/components/agent-chat/AgentChatPanel.tsx`
- [x] T056 [US5] Block invalid, conflicting, cancelled, and already-applied proposals from apply controls in `packages/core/src/app/components/agent-chat/ProposalControls.tsx`

**Checkpoint**: User Story 5 is fully functional and testable independently.

---

## Phase 6: User Story 3 - Layout and Theme Preview (Priority: P2)

**Goal**: A designer can request layout or theme changes, preview structured operations and rendered before/after artifacts, and confirm broad or destructive changes before applying.

**Independent Test**: Request a layout redesign and a theme change, confirm operation list plus rendered before/after preview appears, and confirm broad theme replacement requires stronger confirmation.

### Tests for User Story 3

- [x] T057 [P] [US3] Add theme operation validation tests for theme existence, slide scope, deck scope, and high-risk classification in `packages/core/src/editing/agent-proposals.test.ts`
- [x] T058 [P] [US3] Add suggested action tests for redesign layout, apply theme, and fix alignment risk levels in `packages/core/src/app/lib/agent-chat-actions.test.ts`

### Implementation for User Story 3

- [x] T059 [US3] Add theme summaries from bundled and user-added themes to context collection in `packages/core/src/app/lib/agent-chat-context.ts`
- [x] T060 [US3] Validate `apply-theme` and layout-oriented `patch-slide-source` operations in `packages/core/src/editing/agent-proposals.ts`
- [x] T061 [US3] Add rendered before/after preview support using existing slide canvas behavior in `packages/core/src/app/components/agent-chat/ProposalPreview.tsx`
- [x] T062 [US3] Adapt redesign layout, apply theme, and fix alignment suggested actions to slide or selection scope in `packages/core/src/app/lib/agent-chat-actions.ts`
- [x] T063 [US3] Require explicit confirmation for broad theme replacement and destructive layout operations in `packages/core/src/app/components/agent-chat/ProposalControls.tsx`
- [x] T064 [US3] Surface validation warnings and unavailable-theme recovery copy in `packages/core/src/app/components/agent-chat/ProposalPreview.tsx`

**Checkpoint**: User Story 3 is fully functional and testable independently.

---

## Phase 7: User Story 4 - Deck Narrative Improvements (Priority: P2)

**Goal**: A presenter can ask for deck-level tightening, speaker notes, narrative flow improvements, and related slide creation while keeping proposed deck changes reviewable.

**Independent Test**: Open chat from management for a deck, request narrative flow improvements, confirm deck-scoped context and proposal operations, apply selected speaker note or deck metadata changes, and verify management refreshes.

### Tests for User Story 4

- [ ] T065 [P] [US4] Add deck context tests for folder, deck, ordered slide IDs, speaker notes inclusion, and context budget limits in `packages/core/src/app/lib/agent-chat-context.test.ts`
- [ ] T066 [P] [US4] Add operation validation tests for `create-slide`, `update-speaker-notes`, `reorder-pages`, and `update-deck` in `packages/core/src/editing/agent-proposals.test.ts`

### Implementation for User Story 4

- [ ] T067 [US4] Add deck and folder scoped context preferences to management-launched sessions in `packages/core/src/app/routes/home.tsx`
- [ ] T068 [US4] Validate `create-slide`, `update-speaker-notes`, `reorder-pages`, and `update-deck` operations in `packages/core/src/editing/agent-proposals.ts`
- [ ] T069 [US4] Apply deck metadata and membership operations through existing management helpers in `packages/core/src/http/agent-chat-api.ts`
- [ ] T070 [US4] Apply speaker notes updates through slide metadata paths in `packages/core/src/http/agent-chat-api.ts`
- [ ] T071 [US4] Add deck narrative suggested actions for shorten content, generate speaker notes, and create related slide in `packages/core/src/app/lib/agent-chat-actions.ts`
- [ ] T072 [US4] Refresh management lists and selected inspector state after applied deck operations in `packages/core/src/app/routes/home.tsx`

**Checkpoint**: User Story 4 is fully functional and testable independently.

---

## Phase 8: User Story 6 - Connection Failure Recovery (Priority: P2)

**Goal**: A user with a missing, read-only, or failing agent connection sees categorized errors, recovery actions, diagnostics, retry behavior, and no partial file writes.

**Independent Test**: Disable or simulate a failing connection and test a static build state; confirm no-connection/read-only recovery routes, retry, edit prompt, cancel, copy diagnostics controls, redacted diagnostics, and blocked file-changing runs.

### Tests for User Story 6

- [ ] T073 [P] [US6] Add error category and recovery action tests in `packages/core/src/app/lib/agent-chat-errors.test.ts`
- [ ] T074 [US6] Add runtime tests for static read-only bootstrap, blocked run creation, blocked proposal apply, and no-connection recovery metadata in `packages/core/src/http/agent-chat-api.test.ts`
- [ ] T075 [US6] Add runtime tests for unavailable connection, authentication failure, model failure, timeout, invalid output, cancellation, and redacted diagnostics in `packages/core/src/http/agent-chat-api.test.ts`

### Implementation for User Story 6

- [ ] T076 [US6] Return failed-connection and degraded-connection bootstrap metadata from `GET /__agent-chat/session` in `packages/core/src/http/agent-chat-api.ts`
- [ ] T077 [US6] Render failed-connection, degraded-connection, and static read-only states with settings route, retry, and diagnostics controls in `packages/core/src/app/components/agent-chat/AgentChatPanel.tsx`
- [ ] T078 [US6] Map adapter, timeout, validation, patch conflict, cancellation, and write errors through `agent-chat-errors.ts` in `packages/core/src/http/agent-chat-api.ts`
- [ ] T079 [US6] Implement diagnostics copy with secret and hidden-path redaction in `packages/core/src/app/components/agent-chat/AgentChatPanel.tsx`
- [ ] T080 [US6] Ensure cancellation aborts active adapter work and prevents partial proposal application in `packages/core/src/http/agent-chat-runs.ts`
- [ ] T081 [US6] Add retry and edit-prompt flows that recollect current context in `packages/core/src/app/lib/agent-chat-client.ts`

**Checkpoint**: User Story 6 is fully functional and testable independently.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Accessibility, responsive behavior, documentation, package discipline, and final verification across all delivered stories.

- [ ] T082 [P] Verify keyboard navigation, focus return, live region behavior, and screen-reader labels in `packages/core/src/app/components/agent-chat/AgentChatPanel.tsx`
- [ ] T083 [P] Verify 375px drawer, 768px drawer/panel content, 1024px panel, and 1440px panel layouts against `specs/005-agent-chat-ui/quickstart.md`
- [ ] T084 [P] Update implementation notes if paths or validation behavior differ from the plan in `specs/005-agent-chat-ui/quickstart.md`
- [ ] T085 Run `pnpm check` from `/Users/ducduy/Projects/awesome-slide`
- [ ] T086 Run `pnpm typecheck` from `/Users/ducduy/Projects/awesome-slide`
- [ ] T087 Run `pnpm test` from `/Users/ducduy/Projects/awesome-slide`
- [ ] T088 Run `pnpm build` from `/Users/ducduy/Projects/awesome-slide`
- [ ] T089 Add a patch changeset for `@awesome-slide/core` in `.changeset/`

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1): no dependencies
- Foundational (Phase 2): depends on Setup completion and blocks all user stories
- User Stories (Phases 3-8): depend on Foundational completion
- Polish (Phase 9): depends on all desired user stories being complete

### User Story Dependencies

- US1 Current Slide Chat (P1): starts after Foundational and is the MVP because it includes the slide workspace panel/drawer, active connection display, no-connection route, streaming, retry, and cancel behavior
- US2 Context-Aware Prompting (P1): starts after Foundational; can run after the US1 shell contract is stable
- US5 Selective Review and Apply (P1): starts after Foundational; requires proposal state from Foundational but not US3 rendered previews
- US3 Layout and Theme Preview (P2): starts after US5 proposal preview controls exist
- US4 Deck Narrative Improvements (P2): starts after US2 context collection and US5 apply semantics exist
- US6 Connection Failure Recovery (P2): starts after US1 runtime routes exist; extends the foundational active connection/no-connection path with failure diagnostics and static read-only blocking

### Within Each User Story

- Story-specific tests should be written first and fail before implementation
- Foundational reducer, route, and proposal tests precede their corresponding foundational implementations
- Types and reducers before UI wiring
- Context collectors before prompt submission integration
- Proposal validation before apply routes
- Apply routes before UI apply controls are considered complete
- Story complete before moving to the next priority story

### Parallel Opportunities

- T002, T003, and T004 can run after T001 because they create independent module entry points
- T005, T006, and T007 can run in parallel because they touch different test files
- T008, T009, T010, T011, and T017 can run in parallel after foundational tests are written
- US1 component tasks T022, T023, T024, and T025 can run in parallel
- US2 component tasks T036 and T037 can run in parallel with tests T034 and T035
- US5 tests T045, T046, and T047 can run in parallel
- US5 components T048 and T049 can run in parallel
- US3 tests T057 and T058 can run in parallel
- US4 tests T065 and T066 can run in parallel
- US6 error tests T073 can run in parallel with static read-only route tests T074, but T075 must follow T074 because both update `agent-chat-api.test.ts`
- Polish checks T085, T086, T087, and T088 should run after implementation, with T085 before commit

---

## Parallel Example: User Story 1

```bash
Task: "Create the desktop panel shell with open, close, labelled region, and focus return behavior in packages/core/src/app/components/agent-chat/AgentChatPanel.tsx"
Task: "Create the narrow-screen drawer wrapper with the same labelled region and focus behavior in packages/core/src/app/components/agent-chat/AgentChatDrawer.tsx"
Task: "Create the accessible message stream renderer with polite live-region support in packages/core/src/app/components/agent-chat/ChatMessageList.tsx"
Task: "Create the prompt composer with send, retry, and cancel controls in packages/core/src/app/components/agent-chat/ChatComposer.tsx"
```

## Parallel Example: User Story 2

```bash
Task: "Add context collector tests for current slide, deck, theme, notes, selected elements, size caps, and hidden-file exclusion in packages/core/src/app/lib/agent-chat-context.test.ts"
Task: "Add local session retention tests for message cap, serialized size cap, and secret exclusion in packages/core/src/app/lib/agent-chat-storage.test.ts"
Task: "Create context chip controls with enabled, disabled, required, and truncation states in packages/core/src/app/components/agent-chat/ContextChips.tsx"
Task: "Create contextual suggested action controls in packages/core/src/app/components/agent-chat/SuggestedActions.tsx"
```

## Parallel Example: User Story 5

```bash
Task: "Add proposal validation tests for operation lists, raw patch fallback, selected apply, stale source conflicts, invalid TSX, and sub-200ms common single-slide proposal validation in packages/core/src/editing/agent-proposals.test.ts"
Task: "Add audit JSONL tests for append-only writes, redaction, and applied file summaries in packages/core/src/files/agent-audit.test.ts"
Task: "Create proposal preview rendering for operation list, source diff, diagnostics, and truncation states in packages/core/src/app/components/agent-chat/ProposalPreview.tsx"
Task: "Create visually distinct apply all, apply selected, reject, retry, and refine controls in packages/core/src/app/components/agent-chat/ProposalControls.tsx"
```

---

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3 for US1, including active connection display, no-connection route, static read-only copy, and responsive drawer behavior.
3. Validate US1 independently in the slide workspace.
4. Complete Phase 4 and Phase 5 so contextual prompting and safe review/apply behavior are available before broader design tasks.

### Incremental Delivery

1. US1 delivers the in-slide chat shell, connection-aware bootstrap, responsive drawer, and streaming interaction.
2. US2 adds visible, adjustable context from slide and management surfaces.
3. US5 adds the required preview-before-write and audit path.
4. US3 adds layout/theme preview depth.
5. US4 adds deck-level and speaker-notes workflows.
6. US6 hardens failed connection, diagnostics, retry, static read-only blocking, and cancellation behavior.

### Validation Gates

1. Run focused tests after each user story.
2. Run `pnpm check`, `pnpm typecheck`, `pnpm test`, and `pnpm build` before completion.
3. Add a patch changeset because implementation touches `packages/core`.
