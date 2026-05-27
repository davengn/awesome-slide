# Contract: Awesome Slide Design System

## Design Direction

Awesome Slide uses the final rebrand reference as the normative visual system:

- Black-and-white core UI for app chrome, dense controls, panels, text, dividers, and primary actions.
- Black primary actions and selected states with white text.
- Magenta only for scarce marketing promo CTAs.
- No vermillion/red accent may replace the final magenta or black primary roles.
- Oversized pastel color blocks for onboarding, empty states, marketing storytelling, theme showcases, and important context shifts.
- Editorial typography with a variable sans font and a mono taxonomy style for labels.
- Minimal shadows, crisp borders, pill text CTAs, circular icon buttons, and compact repeated controls.

The primary source direction is `references/REBRANDING_DESIGN_FINAL.md`. The earlier `references/REBRANDING_DESIGN.md` is superseded because it omitted the token front matter used for planning and implementation.

## Token Families

### Color

Required semantic roles:

- `canvas`: default app and page background
- `ink`: primary text on light surfaces
- `inverseCanvas`: dark story/footer surface
- `inverseInk`: text on inverse surfaces
- `surface`: panel and card background
- `surfaceSoft`: quiet secondary surface
- `hairline`: borders and dividers
- `primary`: primary action and selected state
- `primaryText`: text on primary action
- `onInverseSoft`: base color for translucent controls on inverse sections
- `focus`: keyboard focus ring
- `danger`: destructive action
- `accentMagenta`: scarce promotional accent for marketing-only moments
- `semanticSuccess`: success glyph color
- `overlayScrim`: modal and video overlay base
- `blockLime`, `blockLilac`, `blockCream`, `blockMint`, `blockPink`, `blockCoral`, `blockNavy`: expressive color-block surfaces

Rules:

- Body text on light surfaces must meet WCAG AA contrast.
- Pastel block surfaces must not be used as every repeated card background.
- Dark surfaces should be limited to inverse sections, previews, or existing dark-mode support.
- Marketing pages must not default to an all-dark shell; dark surfaces are limited to the marquee, footer, navy block, or embedded product previews.

### Typography

Required roles:

- `display`: large marketing and major empty-state headlines
- `heading`: section and panel headings
- `body`: default reading text
- `bodySmall`: secondary text and dense controls
- `caption`: compact metadata
- `eyebrow`: uppercase mono taxonomy label
- `mono`: numeric values, paths, package names, command labels

Rules:

- Use Geist or Inter for the main sans stack.
- Use JetBrains Mono or Geist Mono for mono roles.
- Do not scale font size directly with viewport width.
- Letter spacing for app body text must stay near zero; mono labels may use positive tracking.

### Shape

Required roles:

- `radiusXs`: 2px, small marks and dividers
- `radiusSm`: 6px, compact controls and list items
- `radiusMd`: 8px, inputs, thumbnails, cards
- `radiusLg`: 24px, color blocks and large callouts
- `radiusPill`: 999px, text CTAs and segmented controls
- `radiusFull`: 999px, circular icon controls

Rules:

- Cards must not use larger than 8px radius unless they are color-block callouts or marketing sections.
- Icon buttons should be circular when the icon is the primary content.

### Motion

Required roles:

- `fast`: 120-150ms for hover/focus state changes
- `standard`: 180-250ms for panel transitions
- `slow`: 250-300ms for larger layout changes

Rules:

- Respect `prefers-reduced-motion`.
- Loading states must preserve layout.
- Avoid decorative motion that competes with slide preview content.

## Component Treatments

### App Shell

- Light canvas with monochrome navigation and side panels.
- Slide previews remain the visual center.
- Global actions use compact icon buttons with accessible labels.

### Slide Browser

- Use dense list/grid controls, clear sorting/filtering, and stable card dimensions.
- Reserve pastel color blocks for empty states and first-run guidance.
- Metadata should be scan-friendly and not compete with slide thumbnails.

### Agent Chat Panel

- Use a contained panel treatment aligned with the app shell.
- Loading and streaming states must not resize the whole app shell.
- Preview/apply actions use primary and secondary pill buttons.

### Connection Settings

- Status indicators must use text plus color, not color alone.
- API key inputs must use secure field patterns and never expose stored secrets in full.

### Theme Gallery

- Theme previews can use expressive color-block surfaces.
- Cards must keep consistent aspect ratios so grids do not shift during loading.

### Marketing and Docs

- Marketing pages may use larger color-block sections and display typography.
- Docs pages should stay readable and use brand color blocks sparingly for calls to action.

## Accessibility Requirements

- All interactive controls have visible focus states.
- Minimum touch target is 44px for primary actions and mobile icon buttons.
- Icon-only controls must have accessible names or tooltips.
- Text must not clip or overlap at 375px, 768px, 1024px, or 1440px.
- Reduced-motion preference must disable non-essential animation.

## Implementation Requirements

- Implement tokens through CSS custom properties and Tailwind 4 `@theme`.
- Do not hand-edit generated shadcn components unless regenerating.
- Use Lucide icons where a familiar icon exists.
- Keep dependency additions out of `packages/core` unless there is a specific implementation need and maintainer approval.
