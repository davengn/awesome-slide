# Implementation Plan: Default Slide Themes From theme-design-md

**Branch**: `codex/008-default-themes-awesome-design-md-plan` | **Date**: 2026-05-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-default-themes-awesome-design-md/spec.md`

## Summary

Build a bundled default theme pipeline for Awesome Slide using the local `references/theme-design-md` corpus as source material. The initial delivery includes 15 marketing-oriented themes across product launch, campaign, marketplace, SaaS, commerce, fintech, collaboration, editorial, entertainment, and consumer categories. The implementation will add a versioned theme manifest, deterministic import tooling, a bundled theme registry in `@awesome-slide/core`, generated slide demos rendered through Awesome Slide, gallery filtering/source attribution, slide creation support, preview/apply behavior for existing slides or decks, and structured theme metadata for agent chat. Project themes remain first-class and are merged beside bundled defaults without being overwritten.

## Technical Context

**Language/Version**: TypeScript 5.9 strict mode, React 18, Node.js >=18.

**Primary Dependencies**: Existing `@awesome-slide/core` dependencies: Vite 5 plugin APIs, fast-glob, React Router, Tailwind CSS, shadcn/ui primitives, lucide-react icons, existing theme gallery/detail components, existing slide management APIs, existing agent chat proposal/preview/apply contracts, and existing `DesignSystem` utilities. No new runtime dependency is planned.

**Storage**: Generated bundled theme artifacts in `packages/core` source and dist outputs; project-added themes remain under configured `themesDir` (default `themes`). Reference source material remains under `references/theme-design-md` and is not read at runtime.

**Testing**: Vitest for manifest parsing/adaptation, bundled-plus-project registry merge, conflict handling, import diagnostics, theme summary generation, slide creation from bundled themes, and agent apply-theme validation. Manual/runtime checks through the demo app for gallery layout, preview rendering, theme creation selection, and before/after apply behavior. Final gates use `pnpm check`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.

**Target Platform**: Awesome Slide local browser runtime served by the core Vite plugin, plus npm-published `@awesome-slide/core` runtime assets and optional `@awesome-slide/cli` template docs.

**Project Type**: pnpm + Turbo monorepo framework packages; implementation is concentrated in `packages/core` with possible `packages/cli/template` documentation updates.

**Performance Goals**: Theme gallery registry should be available synchronously from generated metadata. Gallery preview placeholders must avoid layout shift. Initial gallery render should remain under 200ms after app bootstrap for the curated default set, and preview demo modules should load lazily per visible/opened theme. Import tooling should process the local 71-theme corpus in under 5 seconds on a normal developer machine.

**Constraints**: Runtime must not require network access. Reference files and remote preview pages must not be executed in the app. Bundled outputs must include source attribution and verified license metadata before release. Bundled theme IDs must be stable and slug-safe. New dependencies must be avoided unless a future task justifies a dev-only parser dependency outside the shipped runtime. `packages/core` or `packages/cli` implementation changes require a changeset.

**Scale/Scope**: Curated initial bundle of 15 marketing-oriented default themes from the 71 local references, plus importer support for all current `references/theme-design-md/*/DESIGN.md` files. The other 56 source themes are documented as future-integration backlog tasks. Runtime registry must support bundled defaults and project themes in one gallery and one agent context.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Plan Response |
|-----------|--------|---------------|
| I. Agent-Native by Design | PASS | Theme metadata is explicitly exposed to agent chat, and theme application routes through proposal preview/apply behavior. |
| II. Package Discipline | PASS | Work is scoped mainly to `@awesome-slide/core`; implementation must include a changeset and avoids new runtime dependencies. |
| III. Clean Code Baseline | PASS | Plan uses existing Vite/app/theme patterns, keeps shadcn-generated files untouched, and requires Biome gates. |
| IV. Monorepo Convention | PASS | Commands run from the repo root with pnpm/Turbo filters; source changes stay under established package boundaries. |
| V. Ship Small, YAGNI | PASS | The initial bundle is capped at 15 marketing-oriented themes instead of importing all 71 references, and user-level theme directories remain optional future extension. |

**Post-Design Recheck**: PASS. Research, data model, contracts, and quickstart keep runtime offline, preserve user themes, avoid untrusted preview execution, and keep bundled metadata compact.

## Project Structure

### Documentation (this feature)

```text
specs/008-default-themes-awesome-design-md/
|-- spec.md
|-- plan.md
|-- research.md
|-- data-model.md
|-- theme-backlog.md
|-- quickstart.md
`-- contracts/
    |-- theme-gallery-application-contract.md
    |-- theme-import-contract.md
    `-- theme-manifest-contract.md
```

### Source Code (repository root)

```text
references/
`-- theme-design-md/
    `-- <reference-slug>/
        |-- DESIGN.md
        `-- README.md

packages/core/
|-- scripts/
|   `-- import-theme-design-md.ts
|-- src/
|   |-- app/
|   |   |-- components/
|   |   |   |-- themes/
|   |   |   |   |-- theme-detail.tsx
|   |   |   |   `-- themes-gallery.tsx
|   |   |   `-- slide-management/
|   |   |       `-- CreateSlideDialog.tsx
|   |   |-- default-themes/
|   |   |   |-- generated/
|   |   |   |   |-- demos/
|   |   |   |   |-- manifest.ts
|   |   |   |   `-- source-snapshot.json
|   |   |   `-- registry.ts
|   |   |-- lib/
|   |   |   |-- agent-chat-context.ts
|   |   |   |-- design.ts
|   |   |   `-- themes.ts
|   |   `-- virtual.d.ts
|   |-- http/
|   |   |-- agent-chat-api.ts
|   |   `-- management-api.ts
|   `-- vite/
|       `-- themes-plugin.ts
`-- package.json

packages/cli/
`-- template/
    |-- AGENTS.md
    |-- CLAUDE.md
    `-- README.md

.changeset/
`-- <patch-changeset>.md
```

**Structure Decision**: Implement as a `packages/core` runtime capability because the theme registry, gallery, slide creation, agent context, and Vite virtual modules live there. Use `references/theme-design-md` only as maintainer/import input. Update `packages/cli/template` only if documentation or scaffold guidance must mention bundled defaults. Documentation and contracts live under `specs/008-default-themes-awesome-design-md/`.

## Phase 0 Research Output

Research is complete in [research.md](./research.md) with decisions for:

- Treating `references/theme-design-md` as the plan source of truth.
- Selecting the 15-theme marketing-focused initial default set.
- Documenting the 56 non-initial source themes as future-integration backlog tasks.
- Defining stable bundled theme IDs.
- Parsing the local `DESIGN.md` subset without a shipped runtime dependency.
- Mapping richer reference tokens into the current `DesignSystem`.
- Generating Awesome Slide demos instead of executing reference previews.
- Merging bundled defaults with project themes.
- Extending gallery filters and source attribution.
- Supporting slide creation and existing-slide/deck theme application.
- Exposing structured theme metadata to agent chat.
- Reporting update/change diagnostics for maintainers.

## Phase 1 Design Output

Design artifacts are complete:

- [data-model.md](./data-model.md): source references, manifests, tokens, registry entries, demos, import runs, diagnostics, change reports, and application proposals.
- [theme-backlog.md](./theme-backlog.md): future-integration backlog tasks for all source themes outside the initial delivery set.
- [contracts/theme-manifest-contract.md](./contracts/theme-manifest-contract.md): generated manifest shape consumed by runtime, gallery, create dialog, and agent context.
- [contracts/theme-import-contract.md](./contracts/theme-import-contract.md): maintainer import command behavior, inputs, outputs, diagnostics, and deterministic update requirements.
- [contracts/theme-gallery-application-contract.md](./contracts/theme-gallery-application-contract.md): runtime registry, gallery, slide creation, apply-theme, and agent context behavior.
- [quickstart.md](./quickstart.md): validation loop for import, gallery, creation, apply flow, agent context, update reporting, package-size review, and final gates.
- Renumbering note: this feature now lives under `specs/008-default-themes-awesome-design-md/`.

## Resolved Planning Assumptions

- The local `references/theme-design-md` snapshot is the source of truth for this feature; no runtime network fetch is required.
- The initial bundled set is locked to 15 marketing-oriented themes: `apple`, `airbnb`, `bmw`, `figma`, `framer`, `linear.app`, `miro`, `nike`, `notion`, `shopify`, `spotify`, `stripe`, `vercel`, `webflow`, and `wired`.
- The remaining 56 source themes stay out of initial delivery and are documented as future-integration backlog tasks.
- Bundled IDs use a stable `default-<reference-slug>` form, with slug normalization for dotted names such as `linear.app`.
- Project themes remain under configured `themesDir` and are merged with bundled defaults without file mutation.
- Bundled demo slides render through the existing `SlideCanvas` and `Page[]` demo module path.
- Reference `DESIGN.md` content is parsed as a constrained structured source; unsupported fields produce diagnostics rather than silent fallback.
- Theme application to existing content changes metadata/design through proposal preview/apply and requires confirmation outside immediate slide creation.
- Agent context uses structured theme summaries from the manifest instead of regex-only CSS variable extraction.
- Implementation touching `packages/core` or `packages/cli` must include a patch changeset.

## Complexity Tracking

No constitution violations are present.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
