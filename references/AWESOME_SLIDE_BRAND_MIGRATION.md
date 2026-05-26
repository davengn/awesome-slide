# Awesome Slide Brand Migration

## Canonical Names

| Surface | Canonical value |
| --- | --- |
| User-facing product name | `Awesome Slide` |
| Technical product name | `awesome-slide` |
| Core package | `@awesome-slide/core` |
| CLI package | `@awesome-slide/cli` |
| Runtime binary | `awesome-slide` |
| Config file | `awesome-slide.config.ts` |
| Runtime state directory | `node_modules/.awesome-slide` |
| Virtual modules | `virtual:awesome-slide/*` |
| HMR events and storage keys | `awesome-slide:*` |

## Compatibility Window

Legacy names remain compatibility aliases for one major release cycle unless
package ownership or registry constraints require a documented fallback.

| Legacy surface | Legacy value | Canonical value | Behavior | Tests |
| --- | --- | --- | --- | --- |
| Core package | `@open-slide/core` | `@awesome-slide/core` | Document compatibility package/alias release path | Release notes |
| CLI package | `@open-slide/cli` | `@awesome-slide/cli` | Document compatibility package/alias release path | Release notes |
| Runtime binary | `open-slide` | `awesome-slide` | Both bins invoke the same CLI | Unit test |
| Config file | `open-slide.config.ts` | `awesome-slide.config.ts` | Read canonical first, fallback to legacy, warn when both exist | Unit test |
| Type names | `OpenSlideConfig` | `AwesomeSlideConfig` | Export both names | Typecheck |
| Virtual modules | `virtual:open-slide/*` | `virtual:awesome-slide/*` | Resolve both IDs | Unit test |
| HMR events | `open-slide:*` | `awesome-slide:*` | Send/listen on canonical and legacy events | Unit test/manual |
| Runtime state path | `node_modules/.open-slide` | `node_modules/.awesome-slide` | Write canonical path and legacy path during transition | Unit test/manual |
| Local storage keys | `open-slide:*` | `awesome-slide:*` | Read legacy value and persist canonical value | Manual/unit |
| Docs URLs | Existing open-slide examples | Awesome Slide examples | Canonical first, legacy only in migration context | Inventory scan |

## Copy Rules

- Use `Awesome Slide` in app chrome, docs prose, README text, marketing copy,
  starter copy, and generated slides.
- Use `awesome-slide` in commands, packages, filenames, config names, scripts,
  and technical examples.
- Use `open-slide` only for migration guidance, compatibility aliases, and
  historical changelogs.
- Do not use `AwesomeSlide` in prose. PascalCase names are only for TypeScript
  symbols.

## Config Resolution

1. Load `awesome-slide.config.ts` when present.
2. Otherwise load `open-slide.config.ts`.
3. When both files exist, use `awesome-slide.config.ts` and warn once that the
   legacy file is ignored.
4. When neither file exists, preserve default behavior.

## Release Notes

- New projects should use `npx @awesome-slide/cli init`.
- Existing projects using `open-slide`, `@open-slide/core`, or
  `open-slide.config.ts` should continue to run during the compatibility window.
- Migration docs should show old names only in before/after examples.
