# Specification: In-App Agent Chat

## Status

Planning

## Product Vision Alignment

Awesome Slide should let users collaborate with agents inside the slide workflow rather than leaving the app to run commands. The agent chat must feel contextual, inspectable, reversible, and respectful of local project files.

## Problem Statement

Agent-assisted slide editing is currently conceptually tied to external skills or backend commands. Users need an in-app chat panel where they can ask for content improvements, layout redesigns, theme changes, and edits to selected slide elements while seeing what will change before applying it. Without preview/apply behavior, agent edits can feel risky and opaque. The current implementation also allows prompt submission to appear stuck in a pending state, which blocks further work and makes the chat feel unreliable.

## Goals

- Provide an agent chat panel inside the Awesome Slide UI.
- Allow users to prompt the agent using current deck, slide, selection, metadata, and theme context.
- Support common slide tasks: edit copy, improve structure, redesign layouts, apply themes, fix visual hierarchy, and modify selected slide elements.
- Require preview/apply behavior for file-changing actions.
- Define loading, streaming, error, retry, cancellation, and undo expectations.
- Make agent behavior depend on the active connection selected in the agent/model connection spec.
- Prevent submitted prompts from staying pending forever; every accepted prompt must visibly progress, fail with recovery actions, or enter review.
- Match the Open Design-style agent workspace reference: app-integrated chat rail, clear turn/status cards, visible generated files, and a pinned composer.

## Non-Goals

- Do not build the local agent discovery or API key management UI in this spec.
- Do not allow silent autonomous file writes without user review.
- Do not define every model provider protocol; connection adapters are covered by `specs/006-agent-model-connections`.
- Do not require collaborative multi-user chat history or cloud sync.
- Do not replace manual slide editing.

## User Stories

### User Story 1 - Current Slide Chat (Priority: P1)

As a creator, I want to ask the agent to improve the current slide so I can iterate faster without leaving the app.

### User Story 2 - Context-Aware Prompting (Priority: P1)

As a creator, I want the agent to understand which slide or deck I am working on so prompts can be short and contextual.

### User Story 3 - Layout and Theme Preview (Priority: P2)

As a designer, I want to ask for layout and theme changes and preview them before applying.

### User Story 4 - Deck Narrative Improvements (Priority: P2)

As a presenter, I want to ask for content tightening or narrative flow improvements across a deck.

### User Story 5 - Selective Review and Apply (Priority: P1)

As a cautious user, I want to see proposed changes, reject them, or apply only selected edits.

### User Story 6 - Connection Failure Recovery (Priority: P2)

As a user with a failing agent connection, I want clear errors and recovery actions.

## Functional Requirements

- FR-001: The app must include an agent chat panel that can be opened from the main slide workspace and slide management UI.
- FR-002: The chat panel must identify the active context: current slide, selected slide elements where supported, current deck/folder, current theme, and relevant metadata.
- FR-003: Users must be able to send freeform prompts and choose suggested contextual actions.
- FR-004: Suggested actions must include at least improve copy, shorten content, redesign layout, apply theme, generate speaker notes, fix alignment, and create related slide.
- FR-005: The chat must show the active agent/model connection and provide a route to connection settings when no valid connection is available.
- FR-006: The chat must support visible request-starting, queued, loading, streaming, completed, cancelled, failed, and needs-review states, and must release the composer when a run reaches failed, cancelled, completed, or needs-review.
- FR-007: File-changing responses must produce a preview artifact before application. The preview may be a code diff, rendered slide preview, structured operation list, or a combination.
- FR-008: Users must be able to apply all changes, apply selected changes when the selected operations are valid and conflict-free, reject changes, retry the prompt, or refine the result.
- FR-009: Applied changes must update the slide source and refresh the viewer or slide management UI.
- FR-010: The app must maintain a short local session history for the current project without retaining bulky generated artifacts unnecessarily.
- FR-011: Errors must be categorized as connection unavailable, authentication failed, model refused or failed, timeout, invalid agent output, patch conflict, validation failure, and write failure.
- FR-012: The chat must support cancellation for long-running requests and must not apply partial edits after cancellation.
- FR-013: The agent must not receive hidden files, secret values, or unrelated project files unless the user explicitly expands context.
- FR-014: The agent must be able to reference default and user-added themes when the user requests theme application or redesign.
- FR-015: The chat must expose a deterministic audit trail for applied changes through a visible history or audit control, including prompt, selected context summary, proposed changes, applied files, timestamp, and agent/model used.
- FR-016: Local session history must be bounded to the most recent 50 visible messages or 256KB serialized size, whichever limit is reached first; audit records are stored separately and never retain raw secret-bearing payloads.
- FR-017: When no inspected element selection exists, selected-element context must be shown as unavailable or disabled and must not send an empty or misleading selection payload.
- FR-018: Broad or dangerous edits must include deletes, deck-wide rewrites, multi-slide edits, broad theme replacement, and raw patches outside the active slide; these edits require a double-confirmation modal that summarizes affected files and operations before apply.
- FR-019: Static or read-only builds may show the chat in read-only/no-connection mode, but must block file-changing runs and proposal apply actions.
- FR-020: Empty decks, missing slides, parse-error slides, unsupported metadata formats, and read-only source states must produce categorized non-writing states that block write-capable execution or proposal apply while preserving prompt text, keeping chat navigation usable, and exposing recovery actions.
- FR-021: Context collection must visibly truncate oversized source excerpts, speaker notes, rendered snapshots, or deck metadata rather than silently exceeding context budgets.
- FR-022: A session must prevent multiple simultaneous active runs; users can cancel, retry after terminal state, or keep the next prompt as a draft before starting another run.
- FR-023: Partial selected apply must report success only when every selected operation succeeds; failed writes must surface as failed transactions, not partial success.
- FR-024: Proposals must become expired or conflict when the relevant source, deck, theme, or metadata changes after proposal generation and before apply.
- FR-025: Run creation, adapter startup, stream connection, stream replay, and terminal-event handling must be guarded so a prompt cannot leave the UI in an indefinite pending or disabled state.
- FR-026: Agent turns must support status/tool cards and file-artifact summaries so users can inspect running work, completed outputs, and files generated or modified from the current turn.

## UX Requirements

- UX-001: The chat should be available as an Open Design-style desktop rail beside the slide workspace and as a drawer on narrower screens.
- UX-002: The desktop rail must keep the slide preview visible by default and may resize the preview area rather than overlaying it.
- UX-003: Context chips must make it clear what the agent can see, such as `Current slide`, `Selected elements`, `Deck`, `Theme`, and `Speaker notes`.
- UX-004: Users must be able to add or remove context before sending a prompt.
- UX-005: Loading states should show progress copy and preserve prior messages.
- UX-006: Streaming responses should separate explanation from proposed file changes.
- UX-007: Preview/apply controls must be visually distinct from normal chat actions.
- UX-008: Dangerous or broad edits must show the double-confirmation modal, especially deck-wide rewrites, deletes, or theme replacement.
- UX-009: Error states must include retry, edit prompt, change connection, and copy diagnostics actions where relevant.
- UX-010: The panel must support keyboard navigation, visible focus states, and screen-reader labels for messages, controls, and preview actions.
- UX-011: The desktop rail must include Chat and Comments tabs, compact message turns, clear running/done/error status cards, a generated-files tray when files are produced, and a composer pinned to the bottom.
- UX-012: Loading and error states must appear inline in the related turn or composer area rather than only logging to the console.

## Technical Considerations

- The chat UI should be connection-agnostic and call a local agent/model adapter interface defined by `specs/006-agent-model-connections`.
- Context collection should be explicit and bounded. A likely model is a `ChatContext` object containing slide ID, metadata, selected element descriptors, deck/folder IDs, theme IDs, and a limited source excerpt or rendered snapshot.
- Proposed edits should be represented as structured operations when possible, with raw patch fallback only when necessary.
- TSX slide edits should be validated before apply through TypeScript parsing, project typecheck where feasible, or a lighter syntax validation path for fast feedback.
- Preview rendering should reuse existing `SlideCanvas` and slide loading behavior to compare before/after.
- Applied changes should integrate with dev server file watching so the current slide updates without a manual restart where possible.
- Local chat history should be project-scoped and either ignored by git by default or stored only when the user opts in.
- The UI should treat agent output as untrusted until parsed, validated, and explicitly applied.

## Acceptance Criteria

- AC-001: Users can open an agent chat panel from the slide workspace.
- AC-002: The panel clearly shows current context and lets users adjust it before prompting.
- AC-003: Users can send prompts for slide editing, content improvement, layout redesign, and theme application.
- AC-004: File-changing responses produce a preview before any write occurs.
- AC-005: Users can apply, reject, retry, cancel, and refine proposed edits.
- AC-006: Failed requests show categorized errors and recovery actions.
- AC-007: Applied edits refresh the affected slide or deck view.
- AC-008: Broad or destructive agent edits require confirmation.
- AC-009: The chat never sends stored API keys or unrelated secret files as prompt context.
- AC-010: The chat UI follows the Awesome Slide design system and accessibility expectations.
- AC-011: Static/read-only builds show the chat entry point but block write-capable runs and proposal apply actions.
- AC-012: Users cannot start two active runs in the same session; cancel or terminal state is required before a new run starts.
- AC-013: Stale proposals caused by independent source or metadata changes cannot be applied until refreshed or retried.
- AC-014: Edge states for empty decks, missing slides, parse errors, unsupported metadata, and read-only files are visible and non-destructive.
- AC-015: If run creation, SSE connection, adapter startup, or replay fails, the prompt remains visible, the assistant turn moves to failed with recovery actions, and the composer is usable again.
- AC-016: The desktop chat rail visually matches the supplied Open Design reference anatomy while using Awesome Slide colors, typography, icons, and accessibility conventions.

## Non-Functional Requirements

- NFR-001: Context collection for a normal single-slide prompt should complete within 200ms after the local dev server has finished initial compilation.
- NFR-002: Common single-slide proposal validation should complete within 200ms before enabling apply controls.
- NFR-003: A queued run should emit an initial visible status or streamed event within 500ms after the local runtime accepts it.
- NFR-004: Preview rendering must keep cancel, reject, and apply controls responsive while before/after artifacts are prepared.
- NFR-005: Diagnostics copy and audit persistence must redact `.env*`, hidden-file contents, credential-like values, and raw provider secrets.
- NFR-006: The UI must render the submitted user prompt and a cancellable queued/status turn within 100ms of local submit, and any accepted run that has no event or heartbeat within the configured timeout must fail with recovery actions.

## Dependencies and Assumptions

- The active connection adapter, connection settings route, credential lookup, and provider-specific protocols are owned by `specs/006-agent-model-connections`.
- The implementation reuses existing Awesome Slide slide canvas, slide management, theme discovery, guarded mutation, and Vite middleware patterns in `packages/core`.
- Implementing this feature changes `@awesome-slide/core`, so the implementation phase must include a patch changeset before completion.
- The run lifecycle is adapter-backed with watchdog timeouts, replay-safe SSE, and terminal-event cleanup; simulated timers are acceptable only in tests or explicit demo fixtures.
- Proposal ingestion and apply routes invoke the shared proposal validator and compare source/deck/theme fingerprints captured at proposal generation time.

## Implementation Phases

### Phase 1: Interaction Contract

- Define chat message states, context object, action taxonomy, preview artifact format, and audit trail fields.
- Define how chat invokes the active connection adapter.
- Define security limits for context collection.

### Phase 2: Chat Panel UI

- Build the Open Design-style chat rail, message list, turn status cards, generated-files tray, composer, context chips, suggested actions, loading states, and error states.
- Add responsive drawer behavior and keyboard navigation.
- Connect no-connection state to connection settings.

### Phase 3: Preview and Apply Pipeline

- Implement structured edit proposal rendering.
- Add diff and rendered preview flows.
- Validate proposed TSX and metadata changes before apply.
- Add apply, reject, selected apply, retry, refine, and cancel behavior.

### Phase 4: Slide and Theme Integration

- Feed current slide/deck/theme context into prompts.
- Support theme application and selected-element edits.
- Refresh slide previews and management metadata after apply.

### Phase 5: Reliability and Safety

- Add tests for state transitions, error categorization, cancellation, validation failures, and apply behavior.
- Add security checks around context redaction.
- Add regression tests for stuck pending submissions, SSE disconnects, terminal cleanup, proposal validation before apply, and source-change conflicts.
- Verify accessibility and responsive behavior.
