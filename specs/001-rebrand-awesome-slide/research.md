# Research: Rebrand and Redesign as Awesome Slide

## Decision: Use dual product naming rules

**Decision**: Use `Awesome Slide` for user-facing product copy and `awesome-slide` for technical identifiers, package names, binaries, config file names, generated folder names, and documentation examples.

**Rationale**: The spec needs a clear split between human-readable brand and installable/importable identifiers. This reduces churn in documentation and prevents inconsistent forms such as `AwesomeSlide`, `Awesome slide`, or `awesome slide`.

**Alternatives considered**:

- Keep `open-slide` in technical identifiers permanently. Rejected because it weakens the fork's product identity and leaves new workflows feeling bolted onto the old product.
- Rename every technical identifier immediately with no compatibility. Rejected because current slide projects, docs examples, and public imports depend on `@open-slide/core`, `open-slide`, and `open-slide.config.ts`.

## Decision: Use a phased public compatibility strategy

**Decision**: Make the new canonical names `@awesome-slide/core`, `@awesome-slide/cli`, `awesome-slide`, and `awesome-slide.config.ts`, while keeping existing `@open-slide/core`, `@open-slide/cli`, `open-slide`, and `open-slide.config.ts` as compatibility aliases for one major cycle.

**Rationale**: Package, command, and config names are public contracts. Immediate replacement would break existing projects and tests. A phased strategy lets the project ship the new product identity while giving users actionable migration paths.

**Alternatives considered**:

- Only rebrand UI/docs and leave npm packages unchanged. Rejected because the product would still install and scaffold under the old brand.
- Publish only new packages and remove old packages. Rejected because it creates a hard break before the rest of the product migration is proven.

## Decision: Keep internal runtime aliases stable first

**Decision**: Treat `virtual:open-slide/*`, `open-slide:*` HMR events, `node_modules/.open-slide`, and `open-slide:*` localStorage keys as internal-but-observable compatibility surfaces. Introduce canonical Awesome Slide names only after tests prove both forms work.

**Rationale**: These values appear in app imports, Vite plugins, state handoff files, and persisted user preferences. Some users or local agent workflows may depend on them even if they were not marketed as public APIs.

**Alternatives considered**:

- Rename internal IDs immediately because they are not official public APIs. Rejected because the current agent context file and skills mention `node_modules/.open-slide/current.json`, and the runtime relies on virtual module and HMR names.
- Never rename internal IDs. Rejected because future code would remain semantically tied to the old brand.

## Decision: Use a repo-local design source of truth

**Decision**: Create a durable Awesome Slide design document, then implement tokens through existing CSS custom properties and Tailwind 4 `@theme` integration in `packages/core/src/app/styles.css`.

**Rationale**: The project already uses Tailwind 4, shadcn/Radix components, Lucide icons, and CSS variables. A new dependency would increase runtime size and add migration risk without solving the immediate design-system problem.

**Alternatives considered**:

- Add a separate design-system package immediately. Rejected because there is not enough evidence that tokens need to be consumed outside the current monorepo packages.
- Hardcode visual changes inside React components. Rejected because it would scatter brand decisions and make future slide management, agent chat, and connection settings inconsistent.

## Decision: Adapt the rebrand reference for app surfaces

**Decision**: Use `references/REBRANDING_DESIGN.md` as the primary visual direction: monochrome core UI, editorial typography, restrained shadows, pill text CTAs, circular icon buttons, and oversized pastel color-block moments. For the app shell, apply color blocks selectively to onboarding, empty states, theme previews, and major context changes rather than every repeated card.

**Rationale**: Slide creation needs a calm, durable workspace where the slide canvas stays dominant. The reference is expressive enough for marketing and empty states, but dense editor surfaces need restraint.

**Alternatives considered**:

- Apply full marketing color-block styling to all app panels. Rejected because it would reduce scanability in slide management and inspector workflows.
- Use a dark dashboard palette because the app is an editor. Rejected because it conflicts with the rebrand reference and would make Awesome Slide feel like a generic SaaS dashboard.

## Decision: Migrate strings through existing localization and docs surfaces

**Decision**: Update runtime copy through `packages/core/src/locale/*`, documentation through `apps/web/content/docs`, and generated starter copy through `packages/cli/template`. Avoid introducing new hardcoded product strings in React components.

**Rationale**: The app already has locale modules with `appTitle: 'open-slide'`, and docs/templates already own their copy. Centralized copy migration makes the inventory testable.

**Alternatives considered**:

- Replace strings wherever they appear. Rejected because it makes future localization and auditing harder.
- Only update English copy. Rejected because locale files in Japanese, Simplified Chinese, and Traditional Chinese carry product names and must remain consistent.

## Decision: Use an explicit rebrand inventory

**Decision**: Maintain a rebrand inventory with fields for path, match, category, replacement, compatibility decision, owner area, validation method, and status.

**Rationale**: `rg` found many references across package metadata, source, docs, skills, demos, generated templates, GitHub config, tests, changelogs, and app storage keys. A table or structured file prevents accidental replacement of compatibility aliases, historical changelog content, or test fixtures.

**Alternatives considered**:

- Run a global search-and-replace. Rejected because some old names must remain as aliases and historical records.
- Track migration only in tasks. Rejected because implementation will span multiple packages and needs a durable audit artifact.

## Decision: Validate visual quality with existing tooling plus manual viewport review

**Decision**: Use existing checks (`pnpm check`, `pnpm typecheck`, `pnpm test`, package builds, web build/type checks) and add manual visual review at 375px, 768px, 1024px, and 1440px for redesigned surfaces. Add automated visual tooling only if implementation scope later justifies it.

**Rationale**: The repo does not currently expose a Playwright dependency in the root workflow. Adding one just for the plan would violate the "do not add dependencies casually" rule.

**Alternatives considered**:

- Add Playwright immediately for visual testing. Deferred because this plan is docs-only and implementation should first identify the exact visual surfaces to cover.
- Rely only on unit tests. Rejected because brand and responsive quality cannot be verified by unit tests alone.
