# Quickstart: Reshape Landing, Sidebar, and Navigation

## 1. Review Source References

Read these before implementation:

- `references/REBRANDING_DESIGN_FINAL.md`
- `references/AWESOME_SLIDE_DESIGN_SYSTEM.md`
- `specs/002-reshape-landing-navigation/contracts/navigation-layout-contract.md`
- `specs/001-rebrand-awesome-slide/validation-notes.md`

Use `ui-ux-pro-max` output as supplemental guidance only. The final palette, typography, and shape decisions come from the Awesome Slide design references.

## 2. Inspect Target Files

Landing and web chrome:

```powershell
rg --files apps/web | rg "landing|layout|global.css"
```

Runtime sidebar and mobile navigation:

```powershell
rg --files packages/core/src/app | rg "sidebar|home-shell|home.tsx|styles.css"
```

## 3. Implement In Slices

Recommended order:

1. Landing first viewport and section rhythm.
2. Web navbar and shared/docs chrome.
3. Runtime sidebar and mobile pill/drawer behavior.
4. Source-level design drift scan.
5. Browser validation sweep.

Keep implementation within existing components unless a small local helper removes meaningful duplication.

## 4. Run Local Validation

Use `pnpm.cmd` on Windows because `pnpm.ps1` may be blocked by execution policy.

```powershell
pnpm.cmd check
pnpm.cmd typecheck
pnpm.cmd test
pnpm.cmd build
```

If pre-existing unrelated failures remain, record the exact failing command and scope in this feature's validation notes.

## 5. Browser Review

Review the landing page, docs/shared nav, runtime home/sidebar, and runtime mobile navigation at:

- 375px
- 768px
- 1024px
- 1440px

Check:

- No horizontal scroll.
- No fixed-nav overlap.
- Hero product identity, CTA pair, and preview visible in first viewport.
- Keyboard focus order matches visual order.
- Icon-only controls have accessible names or tooltips.
- Reduced motion disables non-essential marquee or entrance animation.
- Sidebar rows do not shift when hovered, selected, or showing actions.

## 6. Changeset Requirement

If implementation touches `packages/core`, add a changeset for `@awesome-slide/core` with a short, user-facing patch description.
