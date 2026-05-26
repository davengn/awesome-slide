# Rebrand Inventory: Awesome Slide

Generated from:

```bash
rg -n "open-slide|OpenSlide|@open-slide|Open Slide" package.json README.md AGENTS.md .github .changeset packages apps
```

## Schema

| Field | Meaning |
| --- | --- |
| id | Stable identifier for the inventory row |
| path | Project-relative file or file group |
| currentValue | Legacy value or pattern discovered |
| category | Approved inventory category |
| replacementValue | Canonical value when replacing |
| decision | `replace`, `alias`, `keep-historical`, `defer`, or `remove` |
| compatibilityWindow | Required for aliases |
| validationMethod | Verification method |
| status | `todo`, `in-progress`, `done`, or `blocked` |
| notes | Implementation context |

## Scan Summary

| Area | Matching files | Status |
| --- | ---: | --- |
| package-metadata | 5 | in-progress |
| cli | 4 | in-progress |
| config | 5 | in-progress |
| runtime-ui | 8 | in-progress |
| locale | 4 | in-progress |
| docs | 48 | in-progress |
| template | 5 | in-progress |
| demo | 23 | in-progress |
| skill | 5 | in-progress |
| github | 3 | in-progress |
| changelog | 4 | done |
| internal-protocol | 18 | in-progress |
| storage | 5 | in-progress |

## Inventory

| id | path | currentValue | category | replacementValue | decision | compatibilityWindow | validationMethod | status | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pkg-root | `package.json` | `open-slide-monorepo`, `@open-slide/*` filters | package-metadata | `awesome-slide-monorepo`, `@awesome-slide/*` filters | replace | n/a | build | todo | Root scripts should target renamed workspace packages. |
| pkg-core | `packages/core/package.json` | `@open-slide/core`, `open-slide` bin, metadata URLs | package-metadata | `@awesome-slide/core`, `awesome-slide` bin, canonical URLs | alias | one-major-cycle | build | todo | Keep `open-slide` bin as compatibility alias. |
| pkg-cli | `packages/cli/package.json` | `@open-slide/cli`, `open-slide` bin, metadata URLs | package-metadata | `@awesome-slide/cli`, `awesome-slide` bin, canonical URLs | alias | one-major-cycle | build | todo | Keep `open-slide` bin as compatibility alias. |
| pkg-demo | `apps/demo/package.json`, `apps/demo/tsconfig.json` | `@open-slide/core`, `open-slide` scripts/types | demo | `@awesome-slide/core`, `awesome-slide` scripts/types | alias | one-major-cycle | build | todo | Demo keeps legacy config file during fallback validation. |
| pkg-template | `packages/cli/template/package.json`, `packages/cli/template/tsconfig.json` | `@open-slide/core`, `open-slide` scripts/types | template | `@awesome-slide/core`, `awesome-slide` scripts/types | replace | n/a | integration-test | todo | New scaffolds should be canonical. |
| config-core | `packages/core/src/vite/open-slide-plugin.ts` | `open-slide.config.ts` | config | `awesome-slide.config.ts` | alias | one-major-cycle | unit-test | todo | Canonical config wins when both exist. |
| config-template | `packages/cli/template/open-slide.config.ts`, `packages/cli/src/init.ts` | `open-slide.config.ts` | config | `awesome-slide.config.ts` | alias | one-major-cycle | integration-test | todo | Starter writes canonical config and keeps legacy template. |
| config-docs | docs and READMEs | `open-slide.config.ts` | docs | `awesome-slide.config.ts` | replace | n/a | inventory-scan | todo | Mention legacy only in migration notes. |
| locale-all | `packages/core/src/locale/*.ts` | `appTitle: 'open-slide'` | locale | `appTitle: 'Awesome Slide'` | replace | n/a | unit-test | done | Covered by locale brand test. |
| app-title | `packages/core/src/app/index.html`, `packages/core/src/app/app.tsx` | `open-slide` | runtime-ui | `Awesome Slide` | replace | n/a | manual-review | done | App metadata and document title now use locale app title. |
| app-copy | `packages/core/src/app/routes/slide.tsx`, `packages/core/src/app/lib/page-context.tsx`, CLI copy | runtime-ui | `Awesome Slide`, `@awesome-slide/core` | replace | n/a | inventory-scan | done | Runtime error prefixes and package-facing copy use canonical names. |
| cli-core | `packages/core/src/cli/run.ts`, `packages/core/src/cli/sync.ts` | `open-slide`, `@open-slide/core`, `OPEN_SLIDE_*` | cli | `awesome-slide`, `@awesome-slide/core`, `AWESOME_SLIDE_*` | alias | one-major-cycle | unit-test | in-progress | Env alias remains supported where needed; help copy is canonical. |
| cli-scaffold | `packages/cli/src/index.ts`, `packages/cli/src/init.ts`, `packages/cli/src/git.ts` | `open-slide` help/output/commit text | cli | `awesome-slide`, `Awesome Slide` | replace | n/a | integration-test | todo | Generated project output should be canonical. |
| virtual-modules | `packages/core/src/vite/*`, `packages/core/src/app/lib/*`, `packages/core/src/app/virtual.d.ts` | `virtual:open-slide/*` | internal-protocol | `virtual:awesome-slide/*` | alias | one-major-cycle | unit-test | todo | Resolve both IDs and switch app imports to canonical. |
| hmr-events | `packages/core/src/vite/*`, `packages/core/src/app/*` | `open-slide:*` | internal-protocol | `awesome-slide:*` | alias | one-major-cycle | unit-test | todo | Send/listen on canonical and legacy events. |
| runtime-state | `packages/core/src/vite/current-plugin.ts`, skills/docs | `node_modules/.open-slide` | internal-protocol | `node_modules/.awesome-slide` | alias | one-major-cycle | unit-test | todo | Dual-write state file during migration. |
| storage-keys | `packages/core/src/app/routes/home.tsx`, `slide.tsx`, `notes-drawer.tsx`, presenter/player files | `open-slide:*` storage/channels/windows | storage | `awesome-slide:*` | alias | one-major-cycle | manual-review | todo | Read legacy, write canonical. |
| source-transforms | `packages/core/src/editing/revert-asset.ts`, `packages/core/src/vite/design-plugin.ts`, tests | `@open-slide/core` | internal-protocol | `@awesome-slide/core` | alias | one-major-cycle | unit-test | todo | Handle both import sources. |
| docs-root | `README.md`, `packages/core/README.md`, `packages/cli/README.md`, `AGENTS.md`, `CLAUDE.md` | `open-slide`, `@open-slide/*` | docs | `Awesome Slide`, `@awesome-slide/*` | replace | n/a | inventory-scan | in-progress | Root and package READMEs are done; repository guides remain for polish. |
| docs-web | `apps/web/content/docs/**`, `apps/web/components/landing/**`, `apps/web/lib/**` | `open-slide`, `@open-slide/*` | docs | `Awesome Slide`, `@awesome-slide/*` | replace | n/a | build | in-progress | Entry docs, shared app name, and landing chrome are done; remaining docs are tracked in US3/US4. |
| template-copy | `packages/cli/template/**` | `open-slide`, `@open-slide/*` | template | `Awesome Slide`, `@awesome-slide/*` | replace | n/a | integration-test | todo | Starter README, skills guide, welcome slide. |
| demo-copy | `apps/demo/**` | `open-slide`, `@open-slide/*` | demo | `Awesome Slide`, `@awesome-slide/*` | replace | n/a | build | todo | Demo retains legacy config fallback file. |
| skill-copy | `packages/core/skills/**`, `apps/web/content/docs/skills/**` | `open-slide`, `@open-slide/*`, `.open-slide` | skill | `Awesome Slide`, `@awesome-slide/*`, `.awesome-slide` | replace | n/a | inventory-scan | todo | Mention legacy runtime path only as compatibility. |
| github-copy | `.github/ISSUE_TEMPLATE/*.yml` | `open-slide`, `@open-slide/*` | github | `Awesome Slide`, `@awesome-slide/*` | replace | n/a | inventory-scan | todo | Issue forms should reflect canonical packages. |
| changelog-history | `.changeset/*.md`, `packages/*/CHANGELOG.md` | historical `open-slide` entries | changelog | n/a | keep-historical | n/a | not-applicable | done | Historical records intentionally remain unchanged. |

## Exclusions

Historical changelog entries and old changesets are intentionally retained unless
they affect current package metadata or forward-looking release copy.
