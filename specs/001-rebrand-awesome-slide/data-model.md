# Data Model: Rebrand and Redesign as Awesome Slide

## ProductIdentity

Represents the canonical product names used across the codebase and docs.

**Fields**

- `displayName`: Required string. Must be `Awesome Slide` for user-facing copy.
- `technicalName`: Required string. Must be `awesome-slide` for commands, package naming, config naming, generated folder examples, and filenames where applicable.
- `legacyDisplayName`: Optional string. Usually `open-slide` when referencing migration history.
- `legacyTechnicalName`: Optional string. Usually `open-slide`.
- `usageContext`: Enum: `ui`, `docs`, `package`, `cli`, `config`, `internal`, `history`, `compatibility`.

**Validation Rules**

- User-facing surfaces must not use `open-slide` unless the usage context is `history` or `compatibility`.
- Technical identifiers must not use mixed casing unless required by exported TypeScript type names.

## RebrandInventoryItem

Tracks every discovered legacy-brand reference and the migration decision for it.

**Fields**

- `id`: Stable identifier, for example `pkg-core-name` or `docs-getting-started-title`.
- `path`: Project-relative file path.
- `currentValue`: Exact current text or identifier.
- `category`: Enum: `package-metadata`, `cli`, `config`, `runtime-ui`, `locale`, `docs`, `template`, `demo`, `skill`, `test`, `github`, `changelog`, `internal-protocol`, `storage`.
- `replacementValue`: Desired new value, if replaced.
- `decision`: Enum: `replace`, `alias`, `keep-historical`, `defer`, `remove`.
- `compatibilityWindow`: Optional string, for example `one-major-cycle`.
- `validationMethod`: Enum: `unit-test`, `integration-test`, `build`, `manual-review`, `inventory-scan`, `not-applicable`.
- `status`: Enum: `todo`, `in-progress`, `done`, `blocked`.
- `notes`: Optional string for edge cases.

**Validation Rules**

- Every `alias` item must include `compatibilityWindow`.
- Every `replace` item must include `replacementValue`.
- `changelog` items default to `keep-historical` unless they affect current package metadata or release links.

## CompatibilityAlias

Represents a legacy name that must keep working during migration.

**Fields**

- `legacyName`: Required string, for example `@open-slide/core`.
- `canonicalName`: Required string, for example `@awesome-slide/core`.
- `surface`: Enum: `package`, `binary`, `config-file`, `import-path`, `virtual-module`, `hmr-event`, `local-storage-key`, `generated-file`, `runtime-path`, `documentation-url`.
- `behavior`: Enum: `forward`, `fallback-read`, `dual-write`, `warn-and-forward`, `document-only`.
- `startVersion`: Optional semver string.
- `removalVersion`: Optional semver string.
- `warningCopy`: Optional user-facing migration message.
- `testsRequired`: Required boolean.

**Relationships**

- Can be referenced by one or more `RebrandInventoryItem` records.
- Can be documented in the brand migration contract.

**Validation Rules**

- Public surfaces (`package`, `binary`, `config-file`, `import-path`) require tests.
- `warn-and-forward` aliases must have concise warning copy and must not warn repeatedly in watch mode.

## DesignToken

Represents a reusable visual decision in the Awesome Slide system.

**Fields**

- `name`: Required token name, for example `color.canvas`, `color.block.lime`, `radius.pill`, `typography.eyebrow`.
- `cssVariable`: Optional CSS variable, for example `--as-canvas`.
- `tailwindBinding`: Optional Tailwind theme binding.
- `value`: Required token value or value reference.
- `role`: Enum: `color`, `typography`, `spacing`, `radius`, `shadow`, `border`, `focus`, `motion`.
- `scope`: Enum: `runtime-app`, `marketing`, `docs`, `slide-template`, `all`.
- `contrastRequirement`: Optional AA/AAA note for text-bearing colors.

**Validation Rules**

- Text-bearing color pairs must meet WCAG AA contrast.
- Motion tokens must document reduced-motion behavior.
- App tokens must avoid viewport-scaled font sizes.

## ComponentTreatment

Defines how a UI component expresses the brand.

**Fields**

- `component`: Required name, for example `app-shell`, `slide-card`, `metadata-panel`, `agent-status`, `theme-card`, `dialog`, `button-primary`.
- `surface`: Required token reference.
- `typography`: Required token reference.
- `shape`: Required token reference.
- `interactionStates`: Required list containing `default`, `hover`, `focus`, `active`, and disabled/error states where relevant.
- `responsiveBehavior`: Required summary for mobile, tablet, desktop, and wide desktop.
- `accessibilityNotes`: Required notes for focus, touch target, keyboard navigation, and reduced motion.

**Relationships**

- Uses `DesignToken`.
- Applies to source files in `packages/core/src/app`, `apps/web`, and `packages/cli/template` depending on scope.

**Validation Rules**

- Icon buttons require accessible names or tooltips.
- Repeated controls should use icons where a familiar symbol exists.
- Cards must not be nested inside other cards.

## DocumentationSurface

Represents documentation, marketing, or generated user-facing text.

**Fields**

- `path`: Project-relative path.
- `surfaceType`: Enum: `root-readme`, `package-readme`, `web-doc`, `landing-page`, `starter-readme`, `skill`, `github-template`, `migration-guide`.
- `audience`: Enum: `new-user`, `existing-user`, `contributor`, `maintainer`, `agent`.
- `brandLevel`: Enum: `canonical`, `compatibility`, `historical`.
- `requiresScreenshotUpdate`: Boolean.
- `requiresLinkUpdate`: Boolean.

**Validation Rules**

- New-user surfaces must lead with `Awesome Slide`.
- Compatibility surfaces may mention `open-slide` only with explicit migration context.

## Implementation State Transitions

### RebrandInventoryItem

```text
todo -> in-progress -> done
todo -> blocked
blocked -> in-progress
in-progress -> blocked
done -> in-progress
```

`done` requires the validation method to be completed or explicitly marked `not-applicable`.

### CompatibilityAlias

```text
planned -> implemented -> documented -> deprecated -> removed
```

Removal is out of scope for this feature unless the alias is internal and proven unused.

### DesignToken

```text
proposed -> documented -> implemented -> validated
```

`validated` requires contrast, responsive, and reduced-motion review where applicable.
