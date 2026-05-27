# Tasks: Reshape Landing, Sidebar, and Navigation

**Input**: Design documents from `/specs/002-reshape-landing-navigation/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `quickstart.md`, `contracts/navigation-layout-contract.md`

**Tests**: No standalone automated test tasks were requested. This feature requires source-level, browser-level, keyboard, reduced-motion, drift, and project-gate validation tasks.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated as an independent increment after shared setup and foundation are complete.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create tracking artifacts and collect source-of-truth constraints before reshaping UI files.

- [X] T001 Create the layout audit and wireframe mapping file in `specs/002-reshape-landing-navigation/layout-audit.md`
- [X] T002 [P] Create the validation log for browser review, keyboard review, reduced-motion review, drift scans, and quality gates in `specs/002-reshape-landing-navigation/validation-notes.md`
- [X] T003 Capture final design constraints from `references/REBRANDING_DESIGN_FINAL.md`, `references/AWESOME_SLIDE_DESIGN_SYSTEM.md`, and `specs/002-reshape-landing-navigation/contracts/navigation-layout-contract.md` in `specs/002-reshape-landing-navigation/layout-audit.md`
- [X] T004 Inventory current landing, navbar, docs chrome, runtime sidebar, and mobile navigation targets from `apps/web/components/landing/nav.tsx`, `apps/web/components/landing/hero.tsx`, `apps/web/app/(home)/landing.css`, `apps/web/app/docs/layout.tsx`, `apps/web/lib/layout.shared.tsx`, `packages/core/src/app/components/sidebar/sidebar.tsx`, and `packages/core/src/app/components/sidebar/mobile-pill.tsx` in `specs/002-reshape-landing-navigation/layout-audit.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Lock layout roles, responsive states, and shared CSS behavior before user-story implementation.

**Critical**: No user story work should begin until this phase is complete.

- [X] T005 Map `LandingSection` and `ActionPair` targets for hero, proof, workflow, product preview, CTA, and footer sections in `specs/002-reshape-landing-navigation/layout-audit.md`
- [X] T006 Map `NavigationItem` and `NavigationGroup` targets for desktop navbar, mobile menu, docs chrome, CTA pair, and external utility links in `specs/002-reshape-landing-navigation/layout-audit.md`
- [X] T007 Map `SidebarSection` and `ResponsiveState` targets for folders, slides, actions, status metadata, mobile pill, and drawer behavior in `specs/002-reshape-landing-navigation/layout-audit.md`
- [X] T008 Establish shared focus, sticky-offset, reduced-motion, no-horizontal-scroll, and hairline baseline rules in `apps/web/app/global.css`, `apps/web/app/(home)/landing.css`, and `packages/core/src/app/styles.css`

**Checkpoint**: Landing, navbar, docs chrome, and runtime navigation have agreed layout roles and shared CSS constraints.

---

## Phase 3: User Story 1 - Land on a Confident Product Page (Priority: P1) MVP

**Goal**: New visitors and returning users see a polished Awesome Slide landing page with visible product identity, clear actions, and a real product or slide preview in the first viewport.

**Independent Test**: Open the web home route at desktop and mobile widths and verify the first viewport shows the Awesome Slide name, value copy, primary action, secondary action, and product preview without clipping or horizontal scroll.

### Implementation for User Story 1

- [X] T009 [US1] Recompose the landing page wrapper and first-viewport spacing for a white-canvas hero in `apps/web/app/(home)/layout.tsx` and `apps/web/app/(home)/landing.css`
- [X] T010 [US1] Rewrite hero identity, value copy, CTA pair, and product preview placement in `apps/web/components/landing/hero.tsx`
- [X] T011 [P] [US1] Refresh real product and slide preview framing in `apps/web/components/landing/inline-slide-player.tsx`, `apps/web/components/landing/live-demo.tsx`, and `apps/web/components/landing/demo-slide/index.tsx`
- [X] T012 [P] [US1] Rework the workflow story block to use one dominant pastel surface in `apps/web/components/landing/how-it-works.tsx`
- [X] T013 [P] [US1] Rework the anatomy/product-proof story block with inspectable slide content in `apps/web/components/landing/anatomy.tsx`
- [X] T014 [P] [US1] Rework agent and asset story blocks for editorial rhythm in `apps/web/components/landing/agents.tsx` and `apps/web/components/landing/assets.tsx`
- [X] T015 [US1] Rework final CTA and footer hierarchy with magenta limited to a scarce promo or action moment in `apps/web/components/landing/get-started.tsx`, `apps/web/components/landing/footer.tsx`, and `apps/web/app/(home)/landing.css`
- [X] T016 [US1] Tune landing section rhythm, responsive spacing, CTA wrapping, and product preview sizing for 375px, 768px, 1024px, and 1440px in `apps/web/app/(home)/landing.css`
- [X] T017 [US1] Record landing first-viewport, no-horizontal-scroll, CTA fit, and product-preview validation in `specs/002-reshape-landing-navigation/validation-notes.md`

**Checkpoint**: User Story 1 is fully functional and testable independently.

---

## Phase 4: User Story 2 - Navigate With a Figma-Style Top Bar (Priority: P1)

**Goal**: Users can move through marketing, docs, and product entry points using a restrained top navbar with clear hierarchy, black/white CTAs, and accessible mobile behavior.

**Independent Test**: Use keyboard and pointer navigation on web home and docs layouts at 375px, 768px, 1024px, and 1440px.

### Implementation for User Story 2

- [X] T018 [US2] Reshape the desktop top navbar to a stable 56px monochrome rhythm with clear link, utility, and CTA zones in `apps/web/components/landing/nav.tsx` and `apps/web/app/(home)/landing.css`
- [X] T019 [US2] Implement mobile menu open, close, focus return, primary action reachability, and no-content-hidden behavior in `apps/web/components/landing/nav.tsx`
- [X] T020 [US2] Align home sticky offset, skip-to-content behavior, and fixed-navigation compensation in `apps/web/app/(home)/layout.tsx` and `apps/web/app/global.css`
- [X] T021 [P] [US2] Align docs/shared navigation chrome, CTA hierarchy, and responsive shell spacing in `apps/web/app/docs/layout.tsx` and `apps/web/lib/layout.shared.tsx`
- [X] T022 [US2] Replace or verify internal navigation links use Next.js `Link` while preserving accessible external-link behavior in `apps/web/components/landing/nav.tsx` and `apps/web/lib/layout.shared.tsx`
- [X] T023 [US2] Add navbar focus, active, CTA, icon-button, and mobile-menu styles without layout shift in `apps/web/app/(home)/landing.css` and `apps/web/app/global.css`
- [X] T024 [US2] Record desktop navbar, mobile menu, keyboard, focus-return, and sticky-offset validation in `specs/002-reshape-landing-navigation/validation-notes.md`

**Checkpoint**: User Story 2 is fully functional and testable independently.

---

## Phase 5: User Story 3 - Work From a Reshaped Runtime Sidebar (Priority: P2)

**Goal**: Slide creators use a cleaner runtime sidebar and mobile navigation system that feels connected to the rebrand while staying dense, stable, and scan-friendly.

**Independent Test**: Open the runtime home or workspace, switch folders or slides, resize to mobile, and verify selection, actions, counters, long labels, and focus order remain stable.

### Implementation for User Story 3

- [X] T025 [US3] Reshape runtime home shell and sidebar placement while preserving slide-preview dominance in `packages/core/src/app/routes/home-shell.tsx` and `packages/core/src/app/routes/home.tsx`
- [X] T026 [US3] Add runtime sidebar layout variables, compact row dimensions, hairline dividers, black selected states, and restrained pastel empty-state rules in `packages/core/src/app/styles.css`
- [X] T027 [US3] Rework sidebar group hierarchy, primary actions, counters, selected states, and empty states in `packages/core/src/app/components/sidebar/sidebar.tsx`
- [X] T028 [P] [US3] Rework folder and slide rows for long labels, stable hover/selected dimensions, and accessible row actions in `packages/core/src/app/components/sidebar/folder-item.tsx`
- [X] T029 [P] [US3] Rework icon picker affordances with accessible names, stable icon buttons, and consistent visual treatment in `packages/core/src/app/components/sidebar/icon-picker.tsx`
- [X] T030 [US3] Rework mobile pill or drawer access, touch target sizing, and primary runtime actions in `packages/core/src/app/components/sidebar/mobile-pill.tsx`
- [X] T031 [US3] Integrate runtime sidebar mobile states with the home shell without hiding create, open, folder-switch, or slide-switch workflows in `packages/core/src/app/components/sidebar/sidebar.tsx`, `packages/core/src/app/components/sidebar/mobile-pill.tsx`, and `packages/core/src/app/routes/home-shell.tsx`
- [X] T032 [US3] Record runtime sidebar, mobile navigation, row-stability, long-label, and focus-order validation in `specs/002-reshape-landing-navigation/validation-notes.md`

**Checkpoint**: User Story 3 is fully functional and testable independently.

---

## Phase 6: User Story 4 - Preserve Usability While Raising Visual Quality (Priority: P3)

**Goal**: Keyboard, reduced-motion, and smaller-screen users retain access to all landing, navbar, and sidebar flows while the layout becomes more expressive.

**Independent Test**: Verify keyboard traversal, reduced-motion behavior, focus rings, text contrast, state indicators, and no-overlap behavior across touched surfaces.

### Implementation for User Story 4

- [X] T033 [US4] Audit and add accessible names or tooltips for icon-only controls in `apps/web/components/landing/nav.tsx`, `packages/core/src/app/components/sidebar/sidebar.tsx`, `packages/core/src/app/components/sidebar/folder-item.tsx`, `packages/core/src/app/components/sidebar/icon-picker.tsx`, and `packages/core/src/app/components/sidebar/mobile-pill.tsx`
- [X] T034 [US4] Add or verify `prefers-reduced-motion` behavior for landing, navbar, sidebar, menu, and mobile navigation motion in `apps/web/app/(home)/landing.css`, `apps/web/app/global.css`, and `packages/core/src/app/styles.css`
- [X] T035 [US4] Verify focus order and non-color-only state indicators across the navbar and sidebar in `apps/web/components/landing/nav.tsx`, `packages/core/src/app/components/sidebar/sidebar.tsx`, and `packages/core/src/app/components/sidebar/folder-item.tsx`
- [X] T036 [US4] Run browser no-overlap and no-horizontal-scroll review at 375px, 768px, 1024px, and 1440px for landing, navbar, docs chrome, runtime sidebar, and mobile navigation, then record results in `specs/002-reshape-landing-navigation/validation-notes.md`
- [X] T037 [US4] Run a source drift scan for vermillion/red primary chrome, unauthorized magenta usage, dark-default landing sections, and generated shadcn edits, then record results in `specs/002-reshape-landing-navigation/validation-notes.md`

**Checkpoint**: User Story 4 is fully functional and testable independently.

---

## Phase 7: Polish and Cross-Cutting Concerns

**Purpose**: Finish release hygiene, changeset requirements, and final quality-gate evidence.

- [X] T038 Add the required `@awesome-slide/core` patch changeset for runtime sidebar changes in `.changeset/reshape-landing-navigation.md`
- [X] T039 Run `pnpm.cmd check`, `pnpm.cmd typecheck`, `pnpm.cmd test`, and `pnpm.cmd build`, then record results and any unrelated pre-existing failures in `specs/002-reshape-landing-navigation/validation-notes.md`
- [X] T040 Run final whitespace and task-format review, including `git diff --check`, then record release-prep notes in `specs/002-reshape-landing-navigation/validation-notes.md`

---

## Dependencies and Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup and blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational. This is the first visible MVP slice.
- **User Story 2 (Phase 4)**: Depends on Foundational. It is also P1 and should be included for a complete landing/navigation MVP.
- **User Story 3 (Phase 5)**: Depends on Foundational. It can proceed after the shared CSS and layout roles are stable.
- **User Story 4 (Phase 6)**: Depends on the desired UI stories being implemented, then validates accessibility, motion, and responsive behavior.
- **Polish (Phase 7)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **US1 (P1)**: Can start after Foundation. Coordinate with US2 on `apps/web/app/(home)/landing.css`.
- **US2 (P1)**: Can start after Foundation. Coordinate with US1 on shared landing CSS and home layout offset behavior.
- **US3 (P2)**: Can start after Foundation. It is independent from the web landing work but touches `packages/core`, so it triggers the changeset task.
- **US4 (P3)**: Should run after each implemented story and before claiming completion.

### Within Each User Story

- Complete source changes before recording validation notes for that story.
- Keep component edits in existing route and component boundaries unless a small local helper removes meaningful duplication.
- Avoid editing `packages/core/src/app/components/ui`.
- Preserve existing create, open, switch-folder, and switch-slide workflows while changing layout.

---

## Parallel Execution Examples

### User Story 1

```text
Task: T011 Refresh preview framing in apps/web/components/landing/inline-slide-player.tsx, apps/web/components/landing/live-demo.tsx, and apps/web/components/landing/demo-slide/index.tsx
Task: T012 Rework workflow story block in apps/web/components/landing/how-it-works.tsx
Task: T013 Rework anatomy/product-proof block in apps/web/components/landing/anatomy.tsx
Task: T014 Rework agent and asset story blocks in apps/web/components/landing/agents.tsx and apps/web/components/landing/assets.tsx
```

### User Story 2

```text
Task: T018 Reshape desktop top navbar in apps/web/components/landing/nav.tsx and apps/web/app/(home)/landing.css
Task: T021 Align docs/shared navigation chrome in apps/web/app/docs/layout.tsx and apps/web/lib/layout.shared.tsx
```

### User Story 3

```text
Task: T028 Rework folder and slide rows in packages/core/src/app/components/sidebar/folder-item.tsx
Task: T029 Rework icon picker affordances in packages/core/src/app/components/sidebar/icon-picker.tsx
```

### User Story 4

```text
Task: T036 Run browser no-overlap and no-horizontal-scroll review and record specs/002-reshape-landing-navigation/validation-notes.md
Task: T037 Run source drift scan and record specs/002-reshape-landing-navigation/validation-notes.md
```

---

## Implementation Strategy

### MVP First

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational.
3. Complete Phase 3: User Story 1.
4. Complete Phase 4: User Story 2 for the full P1 landing/navigation MVP.
5. Stop and validate the web home route, docs chrome, navbar, and mobile menu independently.

### Incremental Delivery

1. Deliver US1 so the landing page communicates the new product layout.
2. Deliver US2 so navigation matches the same Figma-style system.
3. Deliver US3 so runtime sidebar and mobile navigation feel product-grade.
4. Deliver US4 so accessibility, reduced motion, drift scans, and browser validation are complete.
5. Complete Phase 7 to satisfy changeset and project quality-gate expectations.

### Parallel Team Strategy

1. One owner completes Setup and Foundational mapping.
2. After Foundation, one owner can implement US1 landing sections while another implements US2 docs/shared nav chrome.
3. A runtime owner can implement US3 in `packages/core` after the shared CSS constraints are settled.
4. US4 validation should be performed against every implemented story before final polish.

---

## Notes

- `[P]` tasks touch different files or can proceed without waiting for unfinished tasks in the same phase.
- `[US1]`, `[US2]`, `[US3]`, and `[US4]` map to the user stories in `specs/002-reshape-landing-navigation/spec.md`.
- Any implementation touching `packages/core` requires the changeset in T038.
- Use `pnpm.cmd` on Windows for project commands.
- Biome must pass before commit unless unrelated pre-existing failures are clearly recorded.
