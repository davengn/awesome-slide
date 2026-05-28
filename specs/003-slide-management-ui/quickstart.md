# Quickstart: Slide Management UI

## Prerequisites

- Node.js >=18
- pnpm 10
- Existing dependencies installed with `pnpm install`

## Development Loop

1. Start the demo runtime:

   ```bash
   pnpm dev:demo
   ```

2. Open the local demo URL printed by Vite.

3. Validate the management surface from the home route:

   - Create a blank slide and confirm a new `slides/<id>/index.tsx` appears.
   - Create from a theme/template and confirm `meta.theme` is set when a theme is selected.
   - Create from prompt and confirm a placeholder slide is created with the prompt in `meta.notes`.
   - Open a slide from grid and list modes.
   - Search by title, ID, tag, and folder/deck.
   - Sort by updated date, created date, title, and manual order.
   - Rename, duplicate, delete, move, and edit metadata from visible controls.
   - Confirm destructive actions require confirmation.
   - Confirm failures display inline and do not show false success.
   - Confirm unsupported source shapes show read-only warnings for slide-owned fields but allow folder/deck changes.

4. Validate responsive behavior:

   - 375px: sidebar/inspector collapse to drawers and create/search/open/delete still work.
   - 768px: navigation and management body remain stable without horizontal scroll.
   - 1024px and 1440px: two- or three-zone layout keeps previews and metadata readable.

5. Validate static read-only behavior:

   ```bash
   pnpm build
   ```

   Serve or inspect the generated demo build and confirm mutation controls are disabled or replaced with read-only guidance.

## Focused Test Targets

Run focused tests while implementing:

```bash
pnpm core test -- src/editing/meta-source.test.ts
pnpm core test -- src/files/folders.test.ts
pnpm core test -- src/http/request-guard.test.ts
pnpm core typecheck
```

Add new tests for:

- `SlideMeta` parse/read/write helpers.
- Manifest loading with missing fields defaulting correctly.
- Management endpoint validation and error responses.
- Create/duplicate/delete/move/metadata patch behavior.
- Sort/search helpers for title, ID, tag, folder, deck, created date, updated date, and manual order.
- Source state detection and field editability logic.

## Final Gates

Run before considering implementation complete:

```bash
pnpm check
pnpm typecheck
pnpm test
pnpm build
```

Because implementation touches `packages/core`, add a changeset:

```bash
pnpm changeset
```

Use a short user-facing patch description, for example:

```text
Add native slide management workflows for creating, organizing, and editing slide metadata.
```
