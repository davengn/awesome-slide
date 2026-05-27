# Layout Audit: Reshape Landing, Sidebar, and Navigation

**Feature**: `002-reshape-landing-navigation`

**Design sources, in order**:

1. `references/REBRANDING_DESIGN_FINAL.md`
2. `references/AWESOME_SLIDE_DESIGN_SYSTEM.md`
3. `specs/002-reshape-landing-navigation/contracts/navigation-layout-contract.md`
4. `specs/002-reshape-landing-navigation/research.md`

## Final Design Constraints

- Marketing chrome uses a white canvas, black ink, hairline borders, and black/white pill CTAs.
- The first viewport must show the Awesome Slide name or product category, concise value copy, a primary action, a secondary action, and a real product or slide preview.
- Pastel sections use one dominant block at a time: lime, lilac, cream, mint, pink, coral, or navy.
- White canvas spacing separates color-block moments.
- Magenta is reserved for one scarce promo/action moment and is not the general primary.
- Desktop top navigation uses a stable 56px rhythm.
- Mobile navigation collapses links into an accessible menu while preserving access to primary actions.
- Runtime sidebar adapts the same monochrome system at a denser scale: compact rows, hairline dividers, black selected states, stable dimensions, and pastel only for compact empty/onboarding states.
- `packages/core/src/app/components/ui` remains out of scope.

## Current Source Inventory

### Landing

- `apps/web/app/(home)/layout.tsx`: scopes landing styles through `.os-landing`.
- `apps/web/app/(home)/landing.css`: landing token bridge, motion utilities, focus states, marquee, and hero/section styling hooks.
- `apps/web/components/landing/hero.tsx`: current copy and CTA pair; product preview is currently supplied by the later live demo instead of the first viewport.
- `apps/web/components/landing/live-demo.tsx`: slide player section with external demo link and slide controls.
- `apps/web/components/landing/inline-slide-player.tsx`: real slide preview renderer and keyboard navigation.
- `apps/web/components/landing/how-it-works.tsx`: three pastel workflow cards.
- `apps/web/components/landing/anatomy.tsx`: code and preview proof section.
- `apps/web/components/landing/agents.tsx`: agent logo marquee.
- `apps/web/components/landing/assets.tsx`: asset manager mock and callouts.
- `apps/web/components/landing/get-started.tsx`: final install CTA with the current magenta highlight.
- `apps/web/components/landing/footer.tsx`: footer link grid.

### Web Navigation and Docs Chrome

- `apps/web/components/landing/nav.tsx`: sticky marketing nav, docs/demo/github links, theme toggle.
- `apps/web/app/(home)/layout.tsx`: landing shell wrapper and future skip-link/sticky offset host.
- `apps/web/app/docs/layout.tsx`: Fumadocs layout wrapper.
- `apps/web/lib/layout.shared.tsx`: shared docs nav title and GitHub URL.
- `apps/web/app/global.css`: global docs/site token bridge, selection, body lock, and future shared focus/offset helpers.

### Runtime Sidebar and Mobile Navigation

- `packages/core/src/app/routes/home-shell.tsx`: desktop sidebar host, mobile header, mobile folder pill row, and content outlet.
- `packages/core/src/app/routes/home.tsx`: selected folder heading, slide grid, sort/search controls, slide cards, empty states, and move/rename/delete dialogs.
- `packages/core/src/app/components/sidebar/sidebar.tsx`: desktop sidebar groups, folder creation, theme toggle, and folder rows.
- `packages/core/src/app/components/sidebar/folder-item.tsx`: row selection, long labels, drag/drop, rename, icon picker trigger, and actions menu.
- `packages/core/src/app/components/sidebar/icon-picker.tsx`: emoji/color icon picker.
- `packages/core/src/app/components/sidebar/mobile-pill.tsx`: mobile folder/navigation pill.
- `packages/core/src/app/styles.css`: runtime tokens, component utilities, focus/motion behavior, and scrollbar styling.

## Target Layout Mapping

### LandingSection and ActionPair Targets

| Section | Target surface | Purpose | Media treatment | CTA treatment |
| --- | --- | --- | --- | --- |
| Hero | White canvas | Immediate product proof and start actions | Product/editor preview visible in first viewport | Black copy command plus white docs pill |
| Live demo | Mint block inside white canvas | Inspectable slide preview | 16:9 real slide player | External demo link plus circular slide controls |
| Workflow | Lime block | Three-step authoring story | Compact command panes, not nested hero cards | No competing CTA |
| Anatomy | Lilac/cream proof | Code-to-render proof | Code pane and rendered slide preview | No competing CTA |
| Agents | White or inverse strip | Bring-your-agent proof | Logo marquee with reduced-motion fallback | No competing CTA |
| Assets | Cream or white story block | Asset workflow proof | Asset manager mock with compact callouts | No competing CTA |
| Final CTA | Lilac promo block on white canvas | Install action | Command copy control | Single magenta promo accent allowed |
| Footer | White canvas | Dense link grid | Wordmark only | Links stay monochrome |

### NavigationItem and NavigationGroup Targets

| Group | Items | Desktop behavior | Mobile behavior |
| --- | --- | --- | --- |
| Brand | Home logo and wordmark | Left aligned, 56px nav rhythm | Always visible |
| Primary links | Docs, Demo, GitHub | Center/right text links with stable hit targets | Collapse into menu |
| CTA pair | Install command, Docs or Get started | Black/white pill pair where space permits | Primary action stays visible; secondary lives in menu if needed |
| Utilities | Theme toggle, GitHub stars | Right aligned with circular/icon treatment | Menu-safe, accessible names preserved |
| Docs chrome | App title, GitHub link | Monochrome shared chrome | Fumadocs responsive shell with matching tokens |

### SidebarSection and ResponsiveState Targets

| Surface | Target | Responsive behavior |
| --- | --- | --- |
| Desktop sidebar | 17rem compact white rail with hairline border | Hidden below `md` and replaced by mobile navigation |
| System group | Draft, Themes, Assets rows | Stable 34-38px rows, count badges, black selected state |
| Folder group | User folders and create action | Long labels truncate, action buttons do not shift row height |
| Icon picker | Emoji/color selection | Accessible labels for icon-only color swatches |
| Mobile navigation | Horizontal pill rail today, drawer-capable styling | 44px touch targets, no hidden primary workflows |
| Home content | Slide grid remains dominant | Sidebar treatment must not compete with slide previews |

## File Coordination Notes

- `apps/web/app/(home)/landing.css` is shared by US1 and US2; landing section and navbar changes must be coordinated there.
- `packages/core/src/app/styles.css` is shared by runtime shell, sidebar, empty states, focus, and reduced-motion behavior.
- `packages/core` changes require a changeset before completion.
