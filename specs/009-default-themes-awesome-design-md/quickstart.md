# Quickstart: Default Slide Themes From theme-design-md

## Prerequisites

- Work from the repository root.
- Keep `references/theme-design-md` available locally.
- Do not run implementation commands from package subdirectories.
- If implementation touches `packages/core` or `packages/cli`, add a patch changeset.

## 1. Generate Bundled Theme Artifacts

After the importer exists, run:

```bash
pnpm core import:themes -- \
  --source references/theme-design-md \
  --themes apple,airbnb,bmw,figma,framer,linear.app,miro,nike,notion,shopify,spotify,stripe,vercel,webflow,wired \
  --snapshot <source-snapshot>
```

Expected result:

- Generated manifest under `packages/core/src/app/default-themes/generated/manifest.ts`.
- Generated demo modules under `packages/core/src/app/default-themes/generated/demos/`.
- Source snapshot metadata under `packages/core/src/app/default-themes/generated/source-snapshot.json`.
- Import report shows selected, changed, skipped, failed, and warning diagnostics.

Run dry-run/check mode before committing generated updates once available:

```bash
pnpm core import:themes -- --source references/theme-design-md --check
```

## 2. Verify Gallery Rendering

Start the demo app:

```bash
pnpm dev
```

Open the slide management app and navigate to Themes.

Verify:

- Bundled default themes appear beside project themes.
- Source labels distinguish bundled defaults from project themes.
- Filtering works by name, mood, tag, and source.
- Preview cards keep a stable 16:9 area while loading.
- Opening a bundled theme detail page shows generated preview pages and source attribution.

## 3. Verify Slide Creation

From slide management, open Create slide.

Verify:

- Bundled themes with demos are available as templates.
- Selecting a bundled theme creates a slide using the generated demo/template source.
- The created slide metadata stores the bundled theme ID, for example `default-figma`.
- Project themes still work through existing `themes/<id>.demo.tsx` files.

## 4. Verify Existing Slide Theme Application

Open an existing slide or deck and request a theme change.

Verify:

- The flow shows before/after preview before apply.
- The target scope is explicit.
- Unknown theme IDs fail validation.
- Confirming apply patches only expected slide metadata, design, or source.
- Cancelling leaves files unchanged.

## 5. Verify Agent Context

Open agent chat with theme context enabled.

Verify:

- Available theme summaries include bundled and project themes.
- Summaries include ID, name, source kind, tags, moods, palette hints, and attribution.
- Full reference source is not included unless a user explicitly asks to inspect a theme.
- Agent-proposed theme changes use the existing `apply-theme` operation and preview/apply path.

## 6. Verify Update Reporting

Change one local reference file in a throwaway worktree or fixture and run import check mode.

Verify:

- Changed themes appear in the change report.
- Added and removed selected slugs are reported.
- Project `themesDir` files are not modified.
- Diagnostics identify source path and recovery action.

## 7. Review Package Size and Attribution

Before release:

- Confirm generated demos and manifests are compact.
- Confirm source attribution and verified license metadata are present for each bundled theme.
- Confirm no remote preview HTML or external assets are executed in the app.

## 8. Final Gates

Run:

```bash
pnpm check
pnpm typecheck
pnpm test
pnpm build
```

If `packages/core` or `packages/cli` changed, add:

```bash
pnpm changeset
```

Use a one-line patch changeset description.
