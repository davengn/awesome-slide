# Tasks: Rebrand and Redesign as Awesome Slide

**Input**: Design documents from `/specs/001-rebrand-awesome-slide/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `quickstart.md`, `contracts/brand-migration-contract.md`, `contracts/design-system-contract.md`, `contracts/rebrand-inventory-contract.md`

**Tests**: Included where explicitly required by the specification and contracts, especially compatibility behavior for renamed public and observable surfaces.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated as an independent increment after the shared setup and foundation are complete.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the tracking artifacts needed to avoid unsafe global replacements and to keep validation evidence in one place.

- [X] T001 Create the rebrand inventory file with the required schema and category list in `specs/001-rebrand-awesome-slide/rebrand-inventory.md`
- [X] T002 [P] Create the Awesome Slide design-system source of truth from the design contract in `references/AWESOME_SLIDE_DESIGN_SYSTEM.md`
- [X] T003 [P] Create the brand migration and compatibility source of truth from the migration contract in `references/AWESOME_SLIDE_BRAND_MIGRATION.md`
- [X] T004 [P] Create the validation log for checks, quickstart results, accessibility review, and viewport review in `specs/001-rebrand-awesome-slide/validation-notes.md`
- [X] T005 Run the initial legacy-brand search from `specs/001-rebrand-awesome-slide/quickstart.md` and paste unclassified matches into `specs/001-rebrand-awesome-slide/rebrand-inventory.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Lock naming, inventory, compatibility, and token decisions before story implementation.

**Critical**: No user story work should begin until this phase is complete.

- [X] T006 Classify package metadata, root scripts, repository docs, and GitHub matches in `specs/001-rebrand-awesome-slide/rebrand-inventory.md`
- [X] T007 [P] Classify runtime UI, locale, internal protocol, runtime path, and storage-key matches in `specs/001-rebrand-awesome-slide/rebrand-inventory.md`
- [X] T008 [P] Classify CLI, starter template, demo, skills, web docs, and marketing matches in `specs/001-rebrand-awesome-slide/rebrand-inventory.md`
- [X] T009 Record compatibility-window decisions for package, binary, config, virtual module, HMR, runtime path, local storage, and docs URL surfaces in `references/AWESOME_SLIDE_BRAND_MIGRATION.md`
- [X] T010 Define final color, typography, spacing, radius, shadow, focus, motion, component treatment, responsive, and accessibility rules in `references/AWESOME_SLIDE_DESIGN_SYSTEM.md`
- [X] T011 Add centralized runtime brand constants for canonical and legacy names in `packages/core/src/brand.ts`
- [X] T012 Export runtime brand constants and compatibility type aliases from `packages/core/src/index.ts`

**Checkpoint**: Inventory, design rules, and naming rules are ready for implementation.

---

## Phase 3: User Story 1 - Consistent Awesome Slide Product Identity (Priority: P1) MVP

**Goal**: A slide creator sees `Awesome Slide` in standard app and docs flows, with legacy references only where inventory decisions mark them as compatibility or history.

**Independent Test**: Run the inventory scan, open the runtime app and docs entry pages, and verify user-facing product copy uses `Awesome Slide` while all remaining `open-slide` references are classified.

### Tests for User Story 1

- [X] T013 [P] [US1] Add locale product-name coverage for all bundled locales in `packages/core/src/locale/brand.test.ts`

### Implementation for User Story 1

- [X] T014 [US1] Update locale app titles and product copy in `packages/core/src/locale/en.ts`, `packages/core/src/locale/ja.ts`, `packages/core/src/locale/zh-cn.ts`, and `packages/core/src/locale/zh-tw.ts`
- [X] T015 [US1] Update runtime app metadata and shell title usage in `packages/core/src/app/index.html` and `packages/core/src/app/app.tsx`
- [X] T016 [P] [US1] Update docs entry-page brand copy in `apps/web/content/docs/index.mdx`, `apps/web/content/docs/getting-started.mdx`, and `apps/web/content/docs/meta.json`
- [X] T017 [P] [US1] Update root and package README brand copy in `README.md`, `packages/core/README.md`, and `packages/cli/README.md`
- [X] T018 [US1] Update landing-page brand chrome in `apps/web/components/landing/nav.tsx`, `apps/web/components/landing/hero.tsx`, `apps/web/components/landing/get-started.tsx`, and `apps/web/components/landing/footer.tsx`
- [X] T019 [US1] Update visible help, error, and runtime copy in `packages/core/src/cli/run.ts`, `packages/core/src/cli/sync.ts`, `packages/core/src/app/routes/slide.tsx`, and `packages/core/src/app/lib/page-context.tsx`
- [X] T020 [US1] Re-run the inventory scan and update User Story 1 statuses in `specs/001-rebrand-awesome-slide/rebrand-inventory.md`

**Checkpoint**: Standard app and docs surfaces show the new product identity and the inventory explains every intentional legacy reference.

---

## Phase 4: User Story 2 - Polished Starter and Marketing Experience (Priority: P2)

**Goal**: A first-time user gets a scaffolded Awesome Slide workspace and sees marketing surfaces that match the new identity.

**Independent Test**: Run the CLI init flow into a temporary directory, inspect the generated README, package scripts, config file, and welcome slide, then build or typecheck the web landing page.

### Tests for User Story 2

- [X] T021 [P] [US2] Add CLI init coverage for canonical starter README, package scripts, dependency names, config filename, and welcome copy in `packages/cli/src/init.test.ts`

### Implementation for User Story 2

- [X] T022 [US2] Update scaffolder command name, help text, git init commit text, generated config path, and success output in `packages/cli/src/index.ts`, `packages/cli/src/init.ts`, and `packages/cli/src/git.ts`
- [X] T023 [US2] Add the canonical starter config template while preserving legacy config compatibility in `packages/cli/template/awesome-slide.config.ts` and `packages/cli/template/open-slide.config.ts`
- [X] T024 [P] [US2] Update starter package scripts, dependency names, and TypeScript includes in `packages/cli/template/package.json` and `packages/cli/template/tsconfig.json`
- [X] T025 [P] [US2] Update starter project README and agent guide copy in `packages/cli/template/README.md`, `packages/cli/template/AGENTS.md`, and `packages/cli/template/CLAUDE.md`
- [X] T026 [US2] Rebrand the generated getting-started deck copy and import examples in `packages/cli/template/slides/getting-started/index.tsx`
- [X] T027 [P] [US2] Rebrand the landing demo slide mirror in `apps/web/components/landing/demo-slide/index.tsx`
- [X] T028 [P] [US2] Update marketing section copy and visual brand styling in `apps/web/components/landing/how-it-works.tsx`, `apps/web/components/landing/anatomy.tsx`, `apps/web/components/landing/live-demo.tsx`, and `apps/web/app/(home)/landing.css`
- [X] T029 [US2] Run the CLI scaffold quickstart and record generated-file validation in `specs/001-rebrand-awesome-slide/validation-notes.md`

**Checkpoint**: New projects scaffold with Awesome Slide branding and the marketing first impression matches the rebrand.

---

## Phase 5: User Story 3 - Contributor-Safe Naming and Compatibility (Priority: P3)

**Goal**: Contributors can update package metadata, technical identifiers, docs, and compatibility aliases without reintroducing inconsistent naming or breaking existing projects.

**Independent Test**: New canonical names work, legacy package/config/CLI/protocol/storage names still work through compatibility paths, and docs explain the migration clearly.

### Tests for User Story 3

- [X] T030 [P] [US3] Add config resolution tests for `awesome-slide.config.ts`, `open-slide.config.ts`, and both-files precedence in `packages/core/src/vite/open-slide-plugin.test.ts`
- [X] T031 [P] [US3] Add runtime CLI help and binary alias coverage for `awesome-slide` and `open-slide` in `packages/core/src/cli/run.test.ts`
- [X] T032 [US3] Add virtual module, HMR event, runtime state path, and localStorage compatibility coverage in `packages/core/src/vite/open-slide-plugin.test.ts` and `packages/core/src/vite/current-plugin.test.ts`

### Implementation for User Story 3

- [X] T033 [US3] Update monorepo and package metadata, filter scripts, repository URLs, homepage URLs, package names, and descriptions in `package.json`, `packages/core/package.json`, and `packages/cli/package.json`
- [X] T034 [US3] Expose both canonical and legacy binaries and update CLI program help in `packages/core/package.json`, `packages/core/bin.js`, `packages/core/src/cli/run.ts`, `packages/cli/package.json`, and `packages/cli/src/index.ts`
- [X] T035 [US3] Implement config resolution order and both-files warning behavior in `packages/core/src/vite/open-slide-plugin.ts`
- [X] T036 [US3] Add canonical config type exports while preserving legacy type exports in `packages/core/src/config.ts`, `packages/core/src/index.ts`, and `packages/core/env.d.ts`
- [X] T037 [US3] Add canonical virtual module IDs while preserving legacy IDs in `packages/core/src/vite/open-slide-plugin.ts`, `packages/core/src/vite/themes-plugin.ts`, `packages/core/src/vite/config.ts`, `packages/core/src/app/virtual.d.ts`, `packages/core/src/app/app.tsx`, `packages/core/src/app/lib/slides.ts`, `packages/core/src/app/lib/folders.ts`, `packages/core/src/app/lib/themes.ts`, and `packages/core/src/app/lib/use-locale.ts`
- [X] T038 [US3] Add canonical HMR events while preserving legacy listeners and senders in `packages/core/src/vite/routes/watchers.ts`, `packages/core/src/vite/open-slide-plugin.ts`, `packages/core/src/app/lib/use-slide-module.ts`, `packages/core/src/app/lib/assets.ts`, and `packages/core/src/app/lib/folders.ts`
- [X] T039 [US3] Migrate runtime state path, persisted UI keys, presenter channel names, and presenter window names with legacy fallback behavior in `packages/core/src/vite/current-plugin.ts`, `packages/core/src/app/routes/slide.tsx`, `packages/core/src/app/routes/home.tsx`, `packages/core/src/app/components/notes-drawer.tsx`, `packages/core/src/app/components/present/use-presenter-channel.ts`, and `packages/core/src/app/components/player.tsx`
- [X] T040 [US3] Update source-transform import handling for `@awesome-slide/core` while preserving `@open-slide/core` behavior in `packages/core/src/editing/revert-asset.ts`, `packages/core/src/editing/revert-asset.test.ts`, `packages/core/src/vite/design-plugin.ts`, and `packages/core/src/vite/design-plugin.test.ts`
- [X] T041 [US3] Update CLI and reference documentation examples in `apps/web/content/docs/cli/overview.mdx`, `apps/web/content/docs/cli/init.mdx`, `apps/web/content/docs/cli/dev.mdx`, `apps/web/content/docs/cli/build.mdx`, `apps/web/content/docs/cli/preview.mdx`, `apps/web/content/docs/cli/sync-skills.mdx`, `apps/web/content/docs/reference/config.mdx`, `apps/web/content/docs/reference/locale.mdx`, `apps/web/content/docs/reference/slide-meta.mdx`, and `apps/web/content/docs/reference/slide-transitions.mdx`
- [X] T042 [US3] Update built-in skill and skill-doc references in `packages/core/skills/current-slide/SKILL.md`, `packages/core/skills/create-slide/SKILL.md`, `packages/core/skills/create-theme/SKILL.md`, `packages/core/skills/apply-comments/SKILL.md`, `packages/core/skills/slide-authoring/SKILL.md`, and `apps/web/content/docs/skills/overview.mdx`
- [X] T043 [US3] Mark package, CLI, config, virtual module, HMR, storage, and docs inventory items complete in `specs/001-rebrand-awesome-slide/rebrand-inventory.md`

**Checkpoint**: Canonical technical names are available and documented, with compatibility paths covered by tests or explicit validation notes.

---

## Phase 6: User Story 4 - Clean Editor Surface for Power Users (Priority: P4)

**Goal**: A power user gets a calm, dense editor surface that preserves slide preview prominence while applying the Awesome Slide visual system.

**Independent Test**: Review the runtime app at 375px, 768px, 1024px, and 1440px for no horizontal scroll, visible focus states, stable loading states, readable contrast, and a dominant slide canvas.

### Implementation for User Story 4

- [ ] T044 [P] [US4] Implement CSS custom properties and Tailwind token bindings in `packages/core/src/app/styles.css`
- [ ] T045 [US4] Redesign app shell, home layout, slide browser, and canvas framing in `packages/core/src/app/routes/home-shell.tsx`, `packages/core/src/app/routes/home.tsx`, `packages/core/src/app/components/thumbnail-rail.tsx`, and `packages/core/src/app/components/slide-canvas.tsx`
- [ ] T046 [US4] Redesign sidebar and folder controls in `packages/core/src/app/components/sidebar/sidebar.tsx`, `packages/core/src/app/components/sidebar/folder-item.tsx`, `packages/core/src/app/components/sidebar/mobile-pill.tsx`, and `packages/core/src/app/components/sidebar/icon-picker.tsx`
- [ ] T047 [US4] Redesign inspector, panel shell, and save states in `packages/core/src/app/components/inspector/inspector-panel.tsx`, `packages/core/src/app/components/inspector/comment-widget.tsx`, `packages/core/src/app/components/panel/panel-shell.tsx`, and `packages/core/src/app/components/panel/save-card.tsx`
- [ ] T048 [US4] Redesign theme gallery, theme detail, assets view, and empty/loading states in `packages/core/src/app/routes/themes.tsx`, `packages/core/src/app/components/themes/themes-gallery.tsx`, `packages/core/src/app/components/themes/theme-detail.tsx`, `packages/core/src/app/routes/assets.tsx`, and `packages/core/src/app/components/asset-view.tsx`
- [ ] T049 [US4] Redesign slide route, presenter route, player controls, and progress feedback in `packages/core/src/app/routes/slide.tsx`, `packages/core/src/app/routes/presenter.tsx`, `packages/core/src/app/components/player.tsx`, and `packages/core/src/app/components/pdf-progress-toast.tsx`
- [ ] T050 [P] [US4] Align web docs chrome and MDX treatment with the design system in `apps/web/app/docs/layout.tsx`, `apps/web/app/docs/[[...slug]]/page.tsx`, `apps/web/lib/layout.shared.tsx`, and `apps/web/components/mdx.tsx`
- [ ] T051 [US4] Record viewport, keyboard focus, contrast, reduced-motion, loading-state, and no-overlap review results in `specs/001-rebrand-awesome-slide/validation-notes.md`

**Checkpoint**: Runtime and docs UI express the new design system without sacrificing editor density or slide-preview priority.

---

## Phase 7: Polish and Cross-Cutting Concerns

**Purpose**: Finish demo, repo maintenance, changesets, and final validation across all implemented stories.

- [ ] T052 [P] Update demo package scripts, dependency names, canonical config, legacy config fallback, and TypeScript includes in `apps/demo/package.json`, `apps/demo/awesome-slide.config.ts`, `apps/demo/open-slide.config.ts`, and `apps/demo/tsconfig.json`
- [ ] T053 [P] Rebrand demo slide and theme examples in `apps/demo/slides/open-slide-launch/index.tsx`, `apps/demo/slides/open-slide-anatomy/index.tsx`, `apps/demo/themes/aurora.md`, `apps/demo/themes/bright-sans.md`, and `apps/demo/themes/sticker-pop.md`
- [ ] T054 [P] Update repository guides and GitHub templates in `AGENTS.md`, `CLAUDE.md`, `.github/ISSUE_TEMPLATE/config.yml`, `.github/ISSUE_TEMPLATE/bug_report.yml`, and `.github/ISSUE_TEMPLATE/feature_request.yml`
- [ ] T055 Add the required package changeset for core and CLI changes in `.changeset/rebrand-awesome-slide.md`
- [ ] T056 Run `pnpm check`, `pnpm typecheck`, `pnpm test`, and `pnpm build`, then record results in `specs/001-rebrand-awesome-slide/validation-notes.md`
- [ ] T057 Run the final legacy-brand inventory scan and update completion status in `specs/001-rebrand-awesome-slide/rebrand-inventory.md`
- [ ] T058 Review migration copy and release-prep notes in `references/AWESOME_SLIDE_BRAND_MIGRATION.md`, `packages/core/README.md`, and `packages/cli/README.md`

---

## Dependencies and Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup and blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational. This is the MVP scope.
- **User Story 2 (Phase 4)**: Depends on Foundational. It can run after or alongside User Story 1, with coordination on shared marketing copy.
- **User Story 3 (Phase 5)**: Depends on Foundational. Complete technical compatibility tasks before depending on canonical package/config names in starter or demo work.
- **User Story 4 (Phase 6)**: Depends on Foundational and the design-system document from T010.
- **Polish (Phase 7)**: Depends on the desired user stories being complete.

### User Story Dependencies

- **US1 (P1)**: No dependency on other user stories after Foundation.
- **US2 (P2)**: No user-story dependency for copy/template work; canonical package usage should wait for US3 package decisions if those tasks are implemented in parallel.
- **US3 (P3)**: No dependency on US1 or US2 after Foundation, but its compatibility aliases protect existing users before broad technical renames.
- **US4 (P4)**: No dependency on other user stories after Foundation, except that runtime copy from US1 should be merged before final visual review.

### Within Each User Story

- Write the listed tests before implementation for stories that include tests.
- Update inventory status after each story's implementation is complete.
- Keep compatibility aliases in place until tests or validation notes prove old projects still load.
- Avoid editing `packages/core/src/app/components/ui` unless regenerating shadcn components.

---

## Parallel Execution Examples

### User Story 1

```text
Task: T013 Add locale product-name coverage in packages/core/src/locale/brand.test.ts
Task: T016 Update docs entry-page brand copy in apps/web/content/docs/index.mdx, apps/web/content/docs/getting-started.mdx, and apps/web/content/docs/meta.json
Task: T017 Update root and package README brand copy in README.md, packages/core/README.md, and packages/cli/README.md
```

### User Story 2

```text
Task: T024 Update starter package scripts, dependency names, and TypeScript includes in packages/cli/template/package.json and packages/cli/template/tsconfig.json
Task: T025 Update starter project README and agent guide copy in packages/cli/template/README.md, packages/cli/template/AGENTS.md, and packages/cli/template/CLAUDE.md
Task: T027 Rebrand the landing demo slide mirror in apps/web/components/landing/demo-slide/index.tsx
Task: T028 Update marketing section copy and visual brand styling in apps/web/components/landing/how-it-works.tsx, apps/web/components/landing/anatomy.tsx, apps/web/components/landing/live-demo.tsx, and apps/web/app/(home)/landing.css
```

### User Story 3

```text
Task: T030 Add config resolution tests in packages/core/src/vite/open-slide-plugin.test.ts
Task: T031 Add runtime CLI help and binary alias coverage in packages/core/src/cli/run.test.ts
Task: T041 Update CLI and reference documentation examples in apps/web/content/docs/cli/*.mdx and apps/web/content/docs/reference/*.mdx
Task: T042 Update built-in skill and skill-doc references in packages/core/skills/*/SKILL.md and apps/web/content/docs/skills/overview.mdx
```

### User Story 4

```text
Task: T044 Implement CSS custom properties and Tailwind token bindings in packages/core/src/app/styles.css
Task: T050 Align web docs chrome and MDX treatment in apps/web/app/docs/layout.tsx, apps/web/app/docs/[[...slug]]/page.tsx, apps/web/lib/layout.shared.tsx, and apps/web/components/mdx.tsx
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational.
3. Complete Phase 3: User Story 1.
4. Stop and validate standard app/docs brand identity with the inventory scan.

### Incremental Delivery

1. Deliver US1 so the visible product identity is coherent.
2. Deliver US3 before relying on canonical technical names in broad starter/demo work.
3. Deliver US2 so new users scaffold and see Awesome Slide from the first command.
4. Deliver US4 so the editor and docs chrome match the new design system.
5. Complete Phase 7 to validate, document, and prepare release artifacts.

### Parallel Team Strategy

1. One owner completes Setup and Foundational inventory/design decisions.
2. After Foundation, separate owners can work US1 docs/runtime copy, US2 starter/marketing, US3 compatibility tests and aliases, and US4 UI tokens.
3. Coordinate before touching shared files listed in multiple phases, especially `packages/core/src/app/routes/slide.tsx`, package metadata, and README files.

---

## Notes

- `[P]` tasks touch different files or can proceed without waiting for unfinished tasks in the same phase.
- `[US1]`, `[US2]`, `[US3]`, and `[US4]` map to the user stories in `specs/001-rebrand-awesome-slide/spec.md`.
- Any implementation touching `packages/core` or `packages/cli` requires the changeset in T055.
- Biome must pass before commit.
