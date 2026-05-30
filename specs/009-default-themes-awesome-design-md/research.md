# Research: Default Slide Themes From theme-design-md

## Decision: Use `references/theme-design-md` as the source of truth

**Rationale**: The user requested that spec 007 reference `references/theme-design-md`, and the local snapshot contains 71 `DESIGN.md` files under `references/theme-design-md/<slug>/DESIGN.md`. Planning against the checked-in corpus makes the importer deterministic, reviewable, and offline.

**Alternatives considered**: Fetching `VoltAgent/awesome-design-md` at plan or runtime was rejected because runtime network access is unnecessary and would make builds less reproducible. Treating the corpus as user-provided theme files was rejected because bundled defaults need attribution, versioning, and generated demos.

## Decision: Ship a marketing-focused initial bundle of 15 themes

**Rationale**: The user requested 15 initial themes related to marketing categories and less focused on AI themes such as `cursor` or `claude`. The initial bundle should cover a broad marketing deck surface: premium product launch (`apple`), marketplace and lifestyle (`airbnb`), automotive and premium brand (`bmw`), design tool marketing (`figma`), creative web launch (`framer`), SaaS product craft (`linear.app`), workshop and collaboration (`miro`), consumer campaign (`nike`), productivity and workspace (`notion`), commerce and growth (`shopify`), entertainment and culture (`spotify`), fintech and platform (`stripe`), developer platform marketing (`vercel`), no-code and agency marketing (`webflow`), and editorial media (`wired`).

**Alternatives considered**: Shipping all 71 references was rejected because it increases bundle size and review scope. Prioritizing AI-agent themes was rejected because the initial delivery should be more useful for marketing, product, campaign, and business storytelling decks. Shipping only existing demo themes was rejected because it does not satisfy the default-theme goal.

## Decision: Document non-initial themes as future-integration backlog tasks

**Rationale**: The remaining 56 source themes still have value, but they should not expand the first delivery scope. A dedicated backlog document preserves every source slug, groups related themes into future integration tasks, and makes it clear which themes are intentionally deferred.

**Alternatives considered**: Dropping non-initial themes from the plan was rejected because future maintainers would lose traceability. Adding all deferred themes to the initial import command as disabled entries was rejected because it creates implementation complexity before those themes are selected for delivery.

## Decision: Use stable bundled IDs prefixed with `default-`

**Rationale**: Existing project themes use file-derived IDs from `themes/<id>.md`. Prefixing bundled IDs, for example `default-figma` and `default-linear-app`, avoids collisions while keeping IDs slug-safe for metadata, URLs, and slide `theme` fields.

**Alternatives considered**: Using raw source slugs was rejected because project themes can use the same IDs. Namespaced IDs such as `default:figma` were rejected because existing code expects slug-like identifiers in several paths.

## Decision: Parse a constrained `DESIGN.md` subset without a shipped runtime dependency

**Rationale**: The source files follow a predictable YAML-like structure with scalar metadata and nested token maps. The importer can extract top-level scalar fields and token sections deterministically in maintainer tooling while generating compact TypeScript/JSON artifacts for runtime. No parser dependency should ship in `@awesome-slide/core` runtime.

**Alternatives considered**: Adding a YAML runtime dependency was rejected because parser work happens before runtime and the package should stay small. Regex-only extraction was rejected for nested color and typography sections because diagnostics need reliable missing-field reporting.

## Decision: Map reference tokens into both compact `DesignSystem` and richer manifest summaries

**Rationale**: Current slide rendering accepts a small `DesignSystem` with `palette`, `fonts`, `typeScale`, and `radius`. The reference corpus has richer `colors`, `typography`, `rounded`, `spacing`, and `components` maps. Runtime demos need the compact design, while gallery filters and agents need richer summaries.

**Alternatives considered**: Expanding `DesignSystem` to mirror every reference token was rejected for the initial feature because it would widen public/runtime API surface. Keeping only the existing Markdown body was rejected because agents and filters need structured metadata.

## Decision: Generate Awesome Slide demo modules for previews

**Rationale**: The local reference snapshot has no preview HTML or assets, and the spec requires not executing arbitrary reference material. Generated `Page[]` demo modules can use `SlideCanvas`, current theme preview loading, and the same rendering path users see for real slides.

**Alternatives considered**: Embedding screenshots was rejected because the local corpus has no image assets and screenshots would add binary weight. Loading remote preview pages was rejected because runtime previews must be offline and safe.

## Decision: Merge bundled defaults and project themes in the virtual theme registry

**Rationale**: Existing runtime code imports `virtual:awesome-slide/themes` and uses it in gallery, create slide, and agent context. Extending this registry keeps the UI and agent surfaces coherent while preserving project `themesDir` behavior.

**Alternatives considered**: Creating a separate `defaultThemes` import was rejected because every consumer would need duplicate merge logic. Copying bundled themes into each new project was rejected because updates would not reach existing projects and could overwrite user files.

## Decision: Keep project themes first-class and visibly distinguish source

**Rationale**: Power users need their `themes/*.md` files to remain discoverable. Gallery cards should label bundled versus project source and retain project theme demos. If IDs conflict despite prefixing, the runtime should report diagnostics instead of silently hiding themes.

**Alternatives considered**: Making bundled themes replace project themes was rejected because it violates user customization. Hiding project themes until a filter is selected was rejected because existing behavior already treats project themes as the primary library.

## Decision: Route existing slide/deck theme application through proposal preview/apply

**Rationale**: Applying a theme to existing content can change metadata, design tokens, or generated source. Existing agent chat and proposal systems already model `apply-theme`, validation, previews, and confirmation. Reusing that path keeps risk visible.

**Alternatives considered**: Immediately mutating slide metadata from the gallery was rejected because users need before/after confirmation for existing content. Limiting themes to create-time templates was rejected because the spec requires applying to existing slides and decks.

## Decision: Expose structured theme summaries to agent chat

**Rationale**: Current agent context derives limited color hints by regexing CSS variables from theme bodies. Default themes need richer data: ID, display name, source, tags, palette, typography, mood, usage, and design summary. Agents can then propose a suitable theme without reading full source bodies by default.

**Alternatives considered**: Passing full `DESIGN.md` content into every context was rejected because it inflates prompt size. Keeping regex-only summaries was rejected because the generated manifests already contain better metadata.

## Decision: Make update tooling report source changes without modifying project themes

**Rationale**: Maintainers need deterministic diffs when `references/theme-design-md` changes. The import command should report added, changed, removed, selected, skipped, failed, and conflicted themes, plus generated artifact paths and source snapshot metadata.

**Alternatives considered**: Auto-updating bundled themes at app startup was rejected because it requires runtime file mutation and network-like behavior. Manual copy/paste updates were rejected because they are not repeatable.
