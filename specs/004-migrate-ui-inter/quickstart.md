# Quickstart: UI Design System Migration to Inter

Use this guide when implementing `specs/004-migrate-ui-inter`.

## 1. Start From the Specifications

Read these files first:
- `specs/004-migrate-ui-inter/spec.md`
- `specs/004-migrate-ui-inter/plan.md`
- `specs/004-migrate-ui-inter/research.md`

## 2. Update Design Reference Documents

1. Open [DESIGN.md](file:///d:/Projects/awesome-slide/references/new-design/DESIGN.md) and replace all instances of `GT Walsheim Framer Medium` and `GT Walsheim Medium` with `Inter` / `Inter Variable`.
2. Update visual variables (colors, border, radius, shadow) in [DESIGN.md](file:///d:/Projects/awesome-slide/references/new-design/DESIGN.md) to define canonical values.
3. Review [AWESOME_SLIDE_DESIGN_SYSTEM.md](file:///d:/Projects/awesome-slide/references/AWESOME_SLIDE_DESIGN_SYSTEM.md) to ensure consistency.

## 3. Configure Core Package Dependency and styles.css

1. Swap `@fontsource-variable/google-sans-flex` with `@fontsource-variable/inter` in [package.json](file:///d:/Projects/awesome-slide/packages/core/package.json).
2. Execute `pnpm install` at the project root to update the lockfile.
3. Edit [styles.css](file:///d:/Projects/awesome-slide/packages/core/src/app/styles.css):
   - Replace `@import "@fontsource-variable/google-sans-flex";` with `@import "@fontsource-variable/inter";`.
   - Update `--font-sans` and `--font-heading` to use `"Inter Variable"`.
   - Configure root token definitions for spacing (5px grid), corners, shadows, and hairline borders.

## 4. Migrate Core UI Components

1. Open components under [packages/core/src/app/components/](file:///d:/Projects/awesome-slide/packages/core/src/app/components/):
   - **Buttons**: Replace hardcoded button styling with pill shapes (`rounded-full` / `rounded.pill`) for text-bearing buttons and circles (`rounded-full size-10` / `rounded.full`) for icon buttons.
   - **Borders**: Update dividers and borders to use the hairline system (`0.5px` top/bottom or `--hairline` styling).
   - **Spacings**: Refine margin, padding, and gaps to snap to the 5px grid.
   - **Radius**: Set cards to `rounded-xl` and gradient showcase items to `rounded-xxl`.
   - **Gradients**: Apply atmospheric gradients to empty states and loaders.

## 5. Update Web Layout and Styles

1. Edit [layout.tsx](file:///d:/Projects/awesome-slide/apps/web/app/layout.tsx):
   - Load `Inter` from `next/font/google`.
   - Set Inter as the body font variable.
   - Remove Google Sans Flex Google Fonts CDN link.
2. Review [landing.css](file:///d:/Projects/awesome-slide/apps/web/app/(home)/landing.css) and ensure alignment with the new light-canvas design language.

## 6. Validate Locally

Run the standard validation scripts:
```bash
pnpm check
pnpm typecheck
pnpm build
```

Run dev server to verify visually:
```bash
pnpm dev
```
Navigate around the app and verify all UI components (sidebar, editor inspector, notes drawers, dialogs, present controls, and marketing headers) load and render typography and design tokens correctly using Inter.

## 7. Generate Changeset

Generate a changeset since `@awesome-slide/core` dependencies and code have changed:
```bash
pnpm changeset
```
Choose `patch` bump for `@awesome-slide/core` and provide a concise description:
```text
Migrate typography and UI visual design system (buttons, borders, spacings, and cards) to Inter Variable and canonical design tokens.
```
