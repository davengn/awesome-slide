# Awesome Slide agent guide

Use `AGENTS.md` as the canonical repository guide for Awesome Slide.

## Constitution

Project governance is defined in `.specify/memory/constitution.md`.
The five non-negotiable principles:

1. **Agent-Native by Design** — features MUST work through agent skills
2. **Package Discipline** — changesets for core/cli; no casual deps
3. **Clean Code Baseline** — Biome gate; comments only for non-obvious WHY
4. **Monorepo Convention** — pnpm + Turbo; `pnpm <pkg> <script>`
5. **Ship Small, YAGNI** — no premature abstractions

When this file and `AGENTS.md` conflict, the constitution wins.

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
- specs/001-rebrand-awesome-slide/plan.md
- specs/002-reshape-landing-navigation/plan.md
- specs/003-slide-management-ui/plan.md
<!-- SPECKIT END -->
