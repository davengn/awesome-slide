# Implementation Plan: Reshape Landing, Sidebar, and Navigation

**Branch**: `002-reshape-landing-navigation` | **Date**: 2026-05-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-reshape-landing-navigation/spec.md`

**Note**: The local Spec Kit bash setup script was not used because `bash` resolves to WSL in this Windows environment and no Linux distribution is installed. This feature was inserted between existing roadmap specs, so the previous `002`-`005` planning folders were shifted to `003`-`006`.

## Summary

Reshape the Awesome Slide marketing landing page, shared/top navigation, and runtime sidebar so the rebrand from `specs/001-rebrand-awesome-slide` becomes a stronger layout system, not only a token pass. The plan uses `references/REBRANDING_DESIGN_FINAL.md` and `references/AWESOME_SLIDE_DESIGN_SYSTEM.md` as normative Figma-style guidance, and uses `ui-ux-pro-max` as supplemental UX/design research for landing structure, responsive navigation, keyboard behavior, reduced-motion handling, and Next.js implementation practices.

## Technical Context

**Language/Version**: TypeScript; React 18 in `packages/core`; React 19 and Next.js 16 in `apps/web`.

**Primary Dependencies**: pnpm 10, Turbo, Vite 5, React Router, Tailwind CSS 4, Lucide icons, Fumadocs, Biome, Vitest.

**Storage**: N/A for new persistent data. The feature reshapes existing UI state and routes.

**Testing**: `pnpm.cmd check`, `pnpm.cmd typecheck`, `pnpm.cmd test`, `pnpm.cmd build`, plus browser validation of landing/nav/sidebar at 375px, 768px, 1024px, and 1440px.

**Target Platform**: Browser-based marketing/docs site and local Awesome Slide runtime UI.

**Project Type**: pnpm/Turbo monorepo with `apps/web` for marketing/docs and `packages/core` for runtime UI.

**Performance Goals**: Preserve responsive interactions at 60 fps, avoid layout shift in nav/sidebar rows, keep motion optional, and avoid adding heavy runtime dependencies.

**Constraints**: Do not hand-edit `packages/core/src/app/components/ui`. Do not add dependencies casually. Core changes require a changeset if implementation touches `packages/core`. Keep repeated app cards at 8px radius or less; reserve 24px+ radius for marketing color blocks and large callouts.

**Scale/Scope**: Landing page route and components, shared web navbar/docs chrome, runtime home/sidebar/mobile navigation, and design validation documentation.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution at `.specify/memory/constitution.md` is still the default template and does not define enforceable principles. Gate status: **PASS**, with repository rules from `AGENTS.md` treated as binding implementation constraints:

- Biome must pass before commit or known unrelated failures must be recorded.
- `packages/core` or `packages/cli` changes require a changeset.
- Do not hand-edit generated shadcn UI components unless regenerating.
- Do not add dependencies casually, especially in `packages/core`.
- Keep comments rare and only for non-obvious reasons.

No constitution violations are present in this plan.

## Project Structure

### Documentation (this feature)

```text
specs/002-reshape-landing-navigation/
|-- spec.md
|-- plan.md
|-- research.md
|-- data-model.md
|-- quickstart.md
`-- contracts/
    `-- navigation-layout-contract.md
```

### Source Code (repository root)

```text
apps/web/
|-- app/
|   |-- (home)/
|   |   |-- landing.css
|   |   `-- layout.tsx
|   |-- docs/
|   |   `-- layout.tsx
|   `-- global.css
|-- components/
|   `-- landing/
|       |-- nav.tsx
|       |-- hero.tsx
|       |-- how-it-works.tsx
|       |-- anatomy.tsx
|       |-- agents.tsx
|       |-- assets.tsx
|       |-- get-started.tsx
|       `-- footer.tsx
`-- lib/
    `-- layout.shared.tsx

packages/core/
`-- src/
    `-- app/
        |-- styles.css
        |-- routes/
        |   |-- home.tsx
        |   `-- home-shell.tsx
        `-- components/
            `-- sidebar/
                |-- sidebar.tsx
                |-- folder-item.tsx
                |-- icon-picker.tsx
                `-- mobile-pill.tsx
```

**Structure Decision**: Keep the existing monorepo layout. Implement web-facing landing and navbar work in `apps/web`, runtime sidebar/mobile navigation work in `packages/core`, and shared design tokens through the existing Awesome Slide CSS variables from 001.

## Complexity Tracking

No constitution violations or new packages are required.

## Phase 0: Research

Research output is recorded in [research.md](./research.md). Key decisions:

- Treat `references/REBRANDING_DESIGN_FINAL.md` as the authoritative Figma-style source and `references/AWESOME_SLIDE_DESIGN_SYSTEM.md` as the local implementation adapter.
- Use `ui-ux-pro-max` recommendations for landing structure, block-based layout, keyboard navigation, reduced motion, sticky navigation compensation, and Next.js link/image practices.
- Override any `ui-ux-pro-max` dark palette or Fira font recommendation with the Awesome Slide/Figma-derived black-white, pastel block, Geist/Inter, and mono-label system.
- Keep the sidebar dense and product-focused rather than applying marketing-sized hero type or oversized cards inside the runtime app.

## Phase 1: Design and Contracts

Design output is recorded in:

- [data-model.md](./data-model.md)
- [quickstart.md](./quickstart.md)
- [contracts/navigation-layout-contract.md](./contracts/navigation-layout-contract.md)

The contract defines the minimum expected behavior and visual structure for landing sections, top navbar, responsive menu, runtime sidebar, mobile navigation, motion, accessibility, and validation notes.

## Post-Design Constitution Check

Gate status: **PASS**.

- The design uses existing packages and route boundaries.
- No new dependency is required.
- Generated shadcn components remain out of scope.
- Core implementation will require a changeset when this plan moves to implementation.
- Browser validation is explicitly required because layout is the primary behavior.

## Planned Implementation Phases

### Phase 1: Layout Audit and Wireframe Mapping

- Inventory current landing, top nav, docs nav, runtime sidebar, and mobile navigation components.
- Map each current section to a target Figma-style role: white hero, monochrome nav, single-color pastel block, product mock, dense runtime row, or mobile drawer/pill.
- Identify copy that must stay, copy that can be shortened, and product preview assets that should remain inspectable.

### Phase 2: Landing Page Reshape

- Recompose the landing first viewport around product identity, value copy, black/white CTA pair, and a real product or slide preview.
- Use a white-canvas hero and alternating editorial sections with single pastel color blocks.
- Keep one dominant CTA pair per viewport and reserve magenta for a scarce promo or emphasis moment.
- Ensure section spacing returns to white canvas between color blocks.

### Phase 3: Web Navbar and Shared Chrome

- Reshape `apps/web/components/landing/nav.tsx` and shared layout chrome to use the 56px monochrome navigation rhythm.
- Use internal `next/link` for internal destinations.
- Add or preserve skip-link/focus behavior, mobile menu behavior, and fixed/sticky offset compensation.
- Keep CTA buttons pill-shaped and icon controls circular.

### Phase 4: Runtime Sidebar and Mobile Navigation

- Reshape runtime sidebar groups, folder rows, icon picker affordances, mobile pill, and home-shell navigation to match the Awesome Slide product system.
- Use compact typography, hairline dividers, black selected states, restrained pastel empty states, and stable row dimensions.
- Preserve slide preview dominance and avoid marketing-card composition inside dense app chrome.

### Phase 5: Validation and Release Prep

- Run source scans for drift from final tokens.
- Review browser screenshots or DevTools snapshots at 375px, 768px, 1024px, and 1440px.
- Verify keyboard navigation, focus states, reduced-motion behavior, and no horizontal scroll.
- Run `pnpm.cmd check`, `pnpm.cmd typecheck`, `pnpm.cmd test`, and `pnpm.cmd build`; record any unrelated pre-existing failures.
- Add a changeset if implementation touches `packages/core`.
