# Research: Slide Management UI

## Decision: Build on the Existing Home Runtime, Replace the Route Surface

**Decision**: Use the current `HomeShell`, `home.tsx`, and file-system conventions as implementation starting points, then replace the home route surface with the new management UI. Extract large UI pieces into `components/slide-management`.

**Rationale**: The file layout (`slides/<id>/index.tsx`, `slides/.folders.json`), the Vite virtual module system, and the dev-server middleware are solid foundations. The route surface and component structure can be replaced freely — this is a clean Awesome Slide management feature, not a compat layer.

**Alternatives considered**:

- Create a separate `/manage` route: rejected because the home route is the natural slide browser. A second route adds navigation complexity for no user benefit.
- Build an independent state store: rejected because the manifest file and virtual modules are the source of truth. A parallel store creates sync bugs.

## Decision: Separate Slide-Owned Metadata from Collection-Owned Metadata

**Decision**: Store slide-owned metadata in `export const meta` inside `slides/<id>/index.tsx`, and collection-owned metadata in `slides/.folders.json`.

**Rationale**: Title, description, tags, theme, status, notes, and createdAt belong to the slide source and should travel with duplicated or moved slide folders. Folder assignment, decks, and manual order are project organization concerns and belong in the collection manifest.

**Alternatives considered**:

- Store every metadata field in `.folders.json`: rejected because duplicated slide folders would lose self-describing metadata and static imports would need manifest lookups for basic slide information.
- Store folders/decks directly in every slide file: rejected because a slide can participate in project-level organization and ordering that should be editable without rewriting many source files.

## Decision: Define a Clean Manifest Schema (Not a v1-to-v2 Evolution)

**Decision**: `slides/.folders.json` becomes the Awesome Slide collection manifest with a defined schema that includes `folders`, `assignments`, `decks`, and `manualOrder` from the start. The file is the authoritative format — not a backwards-compat extension.

**Rationale**: This is a new feature in an actively developed framework. Existing projects have a minimal `folders`/`assignments` manifest that the loader can handle by defaulting missing fields. There is no need for a `schemaVersion` field, migration rules, or unknown-field preservation protocols — the manifest is read, fields that exist are used, and missing fields are defaulted to empty.

**Alternatives considered**:

- Two-file manifest (`folders.json` + `slide-management.json`): rejected because it splits related organization state.
- Versioned schema with migration logic: rejected because there is no deployed v1 population to migrate. The feature is greenfield.

## Decision: Add an Explicit Management API as the Authoritative API

**Decision**: Define a management API (`/__management/*`) that is the single contract for the UI. Old endpoints (`/__folders`, `/__slides/:id`) remain in the codebase for now but are implementation details, not part of the management feature contract.

**Rationale**: The management API provides consistent error handling, capability checks, and static-mode semantics. The UI talks to one contract. Old endpoints continue to function because the slide route and other existing consumers use them, but the management feature does not depend on them.

**Alternatives considered**:

- Keep the UI calling the old endpoints directly: rejected because the management workflows need richer error handling and capability metadata than the fragmented endpoints provide.
- Remove old endpoints now: rejected because other consumers (slide route, presenter) still use them. Deprecation is a separate effort.

## Decision: Use Parser-Guided Source Writes for Metadata

**Decision**: Implement metadata edits with AST-assisted helpers that identify `export const meta` object ranges, then apply narrow text updates that preserve author formatting.

**Rationale**: The repo already depends on Babel parser packages and already edits slide source for title/page operations. Parser-guided range detection gives safer writes than broad regex-only replacements without adding a code generator dependency.

**Alternatives considered**:

- Full AST parse and reprint: rejected because it would require a printer/generator dependency and could rewrite user-authored slide files heavily.
- Manual regex replacement for every field: rejected because metadata fields may contain strings, arrays, comments, and TypeScript assertions.

## Decision: Use Live Runtime Previews First

**Decision**: Reuse existing `SlideCanvas` rendering for grid previews and list thumbnails. Defer persisted screenshot generation to a later feature.

**Rationale**: Live rendering is already available and respects the current runtime assumptions. Screenshot generation would require a headless browser or new rendering pipeline and could add dependency and trust concerns.

**Alternatives considered**:

- Generate PNG thumbnails on every save: rejected for dependency size, latency, and cache invalidation complexity.
- Show no previews until screenshots exist: rejected because previews are a core UX requirement and current cards can render slides.

## Decision: Prompt Create Collects Intent, Creates Placeholder, Hands Off to Agent Chat

**Decision**: The prompt-based create entry point collects the user's prompt, creates a blank placeholder slide (status: `draft`, with the prompt stored in `meta.notes`), then routes the user to the agent chat workflow with the slide context pre-filled. The agent chat spec (`004-agent-chat-ui`) owns the actual model invocation and content generation.

**Rationale**: The spec requires that prompt creation not expose raw backend skill invocation (FR-003), while agent chat and model connections are explicitly out of scope for this feature. Creating a placeholder slide gives the user immediate feedback and a concrete artifact, while the agent chat handles the generative work. This is the exact MVP behavior.

**Alternatives considered**:

- Collect prompt only, no slide until agent responds: rejected because the user gets no feedback and the flow feels broken without an agent connected.
- Implement model/provider calls now: rejected by explicit non-goals and scope boundaries.
- Defer prompt creation entirely: rejected because FR-002 lists it as a required entry point.

## Decision: Use the Awesome Slide Product UI System

**Decision**: Use a dense two- or three-zone runtime layout with sidebar/deck navigation, toolbar, grid/list body, and inspector/drawer surfaces.

**Rationale**: Slide management is a repeated operational workflow. It needs scan density, stable controls, keyboard access, and responsive drawers, not landing-page hero composition.

**Alternatives considered**:

- Card-heavy marketing layout: rejected because it reduces scan density and conflicts with the existing runtime shell.
- Modal-only management: rejected because metadata editing and browsing need persistent context.

## Decision: Validate with Unit Tests and Browser Workflows

**Decision**: Cover parser helpers, manifest operations, endpoint validation, and slide operations with Vitest, then validate the UI through the demo app in browser viewports.

**Rationale**: The highest-risk pieces are file writes and endpoint contracts; the highest-risk UX pieces are keyboard focus, responsive drawers, and mutation states.

**Alternatives considered**:

- Manual-only validation: rejected because source rewrites and manifest operations need regression tests.
- Broad end-to-end automation immediately: deferred unless the repository adds a browser test pattern, because current tests are primarily Vitest/unit-oriented.
