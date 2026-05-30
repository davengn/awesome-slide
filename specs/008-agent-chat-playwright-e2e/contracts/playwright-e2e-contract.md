# Contract: Playwright E2E Harness

## Root Commands

The implementation must add root-level commands equivalent to:

```bash
pnpm test:e2e
pnpm test:e2e:ui
pnpm test:e2e:report
```

Rules:

- `pnpm test:e2e` runs the Chromium suite headlessly.
- UI/report commands are for local debugging and must not be required in CI.
- Commands run from the repository root and must not require `cd` into a package.

## Playwright Configuration

The root `playwright.config.ts` must define:

- `testDir` under `tests/e2e`.
- A `webServer` command that starts the Awesome Slide demo app against workspace packages.
- A `baseURL` pointing at the dev server.
- Chromium as the initial required project.
- CI-friendly retries, workers, timeouts, and artifact retention.
- Trace and screenshot capture on failure.

Rules:

- The dev server must run with an explicit E2E environment flag.
- The config must avoid opening real provider network credentials.
- The suite must be able to run locally after browser installation.

## Fixture Isolation

Each Playwright worker or test suite must use an isolated project fixture.

Rules:

- Generated slides, `.awesome-slide/agent-connections`, `.awesome-slide/agent-chat`, and audit files must stay inside the fixture project or ignored output.
- Tests must not mutate the developer's normal `apps/demo/slides` state.
- Fixture setup must be deterministic and safe to rerun.
- Cleanup must not use destructive commands outside the fixture root.

## Required Browser Flows

### No-Connection Recovery

1. Open the slide library with no ready connection.
2. Assert the first-run or recovery UI is visible.
3. Attempting to start a write-capable chat run must be blocked or recoverable.
4. Assert the recovery action opens the connection setup surface.

### Ready Fixture Connection

1. Seed or configure the deterministic fixture connection.
2. Assert settings or bootstrap displays a ready active connection.
3. Open agent chat and assert the session uses the fixture connection.

### Quick Switcher

1. Open a slide page.
2. Open the top-right agent connection quick switcher.
3. Change active connection or model preference.
4. Start a chat session and assert the new active connection metadata is used.

### Prompt Generation

1. Submit each prompt style case through the UI.
2. Wait for run progress and terminal success.
3. Review and apply the generated proposal when required.
4. Assert generated slide source/metadata exists.
5. Open the generated or updated slide and assert nonblank rendering.

### Failed/Degraded Connection

1. Seed a failed or degraded fixture state.
2. Start the relevant browser flow.
3. Assert categorized recovery UI appears.
4. Assert diagnostics are redacted in UI and artifacts.

## Selector Policy

Rules:

- Prefer `getByRole`, `getByLabel`, `getByText`, and accessible dialog/status names.
- Add test IDs only when the surface has no reliable accessible handle, such as canvas pixel checks.
- Avoid CSS class selectors for product UI.

## Artifact Policy

On failure, the suite must retain:

- Playwright trace.
- Screenshot.
- Console log or attached console output.
- Failed request summary.
- Video or equivalent browser recording when feasible in CI.

Artifacts must not include raw API keys, credential refs, or unredacted secret-like diagnostics.
