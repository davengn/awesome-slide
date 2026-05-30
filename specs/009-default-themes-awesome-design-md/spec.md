# Specification: Default Slide Themes From theme-design-md

## Status

Planning

## Product Vision Alignment

Awesome Slide should ship with useful, inspectable default themes so new decks can look intentional immediately. Themes should be derived from the local `references/theme-design-md` design corpus, previewable in the app, and easy for users and agents to update, customize, and extend.

## Problem Statement

The current theme system supports project-local themes and previews, but a fresh Awesome Slide project starts with no bundled theme library. The local `references/theme-design-md` directory provides a curated set of structured `DESIGN.md` files inspired by real brand systems. Awesome Slide should use that corpus as source material for default slide themes while preserving source attribution, updateability, safety, package discipline, and user customization.

## Goals

- Import a curated default set of slide themes from `references/theme-design-md`.
- Discover local source files, parse their design guidance, and convert them into Awesome Slide theme manifests, design tokens, and demo slides.
- Preview, select, and apply bundled themes from slide creation, theme gallery, slide management, and agent proposal workflows.
- Support future updates by keeping source-path and upstream-origin metadata and by making import output deterministic and reviewable.
- Support project-added themes alongside bundled defaults without overwriting user files.

## Non-Goals

- Do not copy every local reference theme into the default bundle if package size, slide fit, or quality suffers.
- Do not claim ownership of third-party brand identities represented by the reference files.
- Do not execute arbitrary reference preview code or external HTML inside the app.
- Do not make theme application require a network connection at runtime.
- Do not prevent users from creating themes outside the `theme-design-md` source format.
- Do not add casual runtime dependencies to parse the reference corpus.

## Source Context

- The source corpus for this feature is the local directory `references/theme-design-md`.
- The local corpus currently contains 71 `DESIGN.md` files under `references/theme-design-md/<theme-slug>/DESIGN.md` and 141 files total.
- Most source folders also include a `README.md` that points to the related `getdesign.md` page for previews and downloads.
- The checked-in local snapshot does not include preview HTML or image assets, so Awesome Slide must generate previews through its own slide-rendering path.
- The `DESIGN.md` files are structured markdown documents with a YAML-like frontmatter block. Common top-level keys include `version`, `name`, `description`, `colors`, `typography`, `rounded`, `spacing`, and `components`.
- Initial slide-suitable candidates should prioritize marketing, brand, product launch, campaign, and business storytelling references over AI-agent product themes.
- The reference corpus is source material, not an app runtime dependency. Bundled outputs must carry source path, source slug, upstream origin when known, source snapshot identifier when known, and license attribution before publication.

## Initial Delivery Themes

The first bundled delivery must include these 15 marketing-oriented themes:

| Source slug | Category | Marketing fit |
|-------------|----------|---------------|
| `apple` | Premium product launch | Keynotes, product reveals, hardware/software launch decks |
| `airbnb` | Marketplace and lifestyle | Travel, community, hospitality, lifestyle campaign decks |
| `bmw` | Automotive and premium brand | Premium mobility, brand campaigns, executive product updates |
| `figma` | Design tool marketing | Creative tool launches, design workflows, collaborative product stories |
| `framer` | Creative web launch | Maker campaigns, website launch narratives, creator-facing demos |
| `linear.app` | SaaS product craft | Product updates, roadmap narratives, polished B2B SaaS decks |
| `miro` | Workshop and collaboration | Facilitation decks, strategy workshops, visual collaboration narratives |
| `nike` | Consumer campaign | Lifestyle campaigns, movement, community, sports-brand storytelling |
| `notion` | Productivity and workspace | Workspace product marketing, knowledge-base launches, team enablement |
| `shopify` | Commerce and growth | Merchant growth, ecommerce campaigns, retail platform decks |
| `spotify` | Entertainment and culture | Music, creator, culture, and audience-insight presentations |
| `stripe` | Fintech and platform | Payments, developer-commerce, financial infrastructure launch decks |
| `vercel` | Developer platform marketing | Technical launch decks, product-led growth, platform storytelling |
| `webflow` | No-code and agency marketing | Website launches, agency decks, visual-builder product stories |
| `wired` | Editorial and media | Editorial reports, trend narratives, media-rich thought leadership |

AI-agent and narrower technical references such as `cursor` and `claude` are intentionally excluded from initial delivery and tracked in [theme-backlog.md](./theme-backlog.md) for future integration.

## User Stories

- As a new user, I want to pick a polished theme when creating a slide so my first deck looks good quickly.
- As a creator, I want to preview themes on real slide content before applying them.
- As a designer, I want to inspect the design guidance behind a theme so I understand its style rules.
- As a maintainer, I want to update bundled themes from `references/theme-design-md` through a repeatable process.
- As a power user, I want to add my own themes and have them appear beside bundled themes.
- As an agent chat user, I want the agent to understand available themes when I ask it to redesign a slide.

## Functional Requirements

- FR-001: Awesome Slide must define a versioned theme manifest format for bundled and user-added themes.
- FR-002: The import process must discover reference themes from `references/theme-design-md/*/DESIGN.md`.
- FR-003: The import process must extract or derive theme metadata: slug, display name, source path, source origin, description, palette, typography, spacing, radius, layout mood, tags, light/dark support, preview availability, and attribution.
- FR-004: The default bundle must include the 15 initial delivery themes listed in this specification.
- FR-005: Initial delivery must prioritize marketing-relevant themes across product launch, brand campaign, marketplace, SaaS, commerce, fintech, collaboration, editorial, entertainment, and consumer categories.
- FR-006: The app must show bundled and user themes in a unified theme gallery with previews, search/filter, style metadata, and source attribution.
- FR-007: Theme previews must render through Awesome Slide's own slide preview path rather than trusting arbitrary reference HTML or remote previews.
- FR-008: Users must be able to select a bundled or project theme during slide creation.
- FR-009: Users must be able to apply a theme to an existing slide or deck, with preview before applying when the change rewrites slide design or metadata.
- FR-010: Agent chat must be able to read available theme metadata and propose theme application through preview/apply behavior.
- FR-011: Project-added themes must remain discoverable from the configured `themesDir` and may be extended later with user-level theme directories.
- FR-012: Project-added themes must be visually distinguished from bundled defaults while sharing the same preview and apply UI.
- FR-013: Reference update tooling must preserve project custom themes and clearly show added, changed, removed, and conflicted bundled themes.
- FR-014: Imported themes must include license and source attribution in metadata or docs before being bundled for release.
- FR-015: Theme import failures must report invalid format, missing required metadata, unsupported assets, parse failure, token adaptation failure, and preview generation failure.
- FR-016: Bundled theme IDs must be stable, slug-safe, and collision-resistant with project theme IDs.
- FR-017: Themes outside the 15-theme initial delivery must be documented in a future-integration backlog with category, rationale, and backlog task scope.

## UX Requirements

- UX-001: The theme gallery should use large aspect-ratio previews because users choose themes visually.
- UX-002: Theme cards must show name, short mood or usage description, bundled or project source, and light/dark capability where known.
- UX-003: Users should be able to filter by mood or use case, such as editorial, technical, product update, pitch, workshop, minimal, dark, or playful.
- UX-004: Applying a theme to an existing slide or deck must show before/after preview and make the scope explicit.
- UX-005: Theme application from slide creation may be immediate, but existing-content theme changes need confirmation.
- UX-006: Empty states should explain where project themes can be placed and how to import from a `DESIGN.md`.
- UX-007: Reference update UI or CLI output should be maintainer-oriented and explicit about source snapshot, changed files, and conflicts.
- UX-008: Theme previews must remain stable in grid layout and avoid layout shift while loading.
- UX-009: The gallery should follow Awesome Slide's visual system while letting each theme preview express its own style.
- UX-010: Attribution should be present but not visually dominate the selection workflow.
- UX-011: Theme filters and theme application controls must be keyboard accessible and usable at common desktop and narrow widths.

## Technical Considerations

- Existing runtime areas include `packages/core/src/app/lib/themes.ts`, `packages/core/src/vite/themes-plugin.ts`, `packages/core/src/app/components/themes/themes-gallery.tsx`, `packages/core/src/app/components/themes/theme-detail.tsx`, and `packages/core/src/app/components/slide-management/CreateSlideDialog.tsx`.
- The current theme model includes `id`, `name`, `description`, `body`, and `hasDemo`; default-theme work needs a richer manifest with source, tags, capabilities, token summary, demo slides, and attribution while preserving compatibility for existing project themes.
- Existing `DesignSystem` supports `palette`, `fonts`, `typeScale`, and `radius`. The importer must map richer reference tokens into this smaller runtime design model and retain the full source summary for gallery and agent context.
- Existing theme demos are loaded as `themes/<id>.demo.tsx` from the project `themesDir`. Bundled themes need a registry path that can load generated demos from `@awesome-slide/core` without copying files into every project.
- Existing slide creation reads template source from `themesRoot`; default themes require the management API to resolve bundled template/demo sources through the theme registry instead of only project files.
- Existing agent context summarizes colors by regexing CSS variables from theme bodies. Default themes require structured manifest summaries so agents can reason about names, IDs, tags, palette, mood, and source.
- Import tooling should read the local reference corpus, avoid network access, and write generated artifacts deterministically so updates can be reviewed.
- Package size should be monitored. Bundled defaults can include compact manifests, token summaries, and generated demos; full source `DESIGN.md` content should be included only when useful for user inspection and agent context.
- Reference HTML or remote previews should be treated as reference material only and must not be executed in the normal app gallery path.
- Project theme discovery should continue to support configured `themesDir` first-class behavior and should not overwrite or mutate project theme files.

## Acceptance Criteria

- AC-001: A documented theme manifest format supports bundled and project-added themes.
- AC-002: An import process can read `references/theme-design-md/*/DESIGN.md` and produce Awesome Slide theme artifacts deterministically.
- AC-003: A curated default theme set appears in the app theme gallery with previews and attribution.
- AC-004: Users can choose a bundled default theme when creating a slide.
- AC-005: Users can preview and apply a theme to an existing slide or deck.
- AC-006: Project-added themes appear alongside bundled themes and can be previewed.
- AC-007: Theme update tooling reports reference changes without overwriting project-added themes.
- AC-008: Agent chat can reference available themes by ID, name, tags, palette summary, design summary, and source.
- AC-009: The app does not execute arbitrary reference preview HTML in the normal gallery path.
- AC-010: License and source attribution for imported themes is available in metadata or docs.
- AC-011: Default theme implementation adds a changeset if `packages/core` or `packages/cli` changes.
- AC-012: A future-integration backlog documents every non-initial `references/theme-design-md` source slug.

## Implementation Phases

### Phase 1: Theme Source and Manifest Design

- Define the Awesome Slide theme manifest and required metadata.
- Lock the 15-theme initial delivery set.
- Document non-initial source themes as future-integration backlog tasks.
- Decide which source fields are bundled, generated, or retained only for maintainer tooling.

### Phase 2: Import Tooling

- Build deterministic import tooling for `references/theme-design-md/*/DESIGN.md`.
- Add metadata extraction, attribution, source snapshot metadata, token adaptation, and parse diagnostics.
- Generate demo slides or preview metadata for each imported theme.

### Phase 3: Theme Registry, Gallery, and Selection

- Extend the runtime registry to merge bundled defaults with project themes.
- Extend the gallery with richer cards, filters, source labels, and stable preview loading.
- Add bundled theme selection to slide creation.

### Phase 4: Theme Application and Agent Integration

- Add preview/apply flow for applying themes to existing slides and decks.
- Expose structured theme metadata to the agent chat context.
- Support agent-proposed theme changes through the same preview/apply pipeline.

### Phase 5: Update and Maintenance Workflow

- Add maintainer command or documented process for checking reference updates.
- Report added, changed, removed, and conflicted themes.
- Verify package size, license attribution, app previews, and regression tests before release.
