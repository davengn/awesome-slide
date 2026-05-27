# Contract: Navigation and Landing Layout

## Scope

This contract applies to:

- Marketing landing page sections in `apps/web`.
- Shared web/docs navbar and layout chrome in `apps/web`.
- Runtime sidebar, folder navigation, mobile navigation pill/drawer, and related app-shell navigation in `packages/core`.

## Design Sources

Implementation must follow these sources in order:

1. `references/REBRANDING_DESIGN_FINAL.md`
2. `references/AWESOME_SLIDE_DESIGN_SYSTEM.md`
3. `specs/002-reshape-landing-navigation/research.md`
4. Supplemental `ui-ux-pro-max` guidance for accessibility, responsive behavior, and Next.js practices.

When sources conflict, the final Figma-derived Awesome Slide design references win.

## Landing Page Contract

### Hero

- White canvas.
- Monochrome top chrome.
- Product name or literal product category visible in the first viewport.
- Concise value copy below or beside the main headline.
- Primary black pill CTA and secondary white/neutral pill CTA.
- Real Awesome Slide product, slide, or editor preview visible in the first viewport.
- No purely abstract hero illustration as the main proof.

### Section Rhythm

- Sections alternate between white canvas and one dominant pastel color block.
- Pastel blocks use only the approved block tokens: lime, lilac, cream, mint, pink, coral, or navy.
- White canvas spacing separates color blocks.
- Repeated item cards stay at 8px radius or less.
- Large story blocks may use 24px radius on desktop and edge-to-edge treatment on mobile.

### Calls To Action

- Primary actions use black fill and white text.
- Secondary actions use white or neutral treatment with black text.
- Magenta is limited to a single promo or high-emphasis action moment per page.
- CTA text must fit at 375px without clipping.

## Navbar Contract

### Desktop

- Stable 56px navigation rhythm unless implementation documents a measured reason for change.
- Logo/wordmark area, primary links, utility links, and CTA pair are visually distinct.
- Internal links use Next.js `Link`.
- External links expose expected external-link behavior and accessible names where icon-only.
- Sticky or fixed nav reserves vertical space so it does not overlap the first section.

### Mobile

- Primary links collapse into a drawer, overlay, or menu pattern below the chosen breakpoint.
- Menu open/close is keyboard accessible.
- Focus returns to the trigger after close.
- Primary action remains reachable without scrolling through unrelated links.
- No horizontal scroll at 375px.

## Runtime Sidebar Contract

### Structure

- Sidebar uses compact groups for folders, slides, and key actions.
- Rows have stable dimensions across default, hover, selected, pending, and error states.
- Selected state uses more than color alone: fill, border, icon, weight, or shape change.
- Slide previews and main workspace content remain more visually dominant than sidebar decoration.

### Visual Treatment

- Default surface is white or soft off-white.
- Dividers use hairline tokens.
- Primary actions use black/white treatment.
- Pastel blocks are allowed only for compact empty states, onboarding hints, or major context shifts.
- Do not introduce vermillion/red as product chrome.

### Mobile

- Sidebar collapses to a drawer, rail, or mobile pill pattern.
- Users can still switch folders/slides and trigger primary actions.
- Touch targets for primary mobile actions are at least 44px.

## Motion and Accessibility Contract

- Hover/focus transitions stay in the 120-300ms range.
- Hover states must not change layout dimensions.
- `prefers-reduced-motion: reduce` disables non-essential marquee, entrance, and panel motion.
- Keyboard order follows visual order.
- Visible focus states are required for links, CTAs, menu toggles, sidebar rows, and icon buttons.
- Color is never the only state indicator.
- Headings follow a logical hierarchy.
- Skip-to-content behavior must be preserved or introduced on nav-heavy web pages.

## Validation Contract

Implementation is not complete until validation records:

- Landing review at 375px, 768px, 1024px, and 1440px.
- Navbar/menu review at 375px, 768px, 1024px, and 1440px.
- Runtime sidebar/mobile navigation review at 375px, 768px, 1024px, and 1440px where the runtime can be launched.
- Keyboard navigation review for navbar and sidebar.
- Reduced-motion source or browser review.
- Drift scan showing no vermillion/red primary chrome in touched surfaces.
- Results of `pnpm.cmd check`, `pnpm.cmd typecheck`, `pnpm.cmd test`, and `pnpm.cmd build`, with unrelated pre-existing failures clearly scoped.
