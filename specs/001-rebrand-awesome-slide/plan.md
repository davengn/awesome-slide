# Implementation Plan: Rebrand and Redesign as Awesome Slide

**Branch**: `main` | **Date**: 2026-05-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-rebrand-awesome-slide/spec.md`

**Note**: The local Spec Kit bash setup script could not run in this Windows environment because `bash` resolves to WSL and no Linux distribution is installed. This plan follows the same template and targets the explicitly requested feature directory.

## Summary

Rebrand the open-slide fork into `awesome-slide` / `Awesome Slide` across runtime UI, CLI, templates, docs, package metadata, and marketing surfaces while preserving existing slide projects through explicit compatibility aliases. The implementation will introduce a documented Awesome Slide design system, migrate user-facing copy through existing locale/docs/template surfaces, and phase public package, binary, config, virtual module, HMR event, and storage-key changes so existing projects continue to load.

## Technical Context

**Language/Version**: TypeScript; Node.js >=18 for packages; React 18 in `packages/core` and `apps/demo`; React 19 and Next.js 16 in `apps/web`.

**Primary Dependencies**: pnpm 10, Turbo, Vite 5, React Router, Tailwind CSS 4, shadcn/Radix UI components, Lucide icons, Fumadocs, Changesets, Biome, Vitest.

**Storage**: Local project files (`slides/`, `themes/`, config files, package metadata, docs), generated runtime files under `node_modules/.open-slide`, browser `localStorage` keys for UI preferences, and package-manager metadata.

**Testing**: `pnpm check`, `pnpm typecheck`, `pnpm test`, package builds, web build/type checks, and manual responsive/accessibility review for redesigned UI surfaces.

**Target Platform**: Browser-based local development runtime, generated static slide builds, npm packages for runtime and scaffolding, and Next.js marketing/docs site.

**Project Type**: pnpm/Turbo monorepo with framework runtime (`packages/core`), scaffolding CLI (`packages/cli`), dogfood app (`apps/demo`), and web/docs app (`apps/web`).

**Performance Goals**: Keep slide editor interactions at 60 fps, preserve current dev-server hot reload behavior, avoid blank loading states, and avoid adding heavy runtime dependencies to `packages/core`.

**Constraints**: Do not hand-edit `packages/core/src/app/components/ui` unless regenerating shadcn components. Add a changeset for any implementation touching `packages/core` or `packages/cli`. Do not break existing slide projects using `@open-slide/core`, `open-slide`, `open-slide.config.ts`, `virtual:open-slide/*`, or existing persisted UI keys unless a compatibility path exists.

**Scale/Scope**: Rebrand spans package metadata, runtime app shell, CLI commands/output/templates, demo, docs/marketing content, locale strings, built-in skills, tests, config names, virtual module identifiers, HMR event names, and storage paths.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution at `.specify/memory/constitution.md` is still the default template and does not define enforceable principles. Gate status: **PASS**, with repository rules from `AGENTS.md` treated as binding implementation constraints:

- Biome must pass before commit.
- `packages/core` or `packages/cli` changes require a changeset.
- Changeset descriptions must be short and user-facing.
- Do not hand-edit generated shadcn UI components unless regenerating.
- Do not add dependencies casually, especially in `packages/core`.
- Keep comments rare and only for non-obvious reasons.

No constitution violations are present in this plan.

## Project Structure

### Documentation (this feature)

```text
specs/001-rebrand-awesome-slide/
|-- spec.md
|-- plan.md
|-- research.md
|-- data-model.md
|-- quickstart.md
`-- contracts/
    |-- brand-migration-contract.md
    |-- design-system-contract.md
    `-- rebrand-inventory-contract.md
```

### Source Code (repository root)

```text
packages/core/
|-- package.json
|-- bin.js
|-- README.md
|-- skills/
`-- src/
    |-- app/
    |   |-- styles.css
    |   |-- index.html
    |   |-- components/
    |   |-- routes/
    |   |-- lib/
    |   `-- virtual.d.ts
    |-- cli/
    |-- config.ts
    |-- locale/
    |-- vite/
    `-- index.ts

packages/cli/
|-- package.json
|-- README.md
|-- src/
`-- template/
    |-- AGENTS.md
    |-- README.md
    |-- package.json
    |-- open-slide.config.ts
    `-- slides/

apps/demo/
|-- package.json
|-- README.md
|-- open-slide.config.ts
|-- slides/
`-- themes/

apps/web/
|-- app/
|-- components/
|-- content/docs/
|-- lib/
`-- package.json

.changeset/
.github/
README.md
AGENTS.md
```

**Structure Decision**: Keep the existing monorepo structure. Implement shared runtime and brand tokens in `packages/core`, generated starter changes in `packages/cli/template`, dogfood validation in `apps/demo`, and marketing/docs changes in `apps/web` and root documentation. Avoid creating a new package only for branding until implementation proves the token surface needs to be consumed outside the current package graph.

## Complexity Tracking

No constitution violations or additional projects are required.

## Phase 0: Research

Research output is recorded in [research.md](./research.md). Key decisions:

- Use `Awesome Slide` for user-facing product copy and `awesome-slide` for technical identifiers.
- Introduce `@awesome-slide/core`, `@awesome-slide/cli`, and `awesome-slide` as canonical targets, but keep existing `@open-slide/*`, `open-slide`, `open-slide.config.ts`, `virtual:open-slide/*`, HMR events, and persisted paths as compatibility aliases for one major cycle.
- Use a repo-local design source of truth plus CSS custom properties/Tailwind tokens rather than a new design-system dependency.
- Migrate copy through locale files, docs, templates, and package metadata instead of scattering literals inside components.

## Phase 1: Design and Contracts

Design output is recorded in:

- [data-model.md](./data-model.md)
- [quickstart.md](./quickstart.md)
- [contracts/brand-migration-contract.md](./contracts/brand-migration-contract.md)
- [contracts/design-system-contract.md](./contracts/design-system-contract.md)
- [contracts/rebrand-inventory-contract.md](./contracts/rebrand-inventory-contract.md)

The design contracts define the minimum interface for implementation tasks: naming rules, compatibility aliases, inventory schema, design token roles, component treatments, responsive behavior, and validation expectations.

## Post-Design Constitution Check

Gate status: **PASS**.

- The plan keeps implementation within the current monorepo structure.
- No new runtime dependency is required by the design.
- Compatibility aliases are documented for public package, CLI, config, virtual module, HMR, storage, and docs migration surfaces.
- Implementation tasks that touch `packages/core` or `packages/cli` must include a changeset.
- Generated shadcn components remain out of scope for hand edits.

## Planned Implementation Phases

### Phase 1: Brand and Migration Audit

- Create a machine-readable or table-based inventory of current `open-slide` references.
- Classify each reference as user-facing copy, public API, compatibility alias, internal implementation detail, generated template, docs content, test fixture, or historical changelog.
- Decide replacement timing for each item and document compatibility behavior.

### Phase 2: Design System Foundation

- Create the Awesome Slide design source of truth from `references/REBRANDING_DESIGN.md`.
- Map tokens into `packages/core/src/app/styles.css` without editing generated shadcn components.
- Define app, marketing, and docs treatments for navigation, panels, cards, dialogs, empty states, loading states, focus rings, and responsive breakpoints.

### Phase 3: Runtime App and Template Rebrand

- Update locale strings, app title, home/slide/theme/asset surfaces, starter template copy, config examples, and built-in skills.
- Add compatibility handling for config names, package imports, binary commands, storage keys, and generated project defaults.
- Update tests that assert old names while preserving tests for compatibility aliases.

### Phase 4: Marketing, Docs, and Demo Refresh

- Update root README, package READMEs, web landing page, docs content, demos, screenshots, and GitHub templates.
- Keep historical changelogs intact except for forward-looking links or package metadata needed for releases.
- Dogfood the new starter and demo branding.

### Phase 5: Validation and Release Prep

- Run `pnpm check`, `pnpm typecheck`, `pnpm test`, targeted package builds, and web validation.
- Review responsive behavior at 375px, 768px, 1024px, and 1440px.
- Validate existing `open-slide` projects still load through compatibility paths.
- Add changesets for `packages/core` and `packages/cli` changes.
