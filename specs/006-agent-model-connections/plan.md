# Implementation Plan: Agent and Model Connection Options

**Branch**: `codex/006-agent-model-connections-plan` | **Date**: 2026-05-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-agent-model-connections/spec.md`

## Summary

Build the connection and settings layer for in-app agent execution in `@awesome-slide/core`. The feature adds a first-run slide-library setup entry, an Open Design-style `Execution & model` settings modal, a slide-page top-right quick switcher for agent/model/reasoning changes, bounded local agent discovery, manual agent path validation, BYOK provider setup, secure credential references, active connection selection, and a provider-neutral adapter consumed by `specs/005-agent-chat-ui`. 006 owns discovery, credentials, connection status, provider adapters, and connection settings; 005 owns prompt context, bundled `packages/core/skills` workflow selection, proposal validation, preview/apply, and audit.

## Current Gap Correction

The original 006 spec was directionally correct but incomplete for the upgraded in-app workflow:

- It did not define what happens when users first open the slide library with no active agent/model connection.
- It did not specify that users must be offered auto-scan, manual agent path setup, BYOK setup, and do-later choices before prompt-based slide creation appears broken.
- It described a generic settings UI but did not tie it to the supplied Open Design settings modal anatomy.
- It did not define the slide-page quick switcher shown in the reference, where users can change active local/API mode, code agent, model, and reasoning while keeping the settings gear in the top-right toolbar.
- It did not explicitly align the 006 adapter boundary with 005, where the chat runtime loads `packages/core/skills` workflows and needs only safe connection metadata plus execution capabilities.

The implementation plan treats those as required behavior, not polish.

## Technical Context

**Language/Version**: TypeScript 5.9 in strict mode, React 18, Node.js >=18.

**Primary Dependencies**: Existing `@awesome-slide/core` runtime dependencies: Vite 5 middleware, React Router, Tailwind CSS, shadcn/ui primitives, lucide-react icons, existing slide management route, existing agent chat components/contracts from `specs/005-agent-chat-ui`, and Node process APIs for local agent validation. No new runtime dependency is planned during the plan phase.

**Storage**: Project-local non-secret settings for active connection alias, provider/model IDs, scan consent, approved scan directories, and last safe status. User-local credential references and API keys prefer OS credential storage, with environment-variable reference fallback only; if neither safe path is available, the runtime reports `secure-storage-unavailable` rather than writing raw keys to local plain files. Browser-local first-run dismissal state for slide-library setup.

**Testing**: Vitest for connection schema, scan registry, manual path validation, status/error mapping, storage redaction, adapter contract, and UI state reducers. Runtime/manual checks for the settings modal at 375px, 768px, 1024px, and 1440px. Final gates use `pnpm check`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.

**Target Platform**: Awesome Slide local browser runtime served by the core Vite plugin. Static/read-only builds may show status and setup help but cannot validate local executable paths or store new credentials.

**Project Type**: pnpm + Turbo monorepo framework package; implementation is concentrated in `packages/core`.

**Performance Goals**: Slide-library first-run connection status should render within 200ms after initial dev-server compilation. The slide-page quick switcher should open from cached bootstrap/settings metadata within 150ms on a warm slide page, and active agent/model changes should show visible feedback within 500ms. Known-command scan results should appear within 2 seconds. Manual path validation should return feedback within 1 second for existing paths before any deeper protocol probe. Connection status must be available to 005 before run creation.

**Constraints**: No full-disk scanning. Auto-scan starts only after opt-in. No raw API keys, env values, hidden-file contents, or secret-like command output in project files, chat context, diagnostics copy, or browser session history. The settings modal and slide-page quick switcher must be accessible, keyboard navigable, and visually aligned with the Open Design-style settings reference while using Awesome Slide tokens. The slide-page settings gear remains the rightmost top toolbar control and opens the compact quick switcher; full settings remain available from inside that menu. UI implementation phases should use `$ui-ux-pro-max` for dense settings and accessibility checks, and `$frontend-design` for production-quality modal composition.

**Scale/Scope**: One connection subsystem spanning slide library entry, slide page quick switcher, agent chat recovery entry, settings modal, local discovery, manual paths, BYOK providers, adapter execution, secure storage references, and diagnostic/error normalization.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Plan Response |
|-----------|--------|---------------|
| I. Agent-Native by Design | PASS | The feature exists to make agent execution configurable for in-app slide authoring and explicitly serves 005 chat workflows. |
| II. Package Discipline | PASS | Work is scoped to `@awesome-slide/core`; implementation must include a patch changeset and avoid casual dependencies. |
| III. Clean Code Baseline | PASS | Plan uses existing app, middleware, and test patterns; generated shadcn UI files are not hand-edited. |
| IV. Monorepo Convention | PASS | Commands run from the repo root with pnpm/Turbo filters; source changes remain under `packages/core`. |
| V. Ship Small, YAGNI | PASS | Marketplace, full-disk scan, cloud account requirement, and provider-specific prompt optimization are out of scope. |

**Post-Design Recheck**: PASS. Research, data model, contracts, quickstart, and checklist keep provider integration bounded, keep secrets out of project files, and preserve the 005/006 ownership boundary.

## Project Structure

### Documentation (this feature)

```text
specs/006-agent-model-connections/
|-- spec.md
|-- plan.md
|-- research.md
|-- data-model.md
|-- quickstart.md
|-- checklists/
|   `-- requirements.md
`-- contracts/
    |-- adapter-contract.md
    |-- connection-runtime-contract.md
    `-- settings-ui-contract.md
```

### Source Code (repository root)

```text
packages/core/
|-- src/
|   |-- app/
|   |   |-- components/
|   |   |   |-- settings/
|   |   |   |   |-- SettingsModal.tsx
|   |   |   |   |-- SettingsNav.tsx
|   |   |   |   |-- ExecutionModelSettings.tsx
|   |   |   |   |-- LocalAgentCard.tsx
|   |   |   |   |-- ManualAgentPathForm.tsx
|   |   |   |   |-- ByokProviderForm.tsx
|   |   |   |   |-- QuickConnectionSwitcher.tsx
|   |   |   |   |-- ProjectSettingsEntry.tsx
|   |   |   |   `-- FirstRunAgentSetup.tsx
|   |   |   |-- agent-chat/
|   |   |   `-- slide-management/
|   |   |-- lib/
|   |   |   |-- agent-connections.ts
|   |   |   |-- agent-connections.test.ts
|   |   |   |-- agent-connection-client.ts
|   |   |   |-- agent-connection-state.ts
|   |   |   |-- agent-connection-state.test.ts
|   |   |   |-- agent-connection-storage.ts
|   |   |   |-- agent-connection-storage.test.ts
|   |   |   `-- agent-connection-types.ts
|   |   `-- routes/
|   |       |-- home.tsx
|   |       `-- slide.tsx
|   |-- http/
|   |   |-- agent-connections-api.ts
|   |   |-- agent-connections-api.test.ts
|   |   |-- agent-connection-adapters.ts
|   |   |-- agent-connection-adapters.test.ts
|   |   |-- agent-discovery.ts
|   |   |-- agent-discovery.test.ts
|   |   |-- agent-secrets.ts
|   |   `-- agent-secrets.test.ts
|   `-- vite/
|       `-- api-plugin.ts
`-- package.json

.changeset/
`-- <patch-changeset>.md
```

**Structure Decision**: Implement as a `packages/core` runtime capability because the slide library, agent chat, dev-server middleware, local process validation, and settings UI all live there. Documentation and contracts live under `specs/006-agent-model-connections/`.

## Phase 0 Research Output

Research is complete in [research.md](./research.md) with decisions for:

- 006/005 ownership boundary.
- First-run slide-library setup.
- Open Design-style settings modal anatomy.
- Slide-page quick switcher anchored to the top-right settings gear.
- Local agent discovery scope.
- Manual agent path validation.
- BYOK credential storage.
- Provider and local adapter registry.
- Capability flags for 005.
- Error taxonomy and recovery actions.
- UI/accessibility guidance from `$ui-ux-pro-max` and `$frontend-design`.

## Phase 1 Design Output

Design artifacts are complete:

- [data-model.md](./data-model.md): settings store, scan preference, local candidates, manual paths, BYOK providers, active connection selection, model/reasoning preferences, quick switcher state, capability flags, status/errors, first-run state, and adapter request/response shapes.
- [contracts/connection-runtime-contract.md](./contracts/connection-runtime-contract.md): bootstrap, settings state, scan, manual path validation, connection CRUD, active selection, test, remove credentials, and 005-safe active connection metadata.
- [contracts/adapter-contract.md](./contracts/adapter-contract.md): provider-neutral TypeScript execution contract consumed by 005.
- [contracts/settings-ui-contract.md](./contracts/settings-ui-contract.md): first-run slide-library entry, slide-page quick switcher, modal anatomy, Local CLI/BYOK behavior, manual path, BYOK form, accessibility, and responsive layout.
- [quickstart.md](./quickstart.md): validation loop for status bootstrap, first-run setup, scan, manual path, BYOK, slide-page quick switcher, agent chat integration, security, and final gates.
- [checklists/requirements.md](./checklists/requirements.md): completed requirements checklist for clarity, coverage, 005 alignment, UI reference, security, and edge cases.
- `AGENTS.md`: Spec Kit reference block points to `specs/006-agent-model-connections/plan.md`.

## Resolved Planning Assumptions

- The first-run slide-library setup is non-blocking and dismissible, but it must be visible when no valid connection or setup preference exists.
- Auto-scan never runs without user consent and never performs full-disk traversal.
- Manual agent paths may be executable files, runnable commands, or supported project paths, but must pass validation before activation.
- BYOK credentials are stored outside git-tracked project files; project settings retain only references and non-secret metadata.
- 005 receives safe active connection metadata and capability flags, while 006 performs credential lookup and provider/local process execution.
- 005 remains responsible for `packages/core/skills` workflow selection, prompt context, proposal validation, preview/apply, and audit.
- The slide page quick switcher is a compact operational menu, not the full settings modal. It provides fast active connection/model changes, Rescan PATH, Settings, and Back to projects while keeping the gear as the rightmost top toolbar control.
- The supplied screenshot is a settings modal anatomy reference; Awesome Slide tokens, lucide icons, accessible labels, and existing layout density are authoritative.

## Complexity Tracking

No constitution violations are present.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
