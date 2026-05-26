# Awesome Slide Design System

This is the source of truth for the Awesome Slide visual system. It adapts
`references/REBRANDING_DESIGN.md` for the framework app, docs, marketing site,
starter template, and future slide-management surfaces.

## Direction

Awesome Slide uses a calm monochrome editor base with selective expressive
color blocks.

- App chrome, dense controls, panels, body text, dividers, and primary actions
  use a light monochrome system.
- Pastel blocks are reserved for onboarding, empty states, marketing story
  moments, theme showcases, and major context shifts.
- Slide previews remain visually dominant in editor surfaces.
- Docs stay readable and use brand color sparingly.
- Marketing can use larger editorial type and color-block sections than the app.

## Tokens

| Token | CSS variable | Value | Scope | Contrast note |
| --- | --- | --- | --- | --- |
| color.canvas | `--as-canvas` | `oklch(0.985 0 0)` | all | Default page and app background |
| color.ink | `--as-ink` | `oklch(0.145 0 0)` | all | AA on canvas |
| color.inverseCanvas | `--as-inverse-canvas` | `oklch(0.18 0.04 278)` | marketing, docs | AA with inverse ink |
| color.inverseInk | `--as-inverse-ink` | `oklch(0.985 0 0)` | marketing, docs | AA on inverse canvas |
| color.surface | `--as-surface` | `oklch(1 0 0)` | all | Panels and cards |
| color.surfaceSoft | `--as-surface-soft` | `oklch(0.955 0.006 100)` | all | Quiet secondary surfaces |
| color.hairline | `--as-hairline` | `oklch(0.86 0 0)` | all | Borders and dividers |
| color.primary | `--as-primary` | `oklch(0.145 0 0)` | all | Primary action |
| color.primaryText | `--as-primary-text` | `oklch(0.985 0 0)` | all | AA on primary |
| color.focus | `--as-focus` | `oklch(0.61 0.16 255)` | all | Keyboard focus |
| color.danger | `--as-danger` | `oklch(0.56 0.2 29)` | all | Destructive actions |
| color.blockLime | `--as-block-lime` | `oklch(0.9 0.12 124)` | marketing, empty states | Dark text only |
| color.blockLilac | `--as-block-lilac` | `oklch(0.88 0.08 310)` | marketing, empty states | Dark text only |
| color.blockCream | `--as-block-cream` | `oklch(0.94 0.04 86)` | marketing, template | Dark text only |
| color.blockMint | `--as-block-mint` | `oklch(0.9 0.07 170)` | marketing, theme | Dark text only |
| color.blockPink | `--as-block-pink` | `oklch(0.89 0.08 350)` | marketing, theme | Dark text only |
| color.blockCoral | `--as-block-coral` | `oklch(0.78 0.12 42)` | marketing | Dark text only |
| color.blockNavy | `--as-block-navy` | `oklch(0.23 0.08 275)` | marketing | Light text only |

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

- App shell: light canvas, monochrome navigation, compact icon controls, strong
  focus rings, and a slide canvas that remains the largest visual object.
- Slide browser: stable thumbnail ratios, compact metadata, dense filtering and
  sorting, pastel blocks only for empty states or first-run guidance.
- Inspector and panels: hairline dividers, tight type hierarchy, no nested cards,
  and save states that do not resize the panel.
- Agent and connection surfaces: text plus color for state, compact controls,
  no exposed secrets, predictable keyboard access.
- Theme gallery: expressive previews allowed, fixed aspect ratios required.
- Docs: readable prose, restrained callouts, canonical package names first.
- Marketing: full-width editorial sections, large type, and single-color blocks
  separated by white canvas.

## Responsive And Accessibility Rules

- Review at 375px, 768px, 1024px, and 1440px.
- Standard app views must avoid horizontal scroll.
- Touch targets are at least 44px for primary mobile actions.
- Icon-only controls require accessible names or tooltips.
- Visible focus states are required for all interactive controls.
- Text must not clip or overlap its container.
- Color is never the only state indicator.
- Loading and skeleton states must preserve surrounding layout.
