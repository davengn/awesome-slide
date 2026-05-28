# Contract: Metadata Persistence

## Source Files

Each managed slide uses this source location:

```text
slides/<slideId>/index.tsx
```

The implementation may read other files for previews/assets, but metadata writes are limited to `index.tsx`.

## Slide Metadata Export

Supported shape:

```ts
export const meta: SlideMeta = {
  title: 'Slide title',
  description: 'Short summary',
  tags: ['strategy', 'launch'],
  theme: 'light',
  status: 'draft',
  notes: 'Planning notes',
  createdAt: '2026-05-28T00:00:00.000Z',
};
```

Rules:

- `meta` may use TypeScript assertions or satisfies expressions if the object literal range remains discoverable.
- Missing `meta` may be inserted before `export default` when the file has a safe default export.
- Existing formatting should be preserved as much as practical.
- Comments and unrelated exports must be preserved.
- Unsupported shapes return a `422` error and leave the source unchanged.

Unsupported write shapes:

- `meta` initialized from a function call.
- `meta` spread from other objects when the target field cannot be resolved safely.
- Computed metadata keys.
- Missing default export when insertion would be required.
- Syntax that cannot be parsed by the configured TypeScript/JSX parser.

## Collection Manifest

Path:

```text
slides/.folders.json
```

Shape:

```json
{
  "folders": [],
  "assignments": {},
  "decks": [],
  "manualOrder": {}
}
```

Loading rules:

- The file may not exist: all fields default to empty.
- Missing `folders` becomes `[]`.
- Missing `assignments` becomes `{}`.
- Missing `decks` becomes `[]`.
- Missing `manualOrder` becomes `{}`.
- Pre-management manifests that contain only `folders` and `assignments` load correctly because missing fields default to empty.

Write rules:

- The manifest is written as a complete JSON object with consistent formatting (2-space indent, trailing newline).
- Assignments referencing deleted folders are cleaned up on the next write that touches assignments.
- Deck order entries referencing deleted slides are cleaned up on the next deck write.

## Virtual Modules

`virtual:awesome-slide/slides` exposes:

- `slideIds`
- `slideThemes`
- `slideCreatedAt`
- `loadSlide`

This feature extends generated data or wraps it in app code to support:

- title.
- description.
- tags.
- status.
- updatedAt.
- sourceState.

`virtual:awesome-slide/folders` exposes the full manifest snapshot for static builds, including `folders`, `assignments`, `decks`, and `manualOrder`.

## Write Atomicity

For mutations that touch both slide source and manifest:

1. Validate all requested fields.
2. Read and parse all affected files.
3. Build all replacements in memory.
4. Write source and manifest.
5. Refresh/invalidate virtual modules and notify clients.

If validation fails, write nothing.

If file-system write fails after a partial write, the endpoint returns failure and the UI refreshes from disk before showing recovery guidance.

## HMR and Refresh

Dev mode must refresh the management UI when:

- A slide entry is added.
- A slide entry is removed.
- A slide entry changes.
- `slides/.folders.json` changes.

Rules:

- The `awesome-slide:slide-changed` and `awesome-slide:files-changed` events are the primary refresh signals.
- UI state should preserve current selected collection and search query across refresh when possible.

## Static Builds

Static builds:

- Read metadata at build time through generated virtual modules.
- Bundle folder/deck/manual order state from `slides/.folders.json`.
- Mark mutation capabilities false.
- Avoid client attempts to call dev-only endpoints.

## Recovery Guidance

The UI must present action-specific recovery text:

- Parse/write unsupported: edit `export const meta` into a supported object-literal shape.
- Duplicate ID: choose a different slide ID.
- Missing slide: refresh the list; the slide may have been deleted on disk.
- Static read-only: run the local dev server to edit.
- File-system failure: check permissions and disk state, then retry.
