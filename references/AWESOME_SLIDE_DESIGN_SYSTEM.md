# Awesome Slide Design System

This is the source of truth for the Awesome Slide visual system. It adapts
`references/REBRANDING_DESIGN_FINAL.md` for the framework app, docs, marketing
site, starter template, and future slide-management surfaces. The earlier
`references/REBRANDING_DESIGN.md` is superseded because it omitted the token
front matter used for planning and implementation.

## Direction

`references/REBRANDING_DESIGN_FINAL.md` is normative for color, token names,
and marketing rhythm. Awesome Slide adapts the reference only for product
context and editor density, not by changing the palette.

- App chrome, dense controls, panels, body text, dividers, and primary actions
  use a light black-and-white system.
- Primary actions and selected states use black with white text.
- The magenta accent is scarce and reserved for marketing-only promo CTAs.
- Vermillion/red must not replace the final reference accent palette.
- Pastel blocks are reserved for onboarding, empty states, marketing story
  moments, theme showcases, and major context shifts.
- Slide previews remain visually dominant in editor surfaces.
- Docs stay readable and use brand color sparingly.
- Marketing uses a white hero and monochrome chrome, then full-width pastel
  color-block sections separated by white canvas.

## Tokens

| Token | CSS variable | Value | Scope | Contrast note |
| --- | --- | --- | --- | --- |
| color.primary | `--as-primary` | `#000000` | all | Primary action and selected state |
| color.onPrimary | `--as-on-primary` | `#ffffff` | all | Text on primary |
| color.ink | `--as-ink` | `#000000` | all | Text on canvas and pastel blocks |
| color.canvas | `--as-canvas` | `#ffffff` | all | Default app and page background |
| color.inverseCanvas | `--as-inverse-canvas` | `#000000` | marketing, docs | Marquee, footer, and inverse sections |
| color.inverseInk | `--as-inverse-ink` | `#ffffff` | marketing, docs | Text on inverse canvas |
| color.onInverseSoft | `--as-on-inverse-soft` | `#ffffff` | marketing | Base color for translucent circular controls |
| color.hairline | `--as-hairline` | `#e6e6e6` | all | Borders and dividers |
| color.hairlineSoft | `--as-hairline-soft` | `#f1f1f1` | all | Subtle row and footer rules |
| color.surfaceSoft | `--as-surface-soft` | `#f7f7f5` | all | Quiet secondary surfaces |
| color.accentMagenta | `--as-accent-magenta` | `#ff3d8b` | marketing | Scarce promo CTA accent |
| color.semanticSuccess | `--as-semantic-success` | `#1ea64a` | all | Success glyphs, not a surface |
| color.overlayScrim | `--as-overlay-scrim` | `#000000` | all | Modal/video scrims with opacity applied at render time |
| color.blockLime | `--as-block-lime` | `#dceeb1` | marketing, empty states | Dark text only |
| color.blockLilac | `--as-block-lilac` | `#c5b0f4` | marketing, empty states | Dark text only |
| color.blockCream | `--as-block-cream` | `#f4ecd6` | marketing, template | Dark text only |
| color.blockMint | `--as-block-mint` | `#c8e6cd` | marketing, theme | Dark text only |
| color.blockPink | `--as-block-pink` | `#efd4d4` | marketing, theme | Dark text only |
| color.blockCoral | `--as-block-coral` | `#f3c9b6` | marketing | Dark text only |
| color.blockNavy | `--as-block-navy` | `#1f1d3d` | marketing | Light text only |

## Typography

- Main sans: Geist, Inter, system UI.
- Mono: JetBrains Mono, Geist Mono, SFMono-Regular, Consolas.
- Do not scale font size directly with viewport width.
- App body letter spacing stays at `0`; mono labels may use positive tracking.

| Role | Size | Weight | Line height | Use |
| --- | --- | --- | --- | --- |
| display | 56-72px desktop, 40-48px mobile | 500 | 1.02 | Hero and major empty states |
| heading | 22-32px | 560 | 1.12 | Page and panel headings |
| body | 14-16px | 400 | 1.5 | Main reading text |
| bodySmall | 12-13px | 400 | 1.45 | Dense controls |
| caption | 11-12px | 500 | 1.2 | Metadata |
| eyebrow | 10-12px | 600 | 1.2 | Uppercase mono taxonomy |
| mono | 11-13px | 500 | 1.35 | Commands, paths, counters |

## Shape And Elevation

| Role | Value | Use |
| --- | --- | --- |
| radiusXs | 2px | Rules and small marks |
| radiusSm | 6px | Compact controls and rows |
| radiusMd | 8px | Inputs, thumbnails, repeated cards |
| radiusLg | 24px | Color blocks and large callouts |
| radiusPill | 999px | Text CTAs and segmented controls |
| radiusFull | 999px | Circular icon controls |

Repeated cards stay at 8px radius or less. Larger radii are reserved for
color-block sections, large callouts, and marketing surfaces. Shadows stay
subtle; borders and color blocks carry most hierarchy.

## Motion

| Role | Duration | Use |
| --- | --- | --- |
| fast | 120-150ms | Hover and focus changes |
| standard | 180-250ms | Panel and toolbar transitions |
| slow | 250-300ms | Larger layout changes |

Reduced-motion preference disables non-essential animation. Loading states must
preserve layout and avoid blank panels.

## Component Treatments

- App shell: light canvas, monochrome navigation, black primary actions,
  compact icon controls, strong focus rings, and a slide canvas that remains
  the largest visual object.
- Slide browser: stable thumbnail ratios, compact metadata, dense filtering and
  sorting, pastel blocks only for empty states or first-run guidance.
- Inspector and panels: hairline dividers, tight type hierarchy, no nested cards,
  and save states that do not resize the panel.
- Agent and connection surfaces: text plus color for state, compact controls,
  no exposed secrets, predictable keyboard access.
- Theme gallery: expressive previews allowed, fixed aspect ratios required.
- Docs: readable prose, restrained callouts, canonical package names first.
- Marketing: white hero, monochrome chrome, black/white CTA pair, full-width
  editorial sections, and single-color pastel blocks separated by white canvas.

## Responsive And Accessibility Rules

- Review at 375px, 768px, 1024px, and 1440px.
- Standard app views must avoid horizontal scroll.
- Touch targets are at least 44px for primary mobile actions.
- Icon-only controls require accessible names or tooltips.
- Visible focus states are required for all interactive controls.
- Text must not clip or overlap its container.
- Color is never the only state indicator.
- Loading and skeleton states must preserve surrounding layout.
