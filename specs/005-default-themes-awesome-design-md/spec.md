# Specification: Default Slide Themes From awesome-design-md

## Status

Planning

## Product Vision Alignment

Awesome Slide should ship with useful, inspectable default themes so new decks can look intentional immediately. Themes should be derived from open design guidance, previewable in the app, and easy for users to update, customize, and extend.

## Problem Statement

The current theme system supports local themes and previews, but Awesome Slide needs a stronger default library. The `VoltAgent/awesome-design-md` repository provides a curated collection of `DESIGN.md` files inspired by real brand systems. Awesome Slide should use that repository as a source for default slide themes while preserving licensing, updateability, safety, and user customization.

## Goals

- Import a curated default set of slide themes from `https://github.com/VoltAgent/awesome-design-md`.
- Discover theme source files, parse their design guidance, and convert them into Awesome Slide theme packages.
- Preview, select, and apply themes from the slide creation and slide management workflows.
- Support future updates from the upstream repository through a pinned source version and repeatable import process.
- Support user-added themes alongside bundled defaults.

## Non-Goals

- Do not copy every upstream theme into the default bundle if package size or quality suffers.
- Do not claim ownership of third-party brand identities represented by upstream design files.
- Do not execute arbitrary upstream preview HTML inside the app without sanitization or isolation.
- Do not make theme application require a network connection at runtime.
- Do not prevent users from creating themes outside the upstream source format.

## Source Context

- `awesome-design-md` is a MIT-licensed curated collection of `DESIGN.md` files for AI/coding agents.
- The repository stores design files under `design-md/<theme-slug>/DESIGN.md` and commonly includes `preview.html` and `preview-dark.html` visual catalogs.
- The collection includes creative-tool and productivity references such as Figma, Miro, Notion, Linear, Vercel, Framer, Webflow, and others.
- The upstream README describes the `DESIGN.md` format as covering visual theme, color roles, typography, component styling, layout principles, depth, do/don't rules, responsive behavior, and agent prompt guidance.
- The repository currently has no published releases, so Awesome Slide should pin by commit SHA rather than release version until upstream release tags exist.

## User Stories

- As a new user, I want to pick a polished theme when creating a slide so my first deck looks good quickly.
- As a creator, I want to preview themes on real slide content before applying them.
- As a designer, I want to inspect the design guidance behind a theme so I understand its style rules.
- As a maintainer, I want to update bundled themes from upstream through a repeatable process.
- As a power user, I want to add my own themes and have them appear beside bundled themes.
- As an agent chat user, I want the agent to understand available themes when I ask it to redesign a slide.

## Functional Requirements

- FR-001: Awesome Slide must define a theme manifest format for bundled and user-added themes.
- FR-002: The import process must discover upstream themes from `design-md/*/DESIGN.md`.
- FR-003: The import process must parse or extract theme metadata: slug, display name, source, description, palette, typography, layout mood, light/dark support, preview availability, and license attribution.
- FR-004: The default bundle must include a curated initial set suited to slide creation, creative workflows, documentation, product updates, technical talks, and pitch decks.
- FR-005: Suggested initial candidates should include design-tool and productivity oriented themes such as Figma, Miro, Notion, Linear, Vercel, Framer, Webflow, and one or more developer/AI themes where they fit slide use cases.
- FR-006: The app must show a theme gallery with previews, search/filter, style metadata, and source attribution.
- FR-007: Theme previews must render through Awesome Slide's own slide preview path rather than trusting arbitrary upstream HTML by default.
- FR-008: Users must be able to select a theme during slide creation.
- FR-009: Users must be able to apply a theme to an existing slide or deck, with preview before applying when the change rewrites slide design.
- FR-010: Agent chat must be able to read available theme metadata and propose theme application through preview/apply behavior.
- FR-011: User-added themes must be discoverable from project themes and optional user-level theme directories.
- FR-012: User-added themes must be visually distinguished from bundled defaults while sharing the same preview and apply UI.
- FR-013: Upstream update tooling must preserve local custom themes and clearly show added, changed, removed, and conflicted bundled themes.
- FR-014: Imported themes must include license and source attribution in docs or metadata.
- FR-015: Theme import failures must report invalid format, missing required metadata, unsupported assets, parse failure, and preview generation failure.

## UX Requirements

- UX-001: The theme gallery should use large aspect-ratio previews because users choose themes visually.
- UX-002: Theme cards must show name, short mood/usage description, bundled or user-added source, and light/dark capability where known.
- UX-003: Users should be able to filter by mood or use case, such as editorial, technical, product update, pitch, workshop, minimal, dark, or playful.
- UX-004: Applying a theme to an existing slide or deck must show before/after preview and make the scope explicit.
- UX-005: Theme application from slide creation may be immediate, but existing-content theme changes need confirmation.
- UX-006: Empty states should explain where user-added themes can be placed and how to import from a `DESIGN.md`.
- UX-007: Theme update UI should be maintainer-oriented and explicit about source commit, changed files, and conflicts.
- UX-008: Theme previews must remain stable in grid layout and avoid layout shift while loading.
- UX-009: The gallery should follow Awesome Slide's visual system while letting each theme preview express its own style.
- UX-010: Attribution should be present but not visually dominate the selection workflow.

## Technical Considerations

- Existing theme runtime areas include `packages/core/src/app/lib/themes.ts`, `packages/core/src/vite/themes-plugin.ts`, and `packages/core/src/app/components/themes/themes-gallery.tsx`.
- The current theme model includes `id`, `name`, `description`, `body`, and `hasDemo`; the default-theme work likely needs a richer manifest with source, version, tags, capabilities, design tokens, demo slides, and attribution.
- Upstream `DESIGN.md` files are design guidance, not guaranteed executable slide themes. Awesome Slide needs an adapter that converts guidance into slide-compatible design systems and demo pages.
- Import tooling should pin an upstream commit SHA and write generated artifacts deterministically so updates can be reviewed.
- Because the upstream repository has no releases, update checks should compare against a configured branch or commit and require explicit maintainer action.
- Package size should be monitored. Bundled defaults can include parsed metadata and generated demos, while optional full source files may be included only when useful for agent context.
- Preview HTML from upstream should be treated as reference material, not executable app content, unless sandboxed.
- User theme discovery should support project-local `themes/` first and optional user-level paths after connection/settings support exists.
- Theme application should produce structured changes where possible and route broad rewrites through the agent preview/apply pipeline.

## Acceptance Criteria

- AC-001: A documented theme manifest format supports bundled and user-added themes.
- AC-002: An import process can read `awesome-design-md` theme folders from a pinned source and produce Awesome Slide theme artifacts.
- AC-003: A curated default theme set appears in the app theme gallery with previews and attribution.
- AC-004: Users can choose a default theme when creating a slide.
- AC-005: Users can preview and apply a theme to an existing slide or deck.
- AC-006: User-added themes appear alongside bundled themes and can be previewed.
- AC-007: Theme update tooling reports upstream changes without overwriting user-added themes.
- AC-008: Agent chat can reference available themes by ID, name, tags, and design summary.
- AC-009: The app does not execute arbitrary upstream preview HTML in the normal gallery path.
- AC-010: License and source attribution for imported themes is available in metadata or docs.

## Implementation Phases

### Phase 1: Theme Source and Manifest Design

- Define the Awesome Slide theme manifest and required metadata.
- Choose the initial curated upstream theme candidates.
- Decide which source files are bundled, generated, or retained only for maintainer tooling.

### Phase 2: Import Tooling

- Build deterministic import tooling for `design-md/*/DESIGN.md`.
- Add metadata extraction, attribution, source commit pinning, and parse diagnostics.
- Generate demo slides or preview metadata for each imported theme.

### Phase 3: Theme Gallery and Selection

- Extend the gallery with richer cards, filters, source labels, and stable preview loading.
- Add theme selection to slide creation.
- Add user-added theme discovery.

### Phase 4: Theme Application and Agent Integration

- Add preview/apply flow for applying themes to existing slides and decks.
- Expose theme metadata to the agent chat context.
- Support agent-proposed theme changes through the same preview/apply pipeline.

### Phase 5: Update and Maintenance Workflow

- Add maintainer command or documented process for checking upstream updates.
- Report added, changed, removed, and conflicted themes.
- Verify package size, license attribution, app previews, and regression tests before release.

