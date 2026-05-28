# Contract: Slide Management API

## Scope

The management API is served only by the local Awesome Slide dev server. Static builds expose the same UI data through virtual modules but do not expose mutation endpoints.

All mutation requests use the same-origin guard from `validateMutationRequest`.

## Common Response Types

```ts
type ManagementMode = 'editable' | 'readonly';

type ApiError = {
  error: string;
  code?: string;
  field?: string;
  recovery?: string;
};

type ManagementCapabilities = {
  create: boolean;
  rename: boolean;
  duplicate: boolean;
  delete: boolean;
  move: boolean;
  editMetadata: boolean;
  manualOrder: boolean;
};
```

Readonly static responses set all mutation capabilities to `false`.

## GET `/__management/slides`

Returns the management aggregate used by the home route.

Response:

```ts
type ListSlidesResponse = {
  mode: ManagementMode;
  capabilities: ManagementCapabilities;
  slides: SlideRecord[];
  folders: Folder[];
  decks: Deck[];
  manualOrder: Record<string, string[]>;
};
```

Rules:

- Dev mode reads live file state.
- Static mode is produced from virtual modules and marks records `readOnly: true`.
- Missing or invalid optional metadata does not fail the whole response; affected slides include `sourceState` and omit invalid derived values.

Errors:

- `500` for unexpected file-system or manifest read failures.

## POST `/__management/slides`

Creates a slide from the in-app create flow.

Request:

```ts
type CreateSlideRequest = {
  kind: 'blank' | 'template' | 'prompt';
  id: string;
  title: string;
  theme?: string;
  templateId?: string;
  folderId?: string | null;
  deckId?: string | null;
  prompt?: string;
};
```

Response:

```ts
type CreateSlideResponse = {
  ok: true;
  slideId: string;
  next:
    | { type: 'open-slide'; slideId: string }
    | { type: 'agent-chat'; prompt: string; seedSlideId: string };
};
```

Rules:

- `blank` writes `slides/<id>/index.tsx` with a minimal valid default export and `meta.createdAt`.
- `template` copies from trusted local template/theme sources only.
- `prompt` creates a blank placeholder slide with the prompt text stored in `meta.notes`, status set to `draft`, and returns `{ type: 'agent-chat', prompt, seedSlideId }`. The agent chat feature (spec 004) handles model invocation.
- `folderId` updates `assignments` when supplied.
- `deckId` appends the new slide to the deck order when supplied.

Errors:

- `400` invalid ID, title, kind, theme, folder, deck, or template.
- `409` slide ID already exists.
- `422` template cannot be copied or source cannot be generated safely.
- `500` file-system failure.

## PATCH `/__management/slides/:slideId/metadata`

Patches slide-owned and collection-owned metadata.

Request:

```ts
type SlideMetadataPatch = {
  title?: string;
  description?: string | null;
  tags?: string[];
  theme?: string | null;
  status?: 'draft' | 'ready' | 'archived';
  notes?: string | null;
  folderId?: string | null;
  deckIds?: string[];
};
```

Response:

```ts
type SlideMetadataPatchResponse = {
  ok: true;
  slide: SlideRecord;
};
```

Rules:

- Slide-owned fields (title, description, tags, theme, status, notes) require `sourceState: 'supported'`. Return `422` for unsupported sources.
- Collection-owned fields (folderId, deckIds) are always editable in dev mode because they write to the manifest, not to slide source.
- If a request includes both source and manifest changes, implementation validates both before writing either.
- Unknown theme IDs are accepted but returned with a warning for the UI to display.

Errors:

- `400` invalid field value.
- `404` slide, folder, or deck not found.
- `409` conflicting manifest update.
- `422` slide source cannot be safely updated (unsupported source shape).
- `500` file-system failure.

## POST `/__management/slides/:slideId/duplicate`

Duplicates a slide directory and registers collection state.

Request:

```ts
type DuplicateSlideRequest = {
  newId?: string;
  title?: string;
  folderId?: string | null;
  deckId?: string | null;
};
```

Response:

```ts
type DuplicateSlideResponse = {
  ok: true;
  slideId: string;
};
```

Rules:

- Uses unique ID generation when `newId` is absent.
- Copies folder assignment from the source unless `folderId` is explicitly supplied.
- Adds to `deckId` when supplied. Does not copy source's deck membership otherwise.
- Updates copied metadata title, createdAt, and status.

Errors:

- `400` invalid source ID or new ID.
- `404` source slide not found.
- `409` new slide ID already exists.
- `422` copied source cannot be safely updated.
- `500` file-system failure.

## DELETE `/__management/slides/:slideId`

Deletes a slide after UI confirmation.

Response:

```ts
type DeleteSlideResponse = {
  ok: true;
};
```

Rules:

- Removes `slides/<slideId>`.
- Removes folder assignment and deck/manual-order references.
- Does not promise recovery unless the project is under version control or the file system provides recovery.

Errors:

- `400` invalid slide ID.
- `404` slide not found.
- `500` file-system failure.

## PUT `/__management/collections/order`

Persists manual ordering for draft, folder, or deck collections.

Request:

```ts
type UpdateOrderRequest = {
  collection:
    | { type: 'draft' }
    | { type: 'folder'; folderId: string }
    | { type: 'deck'; deckId: string };
  slideIds: string[];
};
```

Response:

```ts
type UpdateOrderResponse = {
  ok: true;
  collectionKey: string;
  slideIds: string[];
};
```

Rules:

- `slideIds` must be a permutation of the currently visible slides in that collection.
- For folders and draft, order writes to `manualOrder`.
- For decks, order writes to the deck `slideOrder`.

Errors:

- `400` invalid collection or order.
- `404` folder or deck not found.
- `409` order includes stale slide IDs.
- `500` file-system failure.
