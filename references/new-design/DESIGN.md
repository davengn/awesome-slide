---
version: alpha
name: AwesomeSlide-design-analysis
description: "A confident light-canvas builder marketing site that treats the page like a working artboard — pure white surfaces, dark display type set in Inter with aggressive negative tracking, and a single confident blue (#0099ff) reserved for hyperlinks and selection states. The page rhythm is broken by oversized vibrant gradient atmosphere panels — magenta, violet, orange spotlights — that act as living showcase tiles, not decoration. Every CTA is a black pill on light; every card is a light-gray surface; every section title pulls letter-spacing tight enough to feel like a poster."

colors:
  primary: "#000000"
  on-primary: "#ffffff"
  accent-blue: "#0099ff"
  ink: "#090909"
  ink-muted: "#666666"
  canvas: "#ffffff"
  surface-1: "#f5f5f5"
  surface-2: "#ececec"
  hairline: "#e5e5e5"
  hairline-soft: "#f0f0f0"
  inverse-canvas: "#090909"
  inverse-ink: "#ffffff"
  gradient-magenta: "#d44df0"
  gradient-violet: "#6a4cf5"
  gradient-orange: "#ff7a3d"
  gradient-coral: "#ff5577"
  semantic-success: "#22c55e"
  # Dark mode overrides
  dark-primary: "#ffffff"
  dark-on-primary: "#000000"
  dark-accent-blue: "#0099ff"
  dark-ink: "#ffffff"
  dark-ink-muted: "#999999"
  dark-canvas: "#090909"
  dark-surface-1: "#141414"
  dark-surface-2: "#1c1c1c"
  dark-hairline: "#262626"
  dark-hairline-soft: "#1a1a1a"
  dark-inverse-canvas: "#ffffff"
  dark-inverse-ink: "#000000"

typography:
  display-xxl:
    fontFamily: Inter Variable
    fontSize: 110px
    fontWeight: 700
    lineHeight: 0.85
    letterSpacing: -5.5px
  display-xl:
    fontFamily: Inter Variable
    fontSize: 85px
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: -4.25px
    fontFeature: ss02
  display-lg:
    fontFamily: Inter Variable
    fontSize: 62px
    fontWeight: 600
    lineHeight: 1.00
    letterSpacing: -3.1px
    fontFeature: ss02
  display-md:
    fontFamily: Inter Variable
    fontSize: 32px
    fontWeight: 600
    lineHeight: 1.13
    letterSpacing: -1.0px
  headline:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: 700
    lineHeight: 1.20
    letterSpacing: -0.8px
    fontFeature: cv05
  subhead:
    fontFamily: Inter Variable
    fontSize: 24px
    fontWeight: 400
    lineHeight: 1.30
    letterSpacing: -0.01px
    fontFeature: cv11
  body-lg:
    fontFamily: Inter Variable
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.30
    letterSpacing: -0.18px
    fontFeature: cv11
  body:
    fontFamily: Inter Variable
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.30
    letterSpacing: -0.15px
    fontFeature: cv11
  body-sm:
    fontFamily: Inter Variable
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.40
    letterSpacing: -0.14px
    fontFeature: cv11
  caption:
    fontFamily: Inter Variable
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.20
    letterSpacing: -0.13px
    fontFeature: cv11
  micro:
    fontFamily: Inter Variable
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.20
    letterSpacing: -0.12px
    fontFeature: cv11
  button:
    fontFamily: Inter Variable
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.0
    letterSpacing: -0.14px
    fontFeature: cv11

rounded:
  xs: 4px
  sm: 6px
  md: 10px
  lg: 15px
  xl: 20px
  xxl: 30px
  pill: 100px
  full: 9999px

spacing:
  hair: 1px
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 15px
  lg: 20px
  xl: 30px
  xxl: 40px
  section: 96px

components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: 10px 15px
  button-primary-pressed:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
  button-secondary:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: 10px 15px
  button-translucent:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.xxl}"
    padding: 8px 14px
  button-icon-circular:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
    size: 40px
  pricing-tab-default:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: 8px 14px
  pricing-tab-selected:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: 8px 14px
  text-input:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: 10px 14px
  text-input-focused:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: 10px 14px
  pricing-card:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.xl}"
    padding: 24px
  pricing-card-featured:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.xl}"
    padding: 24px
  template-card:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
    padding: 12px
  gradient-spotlight-card:
    backgroundColor: "{colors.gradient-violet}"
    textColor: "{colors.ink}"
    typography: "{typography.subhead}"
    rounded: "{rounded.xl}"
    padding: 32px
  gradient-spotlight-card-magenta:
    backgroundColor: "{colors.gradient-magenta}"
    textColor: "{colors.ink}"
    typography: "{typography.subhead}"
    rounded: "{rounded.xl}"
    padding: 32px
  gradient-spotlight-card-orange:
    backgroundColor: "{colors.gradient-orange}"
    textColor: "{colors.ink}"
    typography: "{typography.subhead}"
    rounded: "{rounded.xl}"
    padding: 32px
  product-mockup-tile:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.xl}"
    padding: 16px
  feature-row:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.xs}"
  comparison-row:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.xs}"
  top-nav:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.xs}"
    height: 56px
  faq-row:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: 24px
  footer:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.caption}"
    rounded: "{rounded.xs}"
    padding: 64px 32px

  # Dark Mode Component Overrides
  dark-button-primary:
    backgroundColor: "{colors.dark-primary}"
    textColor: "{colors.dark-on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: 10px 15px
  dark-button-primary-pressed:
    backgroundColor: "{colors.dark-primary}"
    textColor: "{colors.dark-on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
  dark-button-secondary:
    backgroundColor: "{colors.dark-surface-1}"
    textColor: "{colors.dark-ink}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: 10px 15px
  dark-button-translucent:
    backgroundColor: "{colors.dark-surface-2}"
    textColor: "{colors.dark-ink}"
    typography: "{typography.button}"
    rounded: "{rounded.xxl}"
    padding: 8px 14px
  dark-button-icon-circular:
    backgroundColor: "{colors.dark-surface-1}"
    textColor: "{colors.dark-ink}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
    size: 40px
  dark-pricing-tab-default:
    backgroundColor: "{colors.dark-canvas}"
    textColor: "{colors.dark-ink-muted}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: 8px 14px
  dark-pricing-tab-selected:
    backgroundColor: "{colors.dark-surface-2}"
    textColor: "{colors.dark-ink}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: 8px 14px
  dark-text-input:
    backgroundColor: "{colors.dark-surface-1}"
    textColor: "{colors.dark-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: 10px 14px
  dark-text-input-focused:
    backgroundColor: "{colors.dark-surface-1}"
    textColor: "{colors.dark-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: 10px 14px
  dark-pricing-card:
    backgroundColor: "{colors.dark-surface-1}"
    textColor: "{colors.dark-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.xl}"
    padding: 24px
  dark-pricing-card-featured:
    backgroundColor: "{colors.dark-surface-2}"
    textColor: "{colors.dark-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.xl}"
    padding: 24px
  dark-template-card:
    backgroundColor: "{colors.dark-surface-1}"
    textColor: "{colors.dark-ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
    padding: 12px
  dark-product-mockup-tile:
    backgroundColor: "{colors.dark-surface-1}"
    textColor: "{colors.dark-ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.xl}"
    padding: 16px
  dark-feature-row:
    backgroundColor: "{colors.dark-canvas}"
    textColor: "{colors.dark-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.xs}"
  dark-comparison-row:
    backgroundColor: "{colors.dark-canvas}"
    textColor: "{colors.dark-ink-muted}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.xs}"
  dark-top-nav:
    backgroundColor: "{colors.dark-canvas}"
    textColor: "{colors.dark-ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.xs}"
    height: 56px
  dark-faq-row:
    backgroundColor: "{colors.dark-canvas}"
    textColor: "{colors.dark-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: 24px
  dark-footer:
    backgroundColor: "{colors.dark-canvas}"
    textColor: "{colors.dark-ink-muted}"
    typography: "{typography.caption}"
    rounded: "{rounded.xs}"
    padding: 64px 32px
---

## Overview

AwesomeSlide's marketing canvas is a clean, crisp, light-theme artboard by default. The dominant surface is `{colors.canvas}` — pure white — and on top of it sits oversized near-black display type set in **Inter** with letter-spacing pulled to extreme negative values (-5.5px on the 110px display, -4.25px on the 85px hero). The page reads like a poster: one assertive statement per band, generous breathing room above and below.

The single accent is `{colors.accent-blue}` — used scarcely, mostly for hyperlinks, selection halos, and a subtle blue-tinted shadow ring on focused inputs. The brand chrome itself is monochrome: black pill buttons, light-gray cards, gray secondary text. What makes AwesomeSlide distinctive is the rhythm break — every few sections the page drops in a **vibrant gradient atmosphere card**: a magenta-violet spotlight, a sunset-orange wash, a coral-pink panel. These aren't section backgrounds; they're individual cards arranged in a card grid, each one a small living poster that shows what AwesomeSlide can produce.

Body type is **Inter Variable**, with AwesomeSlide leaning hard into Inter's character variants (`cv01`, `cv05`, `cv09`, `cv11`, `ss03`, `ss07`, `dlig`) — the result is a body voice that feels custom-tuned, with single-storey "a", straight-leg "l", and tabular figures. 

To support modern multi-theme applications, this specification details a matching dark mode adaptation. When switching to dark mode, the canvas switches to `{colors.dark-canvas}` (near-black), and the type flips to pure white `{colors.dark-ink}`. CTA buttons reverse polarity (primary becomes a white pill with black text), and surfaces shift to charcoal/black values to preserve contrast and visual hierarchy.

**Key Characteristics:**
- **Dual-theme support**: The system gracefully switches between the default light canvas and a matching dark mode adaptation.
- **Light-canvas marketing system**: `{colors.canvas}` is the default surface for hero, body, pricing, FAQ, and footer alike.
- **Black-canvas marketing system**: `{colors.dark-canvas}` acts as the canvas surface for all main sections in dark mode, with `{colors.dark-ink}` display and body type.
- **Massive negative letter-spacing** on display sizes (-5.5px / -4.25px / -3.1px) creates a poster-grade headline cadence across both themes.
- **Pill CTAs**: `{components.button-primary}` (black pill) anchors the default light canvas, while `{components.dark-button-primary}` (white pill) anchors the dark canvas. Secondary actions live as light-gray or charcoal/black pills.
- **Oversized gradient spotlight cards** (violet, magenta, orange, coral) act as showcase tiles inside the grid, adapting their border and text colors to maintain contrast.
- **Inter Variable with bespoke OpenType character variants** (`cv01/05/09/11`, `ss03/ss07`, `dlig`) used everywhere body type appears — the typographic voice is unmistakable.
- **Border radius scale** runs from 4px utility chips up to 100px pills and full circles, with 15–20px the default for cards and 30px for atmospheric gradient cards.
- **A single chromatic accent** `{colors.accent-blue}` reserved for hyperlinks, focus, and selection — never decorative.

## Colors

> Source pages: framer.com (home), /ai/, /startups/, /marketplace/templates/nudge/, /gallery/a16z-speedrun-×-tonik, /pricing.

### Brand & Accent
- **Pure White** ({colors.canvas}): The light mode primary canvas background.
- **Sky Blue** ({colors.accent-blue}): The single chromatic accent, shared across both themes. Used for hyperlinks, focused-input rings, and selection states.
- **Pure Black** ({colors.primary}): The default primary brand surface. Every primary CTA pill, display headline, and body line on light canvas.

### Surface
- **Canvas (Light)** ({colors.canvas}): Default page background — pure white.
- **Canvas (Dark)** ({colors.dark-canvas}): Dark page background — near-black with a faint warmth.
- **Surface 1 (Light)** ({colors.surface-1}): One step above light canvas — light gray card backdrops and text inputs.
- **Surface 1 (Dark)** ({colors.dark-surface-1}): One step above dark canvas — pricing cards, secondary buttons, mockup tiles.
- **Surface 2 (Light)** ({colors.surface-2}): Two steps above light canvas — active segment control backgrounds.
- **Surface 2 (Dark)** ({colors.dark-surface-2}): Two steps above dark canvas — featured pricing card, selected pricing tab.
- **Hairline (Light)** ({colors.hairline}): 1px borders on light inputs and dividers.
- **Hairline (Dark)** ({colors.dark-hairline}): 1px borders on dark inputs and dividers.
- **Hairline Soft (Light)** ({colors.hairline-soft}): Subtle light dividers.
- **Hairline Soft (Dark)** ({colors.dark-hairline-soft}): Subtle dark dividers.
- **Inverse Canvas (Light)** ({colors.inverse-canvas}): Pure black surface used for contrast callouts.
- **Inverse Canvas (Dark)** ({colors.dark-inverse-canvas}): Pure white surface used for contrast callouts.

### Text
- **Ink (Light)** ({colors.ink}): All headline and body type on light canvas — near-black.
- **Ink (Dark)** ({colors.dark-ink}): All headline and body type on dark canvas — pure white.
- **Ink Muted (Light)** ({colors.ink-muted}): Secondary type on light canvas — medium gray (#666666) for metadata and captions.
- **Ink Muted (Dark)** ({colors.dark-ink-muted}): Secondary type on dark canvas — gray (#999999) for metadata and captions.

### Semantic
- **Success Green** ({colors.semantic-success}): Pricing comparison-table checkmarks. Glyph fill, not surface.

### Brand Gradient (signature)
- **Gradient Magenta** ({colors.gradient-magenta}): Spotlight card variant.
- **Gradient Violet** ({colors.gradient-violet}): Spotlight card variant — most common.
- **Gradient Orange** ({colors.gradient-orange}): Spotlight card variant — sunset wash.
- **Gradient Coral** ({colors.gradient-coral}): Spotlight card variant — coral/pink.

These four sit as oversized atmospheric tiles inside otherwise monochrome card grids — a canvas with one or two glowing spotlight cards is a recurring page signature.

## Typography

### Font Family

- **Inter Variable** — AwesomeSlide's display and body typeface. Geometric, slightly humanist, very confident at large sizes with extreme negative tracking. Fallbacks: system sans-serif.
- **Inter Variable** — System body typeface. Used with extensive OpenType character variants: `cv01` (alternate "1"), `cv05` (alternate "g"), `cv09` (alternate "i" / "l"), `cv11` (alternate "0"), `ss03` / `ss07` stylistic sets, `dlig` discretionary ligatures, and `tnum` for numerics in tabular contexts. The result is a body voice that feels bespoke without commissioning a custom face.
- **Inter** — Used selectively for `{typography.headline}` (the 22px / 20px tier). The non-variable cut catches small tracking targets that the variable file rounds.

### Hierarchy

| Token | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|
| `{typography.display-xxl}` | 110px | 500 | 0.85 | -5.5px | Largest hero headline (home, AI page) |
| `{typography.display-xl}` | 85px | 500 | 0.95 | -4.25px | Section opener headlines |
| `{typography.display-lg}` | 62px | 500 | 1.00 | -3.1px | Sub-section openers |
| `{typography.display-md}` | 32px | 500 | 1.13 | -1.0px | Card titles, smaller display |
| `{typography.headline}` | 22px | 700 | 1.20 | -0.8px | Pricing tier headlines, FAQ category titles |
| `{typography.subhead}` | 24px | 400 | 1.30 | -0.01px | Lead body next to display headlines |
| `{typography.body-lg}` | 18px | 400 | 1.30 | -0.18px | Hero subhead, lead paragraphs |
| `{typography.body}` | 15px | 400 | 1.30 | -0.15px | Default body, card descriptions |
| `{typography.body-sm}` | 14px | 500 | 1.40 | -0.14px | Pricing comparison rows, dense data |
| `{typography.caption}` | 13px | 500 | 1.20 | -0.13px | Eyebrows, footer columns, meta |
| `{typography.micro}` | 12px | 400 | 1.20 | -0.12px | Disclaimer, footnote |
| `{typography.button}` | 14px | 500 | 1.0 | -0.14px | Pill buttons |

### Principles

- **Letter-spacing scales with size, hard.** Display-xxl pulls -5.5px (5% of size); body sticks to about -1% (-0.15px on 15px). The result: posters at the top, comfortable reading at body.
- **OpenType character variants are the brand voice.** Switching off `cv11`, `ss03`, etc. visibly changes the body voice — the brand depends on them.
- **Weight stays in a narrow band.** Display sits at 500, body at 400, body-sm/caption at 500. Hierarchy is carried by size + tracking, not by 700/900 ramps.
- **Tight line-heights everywhere.** Even body runs at 1.30 — AwesomeSlide's editorial tone is denser than typical SaaS marketing.

### Typography Baseline

AwesomeSlide utilizes **Inter Variable** as the single typography baseline across the entire application and design system, configured with tight tracking for display headers to ensure a clean, high-contrast, poster-like character.

## Layout

### Spacing System

- **Base unit**: 5px (AwesomeSlide uses non-standard 5/10/15/20/30 increments rather than the more common 4/8/16/24).
- **Tokens (front matter)**: `{spacing.hair}` 1px · `{spacing.xxs}` 4px · `{spacing.xs}` 8px · `{spacing.sm}` 12px · `{spacing.md}` 15px · `{spacing.lg}` 20px · `{spacing.xl}` 30px · `{spacing.xxl}` 40px · `{spacing.section}` 96px.
- Card interior padding: `{spacing.lg}` 20px on pricing cards; `{spacing.xl}` 30px on gradient spotlight cards.
- Pill button padding: 10px vertical · 15px horizontal.
- Section padding (vertical): roughly `{spacing.section}` 96px on home; tighter (~64px) on pricing comparison.

### Grid & Container

- Max content width sits around the 1199px breakpoint, with side gutters that scale toward `{spacing.xl}` on desktop.
- Card grids on the home gallery use 2-up at desktop, collapsing to 1-up below 810px.
- Pricing tier grid is 4-up across the documented breakpoints; comparison table beneath it uses fixed-width left column with horizontally scrolling tier columns at narrow widths.

### Whitespace Philosophy

The canvas (whether pure white or near-black) IS the whitespace. Where lighter brands lean on white air to separate sections, AwesomeSlide leans on long stretches of canvas with a single oversized statement floating in the middle. Sections separate by mode change: a band of cards, then a band of flat canvas with a gradient spotlight, then back to cards — like cuts in a film.

## Elevation & Depth

| Level | Treatment (Light Mode) | Treatment (Dark Mode) | Use |
|---|---|---|---|
| 0 (flat) | No shadow, no border | No shadow, no border | Default for canvas-mounted display type, FAQ rows, footer |
| 1 (card) | `{colors.surface-1}` lift on canvas | `{colors.dark-surface-1}` lift on canvas | Pricing cards, mockup tiles, secondary buttons |
| 2 (lifted) | `1px solid {colors.hairline}` + `rgba(0,0,0,0.06)` 0px 10px 30px drop | `rgba(255,255,255,0.10)` 0.5px top edge + `rgba(0,0,0,0.25)` 0px 10px 30px drop | Floating product cards, modal cards |
| 3 (selected) | `rgba(0,153,255,0.20)` 0px 0px 0px 2px ring | `rgba(0,153,255,0.15)` 0px 0px 0px 1px ring | Focused inputs, selected option |

Four shadow signatures recur across the homepage: a 1px subtle drop, a translucent blue ring, a thick outline (used as the active-element marker on sub-nav), and the layered top edge + drop-shadow used for floating cards.

### Decorative Depth

- **Gradient spotlight cards** are the dominant depth device — color saturation against the canvas substitutes for shadow-driven elevation.
- **Layered product mockups** (browser frames containing live AwesomeSlide-built slides) sit inside Surface 1 cards with the level-2 treatment.
- **Subtle blue ring (focus / selected)** is the only chromatic depth signal — used to mark the active state of input groups and pricing tier toggles without changing the underlying surface.

## Shapes

### Border Radius Scale

AwesomeSlide's extracted radius set is unusually granular (1px, 4px, 5px, 6px, 8px, 10px, 12px, 15px, 20px, 30px, 40px, 100px). The named scale below picks the levels the marketing surface actually consumes.

| Token | Value | Use |
|---|---|---|
| `{rounded.xs}` | 4px | Small chip / utility radius |
| `{rounded.sm}` | 6px | Inline tag, badge |
| `{rounded.md}` | 10px | Form input, list item |
| `{rounded.lg}` | 15px | Template card thumbnails |
| `{rounded.xl}` | 20px | Pricing cards, mockup tiles |
| `{rounded.xxl}` | 30px | Gradient spotlight cards, oversized panels |
| `{rounded.pill}` | 100px | All primary text CTAs |
| `{rounded.full}` | 9999px | Circular icon buttons, avatar circles |

### Photography & Illustration Geometry

- Embedded site mockups (browser-chromed previews of AwesomeSlide-built slides) sit in `{rounded.xl}` 20px tiles with `{spacing.md}` 15px interior padding.
- Gradient spotlight cards use `{rounded.xxl}` 30px corners — softer than the 20px content cards by design, to make them feel like atmospheric panels rather than tighter UI.
- Icon glyphs and sub-nav glyphs render in `{rounded.full}` circles at 32–40px sizes.

## Components

### Buttons

**`button-primary`** (Light Mode: `{components.button-primary}`, Dark Mode: `{components.dark-button-primary}`)
- Primary CTA across home, pricing, AI, and gallery pages.
- Light mode: Background `{colors.primary}` (black), text `{colors.on-primary}` (white).
- Dark mode: Background `{colors.dark-primary}` (white), text `{colors.dark-on-primary}` (black).
- Rounded `{rounded.pill}`, type `{typography.button}`, padding 10px 15px.
- Pressed state uses a transform-scale shrink rather than a filled color transition.

**`button-secondary`** (Light Mode: `{components.button-secondary}`, Dark Mode: `{components.dark-button-secondary}`)
- Light gray pill in light mode; charcoal pill in dark mode. Used for secondary navigation actions ("Sign in", "Talk to sales").
- Light mode: Background `{colors.surface-1}`, text `{colors.ink}`.
- Dark mode: Background `{colors.dark-surface-1}`, text `{colors.dark-ink}`.
- Rounded `{rounded.pill}`, type `{typography.button}`, padding 10px 15px.

**`button-translucent`** (Light Mode: `{components.button-translucent}`, Dark Mode: `{components.dark-button-translucent}`)
- Translucent secondary used on top of busy backgrounds (gallery hero, gradient cards).
- Light mode: Background `{colors.surface-2}` (translucent light gray), text `{colors.ink}` (near-black).
- Dark mode: Background `{colors.dark-surface-2}` (translucent charcoal), text `{colors.dark-ink}` (white).

**`button-icon-circular`** (Light Mode: `{components.button-icon-circular}`, Dark Mode: `{components.dark-button-icon-circular}`)
- 40px circle for inline icon actions (carousel arrows, social links).
- Light mode: Background `{colors.surface-1}`, text `{colors.ink}`, rounded `{rounded.full}`, size 40px.
- Dark mode: Background `{colors.dark-surface-1}`, text `{colors.dark-ink}`, rounded `{rounded.full}`, size 40px.

### Pricing Tabs

**`pricing-tab-default`** + **`pricing-tab-selected`** (Dark Mode: `{components.dark-pricing-tab-default}` + `{components.dark-pricing-tab-selected}`)
- The pill-toggle that switches between Basic / Pro / Business / Enterprise on `/pricing`.
- Light mode default: `{colors.canvas}` bg, `{colors.ink-muted}` text; selected: `{colors.surface-2}` bg, `{colors.ink}` text.
- Dark mode default: `{colors.dark-canvas}` bg, `{colors.dark-ink-muted}` text; selected: `{colors.dark-surface-2}` bg, `{colors.dark-ink}` text.

### Inputs & Forms

**`text-input`** + **`text-input-focused`** (Dark Mode: `{components.dark-text-input}` + `{components.dark-text-input-focused}`)
- Form fields on `/pricing` (seat-count, currency switcher).
- Light mode: Background `{colors.surface-1}`, text `{colors.ink}`, focus ring `{colors.accent-blue}` shadow.
- Dark mode: Background `{colors.dark-surface-1}`, text `{colors.dark-ink}`, focus ring `{colors.dark-accent-blue}` shadow.

### Cards & Containers

**`pricing-card`** / **`-featured`** (Dark Mode: `{components.dark-pricing-card}` / `{components.dark-pricing-card-featured}`)
- Light mode: `{colors.surface-1}` bg (featured uses `{colors.surface-2}`), `{colors.ink}` text, `{rounded.xl}`.
- Dark mode: `{colors.dark-surface-1}` bg (featured uses `{colors.dark-surface-2}`), `{colors.dark-ink}` text, `{rounded.xl}`.

**`template-card`** and **`product-mockup-tile`** (Dark Mode: `{components.dark-template-card}` / `{components.dark-product-mockup-tile}`)
- Light mode: Background `{colors.surface-1}`, text `{colors.ink}`.
- Dark mode: Background `{colors.dark-surface-1}`, text `{colors.dark-ink}`.

### Gradient Spotlight Cards (signature)

The defining decorative surface of AwesomeSlide's marketing — oversized atmospheric tiles dropped into otherwise monochrome card grids. In dark mode, typography flips to `{colors.dark-ink}` (or maintains solid white text with a darkened gradient core/border to ensure WCAG AA contrast).
- **`gradient-spotlight-card`**: Background `{colors.gradient-violet}`, text `{colors.ink}`, type `{typography.subhead}`.
- **`gradient-spotlight-card-magenta`**: Background `{colors.gradient-magenta}`.
- **`gradient-spotlight-card-orange`**: Background `{colors.gradient-orange}`.

### Comparison & FAQ

**`feature-row`** + **`comparison-row`** (Dark Mode: `{components.dark-feature-row}` + `{components.dark-comparison-row}`)
- Light mode: `{colors.canvas}` bg, text `{colors.ink}`/`{colors.ink-muted}`, soft underlines `{colors.hairline-soft}`.
- Dark mode: `{colors.dark-canvas}` bg, text `{colors.dark-ink}`/`{colors.dark-ink-muted}`, soft underlines `{colors.dark-hairline-soft}`.

**`faq-row`** (Dark Mode: `{components.dark-faq-row}`)
- Light mode: Background `{colors.canvas}`, text `{colors.ink}`, `{rounded.md}`, padding 24px.
- Dark mode: Background `{colors.dark-canvas}`, text `{colors.dark-ink}`, `{rounded.md}`, padding 24px.

### Navigation

**`top-nav`** (Dark Mode: `{components.dark-top-nav}`)
- Sticky bar with wordmark, primary nav, and actions.
- Light mode: Background `{colors.canvas}`, text `{colors.ink}`.
- Dark mode: Background `{colors.dark-canvas}`, text `{colors.dark-ink}`.

### Footer

**`footer`** (Dark Mode: `{components.dark-footer}`)
- Link grid with wordmark and columns.
- Light mode: Background `{colors.canvas}`, text `{colors.ink-muted}`.
- Dark mode: Background `{colors.dark-canvas}`, text `{colors.dark-ink-muted}`.

## Do's and Don'ts

### Do

- Reserve `{colors.primary}`/`{colors.canvas}` (light) or `{colors.dark-primary}`/`{colors.dark-canvas}` (dark) as the system's anchor surfaces.
- Push display-size letter-spacing aggressively negative — `{typography.display-xxl}` at -5.5px is the brand signature.
- Use `{colors.accent-blue}` only for hyperlinks, focus rings, and selected indicators. Never as a background or button fill.
- Drop one or two gradient spotlight variants into a card grid; they are the brand's atmosphere device.
- Compose every CTA as a pill (`{rounded.pill}`).
- Keep body type Inter Variable with character variants `cv01`, `cv05`, `cv09`, `cv11`, `ss03`, `ss07` enabled.

### Don't

- Don't mix dark and light components within the same section unless explicitly designed as an inverted block (e.g. an inverse-canvas section).
- Don't introduce mid-tone gray text outside `{colors.ink-muted}` / `{colors.dark-ink-muted}`. The hierarchy is binary: `ink` or `ink-muted`.
- Don't use `{colors.accent-blue}` as a brand fill (e.g., a blue CTA pill).
- Don't square off CTAs. Pill (`{rounded.pill}`) or full circle is the brand vocabulary.
- Don't reduce the negative letter-spacing on display sizes.
- Don't apply gradient backgrounds to whole sections. Gradients are CARDS, not section grounds.

## Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|---|---|---|
| Desktop | 1199px | Default desktop layout |
| Tablet | 810px | Card grids collapse 4-up → 2-up; nav becomes hamburger |
| Mobile-Lg | 809px | Pricing comparison table becomes per-tier accordion |
| Mobile-XS | 98px | Smallest documented breakpoint — single-column everything |

### Touch Targets

- Pill buttons maintain a minimum 44px tap height across all viewports.
- Circular icon buttons are 40px on desktop and grow to 44px on touch viewports.
- Pricing-tab pills hold ≥40px tap height.

### Collapsing Strategy

- **Nav**: horizontal nav collapses to a hamburger overlay below 810px.
- **Card grids**: grids go 2-up on desktop → 1-up on mobile.
- **Pricing comparison table**: collapses into per-tier accordions below 810px.
- **Display type**: `{typography.display-xxl}` 110px scales down toward `{typography.display-lg}` 62px on tablet and `{typography.display-md}` 32px on mobile, preserving negative letter-spacing.

### Image Behavior

- Embedded product mockups maintain their aspect ratio and never crop.
- Gradient spotlight cards keep their gradient orientations across breakpoints.

## Iteration Guide

1. Focus on ONE component at a time and reference it by its `components:` token name.
2. When introducing a new section, decide first which surface lift it lives on — canvas for hero/FAQ, surface-1 for cards, surface-2 for featured cards.
3. Default body to `{typography.body}`; reach for `{typography.subhead}` only inside spotlight cards.
4. Run `npx @google/design.md lint DESIGN.md` after edits — `broken-ref`, `contrast-ratio`, and `orphaned-tokens` warnings flag issues automatically.
5. Add new variants as separate component entries (`-pressed`, `-featured`, `-selected`) — do not bury them in prose.
6. Treat `{colors.accent-blue}` as a single-shot signal color.
7. Gradient spotlight cards are scarce by design. One or two per long page is the spec.

## Known Gaps

- The exact gradient stops for the spotlight cards are derived from screenshot pixels. Treat the documented `{colors.gradient-*}` hex values as base anchors, not as exact gradient specs.
- Form-field validation / error styling is not visible on the inspected pages.
- The marketplace template detail page returned sparser CSS variable data; surface tokens for that page were inferred from the matching home / gallery treatment.
- The original reference design has been adapted to prefer light mode as the default theme, with dark mode as a fully documented matching variation for the AwesomeSlide framework.
