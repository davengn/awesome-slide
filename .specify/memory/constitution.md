<!--
  Sync Impact Report
  ==================
  Version change: initial → 1.0.0
  Modified principles: N/A (initial ratification)
  Added sections:
    - Core Principles (5 principles)
    - Technology Stack
    - Development Workflow
    - Governance
  Removed sections: N/A
  Templates requiring updates:
    - .specify/templates/plan-template.md: ✅ no changes needed (Constitution Check already generic)
    - .specify/templates/spec-template.md: ✅ no changes needed (structure compatible)
    - .specify/templates/tasks-template.md: ✅ no changes needed (structure compatible)
  Follow-up TODOs: none
-->

# Awesome Slide Constitution

## Core Principles

### I. Agent-Native by Design

Every feature MUST consider the agent-authoring workflow first. Awesome
Slide exists so agents can write slides — any new API, component, or
workflow MUST be expressible through the agent skill system. If a feature
cannot be driven by an agent, it does not belong in the framework.

### II. Package Discipline

All changes to `@awesome-slide/core` or `@awesome-slide/cli` MUST include
a changeset (`pnpm changeset`). Descriptions MUST be one line, present
tense, user-facing. No manual version bumps or `CHANGELOG.md` edits.
Dependencies MUST NOT be added casually — every dep in `core` inflates
end-user install size.

### III. Clean Code Baseline

Biome MUST pass before every commit (`pnpm check` or `pnpm check:fix`).
Comments are reserved for non-obvious WHY only — no WHAT-descriptions,
no PR references, no section banners, no commented-out code. Shadcn UI
components under `packages/core/src/app/components/ui` are biome-ignored
and MUST NOT be hand-edited unless regenerating.

### IV. Monorepo Convention

pnpm + Turbo monorepo. Framework packages live in `packages/` and publish
to npm. Dogfood apps live in `apps/`. Shared config via `biome.json`,
`turbo.json`, `pnpm-workspace.yaml`, and per-package `tsconfig.json`.
Filter with `pnpm <pkg> <script>` — never `cd` into packages to run
commands.

### V. Ship Small, YAGNI

Start simple. Do not design for hypothetical future requirements. Three
similar lines beat a premature abstraction. No half-finished
implementations. Every addition MUST justify its existence against
install-size impact and API surface.

## Technology Stack

- **Language**: TypeScript (strict)
- **UI**: React, Tailwind CSS, shadcn/ui
- **Build**: Vite (plugin in core), Turbo (monorepo orchestration)
- **Package manager**: pnpm (workspaces)
- **Linting/formatting**: Biome (format + lint + organize imports)
- **Testing**: Vitest
- **Versioning**: Changesets (`@changesets/cli`)
- **Canvas**: Fixed 1920 × 1080 — not configurable

## Development Workflow

1. **Lint gate**: `pnpm check` MUST pass before commit. CI enforces this.
2. **Changeset gate**: Any change to `packages/core` or `packages/cli`
   MUST include a changeset. Apps and root tooling are exempt.
3. **No manual versions**: `changeset version` owns `CHANGELOG.md` and
   `package.json` bumps. Never edit these by hand.
4. **Test before release**: `pnpm test` MUST pass. `pnpm build` MUST
   succeed across the full graph.
5. **Commit discipline**: Descriptive messages. One logical change per
   commit when practical.

## Governance

This constitution is the authoritative source for non-negotiable project
rules. All PRs and code reviews MUST verify compliance with the
principles above.

- **Amendments** require documentation of the change, maintainer approval,
  and a migration plan if the change breaks existing patterns.
- **Complexity exceptions** MUST be recorded in the plan's Complexity
  Tracking table with justification and the simpler alternative rejected.
- **Runtime guidance** lives in `AGENTS.md` and `CLAUDE.md`. When this
  constitution and those files conflict, the constitution wins.

**Version**: 1.0.0 | **Ratified**: 2026-05-28 | **Last Amended**: 2026-05-28
