# Implementation Plan: Slide Management UI

**Branch**: `003-slide-management-ui` | **Date**: 2026-05-28 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-slide-management-ui/spec.md`

## Summary

Replace the agent-command-oriented slide management surface with a native UI for creating, browsing, organizing, and editing slides and decks. The management API is the authoritative contract — not a compat layer over old endpoints. The manifest is a clean v1 Awesome Slide format with decks and manual order from the start.

## Technical Context

**Language/Version**: TypeScript (strict), targeting ES2022

**Primary Dependencies**: React 19, Vite 6, Tailwind CSS 4, shadcn/ui, Babel parser (already in tree), fast-glob (already in tree)

**Storage**: File-based — `slides/.folders.json` for collection manifest, `slides/<id>/index.tsx` for slide source and metadata

**Testing**: Vitest for parser helpers, manifest operations, and endpoint validation; browser validation against demo app

**Target Platform**: Local dev server (Vite plugin) for mutations; static builds for read-only browsing

**Project Type**: Monorepo package (`@awesome-slide/core`) exposing runtime, Vite plugin, and dev-server middleware

**Performance Goals**: Grid/list rendering with live slide previews must feel responsive; manifest reads under 50ms; metadata writes preserve author formatting

**Constraints**: No cloud backend; no new runtime dependencies that inflate core package size; source writes must preserve TSX validity; canvas is fixed 1920x1080

**Scale/Scope**: Tens to low hundreds of slides per project; single-user local dev; no real-time collaboration

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Agent-Native by Design | PASS | All management operations will be expressible through agent skills; the UI is the primary surface but every mutation has an API path agents can drive |
| II. Package Discipline | PASS | Changes touch `packages/core`; a changeset will be included. No new dependencies unless justified against install-size impact |
| III. Clean Code Baseline | PASS | Biome gate applies. Comments only for non-obvious WHY. shadcn components left alone |
| IV. Monorepo Convention | PASS | All work in `packages/core`. Scripts via `pnpm core <script>` |
| V. Ship Small, YAGNI | PASS | No multi-select bulk ops, no screenshot pipeline, no cloud API. Decks and manual order included because the spec requires them for organization |

No violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/003-slide-management-ui/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── management-api-contract.md
│   ├── management-ui-contract.md
│   └── metadata-persistence-contract.md
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
packages/core/src/
├── files/
│   ├── folders.ts              # Existing: folder manifest read/write
│   ├── slide-management.ts     # New: manifest schema (decks, order), metadata read/write helpers
│   └── slide-ops.ts            # New: create, duplicate, delete file operations
├── http/
│   ├── management-api.ts       # New: /__management/* route handlers
│   └── request-guard.ts        # Existing: mutation request validation
├── vite/
│   └── open-slide-plugin.ts    # Modified: extend virtual modules for new metadata fields
├── app/
│   ├── lib/
│   │   ├── sdk.ts              # Modified: extend SlideMeta, add Deck/DeckId/SlideRecord types
│   │   ├── folders.ts          # Modified: consume new manifest shape, add deck/order operations
│   │   └── management.ts       # New: hook wrapping management API for UI components
│   ├── components/
│   │   └── slide-management/   # New: all management UI components
│   │       ├── SlideGrid.tsx
│   │       ├── SlideList.tsx
│   │       ├── SlideCard.tsx
│   │       ├── SlideInspector.tsx
│   │       ├── CreateSlideDialog.tsx
│   │       ├── DeleteConfirmDialog.tsx
│   │       ├── SearchSortToolbar.tsx
│   │       └── ManagementSidebar.tsx
│   └── routes/
│       ├── home.tsx             # Modified: integrate management surface
│       └── slide.tsx            # Modified: consume extended metadata
└── editing/
    └── meta-source.ts          # New: parser-guided read/write for export const meta

packages/core/tests/
├── files/
│   ├── manifest.test.ts        # New: manifest schema validation, deck/order operations
│   └── meta-source.test.ts     # New: parser-guided source read/write
└── http/
    └── management-api.test.ts  # New: endpoint validation and error responses
```

**Structure Decision**: All new code lives in `packages/core/src` under existing domain directories. Management UI components go in `components/slide-management/`. New file I/O helpers go in `files/`. New HTTP routes go in `http/`. No new packages or apps.

## Complexity Tracking

No violations to track.
