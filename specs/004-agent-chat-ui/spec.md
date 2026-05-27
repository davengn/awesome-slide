# Specification: In-App Agent Chat

## Status

Planning

## Product Vision Alignment

Awesome Slide should let users collaborate with agents inside the slide workflow rather than leaving the app to run commands. The agent chat must feel contextual, inspectable, reversible, and respectful of local project files.

## Problem Statement

Agent-assisted slide editing is currently conceptually tied to external skills or backend commands. Users need an in-app chat panel where they can ask for content improvements, layout redesigns, theme changes, and edits to selected slide elements while seeing what will change before applying it. Without preview/apply behavior, agent edits can feel risky and opaque.

## Goals

- Provide an agent chat panel inside the Awesome Slide UI.
- Allow users to prompt the agent using current deck, slide, selection, metadata, and theme context.
- Support common slide tasks: edit copy, improve structure, redesign layouts, apply themes, fix visual hierarchy, and modify selected slide elements.
- Require preview/apply behavior for file-changing actions.
- Define loading, streaming, error, retry, cancellation, and undo expectations.
- Make agent behavior depend on the active connection selected in the agent/model connection spec.

## Non-Goals

- Do not build the local agent discovery or API key management UI in this spec.
- Do not allow silent autonomous file writes without user review.
- Do not define every model provider protocol; connection adapters are covered by `specs/005-agent-model-connections`.
- Do not require collaborative multi-user chat history or cloud sync.
- Do not replace manual slide editing.

## User Stories

- As a creator, I want to ask the agent to improve the current slide so I can iterate faster without leaving the app.
- As a creator, I want the agent to understand which slide or deck I am working on so prompts can be short and contextual.
- As a designer, I want to ask for layout and theme changes and preview them before applying.
- As a presenter, I want to ask for content tightening or narrative flow improvements across a deck.
- As a cautious user, I want to see proposed changes, reject them, or apply only selected edits.
- As a user with a failing agent connection, I want clear errors and recovery actions.

## Functional Requirements

- FR-001: The app must include an agent chat panel that can be opened from the main slide workspace and slide management UI.
- FR-002: The chat panel must identify the active context: current slide, selected slide elements where supported, current deck/folder, current theme, and relevant metadata.
- FR-003: Users must be able to send freeform prompts and choose suggested contextual actions.
- FR-004: Suggested actions must include at least improve copy, shorten content, redesign layout, apply theme, generate speaker notes, fix alignment, and create related slide.
- FR-005: The chat must show the active agent/model connection and provide a route to connection settings when no valid connection is available.
- FR-006: The chat must support loading, queued, streaming, completed, cancelled, failed, and needs-review states.
- FR-007: File-changing responses must produce a preview artifact before application. The preview may be a code diff, rendered slide preview, structured operation list, or a combination.
- FR-008: Users must be able to apply all changes, apply selected changes where feasible, reject changes, retry the prompt, or refine the result.
- FR-009: Applied changes must update the slide source and refresh the viewer or slide management UI.
- FR-010: The app must maintain a short local session history for the current project without exposing secrets or large generated artifacts unnecessarily.
- FR-011: Errors must be categorized as connection unavailable, authentication failed, model refused or failed, timeout, invalid agent output, patch conflict, validation failure, and write failure.
- FR-012: The chat must support cancellation for long-running requests and must not apply partial edits after cancellation.
- FR-013: The agent must not receive hidden files, secret values, or unrelated project files unless the user explicitly expands context.
- FR-014: The agent must be able to reference default and user-added themes when the user requests theme application or redesign.
- FR-015: The chat must expose a deterministic audit trail for applied changes: prompt, selected context summary, proposed changes, applied files, timestamp, and agent/model used.

## UX Requirements

- UX-001: The chat panel should be available as a right-side panel on desktop and a drawer on narrower screens.
- UX-002: The panel should not cover the slide preview by default on desktop.
- UX-003: Context chips must make it clear what the agent can see, such as `Current slide`, `Selected elements`, `Deck`, `Theme`, and `Speaker notes`.
- UX-004: Users must be able to add or remove context before sending a prompt.
- UX-005: Loading states should show progress copy and preserve prior messages.
- UX-006: Streaming responses should separate explanation from proposed file changes.
- UX-007: Preview/apply controls must be visually distinct from normal chat actions.
- UX-008: Dangerous or broad edits must show stronger confirmation, especially deck-wide rewrites, deletes, or theme replacement.
- UX-009: Error states must include retry, edit prompt, change connection, and copy diagnostics actions where relevant.
- UX-010: The panel must support keyboard navigation, visible focus states, and screen-reader labels for messages, controls, and preview actions.

## Technical Considerations

- The chat UI should be connection-agnostic and call a local agent/model adapter interface defined by the connection spec.
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

## Implementation Phases

### Phase 1: Interaction Contract

- Define chat message states, context object, action taxonomy, preview artifact format, and audit trail fields.
- Define how chat invokes the active connection adapter.
- Define security limits for context collection.

### Phase 2: Chat Panel UI

- Build the panel shell, message list, composer, context chips, suggested actions, loading states, and error states.
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
- Verify accessibility and responsive behavior.
