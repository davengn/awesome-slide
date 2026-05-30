# Implementation Plan: Playwright E2E Coverage for Agent Connections and Chat Slide Generation

**Branch**: `codex/008-agent-chat-playwright-e2e-plan` | **Date**: 2026-05-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-agent-chat-playwright-e2e/spec.md`

## Summary

Add a root Playwright E2E harness for Awesome Slide that runs the demo app against local workspace packages and verifies the highest-risk agent flows: first-run/no-connection recovery, deterministic ready connection setup, slide-page quick switching, agent chat run streaming, proposal apply, and renderable slide generation from multiple prompt styles. The suite uses an isolated fixture project and a test-only deterministic agent connection so CI never depends on real provider keys, local CLIs, or network model calls.

## Technical Context

**Language/Version**: TypeScript 5.9 strict mode, Node.js >=18, React 18, Playwright test runner.

**Primary Dependencies**: Existing pnpm/Turbo monorepo, `@awesome-slide/core`, `apps/demo`, Vite dev server, agent chat routes under `/__agent-chat`, agent connection routes under `/__agent-connections`, management routes under `/__management`, and a new root dev dependency on `@playwright/test`.

**Storage**: Disposable E2E project fixtures under ignored test output or temporary directories. Playwright artifacts under `test-results/` and HTML report output. Fixture connection state, generated slides, and audit files must stay inside the disposable project or ignored output.

**Testing**: Playwright for browser E2E coverage. Existing Vitest remains responsible for unit, reducer, API route, proposal validation, and storage helper tests. Final gates should include `pnpm check`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and the new E2E command.

**Target Platform**: Local Awesome Slide demo app served by the core Vite plugin. Initial automated browser target is Chromium; Firefox/WebKit can be added after the suite is stable.

**Project Type**: pnpm + Turbo monorepo framework package with a dogfood demo app. E2E tests live at the repository root because they cross package, Vite middleware, browser UI, and filesystem boundaries.

**Performance Goals**: Primary Chromium suite under 5 minutes on CI after browsers are installed. No single prompt-style test should wait on real network or model latency. Run-event assertions should wait on UI or SSE state transitions instead of fixed sleeps.

**Constraints**: No real provider API calls, no real user API keys, no full-disk local agent scans in CI, no shipped runtime dependency added to `@awesome-slide/core`, and no mutation of the developer's normal `apps/demo/slides` state. Test-only runtime hooks must be guarded by an explicit E2E environment flag and must not be active in normal dev or production builds.

**Scale/Scope**: One root Playwright harness, two primary specs for connection flows and chat generation, one reusable fixture project, one deterministic agent fixture, and a prompt style matrix covering at least five cases.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Plan Response |
|-----------|--------|---------------|
| I. Agent-Native by Design | PASS | The suite validates the complete agent-authoring workflow from connection setup through chat generation and slide rendering. |
| II. Package Discipline | PASS | Playwright is a root dev dependency; any `packages/core` implementation hook requires a patch changeset and must avoid shipped runtime weight. |
| III. Clean Code Baseline | PASS | Tests use existing routes and UI surfaces, prefer accessible selectors, and keep generated artifacts in ignored output. |
| IV. Monorepo Convention | PASS | Commands run from the repository root and exercise `apps/demo` through workspace packages. |
| V. Ship Small, YAGNI | PASS | Initial scope is Chromium plus the highest-risk agent flows; real provider/browser matrix expansion is deferred. |

**Post-Design Recheck**: PASS. Research, data model, contracts, and quickstart keep the suite deterministic, isolated, and scoped to agent connection/chat behavior.

## Project Structure

### Documentation (this feature)

```text
specs/008-agent-chat-playwright-e2e/
|-- spec.md
|-- plan.md
|-- research.md
|-- data-model.md
|-- quickstart.md
|-- checklists/
|   `-- requirements.md
`-- contracts/
    |-- agent-fixture-contract.md
    |-- playwright-e2e-contract.md
    `-- prompt-style-matrix.md
```

### Source Code (repository root)

```text
package.json
playwright.config.ts
tests/
`-- e2e/
    |-- agent-chat-generate.spec.ts
    |-- agent-connections.spec.ts
    |-- fixtures/
    |   |-- agent-fixture.ts
    |   |-- prompt-cases.ts
    |   |-- project-fixture.ts
    |   `-- slide-assertions.ts
    `-- projects/
        `-- basic/
            |-- slides/
            |-- themes/
            `-- package.json

packages/core/
`-- src/
    |-- http/
    |   |-- agent-chat-api.ts
    |   `-- agent-connections-api.ts
    `-- app/
        |-- components/
        |   |-- agent-chat/
        |   `-- settings/
        `-- routes/
            |-- home.tsx
            `-- slide.tsx

.changeset/
`-- <patch-changeset>.md
```

**Structure Decision**: Keep Playwright configuration, fixtures, and specs at the repository root because E2E coverage crosses package boundaries. Use `apps/demo` behavior as the dogfood target, but run against an isolated fixture project so tests do not alter normal demo slides. Guard any app/runtime fixture hooks with `AWESOME_SLIDE_E2E=1` or equivalent.

## Phase 0 Research Output

Research is complete in [research.md](./research.md) with decisions for:

- Root Playwright ownership and command shape.
- Demo app as the dogfood E2E target with isolated fixture state.
- Deterministic fixture agent instead of real provider or local CLI calls.
- Agent connection coverage boundaries from `specs/006-agent-model-connections`.
- Agent chat generation coverage boundaries from `specs/005-agent-chat-ui`.
- Prompt style matrix and success assertions.
- Render verification beyond HTTP responses.
- Accessible selector strategy.
- CI artifact, retry, and trace policy.

## Phase 1 Design Output

Design artifacts are complete:

- [data-model.md](./data-model.md): fixture project, fixture agent connection, prompt style cases, run traces, generated slide assertions, render assertions, and artifact policy.
- [contracts/playwright-e2e-contract.md](./contracts/playwright-e2e-contract.md): root commands, Playwright config expectations, isolation, artifacts, and required browser flows.
- [contracts/agent-fixture-contract.md](./contracts/agent-fixture-contract.md): deterministic agent connection behavior, states, events, proposal output, and redaction constraints.
- [contracts/prompt-style-matrix.md](./contracts/prompt-style-matrix.md): initial prompt cases and expected generated-slide outcomes.
- [quickstart.md](./quickstart.md): local/CI validation loop for the future implementation.
- [checklists/requirements.md](./checklists/requirements.md): completed requirements checklist for E2E scope, determinism, and user-flow coverage.

## Resolved Planning Assumptions

- Playwright is the required E2E tool for this feature.
- The first automated browser target is Chromium to keep the initial suite fast and stable.
- The suite should verify user-visible state and generated slide output, not only route responses.
- Real provider calls are out of scope for CI; a deterministic fixture agent is required.
- Prompt-style success means the chat run reaches a terminal successful state, produces or applies a proposal, creates or updates a slide, and renders a nonblank preview.
- Existing Vitest coverage remains in place; E2E tests cover integration seams that unit tests cannot.
- Any runtime test hook in `packages/core` must be disabled unless the E2E environment flag is set.

## Complexity Tracking

No constitution violations are present.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
