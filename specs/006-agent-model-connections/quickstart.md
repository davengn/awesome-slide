# Quickstart: Agent and Model Connection Options

## Prerequisites

- Run from repository root.
- Use the local Awesome Slide dev server for interactive validation.
- Keep `specs/005-agent-chat-ui` open as the consumer contract for active connection metadata and adapter execution.
- During UI implementation, apply `$ui-ux-pro-max` for accessibility/settings checks and `$frontend-design` for production-quality modal composition.

## 1. Bootstrap and First-Run Status

1. Start the dev app.
2. Open the slide library page.
3. With no active connection and no setup preference, verify a non-blocking setup prompt appears.
4. Confirm actions are present: `Auto-scan local agents`, `Specify agent path`, `Use BYOK provider`, and `Do later`.
5. Choose `Do later`, reload, and verify the app does not auto-scan and the slide library remains usable.

Expected result: first-run setup is visible, dismissible, and does not block manual slide management.

## 2. Settings Modal Reference

1. Open settings from the first-run prompt.
2. Confirm the modal opens to `Execution & model`.
3. Open settings again from the project/settings entry and confirm it reaches the same modal target.
4. Confirm the modal has a left navigation rail, Local CLI/BYOK segmented control, local-agent cards, Test action, and Rescan action.
5. Check that the visual treatment is compact and utilitarian, matching the supplied settings reference anatomy without copying unrelated brand styling.

Expected result: the settings modal is a focused execution/model configuration surface, not a marketing page or tiny popover.

## 3. Bounded Auto-Scan

1. Select `Auto-scan local agents`.
2. Confirm the UI explains scan scope before starting.
3. Start scan and verify only known commands, known install locations, current project metadata, and approved directories are checked.
4. Verify candidates are review-only until activated.
5. Use Rescan and confirm manual paths and BYOK settings remain intact.

Expected result: scanning is consented, bounded, cancellable, and non-destructive.

## 4. Manual Agent Path

1. Select `Specify agent path`.
2. If a browse action is unavailable or disabled, confirm direct path entry is still usable.
3. Enter an invalid path and validate.
4. Verify an accessible error appears with recovery actions.
5. Enter a valid local agent executable, command, or project path.
6. Validate and activate only after compatibility is confirmed.

Expected result: arbitrary paths are not trusted until validation passes.

## 5. BYOK Provider

1. Select BYOK.
2. Choose a provider and model.
3. Enter an API key.
4. Test the connection and confirm it performs only a minimal authentication check plus optional model validation without sending slide source.
5. Save and inspect project files.

Expected result: project files contain only provider/model/alias/credential reference metadata, never the raw key. If OS credential storage is unavailable, the UI stores an environment variable reference or reports `secure-storage-unavailable`.

## 6. Agent Chat Integration

1. Open a slide page.
2. Confirm the settings gear remains in the top-right corner beside the existing Present/Share toolbar controls.
3. Open the gear quick switcher and verify it shows the current mode summary, Local CLI/API choices, `CODE AGENT`, `MODEL`, Rescan PATH, Settings, and Back to projects.
4. Switch the active code agent or Local CLI/API mode where configured.
5. Change model and reasoning values where supported.
6. Confirm `Settings` opens the full modal to `Execution & model`.
7. Confirm `Back to projects` returns to the slide library.
8. Confirm no raw API key, credential reference, environment value, hidden path content, or full local path appears in the menu.

Expected result: creators can quickly change active execution settings from the slide page without opening a separate agent chat or leaving the deck workspace.

## 7. Agent Chat Integration

1. Open `specs/005-agent-chat-ui` chat entry with no connection.
2. Verify the chat can open the same settings modal to `Execution & model`.
3. Configure a ready connection.
4. Verify 005 session bootstrap receives the same safe active connection snapshot, model preference, reasoning preference, and capability flags shown in the slide-page quick switcher.
5. Start a chat run and confirm 005 still owns workflow labels, proposal preview, apply, and audit.

Expected result: 006 supplies connection execution; 005 supplies in-app slide workflow behavior.

## 8. Security and Recovery

Simulate:

- Missing executable.
- Invalid manual path.
- User denies scan.
- Secure storage unavailable.
- Invalid/expired API key.
- Provider quota/rate limit.
- Unsupported model.
- Timeout.
- Offline provider.

Expected result: each case has a categorized error, redacted diagnostics, and actionable recovery.

## 9. Focused Tests

Recommended implementation test areas:

- `agent-connections.test.ts`: schema, safe snapshots, capability flags.
- `agent-discovery.test.ts`: bounded scan and candidate states.
- `agent-connection-storage.test.ts`: project-safe settings and secret reference handling.
- `agent-secrets.test.ts`: credential storage fallback and redaction.
- `agent-connection-adapters.test.ts`: adapter execution, streaming, cancellation, and error mapping.
- `agent-connections-api.test.ts`: route validation and no-secret responses.
- `agent-connection-state.test.ts`: first-run setup, modal state, scan/test states.

## Final Gates

Run before implementation completion:

```bash
pnpm check
pnpm typecheck
pnpm test
pnpm build
```

Because implementation changes `packages/core`, add a patch changeset before completion.
