# Contract: Connection Settings UI

## Scope

Defines the expected first-run slide-library setup and settings modal behavior for 006. The visual reference is the supplied Open Design settings screenshot, adapted to Awesome Slide tokens and accessibility rules.

## Entry Points

- Slide library first open when no valid active connection and no setup preference exists.
- Agent chat no-connection banner from `specs/005-agent-chat-ui`.
- Agent chat degraded, failed, or offline recovery actions.
- Slide page top-right settings gear quick switcher.
- Project/settings command or gear entry from the app shell or slide management surface.

All full settings entry points open the settings modal to `Execution & model`. The slide page settings gear first opens the compact quick switcher, whose `Settings` row opens the full modal to `Execution & model`.

## First-Run Slide Library Setup

Required actions:

- `Auto-scan local agents`
- `Specify agent path`
- `Use BYOK provider`
- `Do later`

Rules:

- The setup prompt is non-blocking and dismissible.
- `Auto-scan local agents` opens the settings modal to Local CLI and requires an explicit confirmation before scanning.
- `Specify agent path` opens the modal to the manual path form.
- `Use BYOK provider` opens the modal to BYOK.
- `Do later` records dismissal and does not enable scan.

## Modal Anatomy

Required structure:

- Modal overlay with visible close button.
- Header eyebrow `Settings`.
- Title `Execution & model`.
- Short helper copy explaining Local CLI and BYOK.
- Left navigation rail with compact category rows. Required first item: `Configure execution mode`.
- Main content area with Local CLI/BYOK segmented control.
- Test and Rescan controls near Local CLI status.
- Scrollable content area when vertical space is limited.

Rules:

- Use lucide icons or existing icon system, not emoji icons.
- Cards and buttons must have stable hover/focus states without layout shift.
- Disabled and `not installed` states must meet contrast expectations.
- No marketing hero layout or decorative background effects.

## Slide Page Quick Switcher

Required structure:

- Top-right settings gear trigger in `packages/core/src/app/routes/slide.tsx`; it remains the rightmost toolbar control.
- Compact popover aligned to the gear trigger.
- Header summary with active provider mode and safe connection/model summary, for example `Local CLI` and `Codex CLI · codex-cli 0.13.4 · gpt-5.5`.
- Mode actions for `Use Local CLI` and `Use API · BYOK`, with the active mode marked.
- `CODE AGENT` section listing configured local/code-agent connections with version and selected state.
- `MODEL` section with model select and reasoning select when the active provider supports those options.
- `Rescan PATH` action.
- `Settings` action that opens the full settings modal to `Execution & model`.
- `Back to projects` action that returns to the slide library.

Rules:

- The quick switcher uses only safe display metadata from 006 bootstrap/settings responses.
- Switching mode, agent, model, or reasoning updates the active connection snapshot for subsequent 005 runs.
- The menu must not display raw API keys, credential references, raw environment values, hidden path contents, or full local paths.
- `Rescan PATH` requires explicit selection and must not start automatically when the menu opens.
- Keyboard users can open, navigate, change selects, close with Escape, and return focus to the gear trigger.
- The popover must fit at 375px width without clipped labels or horizontal page scroll.

## Local CLI Tab

Required fields:

- Detected candidates.
- Installed/not-installed/incompatible/needs-manual-path state.
- Version when available.
- Source location label.
- Selected active state.
- Test action.
- Rescan action.
- Add approved directory action.
- Manual path entry action.

Rules:

- Candidates are inactive until selected.
- Scan progress is visible and cancellable.
- Rescan does not remove manual paths or BYOK settings.

## BYOK Tab

Required fields:

- Provider select.
- Model select or model ID field.
- API key input with paste, show/hide, and validation.
- Storage mode indicator.
- Test action.
- Save action.

Rules:

- Saved keys are never displayed in full.
- Provider-specific key hints must not encourage users to paste keys into project files.
- Secure-storage fallback warnings must be visible when relevant.

## Manual Path Form

Required fields:

- Path or command input.
- Optional browse action only when the current runtime can safely return a local path.
- Kind selector: executable, command, project path.
- Validate action.
- Validation result with status, version/protocol when available, and recovery instructions.

Rules:

- Direct path entry is always available and is the fallback when browse support is absent.
- Placeholder-only labels are invalid; fields need associated labels.
- Validation errors use accessible error text and are announced.
- Activation is disabled until validation passes or passes with acknowledged warning.

## Accessibility and Responsiveness

Requirements:

- Tab order follows visible order.
- Escape closes the modal unless a nested confirmation is active.
- Focus returns to the trigger after close.
- Icon-only buttons have accessible names.
- Error messages use `role="alert"` or equivalent live region behavior.
- Layout works at 375px, 768px, 1024px, and 1440px.
- No horizontal page scroll.
- Primary actions remain visible or reachable without clipped labels.
