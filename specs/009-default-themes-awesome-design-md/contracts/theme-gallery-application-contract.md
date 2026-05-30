# Contract: Theme Gallery, Creation, Application, and Agent Context

## Runtime Registry

`virtual:awesome-slide/themes` returns a merged registry:

1. Bundled default themes from generated `@awesome-slide/core` artifacts.
2. Project themes discovered from configured `themesDir`.

The registry preserves backward-compatible fields and adds optional structured fields for richer UI and agent behavior.

```ts
export type ThemeRegistryEntry = {
  id: string;
  name: string;
  description: string;
  body: string;
  hasDemo: boolean;
  sourceKind: 'bundled' | 'project';
  tags: string[];
  moods: string[];
  capabilities: ThemeCapabilities;
  attribution?: ThemeSourceAttribution;
  design?: DesignSystem;
};

export const themes: ThemeRegistryEntry[];
export function loadThemeDemo(id: string): Promise<{ default: Page[]; design?: DesignSystem }>;
```

## Gallery Behavior

- Gallery lists bundled and project themes together.
- Theme cards show preview, name, short description, source label, and light/dark capability where known.
- Filters search across name, description, tags, moods, source kind, and use cases.
- Preview modules load lazily and render through `SlideCanvas`.
- Loading states preserve the preview aspect ratio and must not shift the grid.
- Theme detail view shows source attribution and inspectable guidance.

## Slide Creation Behavior

- The create slide dialog can select any registry entry with `capabilities.canCreateSlide`.
- Bundled templates resolve through the registry demo/source loader.
- Project templates keep existing `themes/<id>.demo.tsx` resolution.
- Created slides store the selected `theme` ID in slide metadata.

## Existing Slide or Deck Application

- Applying a theme to existing content creates a previewable proposal.
- Scope must be explicit: one slide or one deck.
- Before/after preview is required before confirmation.
- Validation must include `theme-exists` and target existence checks.
- Applying a theme may patch metadata, compact design, or source only through existing mutation guards.
- Deck application must list affected slides before confirmation.

## Agent Context Behavior

Agent chat receives compact theme summaries:

```ts
export type ThemeSummary = {
  themeId: string;
  name: string;
  sourceKind: 'bundled' | 'project';
  description?: string;
  tags: string[];
  moods: string[];
  colors: Record<string, string>;
  typography?: Record<string, string>;
  useCases?: string[];
  attribution?: string;
};
```

- Full `DESIGN.md` content is not included by default.
- Agent-visible themes are controlled by `capabilities.agentVisible`.
- Agent proposals use the same `apply-theme` operation kind and preview/apply flow as user-initiated theme changes.

## Failure Behavior

- Missing demo modules show the existing no-demo state for project themes and an import diagnostic for bundled themes.
- Unknown theme IDs produce a validation failure and do not mutate files.
- Source attribution missing for bundled themes appears as a release-blocking diagnostic, not as a hidden UI failure.
