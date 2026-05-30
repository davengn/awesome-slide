# Specification: Playwright E2E Coverage for Agent Connections and Chat Slide Generation

## Status

Planning

## Product Vision Alignment

Awesome Slide is agent-native by design, so the browser experience must prove that users can configure an agent connection, start agent chat, and produce usable slide content from natural prompts. Unit and route tests cover pieces of `specs/005-agent-chat-ui` and `specs/006-agent-model-connections`, but this spec closes the user-journey gap with browser-level end-to-end coverage.

## Problem Statement

Agent connection setup, slide-library prompt creation, slide-page quick switching, server-sent chat events, proposal review, and slide rendering cross several runtime boundaries. Regressions can pass Vitest while the actual browser flow still fails to open settings, loses the active connection, drops streamed events, cannot apply proposals, or creates a slide that does not render. The project needs a Playwright E2E plan focused on those agent paths, with deterministic fixtures that do not depend on real model providers.

## Goals

- Add a Playwright-backed E2E suite that runs from the repository root.
- Exercise the demo app as the dogfood consumer of local `@awesome-slide/core`.
- Validate agent connection setup, active connection switching, no-connection recovery, and failed/degraded connection behavior.
- Validate agent chat slide generation with a matrix of prompt styles: terse command, structured creative brief, markdown/bullet brief, conversational request, and iterative follow-up.
- Verify success through browser-visible chat state, generated slide metadata/source, proposal apply behavior, and nonblank slide rendering.
- Keep E2E runs deterministic, isolated, and free of real provider secrets or network calls.

## Non-Goals

- Do not run real OpenAI, Anthropic, Google, DeepSeek, OpenRouter, Codex CLI, or Claude Code calls in CI.
- Do not replace existing Vitest coverage for route contracts, reducers, proposal validation, or storage helpers.
- Do not add exhaustive visual regression baselines for every slide state in the first delivery.
- Do not cover every browser engine before the Chromium happy path is stable.
- Do not test unrelated marketing-site behavior in this spec.

## User Stories

- US1 (P1): As a maintainer, I want a root E2E command that starts the demo app and verifies agent setup, so I can catch broken browser flows before release.
- US2 (P1): As a creator, I want prompt-based slide creation to work from different prompt styles, so the agent chat flow is reliable for realistic user language.
- US3 (P1): As a user with no configured connection, I want a clear setup and recovery path, so a first prompt does not fail silently.
- US4 (P2): As a power user, I want the slide-page quick switcher to update the active connection/model before chat runs, so connection changes affect the next run.
- US5 (P2): As a maintainer, I want failures to preserve traces, screenshots, console logs, and redacted diagnostics, so debugging E2E failures is practical.

## Functional Requirements

- FR-001: The repository must provide a root command for running the Playwright E2E suite.
- FR-002: The E2E suite must start the demo Awesome Slide app against local workspace packages.
- FR-003: Each test run must use an isolated project fixture and must not mutate the developer's normal `apps/demo/slides` state.
- FR-004: The suite must provide a deterministic agent fixture that can behave like a ready local agent connection without external network access.
- FR-005: The suite must verify the no-connection state surfaces a setup or recovery action before a write-capable chat run starts.
- FR-006: The suite must verify at least one ready connection path that agent chat can use for a successful run.
- FR-007: The suite must verify the slide-page quick switcher displays the active connection and can change the active connection or model preference used by the next chat run.
- FR-008: The suite must verify agent chat streams or displays run progress, reaches a terminal successful state, and does not leave a run stuck in queued, loading, or streaming state.
- FR-009: The suite must verify generated proposals can be applied and produce a slide source or metadata change that the app recognizes.
- FR-010: The suite must verify prompt-created slides can be opened after generation and render a nonblank slide preview.
- FR-011: The prompt matrix must cover terse, structured, markdown/bullet, conversational, and iterative follow-up styles.
- FR-012: The suite must verify failed or degraded connection states show categorized recovery UI without leaking API keys, credential references, hidden path contents, or secret-like diagnostics.
- FR-013: The suite must preserve failure artifacts: Playwright trace, screenshot, video or equivalent browser artifact, console output, and network summary.
- FR-014: The suite must be CI-compatible with predictable timeouts, retries, and browser installation instructions.
- FR-015: Tests must prefer user-facing roles, labels, and accessible names for selectors; dedicated test IDs may be added only for dynamic surfaces that lack stable accessible handles.

## Key Entities

- **E2E Project Fixture**: A disposable Awesome Slide project used by Playwright so generated slides, connection settings, and audit artifacts are isolated.
- **Fixture Agent Connection**: A deterministic local/test connection that returns realistic agent chat events and proposals for prompt-style cases.
- **Prompt Style Case**: A named prompt variant with expected connection state, run outcome, proposal shape, generated slide assertion, and render assertion.
- **Chat Run Trace**: Browser-observable evidence for queued/progress/proposal/completed states, plus redacted diagnostics on failure.
- **Generated Slide Assertion**: A set of source, metadata, navigation, and rendered-preview checks proving the slide exists and is usable.

## UX Requirements

- UX-001: E2E tests must validate visible user recovery, not only HTTP responses.
- UX-002: Tests must assert that chat progress and terminal status are understandable in the UI.
- UX-003: Tests must assert that prompt-created slide generation keeps the user's submitted prompt visible or recoverable after run startup.
- UX-004: Tests must assert that connection setup, switcher, and chat controls are reachable by keyboard-accessible controls.
- UX-005: Failure screenshots must show the relevant app surface without requiring maintainers to infer state from logs alone.

## Acceptance Criteria

- AC-001: A maintainer can run one documented E2E command from the repository root.
- AC-002: The E2E suite starts the demo app, opens the slide library, and verifies the first-run agent connection state.
- AC-003: The E2E suite configures or injects a ready deterministic agent connection without real provider credentials.
- AC-004: The suite verifies a prompt-created slide can transition into agent chat and complete generation.
- AC-005: The suite verifies at least five prompt style cases and confirms each produces an applied, renderable slide result.
- AC-006: The suite verifies a failed or unavailable connection shows a recovery action and does not start a write-capable run.
- AC-007: The suite verifies the quick switcher active connection state is reflected in the next agent chat session.
- AC-008: CI artifacts are sufficient to debug a failed E2E run without rerunning locally first.
- AC-009: E2E runs do not require network access to model providers and do not persist raw secrets in project files.

## Non-Functional Requirements

- NFR-001: The primary Chromium E2E suite should finish in under 5 minutes on a normal CI runner after dependencies and browsers are installed.
- NFR-002: Individual chat generation tests should use deterministic fixture responses and avoid arbitrary sleeps longer than necessary for server-sent event settlement.
- NFR-003: Test fixture cleanup must leave no generated slide or connection files outside ignored temporary locations.
- NFR-004: Failure output must redact secret-like values before logs are written to artifacts.
- NFR-005: E2E setup must not add shipped runtime dependencies to `@awesome-slide/core`.

## Dependencies and Assumptions

- `specs/005-agent-chat-ui` owns chat session UI, prompt context, proposal review/apply, and audit behavior.
- `specs/006-agent-model-connections` owns active connection metadata, connection settings, status/recovery states, and adapter execution.
- Implementation is expected to add Playwright as a root development dependency and to keep any test-only runtime hooks guarded by an explicit E2E environment flag.
- The demo app remains the dogfood target for framework-level E2E coverage.
- If implementation touches `packages/core` or `packages/cli`, it must include a patch changeset.

## Implementation Phases

### Phase 1: Playwright Harness and Fixture Project

- Add root Playwright configuration, scripts, browser setup guidance, and an isolated Awesome Slide project fixture.
- Start the demo app through Playwright `webServer` using workspace packages.
- Capture traces, screenshots, console logs, and network failures.

### Phase 2: Deterministic Agent Connection Fixture

- Add a test-only fixture connection that exposes ready, degraded, failed, and no-connection states.
- Ensure fixture runs stream realistic chat events and proposals without model-provider network calls.
- Add redaction assertions for diagnostics and project files.

### Phase 3: Agent Connection Browser Flows

- Cover first-run setup, manual/fixture activation, active connection persistence, failed recovery, and slide-page quick switcher behavior.
- Verify connection status is shared between settings, quick switcher, and agent chat session bootstrap.

### Phase 4: Prompt Style Slide Generation

- Run the prompt style matrix through the browser UI.
- Apply proposals and verify generated slide metadata/source, navigation, and rendered preview.
- Include an iterative follow-up case that starts from a previously generated slide.

### Phase 5: CI Integration and Maintenance

- Add CI-ready documentation, timeouts, retries, artifacts, and local debugging commands.
- Keep the suite small enough for pre-release validation while documenting future browser and visual-regression expansion.
