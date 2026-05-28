# Validation Notes: Reshape Landing, Sidebar, and Navigation

**Feature**: `002-reshape-landing-navigation`

## Environment

- Spec Kit prerequisite script: blocked on this Windows machine because `bash` resolves to WSL and no Linux distribution is installed.
- Checklists: no `specs/002-reshape-landing-navigation/checklists/` directory is present.
- Ignore-file check: repository is a Git repo and `.gitignore` already covers `node_modules`, build outputs, logs, env files, Vite/Turbo caches, TypeScript build info, and `.codegraph`.
- Project package publishing: package-level publish hygiene is handled by existing package metadata and changesets; no root `.npmignore` change was needed.

## Source Review

- Landing: hero copy, CTA pair, visible real slide preview, white canvas, pastel section rhythm, CTA wrapping, footer hierarchy, and scarce promo magenta are implemented in the existing landing route and section components.
- Navbar and docs chrome: home skip link, fixed-navigation compensation, shared docs shell spacing, Next.js internal links, and stable 56px top-bar rhythm are implemented.
- Runtime sidebar and mobile navigation: sidebar width, group hierarchy, row density, selected state, counters, icon picker swatches, and 44px mobile pill targets are implemented without editing generated shadcn UI files.
- Accessibility and motion: shared focus-visible rules, reduced-motion overrides, labelled icon controls, keyboardable preview control, and mobile menu focus return were reviewed in source and browser.
- Drift scan: no red or vermillion primary chrome remained in touched landing/runtime surfaces; magenta is limited to token definitions and the final CTA promo moment; `packages/core/src/app/components/ui` has no diff.

## Browser Review

| Surface | 375px | 768px | 1024px | 1440px | Notes |
| --- | --- | --- | --- | --- | --- |
| Landing | Pass | Pass | Pass | Pass | No horizontal scroll at all tested widths. At 375px the nav was 57px including border, hero preview was visible in the first viewport, and CTAs fit. |
| Navbar/menu | Pass | Pass | Pass | Pass | Mobile menu opens with Docs, Demo, GitHub, and theme controls; Escape closes it and returns focus to the Open menu button. Desktop menu button is hidden at 1024px and 1440px. |
| Docs chrome | Pass | Pass | Pass | Pass | `/docs` uses `.as-docs-shell`, keeps the Introduction heading reachable, and has no horizontal scroll at 375px, 768px, 1024px, or 1440px. |
| Runtime sidebar/mobile nav | Pass | Pass | Pass | Pass | Demo runtime has no horizontal scroll. Desktop/tablet sidebar is 288px wide; mobile hides the sidebar and shows 44px-tall folder pills with active state. |

## Keyboard and Motion

- Keyboard traversal: navbar links, CTAs, menu toggle, preview control, sidebar rows, folder actions, icon picker, and mobile pills have reachable focus targets and visible focus rings.
- Focus return: verified on mobile landing menu; Escape closes the menu and focus returns to the Open menu button.
- State indicators: sidebar selected rows use color plus structure/border treatment; mobile pills expose `aria-pressed` and visible badges.
- Reduced motion: landing, global app shell, and runtime CSS include `prefers-reduced-motion` rules for scrolling, transitions, animations, marquee, menus, and sidebar motion.

## Quality Gates

| Command | Result | Notes |
| --- | --- | --- |
| Touched-file Biome check | Pass | `node node_modules\@biomejs\biome\bin\biome check ...` passed for the 25 implementation files touched by this feature. |
| `pnpm.cmd check` | Fail, unrelated | Full repo check reports 157 errors and 12 warnings in existing formatting-sensitive files outside this feature scope, including `.agents`, `.specify`, root package/config files, and other metadata. |
| `pnpm.cmd typecheck` | Fail, unrelated | Full typecheck stops on existing core `TS2532` errors in `packages/core/src/app/lib/assets.ts`, `packages/core/src/app/lib/folders.ts`, and `packages/core/src/app/lib/use-slide-module.ts`. Targeted `pnpm.cmd --filter web types:check` passes. |
| `pnpm.cmd test` | Fail, unrelated | Vitest ran 19 files: 18 passed, 1 failed. Existing `packages/core/src/vite/loc-tags-plugin.test.ts` has 4 failing `tagged transform result` expectations; 244 of 248 tests passed. |
| `pnpm.cmd build` | Pass | First sandboxed run failed because Next.js could not fetch Google Fonts; rerun with approved network access passed for core, CLI, demo, and web. |
| `git diff --check` | Pass | No whitespace errors. Git emitted LF-to-CRLF working-copy warnings only. |

## Release Prep

- Changeset: `.changeset/reshape-landing-navigation.md` adds the required `@awesome-slide/core` patch entry for the runtime sidebar and mobile navigation changes.
- Task format: task checkboxes now reflect completed implementation and validation work for T001 through T040.
- Spec Kit hooks: optional follow-up hook remains manual, for example `/speckit-git-commit` if the branch should be committed.
