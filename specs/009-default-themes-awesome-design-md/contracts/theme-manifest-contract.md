# Contract: Theme Manifest

## Purpose

Define the generated manifest shape consumed by the bundled default theme registry, project theme adapter, gallery UI, slide creation, theme application, and agent chat context.

## TypeScript Shape

```ts
export type ThemeSourceKind = 'bundled' | 'project';

export type ThemeCapabilities = {
  hasDemo: boolean;
  supportsLight: boolean;
  supportsDark: boolean;
  canCreateSlide: boolean;
  canApplyToSlide: boolean;
  canApplyToDeck: boolean;
  agentVisible: boolean;
};

export type ThemeSourceAttribution = {
  referenceSlug?: string;
  referencePath?: string;
  upstreamName?: string;
  upstreamUrl?: string;
  snapshot?: string;
  license?: string;
  licenseUrl?: string;
  attributionText: string;
};

export type ThemeTypographyRole = {
  fontFamily: string;
  fontSize?: string;
  fontWeight?: string | number;
  lineHeight?: string | number;
  letterSpacing?: string;
};

export type ThemeTokens = {
  palette: Record<string, string>;
  typography: Record<string, ThemeTypographyRole>;
  radii: Record<string, string>;
  spacing: Record<string, string>;
  components?: Record<string, unknown>;
  rawSections?: string[];
};

export type ThemeDemoRef = {
  kind: 'generated-bundled' | 'project-file';
  moduleId: string;
  pageCount: number;
  previewPageIndex: number;
  sourcePath?: string;
};

export type ThemeManifest = {
  schemaVersion: 1;
  id: string;
  sourceKind: ThemeSourceKind;
  name: string;
  description: string;
  source: ThemeSourceAttribution;
  tags: string[];
  moods: string[];
  useCases: string[];
  capabilities: ThemeCapabilities;
  tokens: ThemeTokens;
  design: import('../lib/design').DesignSystem;
  demo: ThemeDemoRef;
  agentSummary: string;
  body?: string;
};
```

## ID Rules

- Bundled IDs use `default-<normalized-reference-slug>`.
- Dots and unsupported slug characters become `-`, so `linear.app` becomes `default-linear-app`.
- IDs must be stable across imports unless the source slug changes.
- Project theme IDs keep existing file-derived behavior.

## Runtime Compatibility

The existing `Theme` type remains source-compatible:

```ts
export type Theme = {
  id: string;
  name: string;
  description: string;
  body: string;
  hasDemo: boolean;
  sourceKind?: 'bundled' | 'project';
  tags?: string[];
  moods?: string[];
  capabilities?: ThemeCapabilities;
  attribution?: ThemeSourceAttribution;
  design?: DesignSystem;
};
```

Existing consumers may continue reading `id`, `name`, `description`, `body`, and `hasDemo`.

## Validation Rules

- Bundled manifests must include source attribution.
- Bundled manifests must include a compact `DesignSystem`.
- Bundled manifests must include a generated demo with at least one page.
- `agentSummary` must stay short enough for agent context and should not include full source bodies.
- Unsupported manifest schema versions fail fast with an actionable diagnostic.
