# Data Model: Default Slide Themes From theme-design-md

## ReferenceThemeSource

Represents one local source folder under `references/theme-design-md`.

**Fields**

- `slug`: Source folder name, for example `figma` or `linear.app`.
- `designPath`: Project-relative path to `references/theme-design-md/<slug>/DESIGN.md`.
- `readmePath`: Optional project-relative path to `README.md`.
- `sourceUrl`: Optional URL derived from README or configured source metadata.
- `snapshot`: Optional source snapshot identifier or commit SHA.
- `rawVersion`: Optional `version` field from `DESIGN.md`.
- `rawName`: Optional `name` field from `DESIGN.md`.
- `rawDescription`: Optional `description` field from `DESIGN.md`.

**Validation**

- `designPath` must exist and stay inside `references/theme-design-md`.
- `slug` must be non-empty and derived from the folder name.
- Missing optional source URL is a warning, not an import failure.

## ThemeManifest

Versioned generated metadata consumed by the runtime registry, gallery, create dialog, and agent context.

**Fields**

- `schemaVersion`: Manifest schema version, initially `1`.
- `id`: Stable slug-safe theme ID, for example `default-figma`.
- `sourceKind`: `bundled` or `project`.
- `name`: User-facing display name.
- `description`: Short user-facing summary.
- `source`: `ThemeSourceAttribution`.
- `tags`: Search/filter tags such as `product`, `technical`, `dark`, `pitch`, `workshop`.
- `moods`: Smaller controlled list for UI filters.
- `useCases`: Slide contexts where the theme fits.
- `capabilities`: `ThemeCapabilities`.
- `tokens`: `ThemeTokens`.
- `design`: Compact `DesignSystem` used by slide demos and default design application.
- `demo`: `ThemeDemoRef`.
- `agentSummary`: Compact agent-facing description.
- `body`: Optional inspectable guidance body or generated summary.

**Validation**

- `id`, `name`, `description`, `source`, `tokens.palette`, `design`, and `demo` are required for bundled themes.
- `id` must match the same slug-safe constraints accepted by theme and slide metadata paths.
- `sourceKind` controls source label rendering and conflict handling.
- `schemaVersion` must be supported by the runtime loader.

## ThemeSourceAttribution

Records where an imported theme came from.

**Fields**

- `referenceSlug`: Source folder slug.
- `referencePath`: Project-relative `DESIGN.md` path.
- `upstreamName`: Optional upstream project or corpus name.
- `upstreamUrl`: Optional upstream or getdesign page URL.
- `snapshot`: Optional commit SHA or snapshot label.
- `license`: License name when verified.
- `licenseUrl`: Optional URL or project-relative license path.
- `attributionText`: Short display-safe attribution string.

**Validation**

- Bundled themes must include `referenceSlug`, `referencePath`, and `attributionText`.
- Release tasks must verify `license` before publishing generated bundled themes.

## ThemeTokens

Normalized subset of reference design tokens retained for UI, agent context, and demo generation.

**Fields**

- `palette`: Record of color role names to hex/rgb/css color strings.
- `typography`: Record of type role names to `ThemeTypographyRole`.
- `radii`: Record of radius names to CSS length strings.
- `spacing`: Record of spacing names to CSS length strings.
- `components`: Optional compact component token summaries.
- `rawSections`: Optional list of top-level sections detected during import.

**Validation**

- `palette` must contain at least a background/canvas-like color, an ink/text-like color, and one accent/primary color after adaptation.
- `typography` must include a display/headline-like role and a body-like role after adaptation.
- Unsupported token values produce diagnostics and are omitted from generated runtime summaries.

## ThemeTypographyRole

Normalized typography role extracted from a reference source.

**Fields**

- `fontFamily`: CSS font-family string or named source font.
- `fontSize`: CSS length string when present.
- `fontWeight`: Numeric or string font weight when present.
- `lineHeight`: Number or CSS length string when present.
- `letterSpacing`: CSS length string when present.

**Validation**

- `fontFamily` is required for roles used to generate the compact `DesignSystem`.
- Missing optional fields fall back to current Awesome Slide design defaults.

## ThemeCapabilities

Describes runtime behavior and UI affordances.

**Fields**

- `hasDemo`: Whether a generated or project demo is loadable.
- `supportsLight`: Whether the theme has a usable light presentation surface.
- `supportsDark`: Whether the theme has a usable dark presentation surface.
- `canCreateSlide`: Whether the theme can be selected during slide creation.
- `canApplyToSlide`: Whether the theme can be applied to existing slides.
- `canApplyToDeck`: Whether the theme can be applied across a deck.
- `agentVisible`: Whether the theme appears in agent context.

**Validation**

- Bundled defaults must set `hasDemo`, `canCreateSlide`, `canApplyToSlide`, and `agentVisible` to true.
- `canApplyToDeck` may be false until deck-level preview/apply is implemented.

## ThemeDemoRef

References a generated or project-authored demo module.

**Fields**

- `kind`: `generated-bundled` or `project-file`.
- `moduleId`: Importable module ID or virtual module key.
- `pageCount`: Expected number of demo pages.
- `previewPageIndex`: Page index used for gallery card thumbnails.
- `sourcePath`: Optional project-relative source path for diagnostics.

**Validation**

- `pageCount` must be greater than zero when `hasDemo` is true.
- Generated bundled demos must be imported lazily by theme ID.

## ThemeRegistryEntry

Runtime representation returned from `virtual:awesome-slide/themes`.

**Fields**

- `id`: Theme ID.
- `name`: Display name.
- `description`: Short summary.
- `sourceKind`: `bundled` or `project`.
- `tags`: Search tags.
- `moods`: Filter tags.
- `capabilities`: Theme capabilities.
- `attribution`: Display-safe source attribution.
- `design`: Optional compact design for preview and application.
- `body`: Inspectable source/guidance text.
- `hasDemo`: Backward-compatible boolean.

**Relationships**

- Derived from `ThemeManifest` for bundled defaults.
- Derived from existing project theme files for `project` entries.
- Used by theme gallery, detail view, create dialog, management API, and agent context.

## ThemeImportRun

One maintainer import execution.

**Fields**

- `sourceRoot`: Project-relative source root, normally `references/theme-design-md`.
- `selectedSlugs`: Source slugs selected for bundled output.
- `snapshot`: Optional source snapshot identifier supplied by maintainer.
- `startedAt`: ISO timestamp.
- `completedAt`: ISO timestamp.
- `status`: `completed`, `completed-with-warnings`, or `failed`.
- `diagnostics`: `ThemeImportDiagnostic[]`.
- `changes`: `ThemeChangeReport`.
- `writtenFiles`: Project-relative generated artifact paths.

**Validation**

- `selectedSlugs` must exist in `sourceRoot`.
- Failed imports must not partially overwrite generated manifests without reporting written files.

## ThemeImportDiagnostic

Structured import issue.

**Fields**

- `slug`: Source slug.
- `path`: Source or generated path.
- `severity`: `info`, `warning`, or `error`.
- `code`: Stable diagnostic code.
- `message`: Human-readable message.
- `recovery`: Optional maintainer action.

**Validation**

- Error diagnostics prevent a theme from entering the bundled manifest.
- Warning diagnostics allow import but must appear in the import report.

## ThemeChangeReport

Summary of changes between previous generated artifacts and a new import run.

**Fields**

- `added`: Theme IDs added.
- `changed`: Theme IDs with generated content changes.
- `removed`: Theme IDs no longer selected or no longer present.
- `unchanged`: Theme IDs without generated output changes.
- `failed`: Theme IDs skipped due to errors.
- `conflicts`: Theme IDs or source slugs with collision or attribution issues.

**Validation**

- Project theme files are never included in `removed` and must never be deleted by import tooling.

## ThemeApplicationProposal

Represents a user or agent request to apply a theme to existing content.

**Fields**

- `themeId`: Registry theme ID.
- `scope`: `slide` or `deck`.
- `targetIds`: Slide IDs or deck ID.
- `preview`: Before/after preview artifact references.
- `operations`: Metadata/design/source operations to apply.
- `requiresConfirmation`: Boolean.
- `validation`: Existing proposal validation checks, including `theme-exists`.

**State Transitions**

- `selected` -> `previewed` -> `confirmed` -> `applied`.
- `selected` -> `previewed` -> `cancelled`.
- `selected` -> `invalid` when theme or target validation fails.

**Validation**

- Existing slide/deck application must require confirmation.
- `themeId` must exist in the merged registry.
- Deck scope must clearly list affected slides before apply.
