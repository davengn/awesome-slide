# Data Model: Playwright E2E Coverage for Agent Connections and Chat Slide Generation

## E2EProjectFixture

Represents one disposable Awesome Slide project used by a Playwright worker.

**Fields**

- `id`: Unique fixture identifier for the worker/test run.
- `rootPath`: Absolute path to the disposable project root.
- `slidesPath`: Path containing generated and seed slides.
- `connectionStatePath`: Path for `.awesome-slide/agent-connections` fixture state.
- `auditPath`: Path for `.awesome-slide/agent-chat` audit artifacts.
- `baseUrl`: Playwright base URL for the running app.
- `seedSlides`: Known seed slide IDs available before a prompt run.

**Validation**

- `rootPath` must be inside ignored test output or an OS temporary directory.
- Fixture setup must not write to the developer's normal `apps/demo/slides` tree.
- Cleanup must remove or ignore generated files after the run.

## FixtureAgentConnection

Represents the deterministic E2E agent connection.

**Fields**

- `connectionId`: Stable fixture connection ID.
- `displayName`: User-facing name shown in settings, quick switcher, and chat.
- `type`: `local-agent`, `manual-agent`, or `api-provider` shape used by the app.
- `status`: `ready`, `degraded`, `failed`, or `needs-setup`.
- `modelId`: Optional fixture model label.
- `reasoningEffort`: Optional fixture reasoning preference.
- `capabilities`: Streaming, cancellation, structured proposal, and write-capable flags.
- `failureCategory`: Optional normalized failure category for recovery tests.

**Validation**

- Ready fixture connections must not require a real executable or API key.
- Failed/degraded fixture states must return redacted diagnostics.
- Fixture metadata returned to the browser must not include raw local paths or secrets.

## PromptStyleCase

Defines one prompt variant in the E2E generation matrix.

**Fields**

- `id`: Stable case ID, for example `terse-command` or `markdown-brief`.
- `name`: User-facing case name for reports.
- `prompt`: Prompt text submitted through the UI.
- `entryPoint`: `slide-library-create`, `slide-page-chat`, or `follow-up`.
- `expectedOperationKinds`: Proposal operation kinds expected from the fixture agent.
- `expectedSlideTitle`: Expected generated or updated slide title.
- `expectedVisibleText`: Text expected in the rendered slide preview.
- `requiresExistingSlide`: Whether the case starts from an existing slide.

**Validation**

- Prompt text must be natural enough to represent a real user style.
- Each case must produce a deterministic expected result.
- Follow-up cases must name the preceding generated or seed slide they depend on.

## ChatRunTrace

Captures browser-observable evidence for one agent chat run.

**Fields**

- `sessionId`: Chat session ID from UI or route bootstrap.
- `runId`: Run ID surfaced by the app.
- `promptCaseId`: Related prompt style case.
- `connectionId`: Active connection used by the run.
- `events`: Ordered run event types observed by the browser.
- `terminalState`: `completed`, `failed`, or `cancelled`.
- `proposalId`: Proposal ID when generated.
- `appliedOperationIds`: Operations applied by the test.
- `diagnostics`: Redacted diagnostic summary when present.

**Validation**

- Event order must include a startup/progress state before terminal success for generated runs.
- Successful cases must not remain in queued, loading, or streaming state.
- Failed cases must expose a recovery action and redacted diagnostics.

## GeneratedSlideAssertion

Represents persisted evidence that a prompt generated or updated a slide.

**Fields**

- `slideId`: Generated or updated slide ID.
- `sourcePath`: Path to the slide entry file in the fixture project.
- `metadata`: Expected title, status, notes, tags, or theme values.
- `sourceContains`: Required source snippets or visible text.
- `navigationUrl`: Browser URL used to open the slide.
- `renderAssertion`: Linked `RenderAssertion`.

**Validation**

- `sourcePath` must exist after proposal apply.
- Generated source must not contain fixture-only secret strings.
- The app must navigate to or list the generated slide after creation.

## RenderAssertion

Defines how the suite proves a generated slide renders.

**Fields**

- `locator`: Playwright locator for the slide preview or canvas surface.
- `nonblankCheck`: Method used to verify visible pixels or rendered text.
- `viewport`: Browser viewport used for the assertion.
- `screenshotPath`: Artifact path captured on failure or optional success debug.

**Validation**

- Text-based render checks must match visible slide text, not hidden source.
- Pixel checks must tolerate theme/background differences while detecting blank previews.
- Render assertions must wait for app loading state to settle.

## E2EArtifactPolicy

Describes failure output retained by the suite.

**Fields**

- `trace`: Whether Playwright trace is retained.
- `screenshot`: Whether screenshots are retained.
- `video`: Whether video or equivalent browser artifact is retained.
- `consoleLog`: Whether browser console logs are retained.
- `networkLog`: Whether failed requests are summarized.
- `redactionPatterns`: Secret-like values that must be masked.

**Validation**

- Artifacts must be generated on failure in CI.
- Redaction must cover API-key-like strings, credential refs, hidden-file paths, and local user path fragments when diagnostics include them.
