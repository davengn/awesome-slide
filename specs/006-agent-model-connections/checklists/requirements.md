# Requirements Checklist: Agent and Model Connection Options

**Purpose**: Validate that the connection requirements are complete, clear, consistent with 005, secure, and ready for implementation planning.
**Created**: 2026-05-29
**Feature**: [spec.md](../spec.md)

**Note**: This checklist is generated for the refined 006 plan and should stay aligned with `specs/005-agent-chat-ui`.

## Requirement Completeness

- [x] CHK001 Are all required connection entry points covered: agent chat, project settings, slide page quick switcher, slide library first-run setup, and failed-connection states? [Spec FR-001]
- [x] CHK002 Are supported connection types complete for auto-scanned local agent, manual agent path, and API key model provider? [Spec FR-003]
- [x] CHK003 Is first-run slide library behavior explicitly defined when no valid connection exists? [Spec FR-016, FR-017]
- [x] CHK004 Are Test, Rescan, switch, set default, disable, remove, and credential deletion flows covered? [Spec FR-010, FR-011, FR-015, FR-019]
- [x] CHK005 Are local-agent candidate states covered for installed, not installed, incompatible, and needs manual path? [Spec FR-020]

## Requirement Clarity

- [x] CHK006 Is auto-scan clearly opt-in and bounded to safe locations rather than full-disk scanning? [Spec FR-004, FR-018]
- [x] CHK007 Is manual path validation specific enough to implement executable, command, and project path cases? [Spec FR-006]
- [x] CHK008 Is BYOK credential handling clear about secure storage and non-secret project metadata? [Spec FR-008, FR-009]
- [x] CHK009 Is the Open Design settings reference translated into implementable modal anatomy? [Spec UX-011, UX-012]
- [x] CHK010 Are "do later" and scan denial clearly non-blocking states? [Spec FR-017, Data Model FirstRunConnectionSetup]

## 005 Alignment

- [x] CHK011 Is the boundary clear that 006 owns discovery, credentials, provider execution, and capability flags? [Plan Summary]
- [x] CHK012 Is the boundary clear that 005 owns context, `packages/core/skills`, preview/apply, validation, and audit? [Spec Non-Goals, Plan Summary]
- [x] CHK013 Does 006 expose safe active connection metadata that 005 can use before run startup? [Spec FR-012, FR-022, Contracts]
- [x] CHK014 Are capability flags defined so 005 can enable or degrade streaming, cancellation, structured proposals, and write-capable workflows? [Spec FR-023, Data Model ConnectionCapabilities]
- [x] CHK015 Can 005 open the same settings modal from no-connection, degraded, failed, and offline states? [Spec FR-021]

## Scenario Coverage

- [x] CHK016 Is the happy path covered for first-run auto-scan and candidate activation? [Quickstart 3]
- [x] CHK017 Is the happy path covered for manual path validation and activation? [Quickstart 4]
- [x] CHK018 Is the happy path covered for BYOK provider setup and testing? [Quickstart 5]
- [x] CHK019 Are recovery paths covered for missing executable, invalid path, expired key, quota/rate limit, unsupported model, incompatible protocol, offline state, and timeout? [Spec FR-014]
- [x] CHK020 Is connection removal and credential deletion covered with confirmation? [Spec UX-009, Contract DELETE]

## UI and Accessibility

- [x] CHK021 Does the modal require labels, visible focus, keyboard navigation, and accessible error announcements? [Spec UX-014, Settings UI Contract]
- [x] CHK022 Does the design avoid emoji icons, layout-shifting hover, low contrast disabled text, and marketing-style layout? [Spec UX-015]
- [x] CHK023 Are responsive breakpoints covered for 375px, 768px, 1024px, and 1440px? [Spec NFR-006]
- [x] CHK024 Does the UI keep slide library usable when setup is dismissed or postponed? [Spec UX-013]
- [x] CHK025 Are Test and Rescan controls visible in the Local CLI settings flow? [Spec FR-019, UX-012]
- [x] CHK041 Is the slide-page quick switcher defined with a top-right settings gear, current mode summary, code agent list, model/reasoning controls, Rescan PATH, Settings, and Back to projects? [Spec FR-025, FR-026, UX-016]
- [x] CHK042 Does the quick switcher keep the settings gear as the rightmost toolbar control and avoid leaking credentials or raw local paths? [Spec FR-027, UX-017]

## Security and Privacy

- [x] CHK026 Are raw API keys excluded from project files, browser session history, chat context, diagnostics, and audit? [Spec FR-008, FR-022, NFR-005]
- [x] CHK027 Are env values and command output redacted before display or copy? [Spec Technical Considerations]
- [x] CHK028 Does scan consent state avoid silently enabling scans after dismiss? [Spec FR-017]
- [x] CHK029 Is secure-storage fallback behavior visible and user-facing? [Spec FR-008, UX-003]
- [x] CHK030 Does the connection test avoid sending slide source or bulky context? [Contracts Connection Runtime]

## Non-Functional Requirements

- [x] CHK031 Are first-run status, scan, manual validation, modal responsiveness, and redaction performance/security requirements measurable? [Spec NFR-001..NFR-006]
- [x] CHK032 Are long-running scans cancellable and non-blocking? [Spec NFR-004]
- [x] CHK033 Are settings persistence expectations documented across reloads and project switches? [Spec FR-024, Quickstart 5]

## Dependencies and Assumptions

- [x] CHK034 Is implementation scope tied to `packages/core` and existing app/middleware patterns? [Plan Project Structure]
- [x] CHK035 Is the patch changeset requirement captured for `@awesome-slide/core` changes? [Plan Constitution Check, Quickstart Final Gates]
- [x] CHK036 Are `$ui-ux-pro-max` and `$frontend-design` included for design/implementation phases as requested? [Plan Constraints, Quickstart Prerequisites]

## Ambiguities and Conflicts

- [x] CHK037 Are all planning unknowns resolved in the plan artifacts? [Plan]
- [x] CHK038 Are terms used consistently across spec, data model, contracts, and quickstart? [Traceability]
- [x] CHK039 Does 006 avoid redefining provider-specific prompt optimization or skill workflow prompts? [Spec Non-Goals]
- [x] CHK040 Does the Open Design reference requirement avoid copying unrelated brand styling? [Spec Non-Goals, Research]
