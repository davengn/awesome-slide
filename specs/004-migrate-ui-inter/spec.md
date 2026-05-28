# Specification: UI Design System Migration to Inter

## Status

Planning

## Product Vision Alignment

Awesome Slide must present a unified, high-contrast, premium visual identity across both its developer tools and public marketing assets. The design language established in `references/new-design/DESIGN.md` — characterized by pure white/black canvas surfaces, aggressive negative letter-spacing on display type, subtle hairline borders, and atmospheric gradient panels — must be systematically integrated into the framework's runtime editor, presenter mode, slide browser, and CLI starter templates.

## Problem Statement

Currently, the core developer tools (including the editor app, inspector panels, sidebar, present controls, and slide browser) do not fully align with the visual design guidelines defined in `references/new-design/DESIGN.md` and demonstrated in `references/new-design/awesomeslide_marketing_demo.html`. There are visual inconsistencies in button shapes (pills vs. rounded squares), border definitions, shadow styling, component padding, and display typography (which still relies on unavailable GT Walsheim font configurations). A unified migration is required to bring the entire user interface of the developer tools into alignment with the marketing design system, using Inter as the display and body typeface.

## Goals

- Establish a unified, open-source typography stack using Inter and Inter Variable across all developer tools, marketing, and documentation pages, removing all GT Walsheim references.
- Migrate all UI design elements in the core packages to align with the color, shape, elevation, spacing, and layout specifications in `references/new-design/DESIGN.md`.
- Implement shape-level treatments across all editor controls (pill shapes for primary text CTAs, circular shapes for icon buttons, and specific card corner-radii).
- Port the hairline border system (0.5px/1px borders) and subtle shadow configurations to all sidebar and panel containers.
- Integrate the vibrant gradient atmosphere spotlight panels (violet, magenta, orange) into the editor's empty states, loading states, and dashboard cards.
- Ensure that no visual elements of the UI (sidebar, inspector, notes drawers, dialogs, presenter mode, and CLI template preview slides) are missed by the design migration.

## Non-Goals

- Do not alter the editor's core state management, slide AST parsing, or local file serialization behavior.
- Do not introduce closed-source design assets or proprietary typography.
- Do not build new functional features; focus strictly on styling, layout, typography, and visual design Polish.

## User Scenarios & Testing

### User Story 1 - Inter Typography Integration (Priority: P1)

As a developer, I want to swap Google Sans Flex and replace GT Walsheim display typeface with Inter Variable across the core packages and layout templates, so that visual rendering is consistent and free from unavailable proprietary font failures.

**Independent Test**:
Run the core package dev environment and verify display/sans fonts are loading Inter Variable. Next.js app layout must load Inter.

---

### User Story 2 - App Component Design System Migration (Priority: P2)

As an editor user, I want the components of the core tools (sidebar, inspector panels, slide browser, presenter overlays, notes drawers, dialogs) to align with DESIGN.md rules for buttons (pills/circles), spacings (5px grid), and hairline borders (0.5px), so that the entire app interface looks premium and cohesive.

**Independent Test**:
Audit the sidebar navigation and editor panel controls. Verify that text buttons are pill-shaped, icon buttons are circles, and borders are hairline thin.

---

### User Story 3 - Next.js Web App Design System Parity (Priority: P3)

As a visitor, I want the Next.js marketing and documentation site to match the app's clean light-canvas look, utilizing Inter Variable and matching colors/spacing, so that the entire product shares one visual identity.

**Independent Test**:
Browse the landing and documentation pages, verifying that font classes, button pills, and grid spacing correspond exactly to design guidelines.

---
## Functional Requirements

- **FR-001**: The typeface for all display headers and body copy must be `Inter` / `Inter Variable`, with display headers utilizing aggressive negative letter-spacing (`-5%` to `-3%` of font size) to match the brand voice.
- **FR-002**: The design reference document `references/new-design/DESIGN.md` must be updated to replace all references to GT Walsheim with Inter.
- **FR-003**: The `@awesome-slide/core` package must swap its Google Sans Flex fontsource package with Inter Variable.
- **FR-004**: The Next.js web application (`apps/web`) must load Inter via `next/font/google` and remove CDN links for Google Sans Flex in layout.tsx.
- **FR-005**: All UI controls in the core app must use the defined button treatments:
  - Primary CTAs must render as pill shapes (`rounded.pill`, `100px`) with black background and white text (or white background and black text in dark mode).
  - Secondary/utility buttons must render as pill shapes with surface-1 background.
  - Icon-only controls must render as circular shapes (`rounded.full`, `9999px` / `size: 40px`).
- **FR-006**: Card components, pricing panels, and mockups must use `rounded.xl` (`20px`) corners, while atmospheric gradient spotlight cards use `rounded.xxl` (`30px`) corners.
- **FR-007**: Spacing across all custom panels and dialogs must align with the 5px grid system (`{spacing.xs}` 8px, `{spacing.md}` 15px, `{spacing.lg}` 20px, `{spacing.xl}` 30px).
- **FR-008**: Borders must follow the hairline hierarchy, utilizing 0.5px/1px borders with the `--hairline` and `--hairline-soft` color variables.
- **FR-009**: The sidebar, slide browser, presenter overlays, and inspector panels must be updated to ensure complete compliance with the design tokens. No pieces of the UI can be missed.
- **FR-010**: Integrate atmospheric gradient spotlight cards into empty states and loading backdrops.

## UX Requirements

- **UX-001**: The app interface must maintain a monochrome base for navigation, panels, and standard inputs to ensure that the slide canvas remains the most visually dominant element.
- **UX-002**: Atmospheric gradient spotlights (violet, magenta, orange) must be used sparingly to draw attention (e.g. for empty states, loading indicator tracks, or featured template cards).
- **UX-003**: Accessible touch target heights (>= 44px for primary controls on mobile/touch, >= 40px for desktop) must be maintained.
- **UX-004**: Interactive controls must feature clear hover highlights, scale-down transitions on press, and visible focus outline states.

## Technical Considerations

- Style definitions in `packages/core/src/app/styles.css` already have variables for `--canvas`, `--hairline`, and block colors; these need to be updated to match the final values in `DESIGN.md`.
- Components under `packages/core/src/app/components` (e.g., `sidebar`, `inspector`, `present`, `asset-view`) must be audited for hardcoded Tailwind spacing, rounded corners, or color classes that bypass the token system.
- Changes to packages in `packages/` must trigger changeset generation to coordinate proper npm versioning.

## Acceptance Criteria

- **AC-001**: `references/new-design/DESIGN.md` is updated to replace GT Walsheim with Inter and establish the display font metrics.
- **AC-002**: All core UI components (sidebar, inspector, presenter overlays, slide browser, dialogs, notes drawer) conform to the typography, shapes (pills, circles), hairline borders, and spacing tokens.
- **AC-003**: No UI pages or editor elements are missing from the typography and styling migration.
- **AC-004**: Next.js layout.tsx loads Inter Variable and uses it as the default font.
- **AC-005**: All code compiles cleanly, and `pnpm check`, `pnpm typecheck`, and `pnpm build` pass across the monorepo.
- **AC-006**: A changeset is created for the modified core package.

## Implementation Phases

### Phase 1: Update Specifications
- Edit `references/new-design/DESIGN.md` and `references/AWESOME_SLIDE_DESIGN_SYSTEM.md` to map GT Walsheim to Inter and align visual token systems.

### Phase 2: Core Typography and Style Tokens Setup
- Update `@awesome-slide/core` dependencies to install `@fontsource-variable/inter` and remove `@fontsource-variable/google-sans-flex`.
- Modify `packages/core/src/app/styles.css` to import the Inter font, assign font-sans variables, and define components rules (e.g. `.eyebrow`, `.folio`, and `.line-loader-bar`).

### Phase 3: Core UI Components Styling Migration
- Audit and edit components in `packages/core/src/app/components` and `packages/core/src/app/routes` to use design tokens:
  - Migrate all primary/secondary text buttons to pill shapes.
  - Migrate all icon-only buttons to circular shapes.
  - Apply hairline borders (0.5px/1px) and subtle elevations.
  - Implement 5px spacing grid across margins, paddings, and flex gap.
  - Review and apply card radius rules (20px for standard, 30px for atmospheric).

### Phase 4: Web and Docs Alignment
- Configure Next.js layout `apps/web/app/layout.tsx` to use Inter from Google Fonts.
- Review and refine `apps/web/app/global.css` and landing page styles to match the demo's light/dark themes.

### Phase 5: Verification & Changeset
- Run automated validation suite (Biome, TypeScript compiler, monorepo builds).
- Perform manual design alignment audit across viewports.
- Create changeset.
