# Data Model: Slide Management UI

## SlideId

Stable identifier derived from the directory name under `slides/`.

Fields and validation:

- `value`: string matching `SLIDE_ID_RE` (`/^[a-z0-9_-]+$/i`).
- Creation UI generates lowercase slug IDs and rejects duplicates before writing files.
- IDs are stable after creation in the first release. Renaming a slide title does not rename the directory.

Relationships:

- Owns one source entry at `slides/<slideId>/index.tsx`.
- Has exactly one folder assignment (or none, meaning "draft/unassigned").
- May appear in multiple deck order arrays.

## SlideMeta

Slide-owned metadata exported from `slides/<slideId>/index.tsx` as `export const meta`.

Fields:

- `title?: string`: display title, 1-80 characters after trimming when edited through UI.
- `description?: string`: optional summary, 0-280 characters.
- `tags?: string[]`: optional user tags, max 20 tags, each 1-32 characters after trimming.
- `theme?: string`: theme ID. Unknown IDs remain visible and editable.
- `status?: 'draft' | 'ready' | 'archived'`: editorial state. Missing means `draft`.
- `notes?: string`: optional slide-level notes for management context, 0-2000 characters. Page presenter notes remain the existing top-level `notes` export.
- `createdAt?: string`: ISO 8601 timestamp set once at scaffold/create time.

Derived fields:

- `updatedAt?: string`: derived from file mtime in dev mode and from build-time metadata in static builds when available.
- `pageCount?: number`: derived from the slide module default export after load.
- `sourceState`: `supported`, `readable-unsupported`, `parse-error`, or `missing`.

Validation:

- Empty optional fields are removed from `meta` where practical.
- `createdAt` must be valid ISO 8601 when present. Invalid values are displayed but not used for created-date sorting.
- Metadata writes fail with actionable errors when `meta` cannot be located or safely inserted.

## SlideRecord

UI/API aggregate used by the management surface.

Fields:

- `id: SlideId`
- `title: string`
- `description?: string`
- `tags: string[]`
- `theme?: string`
- `status: 'draft' | 'ready' | 'archived'`
- `notes?: string`
- `createdAt?: string`
- `updatedAt?: string`
- `folderId?: FolderId`
- `deckIds: DeckId[]`
- `manualOrder?: number`
- `preview: { kind: 'live' | 'unavailable'; reason?: string }`
- `sourceState: 'supported' | 'readable-unsupported' | 'parse-error' | 'missing'`
- `readOnly: boolean`

Rules:

- `title` falls back to `id` when `meta.title` is absent.
- `deckIds` are inferred by scanning deck order arrays.
- `readOnly` is true in static builds and for records whose source shape cannot be safely mutated.

## Folder

Organization bucket stored in `slides/.folders.json`.

Fields:

- `id: string`: format `f-` followed by 8 lowercase hex characters.
- `name: string`: 1-40 characters after trimming.
- `icon: { type: 'emoji'; value: string } | { type: 'color'; value: string }`

Relationships:

- A slide has zero or one folder through `assignments[slideId]`.
- Deleting a folder removes its assignments but does not delete slides.
- Folder names must be unique within the project (case-insensitive).
- A folder with zero slides is still valid and visible in the sidebar.

## Deck

Ordered collection stored in `slides/.folders.json`.

Fields:

- `id: string`: format `d-` followed by 8 lowercase hex characters.
- `name: string`: 1-60 characters after trimming.
- `description?: string`: 0-280 characters.
- `theme?: string`: optional default theme hint for new slides in this deck.
- `slideOrder: SlideId[]`: ordered slide IDs.

Relationships and rules:

- A slide may appear in multiple decks (multi-deck membership).
- A deck may include slides from any folder (cross-folder membership).
- Deck names must be unique within the project (case-insensitive).
- Missing slide IDs in `slideOrder` are ignored at read time and cleaned up on next write.
- Duplicate slide IDs in `slideOrder` are deduplicated on next write, preserving first occurrence.
- Deleting a deck removes the deck entry and its order, but does not delete or unassign slides.
- Adding a slide to a deck does not change its folder assignment.
- Removing a slide from a deck does not change its folder assignment.

### Folder and deck interaction rules

- Folder assignment and deck membership are independent. A slide belongs to zero or one folder and zero or more decks.
- Moving a slide between folders updates `assignments` only; deck membership is unchanged.
- Adding a slide to a deck appends to that deck's `slideOrder`; folder is unchanged.
- When navigating by folder, slides are shown in `manualOrder` for that folder (or by default sort). When navigating by deck, slides are shown in the deck's `slideOrder`.
- Search results show slides across all folders and decks, sorted by the active sort mode.
- Duplicating a slide copies the source folder assignment. Deck membership is not copied unless explicitly requested.

## SlideCollectionManifest

The Awesome Slide collection manifest stored at `slides/.folders.json`.

Shape:

```json
{
  "folders": [],
  "assignments": {},
  "decks": [],
  "manualOrder": {}
}
```

Fields:

- `folders: Folder[]`
- `assignments: Record<SlideId, FolderId>`
- `decks: Deck[]`
- `manualOrder: Record<string, SlideId[]>`: keys are `draft` or `folder:<folderId>`.

Loading rules:

- The file may not exist yet (fresh project): all fields default to empty.
- Missing `folders` becomes `[]`.
- Missing `assignments` becomes `{}`.
- Missing `decks` becomes `[]`.
- Missing `manualOrder` becomes `{}`.
- Projects with only `folders` and `assignments` (the pre-management manifest shape) load correctly because missing fields default to empty. No migration code is needed — the loader fills defaults.

Write rules:

- The manifest is written as a complete JSON object. Unknown top-level keys from other tooling are not preserved unless the implementation is extended to do so.
- Assignments referencing deleted folders are cleaned up on the next write that touches assignments.
- Deck order entries referencing deleted slides are cleaned up on the next deck write.

## CreateSlideRequest

Used by the native create flow.

Fields:

- `kind: 'blank' | 'template' | 'prompt'`
- `id: SlideId`
- `title: string`
- `theme?: string`
- `templateId?: string`
- `folderId?: FolderId | null`
- `deckId?: DeckId | null`
- `prompt?: string`

Rules:

- `blank` creates a minimal valid slide file with `meta.title` and `meta.createdAt`.
- `template` copies a trusted local template/theme starter and applies the requested ID/title.
- `prompt` creates a blank placeholder slide with `status: 'draft'`, stores the user's prompt text in `meta.notes`, and returns a handoff target for the agent chat workflow. The agent chat spec (005) owns actual model invocation and content generation.

## SlideMetadataPatch

Fields:

- `title?: string`
- `description?: string | null`
- `tags?: string[]`
- `theme?: string | null`
- `status?: 'draft' | 'ready' | 'archived'`
- `notes?: string | null`
- `folderId?: FolderId | null`
- `deckIds?: DeckId[]`

Rules:

- Slide-owned fields write to `export const meta`.
- `folderId` writes to `assignments`.
- `deckIds` updates deck order membership while preserving relative order where possible.
- Partial failures must not report success; the response returns the failed field group and leaves UI state consistent with persisted state.

## Field Editability Rules

Editability depends on `sourceState` and `ManagementMode`:

| Field | Supported source | Readable-unsupported | Parse-error / Missing | Static (readonly) |
|-------|-----------------|---------------------|----------------------|-------------------|
| title | editable | read-only | read-only | read-only |
| description | editable | read-only | read-only | read-only |
| tags | editable | read-only | read-only | read-only |
| theme | editable | read-only | read-only | read-only |
| status | editable | read-only | read-only | read-only |
| notes | editable | read-only | read-only | read-only |
| folder | editable | editable | editable | read-only |
| deck membership | editable | editable | editable | read-only |

Rules:

- Collection-owned fields (folder, deck) are always editable in dev mode because they write to the manifest, not to slide source. The manifest is always writable.
- Slide-owned fields require `sourceState: 'supported'` because they write to `export const meta`.
- `readable-unsupported` means the file can be read but `meta` is not in a safely writable shape. The UI shows a warning: "Slide source uses an unsupported metadata format. Edit the source file directly to enable metadata editing."
- `parse-error` means the source cannot be parsed. The UI shows a warning: "Slide source cannot be parsed. Fix syntax errors to enable metadata editing."
- `missing` means the source file does not exist. The UI shows: "Slide source file not found."
- In static builds, all mutations are read-only. The UI explains that editing requires running in local dev mode.

## State Transitions

Slide lifecycle:

```text
created -> draft
draft -> ready
ready -> draft
draft -> archived
ready -> archived
archived -> draft
archived -> ready
```

Mutation lifecycle:

```text
idle -> pending -> success -> idle
idle -> pending -> failed -> idle
```

Delete lifecycle:

```text
idle -> confirm -> deleting -> deleted
idle -> confirm -> deleting -> failed
```

Duplicate behavior:

- Generates a unique slide ID when none is supplied.
- Copies source files and asset subfolders.
- Sets a new `createdAt`.
- Preserves description, tags, theme, and notes.
- Sets title to `<source title> (copy)` unless the user supplies a title.
- Sets status to `draft`.
- Copies source folder assignment. Does not copy deck membership.
