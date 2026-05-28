# Contract: Edit Proposal Format

## Scope

Defines the reviewable file-changing artifact emitted by agent chat before any write occurs.

## Proposal Envelope

```json
{
  "id": "proposal_123",
  "runId": "run_123",
  "summary": "Tighten copy and improve visual hierarchy on the intro slide.",
  "scope": "slide",
  "riskLevel": "medium",
  "operations": [],
  "previewArtifacts": [],
  "validation": {
    "status": "valid",
    "checks": []
  },
  "state": "pending-review"
}
```

Rules:

- A proposal is required for every file-changing response.
- `summary` must be user-readable and avoid implementation jargon.
- `riskLevel` is `high` for deck-wide rewrites, deletes, broad theme replacement, or operations touching more than one slide unless explicitly narrowed.

## Operation Types

### `patch-slide-source`

Targets `slides/<slideId>/index.tsx` source edits.

Payload:

```json
{
  "edits": [
    {
      "line": 42,
      "column": 8,
      "ops": [{ "kind": "replaceText", "text": "New copy" }]
    }
  ]
}
```

Validation:

- Slide ID must resolve inside the slides root.
- Source must parse after transformation.
- Conflicts are reported when source lines no longer match proposal expectations.

### `patch-slide-metadata`

Targets slide metadata fields already modeled by slide management.

Payload:

```json
{
  "patch": {
    "title": "Updated title",
    "tags": ["launch"],
    "theme": "linear"
  }
}
```

Validation:

- Field rules match `SlideMetadataPatch`.
- Unknown theme IDs are warnings unless theme application requires an existing theme.

### `update-speaker-notes`

Targets page-indexed speaker notes.

Payload:

```json
{
  "pageIndex": 0,
  "notes": "Opening beat..."
}
```

Validation:

- `pageIndex` must exist for the current slide.
- Notes content is size-capped before preview and apply.

### `create-slide`

Creates a related slide through the management create flow.

Payload:

```json
{
  "id": "follow-up",
  "title": "Follow-up",
  "kind": "blank",
  "deckId": "d-12345678",
  "initialSource": "optional generated source"
}
```

Validation:

- ID must match slide ID rules and must not already exist.
- Generated source must parse before write.
- Deck and folder references must exist.

### `reorder-pages`

Changes page order for the active slide.

Payload:

```json
{ "order": [0, 2, 1] }
```

Validation:

- `order` must be a full permutation of existing page indexes.
- Reorder is blocked for static/read-only builds.

### `apply-theme`

Applies a theme to one slide or deck.

Payload:

```json
{
  "themeId": "vercel",
  "scope": "slide",
  "slideIds": ["intro"]
}
```

Validation:

- Theme metadata must exist in bundled or user-added theme sources.
- Existing-content rewrites require preview and confirmation.

### `update-deck`

Targets deck metadata or membership.

Payload:

```json
{
  "deckId": "d-12345678",
  "patch": {
    "description": "New narrative flow"
  }
}
```

Validation:

- Deck must exist.
- The patch must match deck validation rules.

### `raw-patch`

Fallback for changes not expressible structurally.

Payload:

```json
{
  "file": "slides/intro/index.tsx",
  "patch": "--- before\n+++ after\n..."
}
```

Validation:

- File path must resolve to an allowed project file.
- Patch applies cleanly to current source.
- Resulting source must pass syntax validation where applicable.

## Preview Artifact Requirements

Every proposal must include at least one of:

- `operation-list`: grouped operation summary with selectable operations.
- `source-diff`: textual before/after diff for source or metadata.
- `rendered-before-after`: visual preview for slide/theme/layout changes.
- `diagnostics`: validation findings and warnings.

Rules:

- Preview controls must distinguish apply, selected apply, reject, retry, and refine.
- Large previews are truncated with clear status.
- Preview data is not persisted in long-term session history by default.

## Apply Semantics

- Apply all operations when the user chooses "apply all".
- Apply only selected operation IDs when the user chooses selected apply.
- Reject performs no writes.
- Failed apply refreshes UI from persisted state and reports `write-failure`, `validation-failure`, or `patch-conflict`.
- Successful apply writes an audit entry containing prompt, context summary, proposal summary, files touched, timestamp, and agent/model used.
