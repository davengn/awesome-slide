# Feature Specification: Reshape Landing, Sidebar, and Navigation

**Feature Branch**: `002-reshape-landing-navigation`

**Created**: 2026-05-27

**Status**: Draft

**Input**: User description: "Add a new plan after 001 and before 002 to specify new reshape landing page, sidebar and navbar with new style and layout using ui-ux-pro-max follow figma style and layout."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Land on a Confident Product Page (Priority: P1)

New visitors and returning users see a landing page that immediately communicates Awesome Slide as a polished slide framework, with a Figma-inspired editorial rhythm, visible product preview, and clear start actions.

**Why this priority**: The landing page is the first proof that the rebrand is real and coherent.

**Independent Test**: Open the web home route at desktop and mobile widths and verify the first viewport shows the Awesome Slide name, product value, primary action, secondary action, and a real product or slide preview without requiring scroll.

**Acceptance Scenarios**:

1. **Given** a desktop viewport, **When** the landing page loads, **Then** the hero uses a white canvas, monochrome chrome, pill CTAs, and a visible product preview.
2. **Given** a mobile viewport, **When** the landing page loads, **Then** the hero content, CTAs, and preview remain readable without horizontal scrolling or clipped text.

---

### User Story 2 - Navigate With a Figma-Style Top Bar (Priority: P1)

Users can move through marketing, docs, and product entry points using a restrained top navbar with clear hierarchy, black/white CTAs, and responsive mobile behavior.

**Why this priority**: The navbar is shared across key web surfaces and sets the visual tone before users reach the product.

**Independent Test**: Use keyboard and pointer navigation on web home and docs layouts at 375px, 768px, 1024px, and 1440px.

**Acceptance Scenarios**:

1. **Given** a desktop viewport, **When** the navbar renders, **Then** primary links, docs access, GitHub/source links where present, and CTA pair are aligned in a stable 56px navigation rhythm.
2. **Given** a narrow viewport, **When** the menu is opened, **Then** links and actions appear in a full-canvas or drawer-style menu with visible focus states and no hidden content behind the fixed bar.

---

### User Story 3 - Work From a Reshaped Runtime Sidebar (Priority: P2)

Slide creators use a cleaner runtime sidebar and navigation system that feels related to the marketing brand while staying dense, scan-friendly, and optimized for repeated slide work.

**Why this priority**: The sidebar is the main app navigation surface and must feel product-grade after the landing page sets expectations.

**Independent Test**: Open the runtime home/workspace, switch folders or slides, resize to mobile, and verify selection, actions, counters, and focus order remain stable.

**Acceptance Scenarios**:

1. **Given** slides and folders exist, **When** the sidebar renders, **Then** selected states use black/white or hairline treatment, folder rows remain compact, and slide previews stay visually dominant outside the sidebar.
2. **Given** a narrow viewport, **When** navigation collapses, **Then** users can still open folders, switch slides, and reach primary actions through a mobile pill or drawer pattern.

---

### User Story 4 - Preserve Usability While Raising Visual Quality (Priority: P3)

Users with keyboard, reduced-motion, and smaller-screen needs retain access to all landing, navbar, and sidebar flows while the new layout becomes more expressive.

**Why this priority**: The reshape should not trade usability for style.

**Independent Test**: Verify keyboard traversal, reduced-motion behavior, focus rings, text contrast, and no-overlap behavior across the touched surfaces.

**Acceptance Scenarios**:

1. **Given** reduced motion is enabled, **When** the landing page and sidebar load, **Then** non-essential entrance or marquee motion is disabled or simplified.
2. **Given** keyboard-only navigation, **When** users move through navbar links, CTAs, menu toggles, sidebar rows, and actions, **Then** focus order matches visual order and focus states are visible.

### Edge Cases

- Landing content must not rely on a dark default shell; dark treatment is limited to intentional inverse sections, product previews, or the navy color block.
- A mobile menu must not trap focus after close or hide the primary CTA behind the fixed navbar.
- Sidebar row labels, slide IDs, and folder names may be long and must wrap, truncate, or tooltip without shifting controls.
- Empty slide or folder states must still provide primary actions and guidance.
- Motion-heavy treatments must respect `prefers-reduced-motion`.
- The reshape must not edit generated shadcn files in `packages/core/src/app/components/ui`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The landing page MUST use `references/REBRANDING_DESIGN_FINAL.md` and `references/AWESOME_SLIDE_DESIGN_SYSTEM.md` as the visual source of truth.
- **FR-002**: The landing first viewport MUST show product identity, concise value copy, primary and secondary pill CTAs, and a real product or slide preview.
- **FR-003**: The landing page MUST use a white-canvas hero followed by editorial sections that alternate white canvas and single-color pastel blocks.
- **FR-004**: The landing page MUST reserve magenta for a scarce promo/action moment and MUST NOT use it as the general brand primary.
- **FR-005**: The top navbar MUST use monochrome chrome, a stable height rhythm, internal Next links where applicable, and black/white CTA treatment.
- **FR-006**: The top navbar MUST provide responsive mobile menu behavior with keyboard access, visible focus states, and no content hidden under fixed positioning.
- **FR-007**: The runtime sidebar MUST provide compact navigation groups, selected states, folder/slide actions, counters where useful, and stable row dimensions.
- **FR-008**: Sidebar and mobile navigation MUST preserve access to create/open/switch folder or slide workflows already present in the runtime.
- **FR-009**: Icon-only controls in navbar or sidebar MUST use accessible names or tooltips and a consistent icon set.
- **FR-010**: Text in landing sections, nav items, CTA buttons, and sidebar rows MUST not clip or overlap at 375px, 768px, 1024px, or 1440px widths.
- **FR-011**: Hover and focus states MUST avoid layout shift and use transitions in the 120-300ms range.
- **FR-012**: Reduced-motion settings MUST disable non-essential marquee, entrance, or panel motion.
- **FR-013**: The implementation MUST avoid new runtime dependencies unless the plan is amended with justification.
- **FR-014**: The implementation MUST include source-level and browser-level validation notes for landing, navbar, and sidebar states.

### Key Entities

- **Landing Section**: A named marketing section with surface role, content purpose, CTA intent, media treatment, and responsive behavior.
- **Navigation Item**: A link or action with label, destination/action, priority, active state, accessibility label, and responsive visibility.
- **Navigation Group**: A cluster of related navigation items in the top navbar or runtime sidebar.
- **Sidebar Section**: A runtime navigation group for folders, slides, actions, or status metadata.
- **Responsive State**: A viewport-specific layout mode for desktop, tablet, mobile, and reduced-motion contexts.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At 1440px, the landing first viewport shows the product name, value copy, CTA pair, and product preview without clipping.
- **SC-002**: At 375px, the landing page, top nav, and runtime sidebar/mobile navigation have no horizontal scroll.
- **SC-003**: Keyboard users can reach every navbar link, CTA, menu toggle, sidebar row, and sidebar action in visual order.
- **SC-004**: A design-alignment audit finds no use of vermillion/red as primary chrome in the touched surfaces.
- **SC-005**: Browser review covers 375px, 768px, 1024px, and 1440px for landing, navbar, and sidebar.
- **SC-006**: Project quality gates are run and any existing unrelated failures are recorded with scope.

## Assumptions

- The reshape builds on the completed 001 rebrand tokens rather than replacing the design system.
- `ui-ux-pro-max` recommendations are supplementary; conflicting colors or typography are overridden by the Figma-derived Awesome Slide design system.
- "Figma style and layout" refers to the local Figma design analysis in `references/REBRANDING_DESIGN_FINAL.md`, not a live Figma file operation.
- The first implementation slice can focus on existing routes and components without introducing a new routing system.
- Existing slide-management, agent-chat, connection, and default-theme specs remain separate follow-up features.
