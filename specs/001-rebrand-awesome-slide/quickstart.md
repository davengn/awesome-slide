# Quickstart: Rebrand and Redesign Plan

Use this guide when implementing `specs/001-rebrand-awesome-slide`.

## 1. Start From the Contracts

Read these files first:

- `specs/001-rebrand-awesome-slide/spec.md`
- `specs/001-rebrand-awesome-slide/plan.md`
- `specs/001-rebrand-awesome-slide/research.md`
- `specs/001-rebrand-awesome-slide/contracts/brand-migration-contract.md`
- `specs/001-rebrand-awesome-slide/contracts/design-system-contract.md`
- `specs/001-rebrand-awesome-slide/contracts/rebrand-inventory-contract.md`

## 2. Build the Rebrand Inventory

Generate an initial inventory with literal search, then classify each match before editing:

```bash
rg -n "open-slide|OpenSlide|@open-slide|Open Slide" package.json README.md AGENTS.md .github .changeset packages apps
```

Do not run a global replacement. Some legacy names must remain as compatibility aliases or historical changelog content.

## 3. Implement Naming in Compatibility Order

Recommended order:

1. Package metadata and root scripts.
2. CLI binary aliases and generated template scripts.
3. Config file canonical name plus old-name fallback.
4. Runtime app title, locale strings, and index metadata.
5. Virtual module, HMR, localStorage, and runtime path aliases.
6. Docs, marketing, package READMEs, GitHub templates, and skills.
7. Demo project and starter slide copy.

For public surfaces, add tests that prove old names still work before making the new names canonical.

## 4. Implement Design Tokens First

Create or update a durable design source of truth before broad UI edits. Treat
`references/REBRANDING_DESIGN_FINAL.md` as normative for color and marketing
rhythm: black/white primary system, exact pastel block family, scarce
`#ff3d8b` magenta promo accent, and white marketing canvas with limited inverse
sections. Then map the approved tokens into:

- `packages/core/src/app/styles.css`
- runtime app component classes in `packages/core/src/app`
- marketing/docs surfaces in `apps/web`
- starter template copy and sample slide design in `packages/cli/template`

Do not hand-edit `packages/core/src/app/components/ui` unless regenerating shadcn components.

## 5. Validate Locally

Run the standard checks:

```bash
pnpm check
pnpm typecheck
pnpm test
pnpm build
```

For package-specific iteration:

```bash
pnpm core typecheck
pnpm core build
pnpm cli typecheck
pnpm cli build
pnpm dev:demo
pnpm dev:web
```

## 6. Review UX Manually

Review redesigned surfaces at:

- 375px mobile
- 768px tablet
- 1024px desktop
- 1440px wide desktop

Check:

- implemented colors match `references/REBRANDING_DESIGN_FINAL.md`
- marketing does not default to an all-dark shell
- vermillion/red accent drift is absent unless explicitly approved
- no horizontal scroll in standard app views
- visible focus states
- readable contrast
- no overlapping controls or clipped labels
- reduced-motion behavior
- loading states preserve layout
- slide canvas remains visually dominant

## 7. Add Changesets When Code Changes

Any implementation that touches `packages/core` or `packages/cli` must include a changeset:

```bash
pnpm changeset
```

Use one short, present-tense line. Example:

```text
Rebrand runtime and starter surfaces to Awesome Slide.
```
