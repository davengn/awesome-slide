# Specification: Slide Management UI

## Status

Planning

## Product Vision Alignment

Awesome Slide should make slide creation and organization feel like a native part of the app. Users should not need to remember backend agent commands or manually inspect folder files to understand what slides exist, where they belong, and how to edit or reuse them.

## Problem Statement

The current creation flow is too agent-command oriented. Slide creation and management should be exposed as first-class UI workflows for browsing, creating, opening, editing, duplicating, deleting, organizing, and maintaining metadata for slides and decks. Existing folder and slide endpoints provide a starting point, but the app needs a coherent management surface that can grow into agent-assisted editing and theme workflows.

## Goals

- Replace direct "call an AI agent skill" creation affordances with a native slide creation flow.
- Provide a slide management interface for existing slides, draft slides, folders, decks, metadata, and organization.
- Support common operations: create, open, edit, duplicate, delete, rename, move, sort, filter, and search.
- Make metadata visible and editable without forcing users into source files.
- Align with Awesome Slide's redesigned UI system and leave clear integration points for in-app agent chat and theme selection.

## Non-Goals

- Do not build real-time multi-user collaboration in this feature.
- Do not replace the existing slide source format or runtime rendering model.
- Do not require a cloud backend.
- Do not implement full agent editing in this spec; agent prompts and preview/apply behavior are covered by `specs/003-agent-chat-ui`.
- Do not implement provider credentials or local model connection management in this spec; that is covered by `specs/004-agent-model-connections`.

## User Stories

- As a creator, I want to create a new slide from the app so I can start work without invoking an external command.
- As a creator, I want to view all existing slides with previews and metadata so I can quickly find the slide I need.
- As a creator, I want to edit slide metadata such as title, description, tags, theme, deck, and status without opening source files.
- As a creator, I want to duplicate a slide so I can reuse a structure without starting from scratch.
- As a creator, I want to delete slides with confirmation so I can clean up safely.
- As a creator, I want to organize slides into folders or decks so large projects remain navigable.
- As a keyboard-heavy user, I want search, shortcuts, and focus behavior to make management fast.

## Functional Requirements

- FR-001: The home or dashboard route must expose a primary "Create slide" action that opens an in-app creation flow.
- FR-002: The create flow must support at least blank slide, slide from existing theme/template, and slide from prompt entry points.
- FR-003: Prompt-based creation must route through an in-app workflow and not directly expose backend skill invocation as the primary UI.
- FR-004: The slide list must show slide title, stable slide ID, preview thumbnail when available, current folder/deck, theme when known, and modified status when known.
- FR-005: Users must be able to open a slide in viewer/editor mode from the management UI.
- FR-006: Users must be able to rename, duplicate, delete, and move slides between folders or decks.
- FR-007: Users must be able to edit metadata fields defined by the slide metadata model, including title, description, tags, theme, deck/folder, status, and notes where supported.
- FR-008: The management UI must support search by title, ID, tag, and folder/deck.
- FR-009: The management UI must support sorting by updated date, created date, title, and manual order where data is available.
- FR-010: The management UI must include empty states for no slides, no search results, no folder assignment, and loading failures.
- FR-011: Destructive actions must require confirmation and expose clear recovery guidance where recovery is available.
- FR-012: Duplicate actions must generate a valid unique slide ID and allow users to rename it before or immediately after creation.
- FR-013: Folder or deck organization changes must persist to the same source of truth used by dev mode and static builds.
- FR-014: The interface must detect when local file changes update the slide manifest and refresh without requiring a full app restart in dev mode where supported.
- FR-015: Errors from file writes, invalid IDs, duplicate IDs, parse failures, and server endpoint failures must be displayed inline with actionable copy.

## UX Requirements

- UX-001: The management UI should use a two- or three-zone layout: navigation/sidebar for folders and decks, central slide grid/list, and optional metadata inspector.
- UX-002: Slide previews must remain visually dominant in grid mode, while list mode prioritizes dense metadata scanning.
- UX-003: Creation should use a guided dialog or drawer with clear choices, not a raw text command surface.
- UX-004: The prompt-based create option should visually transition users into the agent chat or a focused prompt step with preview/apply behavior.
- UX-005: Metadata editing should be available from an inspector panel and from focused dialogs for longer fields.
- UX-006: Hover menus must not be the only way to access actions; keyboard and visible action entry points are required.
- UX-007: The UI must provide skeleton loading for slide grids and inline pending states for mutations.
- UX-008: Search and sort controls must be keyboard accessible and should not shift layout while results update.
- UX-009: Multi-select actions should be planned for bulk move/delete/tagging, even if the first release limits scope to single-slide actions.
- UX-010: Mobile and narrow layouts must collapse secondary panels into drawers while preserving create, search, open, and delete confirmation flows.

## Technical Considerations

- Existing app context already exposes `useFolders`, `renameSlide`, `duplicateSlide`, `deleteSlide`, `assign`, `draftSlides`, `slidesByFolder`, `titleMap`, and related folder state. The new UI should build on these contracts where possible.
- Current dev endpoints include folder and slide mutation patterns such as `/__folders`, `/__folders/assign`, `/__slides/:slideId`, and `/__slides/:slideId/duplicate`; the spec should consolidate these into an explicit management API contract before implementation.
- Slide metadata is currently represented in `packages/core/src/app/lib/sdk.ts` by `SlideMeta`; this will likely need extension for tags, status, notes, theme, and deck/folder metadata.
- Static builds may not support all management mutations. The UI must distinguish editable dev/project mode from read-only static mode.
- Manual ordering likely needs a persisted manifest field rather than deriving order only from filenames or creation timestamps.
- Thumbnail generation should reuse the existing slide rendering path where possible and avoid executing arbitrary untrusted code outside the current runtime assumptions.
- Creation and duplication must preserve TypeScript/TSX validity and should avoid ad hoc string edits when structured generation or templates are available.

## Acceptance Criteria

- AC-001: Users can create a blank slide from the app and see it appear in the slide list without invoking an external agent command.
- AC-002: Users can view existing slides in grid and list presentations with stable IDs and useful metadata.
- AC-003: Users can open, rename, duplicate, delete, and move a slide through visible UI controls.
- AC-004: Users can edit supported metadata fields and see persisted changes after refresh.
- AC-005: Search and sort work across the available slide collection.
- AC-006: Mutation failures display actionable errors and do not leave the UI in a false-success state.
- AC-007: Destructive actions require confirmation.
- AC-008: The management UI works in editable dev mode and clearly communicates read-only behavior in static builds.
- AC-009: Keyboard navigation and visible focus states cover create, search, list/grid navigation, action menus, metadata fields, and dialogs.
- AC-010: The UI follows the Awesome Slide design system from `specs/001-rebrand-awesome-slide`.

## Implementation Phases

### Phase 1: Management Model and API Contract

- Define slide metadata fields, validation rules, and persistence format.
- Document mutation endpoints and read-only/static behavior.
- Decide how deck/folder/manual order state is stored.

### Phase 2: Core Slide Browser Redesign

- Redesign the dashboard around folders/decks, grid/list modes, search, sort, and preview cards.
- Add loading, empty, and error states.
- Preserve existing folder assignment and mutation behavior.

### Phase 3: Native Create and Metadata Workflows

- Add create slide flow with blank, template/theme, and prompt-based paths.
- Add metadata inspector and validation.
- Add duplicate, delete, rename, and move flows with confirmations and pending states.

### Phase 4: Integration With Agent and Theme Specs

- Connect prompt-based creation to the in-app agent chat workflow.
- Connect theme selection to default and user-added theme discovery.
- Ensure metadata changes can be used as agent context.

### Phase 5: Validation

- Add focused tests for metadata validation, endpoint behavior, and UI state transitions.
- Verify keyboard navigation, responsive layouts, loading states, and destructive confirmations.
- Run project quality gates before implementation is considered complete.

