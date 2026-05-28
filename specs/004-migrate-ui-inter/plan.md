# Implementation Plan: UI Design System Migration to Inter

**Branch**: `004-migrate-ui-inter` | **Date**: 2026-05-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/004-migrate-ui-inter/spec.md`

## Summary

Migrate the visual design system of the core authoring tools to align with the light-canvas builder style, white surfaces, dark display type with aggressive tracking, accent blue #0099ff, rounded pill CTAs, circular icon buttons, and hairline borders specified in `references/new-design/DESIGN.md` and demonstrated in `references/new-design/awesomeslide_marketing_demo.html`. This includes replacing GT Walsheim and Google Sans Flex fonts with Inter Variable, auditing all UI components (sidebar, inspector, notes drawers, dialogs, present controls, and slide browser) to ensure no pieces of the UI are missing from the migration, and implementing the 5px spacing grid and hairline borders.

## Technical Context

**Language/Version**: TypeScript (strict); Node.js >=18; React 18 in core/demo; React 19 and Next.js 16 in apps/web.

**Primary Dependencies**: pnpm 10, Turbo, Vite 5, Tailwind CSS 4, Next.js, Radix UI (shadcn), `@fontsource-variable/inter` (replacing `@fontsource-variable/google-sans-flex`).

**Storage**: N/A

**Testing**: Biome check (`pnpm check`), Vitest (`pnpm test`), type check (`pnpm typecheck`), and monorepo build (`pnpm build`).

**Target Platform**: Modern web browsers (Chrome, Safari, Firefox, Edge).

**Project Type**: Monorepo with packages and web apps.

**Performance Goals**: Fast web font loading by utilizing variable font files and system fallbacks.

**Constraints**:
- Do not introduce proprietary dependencies or assets.
- Maintain consistent display and layout structure.
- Add changesets for changes in `packages/core`.
- Do not hand-edit shadcn UI components directly.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Principle I. Agent-Native**: Checked. No impact on agent-authoring skills or APIs.
- **Principle II. Package Discipline**: Checked. Modifying `packages/core` will require generating a changeset. No CASUAL dependencies; this swaps one font dependency for another.
- **Principle III. Clean Code Baseline**: Checked. Biome check must pass, comments kept to a minimum (WHY only), no manual edits to shadcn UI.
- **Principle IV. Monorepo Convention**: Checked. We will run package installation and validation scripts using standard root scripts.
- **Principle V. Ship Small, YAGNI**: Checked. Only migrating the font configurations and documentation. No extra features.

Gate status: **PASS**.

## Project Structure

### Documentation (this feature)

```text
specs/004-migrate-ui-inter/
├── spec.md              # Feature specification
└── plan.md              # This implementation plan
```

### Source Code (repository root)

```text
references/
├── AWESOME_SLIDE_DESIGN_SYSTEM.md   # [MODIFY] Update main sans definition to Inter
└── new-design/
    └── DESIGN.md                     # [MODIFY] Replace GT Walsheim display typeface with Inter and update visual variables

packages/core/
├── package.json                      # [MODIFY] Swap google-sans-flex with inter font dependency
└── src/app/
    ├── styles.css                    # [MODIFY] Update Fontsource import, font variables, and design tokens
    └── components/                   # [MODIFY] Migrate all buttons, inputs, cards, sidebar, inspector, dialogs, present controls
        ├── asset-view.tsx
        ├── sidebar/
        ├── inspector/
        ├── present/
        └── notes-drawer.tsx

apps/web/
├── app/
│   ├── layout.tsx                    # [MODIFY] Replace Google Sans Flex loading with next/font/google Inter
│   └── (home)/
│       └── landing.css               # [MODIFY] Update web landing page styles to align with design tokens
└── components/landing/               # [MODIFY] Review marketing components for design parity
```

**Structure Decision**: Perform styling audits across all UI files in `packages/core/src/app` and `apps/web/app`, swapping the layout bindings and styling classes to canonical tokens.

## Planned Implementation Phases

### Phase 1: Update Specifications
- Modify `references/new-design/DESIGN.md` to replace GT Walsheim display typeface with `Inter` / `Inter Variable`, and update the visual properties to reflect Inter variables.
- Update `references/AWESOME_SLIDE_DESIGN_SYSTEM.md` to establish Inter as the main display and sans-serif typeface.

### Phase 2: Design Token Setup in packages/core
- Replace dependency `@fontsource-variable/google-sans-flex` with `@fontsource-variable/inter` in `packages/core/package.json`.
- Execute `pnpm install` to update the lockfile.
- In `packages/core/src/app/styles.css`, replace Google Sans Flex variable import with `@fontsource-variable/inter` and update variables `--font-sans` and `--font-heading` to `"Inter Variable"`.
- Refine root variables for colors, spacing (5px base), rounded corners, hairline borders, and shadow tokens.

### Phase 3: Component Migration in core packages
- Audit and modify React components under `packages/core/src/app/components/` and `packages/core/src/app/routes/`:
  - **Pill Buttons**: Migrate all text-bearing buttons to pill shapes (`rounded.pill` / `100px` / `rounded-full`). Update classNames to use `rounded-full` and align background/text color tokens (e.g. `bg-primary text-primary-foreground` for primary).
  - **Circular Icon Controls**: Migrate all circular icon-only buttons to circular shape classes (`rounded-full`, `size-10`).
  - **Hairline Borders**: Apply hairline borders (0.5px/1px) and variables `--hairline` and `--hairline-soft` to dividers, frames, and headers.
  - **Spacing system**: Enforce padding, margin, and gap values that adhere to the 5px spacing grid.
  - **Radius system**: Update corner radii for UI panels, cards, and drawers (`rounded-xl` for cards, `rounded-xxl` for gradient showcases).
  - **Atmospheric Gradients**: Apply the spotlight gradients (violet, magenta, orange) to empty states and loader indicators.

### Phase 4: Web and Docs Alignment
- Update `apps/web/app/layout.tsx` to load Inter from Google Fonts.
- Update `apps/web/app/global.css` and landing page styles to match the demo's light/dark themes.

### Phase 5: Verification & Changeset
- Run monorepo build, linting (`pnpm check`), type checking, and tests.
- Perform a manual visual audit of all UI surfaces (sidebar, inspector, presenter overlays, notes drawers, dialogs, present controls, and marketing headers).
- Create a changeset.

## Verification Plan

### Automated Tests
- Run `pnpm check` to verify formatting and linting.
- Run `pnpm typecheck` to verify no compilation issues.
- Run `pnpm build` to verify the production bundles compile.

### Manual Verification
- Run `pnpm dev` in `apps/demo` and check the local server to verify that the UI components (sidebar, editor inspector, notes drawers, dialogs, present controls, and marketing headers) load and render typography and visual styling correctly using Inter and the design tokens.
- Review all components on mobile, tablet, and desktop viewports to ensure layout parity and responsive correctness.
