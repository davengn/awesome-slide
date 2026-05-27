# Research: Reshape Landing, Sidebar, and Navigation

## Decision: Use the Figma-derived Awesome Slide design system as the visual authority

**Rationale**: The requested style says to follow Figma style and layout, and the repo already has a Figma design analysis in `references/REBRANDING_DESIGN_FINAL.md` plus the implementation adapter in `references/AWESOME_SLIDE_DESIGN_SYSTEM.md`. These files define the exact black/white primary system, pastel block colors, magenta promo accent, typography substitutes, shape scale, and marketing rhythm.

**Alternatives considered**:

- Use the first `ui-ux-pro-max` generated palette directly. Rejected because it recommended a dark code-themed palette and Fira fonts, which conflict with the final Figma-derived Awesome Slide reference.
- Continue only the 001 token polish. Rejected because the user specifically asked for new style and layout reshaping, not just token alignment.

## Decision: Use `ui-ux-pro-max` as supplemental structure and UX guidance

**Rationale**: The design-search output recommended a Hero + Features + CTA pattern, vibrant block-based sections, sticky navbar CTA placement, 200-300ms transitions, and explicit checks for keyboard navigation, reduced motion, skip links, heading hierarchy, and sticky-navigation offset. Those recommendations fit the requested landing/nav/sidebar reshape when adapted to the final Awesome Slide palette.

**Alternatives considered**:

- Ignore the tool because the palette conflicted. Rejected because its structure, accessibility, and responsive guidance remain useful.
- Persist a new design system from the tool. Rejected because the repo already has a normative design system and a second generated source would create drift.

## Decision: Landing page should be editorial, white-first, and product-visible

**Rationale**: The final design reference describes a white marketing canvas with monochrome chrome, oversized editorial type, black/white pill CTAs, and large single-color pastel story blocks separated by white space. The landing first viewport must show the actual Awesome Slide product or slide state, not only abstract decorative composition.

**Alternatives considered**:

- Dark hero shell. Rejected because 001 analysis already identified dark-default marketing as drift from the final Figma reference.
- Card-heavy SaaS hero. Rejected because the reference uses full-width story blocks and clean product previews rather than nested cards.

## Decision: Navbar should be a compact monochrome product/marketing bridge

**Rationale**: The Figma-style top nav is simple, stable, and monochrome, with pill CTAs and responsive collapse. `ui-ux-pro-max` also flags sticky-navigation offset, keyboard navigation, and skip links as important for this layout.

**Alternatives considered**:

- Large floating glass navbar. Rejected because it adds visual noise and does not match the black/white editorial reference.
- Hide CTAs on tablet. Rejected because sticky CTA placement is important for the landing conversion path.

## Decision: Runtime sidebar should adapt the style without becoming marketing

**Rationale**: The app shell has different density needs than the landing page. Sidebar navigation should use the same color roles, hairlines, compact typography, pill/circular action shapes, and black selected state, while keeping slide previews and work content dominant.

**Alternatives considered**:

- Reuse landing color-block sections inside the sidebar. Rejected because it would reduce scan density and compete with slide previews.
- Keep the sidebar visually unchanged after the landing reshape. Rejected because it would make the product feel disconnected from the new brand layout.

## Decision: Use browser validation as a required planning output

**Rationale**: The feature is layout-led. Static source review cannot fully catch fixed-nav overlap, mobile horizontal scroll, sidebar clipping, or product preview framing. The plan requires review at 375px, 768px, 1024px, and 1440px.

**Alternatives considered**:

- Rely on `pnpm.cmd check` only. Rejected because formatting and linting do not validate visual layout quality.
