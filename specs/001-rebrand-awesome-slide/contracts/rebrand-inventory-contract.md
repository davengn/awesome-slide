# Contract: Rebrand Inventory

## Purpose

The rebrand inventory prevents unsafe global replacements by recording every old-brand reference and the intended treatment for each one.

## Required Format

The inventory may be stored as Markdown or JSON, but it must include these fields for each item:

| Field | Required | Description |
| --- | --- | --- |
| `id` | Yes | Stable unique identifier |
| `path` | Yes | Project-relative path |
| `currentValue` | Yes | Exact current text, identifier, package name, command, or path |
| `category` | Yes | One of the approved categories below |
| `replacementValue` | Conditional | Required when decision is `replace` |
| `decision` | Yes | `replace`, `alias`, `keep-historical`, `defer`, or `remove` |
| `compatibilityWindow` | Conditional | Required when decision is `alias` |
| `validationMethod` | Yes | How the item will be verified |
| `status` | Yes | `todo`, `in-progress`, `done`, or `blocked` |
| `notes` | No | Edge cases or implementation constraints |

## Approved Categories

- `package-metadata`
- `cli`
- `config`
- `runtime-ui`
- `locale`
- `docs`
- `template`
- `demo`
- `skill`
- `test`
- `github`
- `changelog`
- `internal-protocol`
- `storage`

## Approved Decisions

### `replace`

Use for legacy references that should become canonical Awesome Slide references now.

Examples:

- app title copy
- root README headline
- starter template README
- package descriptions
- docs new-user examples

### `alias`

Use for legacy references that must continue working during migration.

Examples:

- `open-slide` binary
- `open-slide.config.ts`
- `@open-slide/core`
- `virtual:open-slide/*`
- `node_modules/.open-slide/current.json`

### `keep-historical`

Use for historical records where editing would distort past releases.

Examples:

- old changelog entries
- historical pull request links
- past release notes

### `defer`

Use when the decision depends on package publishing or release ownership.

Examples:

- exact npm deprecation messaging
- website redirects if domain ownership is not settled

### `remove`

Use only for dead text, stale examples, or obsolete generated assets that should not be migrated.

## Validation Methods

- `unit-test`: covered by focused tests
- `integration-test`: covered by CLI/runtime flow tests
- `build`: covered by package or app build
- `manual-review`: reviewed in browser or docs output
- `inventory-scan`: verified by a final search
- `not-applicable`: historical or intentionally retained

## Example Entry

```json
{
  "id": "core-locale-en-app-title",
  "path": "packages/core/src/locale/en.ts",
  "currentValue": "open-slide",
  "category": "locale",
  "replacementValue": "Awesome Slide",
  "decision": "replace",
  "compatibilityWindow": null,
  "validationMethod": "unit-test",
  "status": "todo",
  "notes": "Update all locale appTitle values consistently."
}
```

## Completion Gate

The inventory is complete when:

- every match from the initial search is represented or explicitly excluded by rule
- every `replace` item is implemented
- every `alias` item has tests or documented fallback behavior
- every `keep-historical` item is scoped to changelogs or history
- final search finds no unclassified user-facing `open-slide` references
