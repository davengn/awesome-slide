# Contract: Theme Import

## Purpose

Define maintainer tooling that reads `references/theme-design-md/*/DESIGN.md` and writes deterministic bundled theme artifacts.

## Proposed Command

```bash
pnpm core import:themes -- \
  --source references/theme-design-md \
  --themes apple,airbnb,bmw,figma,framer,linear.app,miro,nike,notion,shopify,spotify,stripe,vercel,webflow,wired \
  --snapshot <source-snapshot>
```

The exact package script may be finalized during implementation, but the command must accept equivalent inputs and produce equivalent outputs.

## Inputs

- `source`: Project-relative source root. Default: `references/theme-design-md`.
- `themes`: Comma-separated source slugs selected for bundled output.
- `snapshot`: Optional source snapshot identifier or commit SHA.
- `check`: Optional dry-run mode that reports changes without writing generated files.

## Outputs

- `packages/core/src/app/default-themes/generated/manifest.ts`
- `packages/core/src/app/default-themes/generated/demos/<theme-id>.tsx`
- `packages/core/src/app/default-themes/generated/source-snapshot.json`
- Import report printed to stdout.

## Import Report Shape

```ts
export type ThemeImportReport = {
  sourceRoot: string;
  selectedSlugs: string[];
  snapshot?: string;
  status: 'completed' | 'completed-with-warnings' | 'failed';
  diagnostics: ThemeImportDiagnostic[];
  changes: ThemeChangeReport;
  writtenFiles: string[];
};

export type ThemeImportDiagnostic = {
  slug: string;
  path: string;
  severity: 'info' | 'warning' | 'error';
  code:
    | 'missing-design'
    | 'invalid-format'
    | 'missing-metadata'
    | 'unsupported-token'
    | 'adaptation-failed'
    | 'preview-generation-failed'
    | 'attribution-missing'
    | 'id-conflict';
  message: string;
  recovery?: string;
};

export type ThemeChangeReport = {
  added: string[];
  changed: string[];
  removed: string[];
  unchanged: string[];
  failed: string[];
  conflicts: string[];
};
```

## Behavior

- The importer reads only files inside the configured source root.
- The importer does not fetch network resources.
- The importer does not execute source content.
- The importer writes generated files in stable sorted order.
- The importer exits non-zero when selected themes fail required validation.
- Dry-run mode reports changes and diagnostics without changing generated files.
- Project `themesDir` files are never read, changed, or deleted by import tooling.

## Required Diagnostics

- Missing `DESIGN.md`.
- Unsupported or invalid structured source.
- Missing name or description.
- Missing adaptable palette.
- Missing adaptable typography.
- Missing or unverified attribution for release-bound themes.
- Generated demo failure.
- Generated ID conflict.

## Determinism Requirements

- Re-running the importer with the same source and same selected slugs must produce byte-identical generated artifacts.
- Theme order in generated registry must be stable.
- Diagnostics must be sorted by source slug, severity, then code.
