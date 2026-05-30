# Quickstart: Playwright E2E Coverage for Agent Connections and Chat Slide Generation

## Prerequisites

- Work from the repository root.
- Keep pnpm workspace dependencies installed.
- Do not run E2E tests against the developer's normal slide state.
- If implementation touches `packages/core` or `packages/cli`, add a patch changeset.

## 1. Install Playwright Browsers

After the implementation adds `@playwright/test`, install the required browser locally:

```bash
pnpm exec playwright install chromium
```

CI should cache browser binaries where practical.

## 2. Run the E2E Suite

Run from the repository root:

```bash
pnpm test:e2e
```

Expected result:

- Playwright starts the Awesome Slide demo app with the E2E environment flag.
- Tests use an isolated fixture project.
- Chromium executes the agent connection and agent chat generation specs.
- Failure artifacts are written under ignored Playwright output.

## 3. Run a Focused Agent Chat Test

During implementation, run a single spec or grep title:

```bash
pnpm test:e2e -- tests/e2e/agent-chat-generate.spec.ts
pnpm test:e2e -- --grep "markdown brief"
```

Expected result:

- Only the targeted prompt-style flow runs.
- Fixture setup and cleanup still happen.

## 4. Debug Locally

Use Playwright UI mode once the script exists:

```bash
pnpm test:e2e:ui
```

Use the report command after a failure:

```bash
pnpm test:e2e:report
```

Review traces, screenshots, console output, and failed request summaries.

## 5. Verify Connection Coverage

Run the connection spec and verify:

- No-connection setup or recovery UI appears.
- Ready fixture connection is visible in settings/chat/quick switcher.
- Failed or degraded fixture connection shows categorized recovery.
- Quick switcher changes are reflected in the next chat session.
- No raw secrets appear in UI, logs, or fixture project files.

## 6. Verify Prompt Style Coverage

Run the chat generation spec and verify:

- Terse command, structured brief, markdown/bullet brief, conversational request, and iterative follow-up cases pass.
- Each case reaches terminal success.
- Each generated or updated slide can be opened.
- Each slide preview renders visible content.
- Follow-up edits preserve the generated slide instead of creating unrelated output.

## 7. Final Gates

Before completing implementation, run:

```bash
pnpm check
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

Add a changeset if implementation changes `packages/core` or `packages/cli`.
