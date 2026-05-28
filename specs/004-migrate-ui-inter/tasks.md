# Tasks: UI Design System Migration to Inter

**Input**: Design documents from `/specs/004-migrate-ui-inter/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Update design reference documentation in [DESIGN.md](file:///d:/Projects/awesome-slide/references/new-design/DESIGN.md) to replace GT Walsheim references with Inter and define visual system tokens
- [x] T002 Update display typography variables in [AWESOME_SLIDE_DESIGN_SYSTEM.md](file:///d:/Projects/awesome-slide/references/AWESOME_SLIDE_DESIGN_SYSTEM.md)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Swap `@fontsource-variable/google-sans-flex` with `@fontsource-variable/inter` in [package.json](file:///d:/Projects/awesome-slide/packages/core/package.json)
- [x] T004 Run `pnpm install` at the repository root to download dependencies and regenerate the lockfile
- [x] T005 Import `@fontsource-variable/inter` and update variables `--font-sans` and `--font-heading` to use `"Inter Variable"` in [styles.css](file:///d:/Projects/awesome-slide/packages/core/src/app/styles.css)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Inter Typography Integration (Priority: P1) 🎯 MVP

**Goal**: Load and display Inter/Inter Variable correctly across core package and web apps

**Independent Test**: Verify that both the web app and the core app load Inter/Inter Variable and display text cleanly with no proprietary font console errors or fallback drift.

### Implementation for User Story 1

- [x] T006 [P] [US1] Load Inter Variable font in [styles.css](file:///d:/Projects/awesome-slide/packages/core/src/app/styles.css) variables and adjust letter-spacing and weight metrics for headers
- [x] T007 [P] [US1] Load Inter font from `next/font/google` and remove Google Fonts CDN link in [layout.tsx](file:///d:/Projects/awesome-slide/apps/web/app/layout.tsx)
- [x] T008 [US1] Audit and adjust display text components across routes in [packages/core/src/app/routes/](file:///d:/Projects/awesome-slide/packages/core/src/app/routes/) to ensure font styling is applied correctly

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - App Component Design System Migration (Priority: P2)

**Goal**: Style all core tools (sidebar, inspector, presenter, notes, dialogs) according to design tokens

**Independent Test**: Verify that all core UI surfaces use pill buttons, circular icons, hairline borders, and 5px grid spacing.

### Implementation for User Story 2

- [x] T009 [P] [US2] Update folder items, counts, and navigation items in [sidebar](file:///d:/Projects/awesome-slide/packages/core/src/app/components/sidebar/) components to align with pill shapes and hairline boundaries
- [x] T010 [P] [US2] Restructure buttons, segmented selectors, input groups, and focus halos in [inspector](file:///d:/Projects/awesome-slide/packages/core/src/app/components/inspector/) components to use design tokens
- [x] T011 [P] [US2] Update present overview layout, control bars, and jump inputs in [present](file:///d:/Projects/awesome-slide/packages/core/src/app/components/present/) components to use pill shapes, hairline borders, and tabular figures
- [x] T012 [P] [US2] Update drawer headers, buttons, and text fields in [notes-drawer.tsx](file:///d:/Projects/awesome-slide/packages/core/src/app/components/notes-drawer.tsx)
- [x] T013 [P] [US2] Restructure list headers, search filters, and preview modals in [asset-view.tsx](file:///d:/Projects/awesome-slide/packages/core/src/app/components/asset-view.tsx) and [asset-picker-dialog.tsx](file:///d:/Projects/awesome-slide/packages/core/src/app/components/inspector/asset-picker-dialog.tsx)
- [x] T014 [US2] Style loading and progress elements in [pdf-progress-toast.tsx](file:///d:/Projects/awesome-slide/packages/core/src/app/components/pdf-progress-toast.tsx) and [sonner.tsx](file:///d:/Projects/awesome-slide/packages/core/src/app/components/ui/sonner.tsx) to integrate atmospheric gradient spotlights

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Next.js Web App Design System Parity (Priority: P3)

**Goal**: Align apps/web landing pages and docs layout style with tool design guidelines

**Independent Test**: Verify web landing page has layout parity, featuring pill CTAs, card grids, spotlights, and hairline rules.

### Implementation for User Story 3

- [x] T015 [P] [US3] Align colors, borders, and rounded tokens in [global.css](file:///d:/Projects/awesome-slide/apps/web/app/global.css)
- [x] T016 [P] [US3] Restructure buttons, pricing cards, and atmospheric gradient panels in [landing components](file:///d:/Projects/awesome-slide/apps/web/components/landing/)
- [x] T017 [US3] Update documentation page styling and font variable scopes in [docs](file:///d:/Projects/awesome-slide/apps/web/app/docs/) pages

**Checkpoint**: All user stories should now be independently functional

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T018 Run biome style checks on all modified code using `pnpm check` and fix problems with `pnpm check:fix`
- [x] T019 Run typescript compiler checks across the monorepo graph using `pnpm typecheck`
- [x] T020 Build all packages and applications using `pnpm build`
- [x] T021 Perform manual design review of all UI views (sidebar, editor inspector, notes drawers, dialogs, present controls, and marketing headers) on mobile, tablet, and desktop viewports
- [x] T022 Create a changeset for touched core packages using `pnpm changeset`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2)
- **User Story 3 (P3)**: Can start after Foundational (Phase 2)

### Within Each User Story

- Setup variables and font mappings before updating components
- Core components before loaders/overlays
- Story complete before moving to next priority

### Parallel Opportunities

- Setup tasks T001, T002 can run in parallel
- Foundational tasks T003, T004, T005 must run sequentially due to npm install dependency
- User Stories US1, US2, and US3 can be developed in parallel after Phase 2 is complete
- Within US2, tasks T009, T010, T011, T012, T013 can run in parallel since they touch separate files

---

## Parallel Example: User Story 2

```bash
# Launch components in parallel:
Task: "Update sidebar layout and entries in packages/core/src/app/components/sidebar/ (T009)"
Task: "Update editor inspector panel controls in packages/core/src/app/components/inspector/ (T010)"
Task: "Update presenter overlays and control bar in packages/core/src/app/components/present/ (T011)"
Task: "Update notes drawer drawer header and text areas in packages/core/src/app/components/notes-drawer.tsx (T012)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test typography integration across apps
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test typography independently (MVP!)
3. Add User Story 2 → Test app UI components alignment
4. Add User Story 3 → Test web/docs visual parity
5. Each story adds value without breaking previous stories
