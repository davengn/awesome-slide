# Contract: Brand Migration

## Canonical Names

| Surface | Canonical Value | Notes |
| --- | --- | --- |
| User-facing product name | `Awesome Slide` | App chrome, docs, marketing, README copy, generated starter copy |
| Technical product name | `awesome-slide` | Package names, binaries, config names, folders, docs examples |
| Core package | `@awesome-slide/core` | New canonical package target |
| CLI package | `@awesome-slide/cli` | New canonical scaffolder target |
| Runtime binary | `awesome-slide` | New canonical command |
| Config file | `awesome-slide.config.ts` | New canonical workspace config |

## Compatibility Names

| Legacy Surface | Legacy Value | Canonical Value | Required Behavior |
| --- | --- | --- | --- |
| Core package | `@open-slide/core` | `@awesome-slide/core` | Compatibility package or alias remains installable for one major cycle |
| CLI package | `@open-slide/cli` | `@awesome-slide/cli` | Compatibility package or alias remains installable for one major cycle |
| Runtime binary | `open-slide` | `awesome-slide` | Old binary forwards to the same runtime for one major cycle |
| Config file | `open-slide.config.ts` | `awesome-slide.config.ts` | Runtime reads new name first, then old name as fallback |
| Type names | `OpenSlideConfig`, related exported types | Future `AwesomeSlide*` names if introduced | Existing type names remain exported during compatibility window |
| Virtual modules | `virtual:open-slide/*` | `virtual:awesome-slide/*` | Old module IDs continue resolving while new IDs are added |
| HMR events | `open-slide:*` | `awesome-slide:*` | Runtime handles old events while new events are introduced |
| Runtime state path | `node_modules/.open-slide` | `node_modules/.awesome-slide` | Existing state readers keep working; migration may dual-write |
| Local storage keys | `open-slide:*` | `awesome-slide:*` | Existing preferences are read and migrated or aliased |

## Copy Rules

- Use `Awesome Slide` in headings, nav, docs, app title, empty states, starter README, package descriptions, and marketing CTAs.
- Use `awesome-slide` in commands, filenames, package names, config examples, generated project scripts, and technical diagrams.
- Use `open-slide` only for migration guidance, compatibility warnings, historical changelogs, and legacy alias documentation.
- Do not introduce `AwesomeSlide` as prose. Reserve PascalCase only for TypeScript symbols when needed.

## Package and CLI Behavior

Implementation must define the exact release path before publishing package changes:

1. Publish new canonical package names.
2. Keep legacy package names with the same runtime behavior or forwarding guidance.
3. Expose both `awesome-slide` and `open-slide` binaries during compatibility.
4. Update `npx` examples to `npx @awesome-slide/cli init`.
5. Keep `npx @open-slide/cli init` functional during the compatibility window, if package ownership allows it.

## Config Resolution Behavior

Workspace config resolution must follow this order:

1. `awesome-slide.config.ts`
2. `open-slide.config.ts`
3. no config, with existing default behavior

If both files exist, the runtime must use `awesome-slide.config.ts` and should provide a clear warning that the legacy config is ignored.

## Documentation Behavior

- New-user docs must show canonical names first.
- Migration docs must show legacy names only in "before" examples.
- Historical changelog entries can remain unchanged.
- Package READMEs must include a short migration note from old identifiers to new ones.

## Validation Requirements

- Unit tests cover config resolution order.
- CLI tests cover generated package scripts and dependencies.
- Runtime tests cover virtual module aliases where added.
- Inventory scan proves no accidental legacy user-facing copy remains.
- Manual docs review confirms migration copy is clear and not duplicated across unrelated pages.
