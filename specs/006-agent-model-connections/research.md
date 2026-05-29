# Research: Agent and Model Connection Options

## Decision: Keep 006 as the connection and execution boundary for 005

Rationale: `specs/005-agent-chat-ui` already owns slide context, bundled `packages/core/skills` workflow selection, proposal validation, preview/apply, and audit. 006 should provide only active connection metadata, credentials, capability flags, and execution adapters. This keeps provider details out of chat UI and prevents a second prompt/workflow system.

Alternatives considered:

- Let 005 own providers directly. Rejected because credential storage, discovery, and provider status would leak across chat components.
- Make 006 select slide-authoring skills. Rejected because 005 is the feature that understands prompt intent, slide context, and proposal semantics.

## Decision: Show first-run setup from the slide library page

Rationale: The slide library is where users create and manage decks. If no connection exists, prompt-based slide creation and the 005 chat entry can look broken. A first-run setup prompt gives users a direct path to `Auto-scan local agents`, `Specify agent path`, `Use BYOK provider`, or `Do later` before they hit a failed chat run.

Alternatives considered:

- Only show setup after a failed chat run. Rejected because it makes the first prompt fail before explaining setup.
- Auto-scan silently on first load. Rejected because scanning must be opt-in and bounded.
- Block the entire slide library until setup. Rejected because manual slide management should remain usable without an agent connection.

## Decision: Use an Open Design-style settings modal anatomy

Rationale: The supplied reference has the right pattern for this feature: modal overlay, left navigation, `Execution & model` page, Local CLI/BYOK segmented choice, compact agent cards, and Test/Rescan controls. This shape is efficient for developer-tool settings and maps directly to Awesome Slide's need for multiple connection categories.

Alternatives considered:

- A full settings route. Rejected for first release because chat and slide-library recovery need a focused overlay that does not force navigation away.
- A small popover. Rejected because local scan directories, manual path validation, BYOK setup, and diagnostics require more room and keyboard structure.

## Decision: Add a slide-page quick switcher anchored to the settings gear

Rationale: The slide page is where creators evaluate and iterate on the deck. Switching from Codex CLI to BYOK, changing a code agent, or changing model/reasoning should not require leaving the slide workspace or opening the full settings modal. A compact top-right menu matching the supplied reference gives fast operational control while preserving the full modal for setup, validation, diagnostics, and credentials.

Alternatives considered:

- Put model switching only in the full settings modal. Rejected because frequent model/agent changes would interrupt slide review and chat iteration.
- Add a separate toolbar button next to the settings icon. Rejected because the reference and existing toolbar hierarchy favor one settings gear at the top-right corner.
- Let agent chat own the model switcher. Rejected because the active connection also affects prompt-based slide creation and should remain a shared 006 setting.

## Decision: Bound local agent discovery to known command locations and user-approved directories

Rationale: Full-disk scans are slow, noisy, and privacy-sensitive. Known CLI names, PATH lookup, current project metadata, common install paths, and explicit user directories cover the useful cases without surprising users.

Alternatives considered:

- Full home directory scan. Rejected for performance and privacy.
- PATH-only discovery. Rejected because many users install tools in predictable app directories or custom locations.
- Manual path only. Rejected because local-first users expect installed tools such as Codex CLI or Claude Code to be detected.

## Decision: Treat manual agent path setup as validation-first

Rationale: Users may paste an executable, command, or project path. The runtime should validate existence, runnable status, version/protocol support where available, and compatibility before activation. This avoids arbitrary execution before the user confirms and gives clear recovery.

Alternatives considered:

- Trust the path and fail during chat run. Rejected because it pushes fixable setup errors into 005 run failures.
- Require executable files only. Rejected because some agents are launched through commands or project directories.

## Decision: Store BYOK secrets outside project files

Rationale: Project files can be shared or committed. They may store non-secret provider names, model IDs, aliases, defaults, and credential reference IDs, but raw API keys must live in OS credential storage where available, with env-var fallback and clear warnings when secure storage is unavailable.

Alternatives considered:

- Store encrypted keys in the project. Rejected because project-scoped files can still be copied or committed and encryption key management adds complexity.
- Environment variables only. Rejected because browser-first setup needs a guided path for users who do not want shell setup.

## Decision: Use capability flags instead of provider-specific UI coupling

Rationale: 005 needs to know whether the active connection supports streaming, cancellation, structured proposals, local file operations, and write-capable slide workflows. Capability flags let chat block or degrade behavior without knowing provider details.

Alternatives considered:

- Hard-code provider names in 005. Rejected because provider additions would require chat UI changes.
- Assume all connections support every capability. Rejected because BYOK models and local CLIs differ.

## Decision: Normalize errors into user-fixable categories

Rationale: Connection errors must guide recovery. Categories such as `missing-executable`, `invalid-path`, `scan-denied`, `secure-storage-unavailable`, `authentication-failed`, `quota-rate-limit`, `unsupported-model`, `incompatible-protocol`, and `timeout` let settings and 005 show specific actions.

Alternatives considered:

- Surface raw stderr/provider errors. Rejected because they can expose secrets and are often not actionable.
- Collapse everything into `connection failed`. Rejected because users need to know whether to rescan, edit path, change key, choose a model, or retry later.

## Decision: Apply dense developer-tool UI guidance

Rationale: `$ui-ux-pro-max` guidance emphasized accessibility basics for errors, labels, contrast, and keyboard navigation. `$frontend-design` guidance favors a deliberate visual direction. For this feature, the appropriate direction is quiet, dense, and utilitarian: compact rows, clear state markers, no emoji icons, no marketing copy, no gradient decoration, stable hover states, and responsive controls that do not clip.

Alternatives considered:

- Use a bold marketing-style settings page. Rejected because this is a repeated-use developer configuration surface.
- Copy the screenshot literally. Rejected because Awesome Slide needs its own tokens, typography, and accessibility conventions.
