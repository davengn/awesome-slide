# Research: UI Design System Migration to Inter

## Decision: Choose Inter Variable as display and body typeface

**Decision**: Canonicalize `Inter` (and its variable font format `Inter Variable`) as the single typeface for both display headlines and body copy, replacing the proprietary `GT Walsheim` display face.

**Rationale**: `GT Walsheim` is a proprietary commercial typeface. Because the font files are not present in the workspace, browser rendering falls back to default system sans-serifs, breaking design alignment. Inter is an open-source, highly polished variable typeface that is widely available, has excellent legibility, and is already used for the body font in the project. Using Inter Variable for display sizes enables us to adjust weight (500–700) and letter-spacing aggressively to emulate the premium geometric styling of GT Walsheim without licensing issues or layout regressions.

**Alternatives considered**:
- **Geist Sans**: Considered because it has a clean geometric structure. However, it is not currently configured as a package dependency in `@awesome-slide/core` and would add extra runtime font-file download overhead compared to Inter which is already partially referenced.
- **Mona Sans**: Excellent geometric display characteristics, but not as widely cached or supported as Inter.
- **Keep GT Walsheim fallbacks**: Rejected because it leads to inconsistent rendering across dev and user setups.

---

## Decision: Swap Fontsource Variable Packages in `@awesome-slide/core`

**Decision**: Swap the `@fontsource-variable/google-sans-flex` package dependency in `packages/core/package.json` with `@fontsource-variable/inter` and import it in `packages/core/src/app/styles.css`.

**Rationale**: `@awesome-slide/core` currently loads `Google Sans Flex Variable` as its default base font. Swapping this package with `@fontsource-variable/inter` ensures that the runtime app shell, editor canvas, and offline viewer all load and bundle Inter natively. This avoids any runtime dependency inflation (swapping one 50KB variable font for another) and ensures offline capability for slide presentations.

**Alternatives considered**:
- **Load via Google Fonts CDN**: Rejected for the runtime package because it would require an active internet connection to render text in the offline viewer.
- **Bundle raw TTF/WOFF files**: Rejected because Fontsource package management is cleaner, keeps versioning explicit, and handles browser-specific format optimization.

---

## Decision: Configure Next.js Font Loading in `apps/web`

**Decision**: Load `Inter` from `next/font/google` in `apps/web/app/layout.tsx` and map it to standard CSS classes/variables. Remove the hardcoded CDN link for Google Sans Flex in the document `<head>`.

**Rationale**: Next.js provides built-in, optimized, and zero-CLS font hosting through `next/font/google` at build time. Loading Inter through this mechanism keeps page loads fast, optimizes layout shift, and ensures the marketing site and docs align with the package runtime's typography.

---

## Decision: Adjust Letter-Spacing and Font-Weight for Display Sizes

**Decision**: Adjust tracking (letter-spacing) for display sizes inside `references/new-design/DESIGN.md` and related CSS utilities to ensure Inter reads like a confident display face.

**Rationale**: GT Walsheim has a wider geometric structure than Inter. When replacing it with Inter, we must preserve the poster-like weight by using `font-weight: 600` or `700` (compared to 500 for GT Walsheim) and applying tight negative letter-spacing (e.g., `-3%` to `-4%`) to keep headers looking compact and intentional.

---

## Decision: Unify marketing and core tool design languages

**Decision**: Migrate all buttons, borders, spacings, and card shapes in the core editor tools to match the visual system defined in `DESIGN.md`.

**Rationale**: A creator-first tool should deliver a premium app experience that matches the design quality of its marketing site. Applying the same styling rules (pills for text buttons, circles for icon buttons, 0.5px hairline borders, and 5px grid spacing) removes visual inconsistencies and ensures the app shell, inspector, and sidebar feel integrated.

**Alternatives considered**:
- **Keep standard app/shadcn styling**: Rejected because square buttons and heavy shadows conflict with the clean, light-canvas marketing design language.
