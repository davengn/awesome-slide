# Research: Playwright E2E Coverage for Agent Connections and Chat Slide Generation

## Decision: Own Playwright at the repository root

**Rationale**: The E2E suite crosses `apps/demo`, `@awesome-slide/core` Vite middleware, browser UI, local filesystem output, and package scripts. A root `playwright.config.ts` and root scripts make the suite visible beside existing `pnpm check`, `pnpm test`, and `pnpm build` gates.

**Alternatives considered**: Placing tests inside `packages/core` was rejected because the browser target is the demo app and the assertions span management, connection, and chat routes. Placing tests inside `apps/demo` was rejected because the suite validates framework behavior, not only demo-owned code.

## Decision: Use the demo app with isolated fixture state

**Rationale**: `apps/demo` is the local consumer of `@awesome-slide/core` and is the right dogfood target. The tests should still avoid mutating developer slides by copying or generating a disposable project fixture for each run.

**Alternatives considered**: Running against the developer's normal `apps/demo/slides` was rejected because tests would create and modify slides. Building a separate minimal app was rejected because it would drift from the actual dogfood runtime.

## Decision: Add a deterministic fixture agent

**Rationale**: The requested coverage is about Awesome Slide's connection and chat behavior, not model quality. A deterministic fixture agent can emit realistic progress, token, proposal, completed, failed, and degraded states without network calls, local CLI installs, or API keys.

**Alternatives considered**: Calling real hosted providers was rejected because CI would require secrets and network stability. Calling real local CLIs was rejected because contributor machines vary. Mocking only `fetch` in the browser was rejected because it would skip the Vite middleware and adapter boundary.

## Decision: Cover connection flows before chat generation

**Rationale**: Agent chat consumes safe active connection metadata from `specs/006-agent-model-connections`. E2E must prove the no-connection setup path, ready connection state, failed/degraded recovery, and quick switcher state before verifying prompt runs.

**Alternatives considered**: Seeding a ready connection for every test was rejected because it would miss the setup/recovery regressions this feature exists to catch. Testing every provider type was rejected for first delivery because provider-specific network behavior belongs outside deterministic CI.

## Decision: Use a prompt style matrix

**Rationale**: Users do not write prompts in one format. A small matrix covering terse, structured, markdown/bullet, conversational, and iterative follow-up prompts gives meaningful coverage of chat startup, context collection, proposal generation, and generated slide verification without making the suite large.

**Alternatives considered**: A single happy-path prompt was rejected because it would not catch formatting or context regressions. A large prompt corpus was rejected because the first suite must stay fast and maintainable.

## Decision: Assert generated slide output at multiple layers

**Rationale**: A chat run can complete while still failing to create a usable slide. The E2E suite should verify UI terminal state, proposal apply state, generated source or metadata, navigation to the generated slide, and a nonblank rendered preview.

**Alternatives considered**: Checking only HTTP responses was rejected because it skips browser integration. Checking only screenshots was rejected because screenshots do not prove metadata/source persistence.

## Decision: Prefer accessible selectors with limited test IDs

**Rationale**: The tests should reflect user-visible behavior and support accessibility improvements. Roles, labels, button names, dialogs, headings, and status text are preferred. Dedicated test IDs are acceptable only for dynamic surfaces such as slide preview canvases or generated-run status containers where accessible selectors are not stable enough.

**Alternatives considered**: Using CSS class selectors was rejected because styling changes would break tests. Adding test IDs everywhere was rejected because it would hide accessibility regressions.

## Decision: Make CI artifacts first-class

**Rationale**: E2E failures are expensive to diagnose. Traces, screenshots, console output, network summaries, and failure videos or equivalent artifacts should be collected by default on failure and redacted before publication.

**Alternatives considered**: Relying on terminal logs only was rejected because UI state and run timing are central to this feature. Capturing full logs without redaction was rejected because agent diagnostics can include path or secret-like data.
