# Tasks: Agent and Model Connection Options

**Input**: Design documents from `/specs/006-agent-model-connections/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md, contracts/

**Tests**: Included because the specification requires secure credential handling, redaction, bounded scan behavior, connection status reliability, slide-page quick switcher state, adapter cancellation, and error recovery. React UI behavior is covered by reducer/contract tests plus quickstart browser validation because the current Vitest setup uses the `node` environment and this plan does not add DOM component test tooling.

**Organization**: Tasks are grouped by prioritized user story so each story can be implemented and tested independently while preserving the 005/006 boundary.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files and does not depend on incomplete tasks
- **[Story]**: Maps implementation work to a user story from spec.md
- All task descriptions include exact repository paths

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare connection module entry points, local storage ignore rules, and route registration placeholders without changing behavior.

- [X] T001 Add `.awesome-slide/agent-connections/` to `.gitignore` for local non-secret connection state, scan cache, and temporary diagnostics
- [X] T002 [P] Create the connection settings component barrel in `packages/core/src/app/components/settings/index.ts`
- [X] T003 [P] Create the app connection type module placeholder in `packages/core/src/app/lib/agent-connection-types.ts`
- [X] T004 [P] Create the browser connection client module placeholder in `packages/core/src/app/lib/agent-connection-client.ts`
- [X] T005 [P] Create the browser connection state module placeholder in `packages/core/src/app/lib/agent-connection-state.ts`
- [X] T006 [P] Create the browser connection storage module placeholder in `packages/core/src/app/lib/agent-connection-storage.ts`
- [X] T007 [P] Create the runtime connection API module placeholder in `packages/core/src/http/agent-connections-api.ts`
- [X] T008 [P] Create the local agent discovery module placeholder in `packages/core/src/http/agent-discovery.ts`
- [X] T009 [P] Create the provider adapter module placeholder in `packages/core/src/http/agent-connection-adapters.ts`
- [X] T010 [P] Create the credential and redaction module placeholder in `packages/core/src/http/agent-secrets.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Define shared types, storage, security helpers, provider registry, API skeleton, client helpers, and state reducers used by every user story.

**Critical**: No user story work should begin until this phase is complete.

### Foundational Tests

- [X] T011 [P] Add schema and safe snapshot tests for connection configs, capabilities, statuses, and first-run setup state in `packages/core/src/app/lib/agent-connections.test.ts`
- [X] T012 [P] Add safe project settings and active connection persistence tests in `packages/core/src/app/lib/agent-connection-storage.test.ts`
- [X] T013 [P] Add credential reference, OS credential storage, environment variable reference fallback, `secure-storage-unavailable`, deletion, and secret redaction tests in `packages/core/src/http/agent-secrets.test.ts`
- [X] T014 [P] Add bounded scan registry tests for known commands, known install locations, approved directories, and no full-disk traversal in `packages/core/src/http/agent-discovery.test.ts`
- [X] T015 [P] Add adapter event normalization, capability mapping, cancellation, and categorized failure tests in `packages/core/src/http/agent-connection-adapters.test.ts`
- [X] T016 [P] Add bootstrap, settings, active connection, and no-secret route contract tests in `packages/core/src/http/agent-connections-api.test.ts`
- [X] T017 [P] Add modal state, quick switcher state, first-run prompt, scan state, and validation error reducer tests in `packages/core/src/app/lib/agent-connection-state.test.ts`

### Foundational Implementation

- [X] T018 [P] Define `AgentConnectionConfig`, `ConnectionCapabilities`, `ConnectionStatus`, `FirstRunConnectionSetup`, `LocalAgentCandidate`, `ManualAgentPath`, `ApiProviderCredential`, `ModelExecutionPreference`, `ActiveConnectionSnapshot`, `QuickConnectionSwitcherState`, and API DTO types in `packages/core/src/app/lib/agent-connection-types.ts`
- [X] T019 [P] Implement provider registry defaults, capability normalization, safe active connection snapshot helpers, and error category to recovery action mapping in `packages/core/src/app/lib/agent-connections.ts`
- [X] T020 [P] Implement reducer state for settings modal target, slide-page quick switcher open/close, Local CLI/BYOK tab, agent/model/reasoning selection, scan progress, manual path validation, BYOK form, and first-run prompt choices in `packages/core/src/app/lib/agent-connection-state.ts`
- [X] T021 Implement project-local non-secret connection settings persistence, active connection persistence, first-run dismissal persistence, and invalid persisted choice handling in `packages/core/src/app/lib/agent-connection-storage.ts`
- [X] T022 Implement credential reference storage, OS credential storage adapter shape, environment variable reference fallback detection, `secure-storage-unavailable` behavior, deletion behavior, and diagnostics redaction helpers in `packages/core/src/http/agent-secrets.ts`
- [X] T023 Implement local provider registry, known command lookup, known install location lookup, approved directory validation, and redacted candidate summaries in `packages/core/src/http/agent-discovery.ts`
- [X] T024 Implement provider-neutral adapter wrapper types, ordered event emission, timeout mapping, cancellation mapping, and capability defaults in `packages/core/src/http/agent-connection-adapters.ts`
- [X] T025 Implement `GET /__agent-connections/bootstrap`, `GET /__agent-connections/settings`, `POST /__agent-connections/first-run/dismiss`, safe quick switcher bootstrap metadata, and shared error response helpers in `packages/core/src/http/agent-connections-api.ts`
- [X] T026 Register `registerAgentConnectionRoutes` with the existing Vite API plugin in `packages/core/src/vite/api-plugin.ts`
- [X] T027 Implement browser fetch helpers for bootstrap, settings, dismissal, scan, manual validation, connection CRUD, active selection with model/reasoning preferences, test, and delete in `packages/core/src/app/lib/agent-connection-client.ts`
- [X] T028 Re-export shared connection modules and settings entry components from `packages/core/src/app/components/settings/index.ts`

**Checkpoint**: Foundation ready; user story implementation can now begin.

---

## Phase 3: User Story 1 - First-Run Setup and Settings Modal (Priority: P1, MVP)

**Goal**: A first-time user opening the slide library sees a non-blocking setup prompt and can open an Open Design-style settings modal directly to `Execution & model` without triggering any scan.

**Independent Test**: Open the slide library with no active connection and no setup preference, verify setup choices appear, choose each path into the modal, choose `Do later`, reload, and confirm no auto-scan occurs and manual slide management remains usable.

### Tests for User Story 1

- [X] T029 [P] [US1] Add first-run and project/settings entry state tests for no connection, dismissed setup, no auto-scan, modal target selection, and trigger focus metadata in `packages/core/src/app/lib/agent-connection-state.test.ts`
- [X] T030 [US1] Add settings modal accessibility contract tests for focus return, Escape close, labelled controls, tab selection, and responsive state flags in `packages/core/src/app/lib/agent-connection-state.test.ts`
- [X] T031 [P] [US1] Add first-run dismissal route tests for `POST /__agent-connections/first-run/dismiss` in `packages/core/src/http/agent-connections-api.test.ts`

### Implementation for User Story 1

- [X] T032 [P] [US1] Create the modal overlay, header, close control, focus management, responsive shell, and `Execution & model` target handling in `packages/core/src/app/components/settings/SettingsModal.tsx`
- [X] T033 [P] [US1] Create the left navigation rail with `Configure execution mode` and placeholder settings categories in `packages/core/src/app/components/settings/SettingsNav.tsx`
- [X] T034 [P] [US1] Create the first-run setup panel with `Auto-scan local agents`, `Specify agent path`, `Use BYOK provider`, and `Do later` actions in `packages/core/src/app/components/settings/FirstRunAgentSetup.tsx`
- [X] T035 [US1] Create the initial `Execution & model` content with Local CLI/BYOK segmented control and Test/Rescan action placement in `packages/core/src/app/components/settings/ExecutionModelSettings.tsx`
- [X] T036 [US1] Create and wire the concrete project/settings trigger, first-run bootstrap, setup prompt rendering, modal open targets, and dismissal persistence in `packages/core/src/app/routes/home.tsx` and `packages/core/src/app/components/settings/ProjectSettingsEntry.tsx`
- [X] T037 [US1] Ensure the first-run setup prompt does not block slide library navigation, management controls, or the existing agent chat drawer in `packages/core/src/app/routes/home.tsx`
- [X] T038 [US1] Add modal state wiring, focus return, live error region, and narrow-width layout behavior for 375px, 768px, 1024px, and 1440px in `packages/core/src/app/components/settings/SettingsModal.tsx`

**Checkpoint**: User Story 1 is fully functional and testable independently.

---

## Phase 4: User Story 2 - Local CLI Discovery and Manual Agent Paths (Priority: P1)

**Goal**: A local-first user can opt into bounded discovery, review local agent candidates, rescan safely, add approved directories, and manually validate an agent executable, command, or project path before activation.

**Independent Test**: Start with no local connection, opt into scan, confirm known command candidates appear without full-disk scan, add an approved directory, rescan without losing manual/BYOK settings, validate an invalid path, validate a supported path, and activate only a compatible result.

### Tests for User Story 2

- [ ] T039 [P] [US2] Add scan start, scan event, scan cancel, approved directory, and rescan route tests in `packages/core/src/http/agent-connections-api.test.ts`
- [ ] T040 [P] [US2] Add manual path validation tests for executable, command, project path, missing path, incompatible protocol, timeout, and redacted stdout/stderr in `packages/core/src/http/agent-discovery.test.ts`
- [ ] T041 [P] [US2] Add Local CLI state tests for candidate states, selected state, scan progress, cancel, add directory, browse capability available/unavailable, and manual path form transitions in `packages/core/src/app/lib/agent-connection-state.test.ts`

### Implementation for User Story 2

- [ ] T042 [P] [US2] Create compact local agent cards with icon, display name, version, source label, installed/not-installed/incompatible/needs-manual-path state, selected state, and accessible names in `packages/core/src/app/components/settings/LocalAgentCard.tsx`
- [ ] T043 [P] [US2] Create manual path form fields, optional browse action shown only when runtime support exists, direct-entry fallback, kind selector, validate action, accessible errors, validation summary, and disabled activation state in `packages/core/src/app/components/settings/ManualAgentPathForm.tsx`
- [ ] T044 [US2] Implement bounded scan start, event stream, cancel, and candidate persistence for `POST /__agent-connections/scan`, `GET /__agent-connections/scan/:scanId/events`, and `POST /__agent-connections/scan/:scanId/cancel` in `packages/core/src/http/agent-connections-api.ts`
- [ ] T045 [US2] Implement manual path validation for `POST /__agent-connections/manual-path/validate` with existence checks, runnable command checks, version/protocol timeout, compatibility report, and redacted diagnostics in `packages/core/src/http/agent-connections-api.ts`
- [ ] T046 [US2] Add user-approved scan directory add/remove behavior and no full-disk validation guards in `packages/core/src/http/agent-discovery.ts`
- [ ] T047 [US2] Wire Local CLI cards, scan progress, cancel, rescan, approved directory controls, and manual path entry into `packages/core/src/app/components/settings/ExecutionModelSettings.tsx`
- [ ] T048 [US2] Implement activation from auto-scanned candidate or validated manual path through `POST /__agent-connections` in `packages/core/src/http/agent-connections-api.ts`
- [ ] T049 [US2] Ensure Rescan preserves manually configured local agents, BYOK connections, selected active connection, and stored credentials in `packages/core/src/app/lib/agent-connection-storage.ts`

**Checkpoint**: User Story 2 is fully functional and testable independently.

---

## Phase 5: User Story 3 - BYOK Provider and Secure Credentials (Priority: P1)

**Goal**: A hosted-model user can configure a provider and model, paste an API key, test it, save only a credential reference, and remove the connection with explicit credential deletion confirmation.

**Independent Test**: Open BYOK, choose a provider/model, paste a key, test and save, inspect project files for no raw key, reload and verify masked display, remove the connection with credential deletion, and confirm subsequent chat bootstrap reports no valid active connection if it was active.

### Tests for User Story 3

- [ ] T050 [P] [US3] Add BYOK credential create, minimal auth test, optional model-list handling, unsupported-model normalization, masked display, secure-storage-unavailable, and no raw key route tests in `packages/core/src/http/agent-connections-api.test.ts`
- [ ] T051 [P] [US3] Add BYOK form state tests for provider/model selection, manual model ID fallback, key show/hide, paste, validation error, storage warning, save, and delete confirmation in `packages/core/src/app/lib/agent-connection-state.test.ts`
- [ ] T052 [P] [US3] Add credential redaction regression tests for project settings, diagnostics, browser bootstrap payloads, and chat bootstrap payloads in `packages/core/src/http/agent-secrets.test.ts`

### Implementation for User Story 3

- [ ] T053 [P] [US3] Create BYOK provider select, model select/model ID field, API key input, show/hide control, storage mode indicator, Test action, and Save action in `packages/core/src/app/components/settings/ByokProviderForm.tsx`
- [ ] T054 [US3] Implement provider and model registry metadata for API key providers without provider-specific coupling to 005 in `packages/core/src/app/lib/agent-connections.ts`
- [ ] T055 [US3] Implement BYOK credential storage, credential reference serialization, masked display hints, OS credential storage plus environment variable reference fallback warnings, `secure-storage-unavailable`, and raw key exclusion in `packages/core/src/http/agent-secrets.ts`
- [ ] T056 [US3] Implement BYOK connection creation and cheap privacy-conscious provider test behavior for credential presence, minimal auth, optional model listing, manual model ID fallback, and normalized unsupported-model results in `packages/core/src/http/agent-connections-api.ts`
- [ ] T057 [US3] Wire BYOK tab state, validation errors, masked saved credentials, storage warnings, and provider test feedback into `packages/core/src/app/components/settings/ExecutionModelSettings.tsx`
- [ ] T058 [US3] Implement delete connection and optional credential deletion for `DELETE /__agent-connections/:connectionId` in `packages/core/src/http/agent-connections-api.ts`
- [ ] T059 [US3] Add destructive credential removal confirmation UI with affected provider and credential hint in `packages/core/src/app/components/settings/ExecutionModelSettings.tsx`

**Checkpoint**: User Story 3 is fully functional and testable independently.

---

## Phase 6: User Story 4 - Slide Page Quick Switcher, Active Status, and 005 Agent Chat Integration (Priority: P1)

**Goal**: A creator can see and quickly change the selected provider mode, code agent, model, and reasoning from the slide page before using agent chat, and `specs/005-agent-chat-ui` can consume safe active connection metadata, capability flags, recovery targets, and adapter execution without owning provider details.

**Independent Test**: Configure a local or BYOK connection, set it active, reload, open the slide-page top-right gear quick switcher, change active agent/model/reasoning where supported, confirm the gear stays rightmost and the quick change is reflected in 005 chat bootstrap, start a chat run, verify 005 still owns workflow selection and proposal validation, then invalidate the persisted active connection and verify recovery opens the same settings modal.

### Tests for User Story 4

- [ ] T060 [P] [US4] Add active connection selection, quick model/reasoning preference, project default, invalid persisted choice, and reload persistence route tests in `packages/core/src/http/agent-connections-api.test.ts`
- [ ] T061 [P] [US4] Add agent chat session bootstrap tests for ready, needs-setup, degraded, failed, offline, settings modal target metadata, and slide-page quick switcher active snapshot parity in `packages/core/src/http/agent-chat-api.test.ts`
- [ ] T062 [P] [US4] Add adapter request tests proving 005 supplies prompt context and bundled workflow instructions while 006 resolves quick switcher model/reasoning preferences, credentials, capabilities, streaming, and cancellation in `packages/core/src/http/agent-connection-adapters.test.ts`

### Implementation for User Story 4

- [ ] T063 [US4] Implement `POST /__agent-connections/active` with session scope, project default scope, model/reasoning preference updates, safe status refresh, and invalid active connection detection in `packages/core/src/http/agent-connections-api.ts`
- [ ] T064 [US4] Render configured connection list, selected state, active badge, project default control, last tested time, and fast reversible switching in `packages/core/src/app/components/settings/ExecutionModelSettings.tsx` and `packages/core/src/app/components/settings/QuickConnectionSwitcher.tsx`
- [ ] T065 [US4] Expose active connection bootstrap metadata, model preference, reasoning preference, available model/reasoning options, status, capabilities, and `settingsModalTarget: "execution-model"` to slide-page and 005-safe consumers in `packages/core/src/app/lib/agent-connections.ts`
- [ ] T066 [US4] Update agent chat session bootstrap to read 006 active connection metadata and no-connection/degraded/failed/offline recovery targets in `packages/core/src/http/agent-chat-api.ts`
- [ ] T067 [US4] Update agent chat panel recovery controls to open the shared settings modal to `Execution & model` instead of relying only on `/settings/connections` copy in `packages/core/src/app/components/agent-chat/AgentChatPanel.tsx`
- [ ] T068 [US4] Route 005 adapter run startup through the active connection adapter while preserving 005 prompt context, `packages/core/skills` workflow selection, proposal parsing, proposal validation, preview/apply, and audit ownership in `packages/core/src/http/agent-chat-api.ts`
- [ ] T069 [US4] Wire `QuickConnectionSwitcher` into the slide page top-right toolbar, keep the settings gear as the rightmost control beside Present/Share actions, and ensure connection capability flags enable or degrade 005 controls in `packages/core/src/app/routes/slide.tsx` and `packages/core/src/app/components/agent-chat/AgentChatPanel.tsx`

**Checkpoint**: User Story 4 is fully functional and testable independently.

---

## Phase 7: User Story 5 - Diagnostics, Recovery, and Reliability (Priority: P2)

**Goal**: A user with a missing executable, invalid path, denied scan, storage issue, expired key, quota issue, unsupported model, incompatible protocol, offline provider, or timeout gets redacted diagnostics and actionable recovery without leaking secrets or blocking the settings UI.

**Independent Test**: Simulate each connection error category, verify status, recovery actions, diagnostics copy, retry/test behavior, static read-only behavior, scan cancellation, and that no raw credentials, env values, hidden path contents, or secret-like command output appear in UI, logs, or bootstrap responses.

### Tests for User Story 5

- [ ] T070 [P] [US5] Add error category to recovery action tests for all 006 categories in `packages/core/src/app/lib/agent-connections.test.ts`
- [ ] T071 [P] [US5] Add diagnostics redaction tests for command output, env values, API keys, hidden paths, and copied diagnostics in `packages/core/src/http/agent-secrets.test.ts`
- [ ] T072 [P] [US5] Add static/read-only mode, timeout, offline, provider quota, unsupported model, and retry/test route tests in `packages/core/src/http/agent-connections-api.test.ts`
- [ ] T073 [P] [US5] Add modal state tests for long diagnostics, disabled states, scan cancellation progress, and non-blocking modal interactions in `packages/core/src/app/lib/agent-connection-state.test.ts`

### Implementation for User Story 5

- [ ] T074 [US5] Normalize missing executable, invalid path, scan denied, secure storage unavailable, authentication failed, quota/rate limit, unsupported model, incompatible protocol, provider offline, timeout, and unknown errors in `packages/core/src/app/lib/agent-connections.ts`
- [ ] T075 [US5] Apply server-side diagnostics redaction to every route response, scan event, test result, adapter event, and error response in `packages/core/src/http/agent-connections-api.ts`
- [ ] T076 [US5] Implement non-blocking testing and scan cancellation state so the modal remains keyboard responsive during long operations in `packages/core/src/app/lib/agent-connection-state.ts`
- [ ] T077 [US5] Render categorized status, recovery actions, diagnostics copy, retry, test again, rescan, edit path, choose model, use BYOK, and delete credential controls in `packages/core/src/app/components/settings/ExecutionModelSettings.tsx`
- [ ] T078 [US5] Add static/read-only bootstrap behavior that shows status and setup help while blocking local validation and credential writes in `packages/core/src/http/agent-connections-api.ts`
- [ ] T079 [US5] Ensure adapter cancellation aborts local processes or provider requests where supported and stops browser event forwarding where unsupported in `packages/core/src/http/agent-connection-adapters.ts`
- [ ] T080 [US5] Document credential handling, scan boundaries, fallback modes, and recovery categories in `specs/006-agent-model-connections/quickstart.md`

**Checkpoint**: User Story 5 is fully functional and testable independently.

---

## Phase 8: User Story 6 - Multiple Connections and Project Defaults (Priority: P2)

**Goal**: A user with multiple local tools or model providers can manage configured connections, switch per session, set a project default, remove stale connections, and keep settings separated between project-shared metadata and user-local secrets.

**Independent Test**: Configure two connections, switch active connection per session, set one as project default, reload, remove the active one, verify fallback status, confirm non-secret project settings remain shareable, and verify stored credentials stay user-local.

### Tests for User Story 6

- [ ] T081 [P] [US6] Add multi-connection settings persistence tests for session active, project default, stale removal, and safe project-shared metadata in `packages/core/src/app/lib/agent-connection-storage.test.ts`
- [ ] T082 [P] [US6] Add configured connection list state tests for switching, project default, stale status, remove, and preserved BYOK/manual settings in `packages/core/src/app/lib/agent-connection-state.test.ts`
- [ ] T083 [P] [US6] Add route tests for removing active/default connections and returning a safe needs-setup snapshot in `packages/core/src/http/agent-connections-api.test.ts`

### Implementation for User Story 6

- [ ] T084 [US6] Implement connection list ordering, stale connection marking, removal of active/default references, and safe fallback state in `packages/core/src/app/lib/agent-connection-storage.ts`
- [ ] T085 [US6] Render multiple configured connections with type, status, scope, source, model or agent, last tested time, remove action, and project default control in `packages/core/src/app/components/settings/ExecutionModelSettings.tsx`
- [ ] T086 [US6] Ensure removing a connection deletes credentials only when explicitly confirmed and preserves non-secret history where appropriate in `packages/core/src/http/agent-connections-api.ts`
- [ ] T087 [US6] Ensure switching connections from the full settings modal or slide-page quick switcher refreshes 005 chat bootstrap state without clearing existing chat messages or storing credential values in `packages/core/src/app/components/agent-chat/AgentChatPanel.tsx`

**Checkpoint**: User Story 6 is fully functional and testable independently.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Visual quality, accessibility, documentation, package discipline, and final verification across all delivered stories.

- [ ] T088 [P] Review the settings modal and quick switcher against `$ui-ux-pro-max` guidance for labels, contrast, error announcements, keyboard navigation, and no color-only state communication in `packages/core/src/app/components/settings/SettingsModal.tsx` and `packages/core/src/app/components/settings/QuickConnectionSwitcher.tsx`
- [ ] T089 [P] Review the settings modal and quick switcher against `$frontend-design` guidance for dense developer-tool hierarchy, stable dimensions, no marketing hero patterns, no decorative gradients, and no layout-shifting hover states in `packages/core/src/app/components/settings/ExecutionModelSettings.tsx` and `packages/core/src/app/components/settings/QuickConnectionSwitcher.tsx`
- [ ] T090 [P] Verify modal, first-run setup, and slide-page quick switcher behavior at 375px, 768px, 1024px, and 1440px against `specs/006-agent-model-connections/quickstart.md`
- [ ] T091 [P] Update implementation notes if storage locations, credential fallback behavior, provider support, or scan boundaries differ from the plan in `specs/006-agent-model-connections/quickstart.md`
- [ ] T092 Run `pnpm check` from `D:\Projects\awesome-slide`
- [ ] T093 Run `pnpm typecheck` from `D:\Projects\awesome-slide`
- [ ] T094 Run `pnpm test` from `D:\Projects\awesome-slide`
- [ ] T095 Run `pnpm build` from `D:\Projects\awesome-slide`
- [X] T096 Add a patch changeset for `@awesome-slide/core` in `.changeset/`

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1): no dependencies
- Foundational (Phase 2): depends on Setup completion and blocks all user stories
- User Story 1 (Phase 3): depends on Foundational and is the MVP
- User Story 2 (Phase 4): depends on Foundational and can proceed after the Local CLI UI shell from US1 exists
- User Story 3 (Phase 5): depends on Foundational and can proceed after the BYOK tab shell from US1 exists
- User Story 4 (Phase 6): depends on US2 or US3 having at least one connection type and blocks slide-page quick switching plus full 005 integration
- User Story 5 (Phase 7): depends on Foundational and hardens all connection paths
- User Story 6 (Phase 8): depends on US2, US3, and US4 configured connection behavior
- Polish (Phase 9): depends on all desired user stories being complete

### User Story Dependencies

- US1 First-Run Setup and Settings Modal (P1): starts after Foundational; no dependencies on other stories
- US2 Local CLI Discovery and Manual Agent Paths (P1): starts after Foundational; uses US1 modal shell
- US3 BYOK Provider and Secure Credentials (P1): starts after Foundational; uses US1 modal shell
- US4 Slide Page Quick Switcher, Active Status, and 005 Agent Chat Integration (P1): starts after at least one connection source from US2 or US3 works
- US5 Diagnostics, Recovery, and Reliability (P2): can start after Foundational, then integrates with all story surfaces
- US6 Multiple Connections and Project Defaults (P2): starts after local/BYOK creation and active selection are implemented

### Within Each User Story

- Story-specific tests should be written first and fail before implementation
- Types before reducers and storage
- Storage and redaction before API responses
- API routes before browser client wiring
- Browser client and reducer before UI integration
- UI shell before route entry-point wiring
- Provider/local execution before 005 run integration
- Security and redaction checks before final gates

### Parallel Opportunities

- T002 through T010 can run in parallel after T001 because they create independent module entry points
- T011 through T017 can run in parallel because they touch separate test files
- T018 through T020, T022 through T024, and T027 can run in parallel after tests exist because they define independent helper modules
- US1 component tasks T032 through T034 can run in parallel
- US2 component tasks T042 and T043 can run in parallel with scan route implementation T044
- US3 BYOK form T053 can run in parallel with provider metadata T054 and credential storage T055
- US4 route tests T060, chat bootstrap tests T061, and adapter tests T062 can run in parallel
- US5 error, redaction, API, and responsive tests T070 through T073 can run in parallel
- US6 tests T081 through T083 can run in parallel
- Polish checks T092 through T095 should run after implementation, with T092 before commit

---

## Parallel Example: User Story 1

```bash
Task: "Create the modal overlay, header, close control, focus management, responsive shell, and Execution & model target handling in packages/core/src/app/components/settings/SettingsModal.tsx"
Task: "Create the left navigation rail with Configure execution mode and placeholder settings categories in packages/core/src/app/components/settings/SettingsNav.tsx"
Task: "Create the first-run setup panel with Auto-scan local agents, Specify agent path, Use BYOK provider, and Do later actions in packages/core/src/app/components/settings/FirstRunAgentSetup.tsx"
```

## Parallel Example: User Story 2

```bash
Task: "Create compact local agent cards with icon, display name, version, source label, installed/not-installed/incompatible/needs-manual-path state, selected state, and accessible names in packages/core/src/app/components/settings/LocalAgentCard.tsx"
Task: "Create manual path form fields, kind selector, validate action, accessible errors, validation summary, and disabled activation state in packages/core/src/app/components/settings/ManualAgentPathForm.tsx"
Task: "Add manual path validation tests for executable, command, project path, missing path, incompatible protocol, timeout, and redacted stdout/stderr in packages/core/src/http/agent-discovery.test.ts"
```

## Parallel Example: User Story 3

```bash
Task: "Create BYOK provider select, model select/model ID field, API key input, show/hide control, storage mode indicator, Test action, and Save action in packages/core/src/app/components/settings/ByokProviderForm.tsx"
Task: "Add BYOK credential create, minimal auth test, optional model-list handling, unsupported-model normalization, masked display, secure-storage-unavailable, and no raw key route tests in packages/core/src/http/agent-connections-api.test.ts"
Task: "Add credential redaction regression tests for project settings, diagnostics, browser bootstrap payloads, and chat bootstrap payloads in packages/core/src/http/agent-secrets.test.ts"
```

## Parallel Example: User Story 4

```bash
Task: "Add active connection selection, quick model/reasoning preference, project default, invalid persisted choice, and reload persistence route tests in packages/core/src/http/agent-connections-api.test.ts"
Task: "Add agent chat session bootstrap tests for ready, needs-setup, degraded, failed, offline, settings modal target metadata, and slide-page quick switcher active snapshot parity in packages/core/src/http/agent-chat-api.test.ts"
Task: "Add adapter request tests proving 005 supplies prompt context and bundled workflow instructions while 006 resolves quick switcher model/reasoning preferences, credentials, capabilities, streaming, and cancellation in packages/core/src/http/agent-connection-adapters.test.ts"
```

---

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3 so the slide library first-run prompt and settings modal shell work without starting scans.
3. Stop and validate US1 independently with the slide library open and no active connection.
4. Complete either Phase 4 for local-first workflows or Phase 5 for BYOK workflows.
5. Complete Phase 6 before declaring 005 agent chat integration ready.

### Incremental Delivery

1. US1 delivers the visible setup path and Open Design-style settings anatomy.
2. US2 adds local agent discovery, rescan, approved directories, manual path validation, and activation.
3. US3 adds BYOK provider setup with secure credential references.
4. US4 adds the slide-page quick switcher and connects active connection status plus adapter execution to 005 without moving skill workflow selection out of 005.
5. US5 hardens error categories, diagnostics, redaction, cancellation, and static/read-only behavior.
6. US6 finishes multi-connection switching, project defaults, removal, and safe fallback.

### Validation Gates

1. Run focused tests after each user story.
2. Validate quickstart scenarios in `specs/006-agent-model-connections/quickstart.md`.
3. Run `pnpm check`, `pnpm typecheck`, `pnpm test`, and `pnpm build` before completion.
4. Add a patch changeset because implementation touches `packages/core`.
