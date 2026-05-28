# Data Model: UI Design System Migration to Inter

This document defines the key entities, schema, and relationships governing the typography tokens, design system tokens, and component treatments for the migration.

## TypographyToken

Represents a typographic definition used in the design system.

**Fields**

- `name`: String (e.g., `display-xxl`, `display-xl`, `body`, `caption`).
- `fontFamily`: String. Must be `"Inter"` or `"Inter Variable"` (replacing `GT Walsheim` and `Google Sans Flex`).
- `fontSize`: String or integer (e.g., `110px`, `15px`).
- `fontWeight`: Integer (e.g., `400`, `500`, `600`, `700`).
- `lineHeight`: Decimal (e.g., `0.85`, `1.30`).
- `letterSpacing`: String (e.g., `-5.5px`, `-0.15px`, `-4%`).
- `fontFeature`: Optional string containing OpenType features (e.g., `cv11`, `ss03`).

**Validation Rules**

- No typography token can reference a font family other than `Inter`, `Inter Variable`, or standard system fallbacks.
- Display tokens (`display-xxl`, `display-xl`, `display-lg`, `display-md`) must specify negative letter-spacing values to maintain the signature style.

## DesignToken

Represents a visual style variable in the Awesome Slide system.

**Fields**

- `name`: String (e.g., `colors.canvas`, `colors.surface-1`, `rounded.pill`, `spacing.md`).
- `cssVariable`: CSS custom property name (e.g., `--canvas`, `--hairline`, `--radius-sm`).
- `value`: Hex code, pixel dimension, or calculation.
- `role`: Enum: `color`, `spacing`, `radius`, `shadow`, `border`.

**Validation Rules**

- Color values must align with the palette variables defined in `references/new-design/DESIGN.md`.
- Spacing values must scale based on the 5px grid.

## ComponentTreatment

Defines how concrete UI components are styled to conform to the design tokens.

**Fields**

- `componentName`: String (e.g., `sidebar`, `inspector-panel`, `button-primary`, `notes-drawer`).
- `corners`: Enum: `pill`, `circle`, `xl` (20px), `xxl` (30px), `none`.
- `borderStyle`: Enum: `hairline` (0.5px), `default` (1px), `none`.
- `background`: Token reference.
- `padding`: Spacing token references.
