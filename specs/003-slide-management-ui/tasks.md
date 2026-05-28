# Tasks: Slide Management UI

**Input**: Design documents from `specs/003-slide-management-ui/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (management-api, management-ui, metadata-persistence), quickstart.md

**Tests**: Included per spec Phase 5 and quickstart.md test targets.

**Organization**: Tasks grouped by user story. Foundation phase blocks all stories. MVP is US2 (view/browse) + US1 (create).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US7)
- Paths relative to monorepo root; source in `packages/core/src/`, tests in `packages/core/tests/`

---

## Phase 1: Setup

No setup tasks required — the monorepo structure, tooling, and dependencies already exist. New files will be created under `packages/core/src/` and `packages/core/tests/` per the project structure in plan.md.

---

## Phase 2: Foundation (Blocking Prerequisites)

**Purpose**: Core types, manifest operations, parser-guided source editing, file operations, and API scaffold. ALL user stories depend on this phase.

**CRITICAL**: No user story work can begin until this phase is complete.

- [X] T001 Extend `SlideMeta` (add description, tags, status, notes), add `SlideRecord`, `Folder`, `Deck`, `DeckId`, `SlideCollectionManifest`, `sourceState`, `ManagementMode`, `ManagementCapabilities`, `CreateSlideRequest`, `SlideMetadataPatch`, `DuplicateSlideRequest`, `UpdateOrderRequest` types in `packages/core/src/app/lib/sdk.ts`
- [X] T002 [P] Implement manifest load (missing-field defaults for `folders`, `assignments`, `decks`, `manualOrder`), write (complete JSON, stale-reference cleanup), deck CRUD, and order helpers in `packages/core/src/files/slide-management.ts`
- [X] T003 [P] Implement parser-guided source read/write for `export const meta`: detect `sourceState` (`supported`, `readable-unsupported`, `parse-error`, `missing`), read meta fields, write individual fields preserving formatting, handle insertion before `export default` in `packages/core/src/editing/meta-source.ts`
- [X] T004 [P] Implement slide file operations: create blank (minimal TSX with `meta.title` and `meta.createdAt`), create from template (copy trusted local source), duplicate directory (copy all files and asset subfolders), delete directory in `packages/core/src/files/slide-ops.ts`
- [X] T005 Implement management API route scaffold and `GET /__management/slides` (read live file state, build `SlideRecord[]` with `sourceState`, derive `folderId`/`deckIds` from manifest, return `ManagementCapabilities` based on dev/static mode) in `packages/core/src/http/management-api.ts`
- [X] T006 Create `useManagement` hook wrapping management API: fetch slide list, detect mode, expose mutation helpers (create, patch, duplicate, delete, reorder) with pending/error state in `packages/core/src/app/lib/management.ts`
- [X] T007 Extend virtual modules in `packages/core/src/vite/open-slide-plugin.ts` to expose `title`, `description`, `tags`, `status`, `updatedAt`, `sourceState` alongside existing `slideIds`, `slideThemes`, `slideCreatedAt`, `loadSlide`; extend `virtual:awesome-slide/folders` to include `decks` and `manualOrder`
- [X] T008 [P] Write manifest load/write, deck CRUD, order helpers, and missing-field defaulting tests in `packages/core/tests/files/manifest.test.ts`
- [X] T009 [P] Write parser-guided meta source read/write, sourceState detection, and unsupported-shape handling tests in `packages/core/tests/editing/meta-source.test.ts`

**Checkpoint**: Foundation ready — types defined, manifest and source read/write working with tests, `GET /__management/slides` returns live data. User story implementation can now begin.

---

## Phase 3: US2 — View and Browse Slides (P1) MVP Core

**Goal**: Replace the home route with a management surface showing slides in grid/list mode with sidebar navigation for folders, decks, and drafts.

**Independent Test**: Start dev server (`pnpm dev:demo`), navigate to home route, see slides rendered in grid and list modes with title, ID, status, and preview. Sidebar shows folders and decks with slide counts. Switching between grid and list preserves data. Clicking a slide navigates to slide route.

- [X] T010 [P] [US2] Create `SlideCard` component rendering slide preview thumbnail (16:9), title (falls back to ID), status badge, and hover/keyboard action affordances in `packages/core/src/app/components/slide-management/SlideCard.tsx`
- [X] T011 [P] [US2] Create `SlideGrid` component rendering `SlideCard` items in a responsive grid layout with 16:9 preview aspect ratio in `packages/core/src/app/components/slide-management/SlideGrid.tsx`
- [X] T012 [P] [US2] Create `SlideList` component rendering slide items as dense rows with title, ID, status, folder, deck, dates, and inline action controls in `packages/core/src/app/components/slide-management/SlideList.tsx`
- [X] T013 [US2] Create `ManagementSidebar` component showing draft count, folder list with slide counts, deck list with slide counts, active selection highlighting, and stable dimensions across state changes in `packages/core/src/app/components/slide-management/ManagementSidebar.tsx`
- [X] T014 [US2] Replace home route surface: integrate `ManagementSidebar`, `SlideGrid`/`SlideList` with grid/list toggle, and toolbar into the existing `HomeShell` layout in `packages/core/src/app/routes/home.tsx`
- [X] T015 [US2] Add open-slide navigation from grid/list item click to the slide route in `packages/core/src/app/routes/home.tsx`

**Checkpoint**: Home route shows full management UI. Slides render in grid and list. Sidebar navigates folders, decks, drafts. Clicking a slide opens it. This is the MVP core surface.

---

## Phase 4: US1 — Create Slide (P1)

**Goal**: Add native slide creation from the app with blank, template/theme, and prompt entry points.

**Independent Test**: Click create action, choose blank/template/prompt, fill details, submit. New slide appears in grid/list immediately. Prompt kind creates a placeholder slide (status: draft, prompt in meta.notes) and returns an agent-chat handoff target.

- [X] T016 [US1] Implement `POST /__management/slides` endpoint handling `blank` (write minimal TSX with `meta.title` and `meta.createdAt`), `template` (copy from trusted local source, apply ID/title), and `prompt` (create placeholder with `meta.notes` = prompt, `status: 'draft'`, return `{ type: 'agent-chat', prompt, seedSlideId }`) in `packages/core/src/http/management-api.ts`
- [X] T017 [US1] Create `CreateSlideDialog` component with kind selector (blank, template, prompt), ID/title inputs, optional theme/folder/deck selectors, prompt textarea for prompt kind, and field validation in `packages/core/src/app/components/slide-management/CreateSlideDialog.tsx`
- [X] T018 [US1] Integrate create action into toolbar: visible primary button, opens `CreateSlideDialog`, refreshes list on success, navigates to new slide or agent-chat target in `packages/core/src/app/routes/home.tsx`

**Checkpoint**: Users can create blank, template, and prompt-based slides from the app. New slides appear in the management surface immediately.

---

## Phase 5: US3 — Edit Slide Metadata (P1)

**Goal**: Make slide metadata visible and editable from an inspector panel with field-level editability based on `sourceState`.

**Independent Test**: Select a slide, see inspector with all metadata fields. Edit title, tags, status on a `sourceState: 'supported'` slide and confirm persistence after refresh. Confirm `readable-unsupported` slides show read-only fields with warning. Confirm folder/deck fields are always editable in dev mode.

- [X] T019 [US3] Implement `PATCH /__management/slides/:slideId/metadata` endpoint: validate `sourceState` gate for slide-owned fields (return 422 for unsupported source), write meta fields via parser, write `folderId` to assignments and `deckIds` to deck order, return updated `SlideRecord` in `packages/core/src/http/management-api.ts`
- [X] T020 [US3] Create `SlideInspector` component with field-level editability matrix: editable for `sourceState: 'supported'`, read-only with source-state warning for `readable-unsupported`/`parse-error`/`missing`, always-editable for folder/deck in dev mode, inline validation, focused editor for long fields in `packages/core/src/app/components/slide-management/SlideInspector.tsx`
- [X] T021 [US3] Integrate inspector into management layout: persistent side panel on wide screens (1024px+), drawer on narrow screens, update on slide selection, focus return on close in `packages/core/src/app/routes/home.tsx`

**Checkpoint**: Metadata inspector works. Slide-owned fields respect `sourceState`. Collection-owned fields always editable in dev mode. Changes persist and refresh correctly.

---

## Phase 6: US4 — Duplicate Slide (P2)

**Goal**: Allow users to duplicate a slide with a new ID, copying source and folder assignment but not deck membership.

**Independent Test**: Select a slide, choose duplicate, optionally set new ID/title, confirm. New slide appears in same folder with title suffix "(copy)". Deck membership is not copied.

- [X] T022 [US4] Implement `POST /__management/slides/:slideId/duplicate` endpoint: copy directory via `slide-ops.ts`, generate unique ID when absent, set title to `<source> (copy)` unless supplied, set new `createdAt`, set `status: 'draft'`, copy folder assignment, do not copy deck membership in `packages/core/src/http/management-api.ts`
- [X] T023 [US4] Add duplicate action to `SlideCard` and `SlideList` items with optional new ID/title dialog, pending state display, and list refresh on success in `packages/core/src/app/components/slide-management/SlideCard.tsx` and `packages/core/src/app/components/slide-management/SlideList.tsx`

**Checkpoint**: Duplicate creates a new slide with copied content and folder assignment. Deck membership is not copied.

---

## Phase 7: US5 — Delete Slide (P2)

**Goal**: Allow users to delete slides with confirmation and cleanup of all manifest references.

**Independent Test**: Select a slide, choose delete, see confirmation dialog with title/ID, confirm. Slide removed from grid/list and all manifest references (assignment, deck order, manual order). Cancel preserves the slide.

- [X] T024 [US5] Implement `DELETE /__management/slides/:slideId` endpoint: remove directory via `slide-ops.ts`, remove folder assignment, remove deck order entries, remove manual-order references in `packages/core/src/http/management-api.ts`
- [X] T025 [US5] Create `DeleteConfirmDialog` component with slide title/ID display, warning text about no guaranteed recovery, cancel and confirm buttons, focus trap, and return focus on close in `packages/core/src/app/components/slide-management/DeleteConfirmDialog.tsx`
- [X] T026 [US5] Add delete action to `SlideCard` and `SlideList` items: opens `DeleteConfirmDialog`, shows pending state during deletion, refreshes list on success, shows inline error on failure in `packages/core/src/app/components/slide-management/SlideCard.tsx` and `packages/core/src/app/components/slide-management/SlideList.tsx`

**Checkpoint**: Delete removes the slide and cleans up all manifest references. Confirmation is required. Cancel preserves the slide. Pending state is visible.

---

## Phase 8: US6 — Organize Folders and Decks (P2)

**Goal**: Add folder and deck management including create, rename, delete, move slides between folders, assign to decks, and manual ordering.

**Independent Test**: Create a folder and deck in sidebar. Assign slides to folder and deck via inspector or item actions. Reorder slides in a deck via drag or manual order. Move a slide between folders. Delete a folder — slides remain but are unassigned.

- [X] T027 [US6] Add folder CRUD endpoints (`POST /__management/folders`, `PUT /__management/folders/:folderId`, `DELETE /__management/folders/:folderId`) and deck CRUD endpoints (`POST /__management/decks`, `PUT /__management/decks/:deckId`, `DELETE /__management/decks/:deckId`) with validation (unique names, ID format) in `packages/core/src/http/management-api.ts`
- [X] T028 [US6] Implement `PUT /__management/collections/order` endpoint: validate `slideIds` is a permutation of visible slides in that collection, write to `manualOrder` for folder/draft, write to deck `slideOrder` for decks, detect stale IDs in `packages/core/src/http/management-api.ts`
- [X] T029 [US6] Add folder and deck management controls to `ManagementSidebar`: create folder/deck, rename folder/deck, delete folder/deck (with confirmation), show slide counts, handle empty folders/decks in `packages/core/src/app/components/slide-management/ManagementSidebar.tsx`
- [X] T030 [US6] Add move-between-folders and deck assignment actions to slide items and inspector: folder selector dropdown, deck membership toggles, consume `PATCH /__management/slides/:slideId/metadata` with `folderId` and `deckIds` in `packages/core/src/app/components/slide-management/SlideCard.tsx`, `SlideList.tsx`, `SlideInspector.tsx`

**Checkpoint**: Folders and decks are fully manageable from the sidebar. Slides can be assigned, moved, and reordered. Deleting a folder does not delete slides.

---

## Phase 9: US7 — Search, Sort, and Keyboard (P2)

**Goal**: Add search across title/ID/tag/folder/deck, sort by updated/created/title/manual order, and full keyboard navigation across the management surface.

**Independent Test**: Type in search input, see filtered results matching title, ID, tag, folder name, or deck name. Change sort mode, see reordered results. Navigate grid/list with arrow keys, open actions with Enter, tab between sidebar/content/inspector, Escape closes drawers/dialogs. Missing dates sort after dated slides in desc modes.

- [X] T031 [US7] Implement search helpers matching title, stable slide ID, tags, folder name, and deck name with case-insensitive matching in `packages/core/src/app/lib/management.ts`
- [X] T032 [US7] Implement sort helpers for updated date (desc/asc), created date (desc/asc), title (asc/desc), and manual order with missing-date fallback (sort after dated slides in desc modes) in `packages/core/src/app/lib/management.ts`
- [X] T033 [US7] Create `SearchSortToolbar` component with search input, sort mode selector (updated/created/title/manual), grid/list toggle, keyboard-accessible controls, stable dimensions across state changes in `packages/core/src/app/components/slide-management/SearchSortToolbar.tsx`
- [X] T034 [US7] Add keyboard navigation: focus grid/list items with arrow keys, open action menus with Enter/Space, tab into sidebar and inspector, Escape closes transient surfaces without applying unsaved changes, visible focus states on all interactive elements in `packages/core/src/app/routes/home.tsx`
- [X] T035 [US7] Implement responsive breakpoints: 375px (sidebar/inspector as drawers, create/search/delete reachable), 768px (stable toolbar, no horizontal scroll), 1024px (two-zone layout), 1440px (three-zone layout with all panels visible) in `packages/core/src/app/routes/home.tsx`

**Checkpoint**: Search and sort work across all fields and modes. Keyboard navigation covers all management actions. Responsive layout works across breakpoints.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Empty/error states, static read-only mode, HMR refresh, final tests, and quality gates.

- [X] T036 [P] Add empty states: no slides (distinct from no-search-results), no search results, no folder assignment, no deck assignment, loading failure with recovery guidance in `packages/core/src/app/routes/home.tsx` and slide-management components
- [X] T037 [P] Add error states with action-specific recovery text: file write failure, invalid slide ID, duplicate slide ID, metadata parse/write failure, endpoint/server failure, static read-only mutation attempt in `packages/core/src/app/routes/home.tsx` and slide-management components
- [X] T038 Implement static read-only mode: detect `ManagementMode: 'readonly'`, disable/hide create/rename/duplicate/delete/move/metadata-edit/manual-order controls, show guidance to run local dev server, mark all inspector fields read-only in `packages/core/src/app/routes/home.tsx`
- [X] T039 Integrate HMR refresh on `awesome-slide:slide-changed` and `awesome-slide:files-changed` events: refresh slide list and manifest, preserve selected collection and search query across refresh in `packages/core/src/app/lib/management.ts`
- [X] T040 [P] Write management API endpoint validation, error response, and source-state gate tests in `packages/core/tests/http/management-api.test.ts`
- [X] T041 [P] Write sort/search helper tests covering title, ID, tag, folder, deck, date sorting with missing-date fallback, and manual order in `packages/core/tests/app/management-helpers.test.ts`
- [ ] T042 Run quality gates and validate against quickstart.md: `pnpm check`, `pnpm typecheck`, `pnpm test`, `pnpm build`, add changeset in repo root

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — structure exists
- **Foundation (Phase 2)**: No dependencies — can start immediately
- **US2 View/Browse (Phase 3)**: Depends on Foundation (T001–T009) complete
- **US1 Create (Phase 4)**: Depends on Foundation + US2 (needs grid/list to show new slide)
- **US3 Metadata (Phase 5)**: Depends on Foundation + US2 (needs slide selection in grid/list)
- **US4 Duplicate (Phase 6)**: Depends on Foundation + US2 (needs grid/list items)
- **US5 Delete (Phase 7)**: Depends on Foundation + US2 (needs grid/list items)
- **US6 Organize (Phase 8)**: Depends on Foundation + US2 + US3 (needs sidebar and inspector for folder/deck actions)
- **US7 Search/Sort/Keyboard (Phase 9)**: Depends on Foundation + US2 (needs grid/list surface)
- **Polish (Phase 10)**: Depends on all desired user stories complete

### User Story Dependencies

- **US2 (P1)**: First user story after Foundation — provides the management surface all other stories plug into
- **US1 (P1)**: After US2 — create adds slides to the browser
- **US3 (P1)**: After US2 — inspector needs slide selection from grid/list
- **US4 (P2)**: After US2 — duplicate is an item action on grid/list
- **US5 (P2)**: After US2 — delete is an item action on grid/list
- **US6 (P2)**: After US3 — organize needs folder/deck controls in sidebar and inspector
- **US7 (P2)**: After US2 — search/sort wraps the grid/list surface

### Within Each User Story

- API endpoint before UI component (endpoint defines data contract)
- Component before route integration (component must render before wiring)
- Story complete before moving to next priority

### Parallel Opportunities

- **Foundation**: T002, T003, T004 in parallel (different files); T008, T009 in parallel (different test files)
- **US2**: T010, T011, T012 in parallel (SlideCard, SlideGrid, SlideList are independent components)
- **US4 + US5**: Can be worked on in parallel (duplicate and delete are independent operations)
- **Polish**: T036, T037 in parallel (empty and error states); T040, T041 in parallel (different test files)

---

## Parallel Example: Foundation

```
# Launch independent foundation tasks together:
Task T002: "Implement manifest helpers in packages/core/src/files/slide-management.ts"
Task T003: "Implement parser-guided meta source in packages/core/src/editing/meta-source.ts"
Task T004: "Implement slide file operations in packages/core/src/files/slide-ops.ts"

# Then tests in parallel:
Task T008: "Write manifest tests in packages/core/tests/files/manifest.test.ts"
Task T009: "Write meta-source tests in packages/core/tests/editing/meta-source.test.ts"
```

## Parallel Example: US2 (View/Browse)

```
# Launch grid/list/card components in parallel:
Task T010: "Create SlideCard in packages/core/src/app/components/slide-management/SlideCard.tsx"
Task T011: "Create SlideGrid in packages/core/src/app/components/slide-management/SlideGrid.tsx"
Task T012: "Create SlideList in packages/core/src/app/components/slide-management/SlideList.tsx"
```

---

## Implementation Strategy

### MVP First (US2 + US1)

1. Complete Phase 2: Foundation (T001–T009)
2. Complete Phase 3: US2 — View/Browse (T010–T015)
3. Complete Phase 4: US1 — Create (T016–T018)
4. **STOP and VALIDATE**: Test browse and create against quickstart.md scenarios
5. Demo/deploy if ready

### Incremental Delivery

1. Foundation → ready for UI work
2. US2 (Browse) → users can see and open slides → **MVP!**
3. US1 (Create) → users can create new slides
4. US3 (Metadata) → users can edit slide metadata
5. US4 (Duplicate) + US5 (Delete) → complete slide operations
6. US6 (Organize) → folder and deck management
7. US7 (Search/Sort/Keyboard) → full UX polish
8. Polish (Phase 10) → error states, static mode, quality gates

### Parallel Team Strategy

With multiple developers:

1. Team completes Foundation together (T001–T009)
2. Once Foundation is done:
   - Developer A: US2 (View/Browse)
3. Once US2 is done:
   - Developer A: US1 (Create)
   - Developer B: US3 (Metadata)
4. Once US1 + US3 are done:
   - Developer A: US4 (Duplicate) + US5 (Delete)
   - Developer B: US6 (Organize)
   - Developer C: US7 (Search/Sort/Keyboard)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All paths relative to monorepo root; source in `packages/core/src/`, tests in `packages/core/tests/`
