# Contract: Slide Management UI

## Layout

The management surface uses two or three zones depending on width:

- Navigation zone: sidebar or drawer for draft, folders, decks, themes, and assets.
- Content zone: toolbar plus grid/list of slides.
- Inspector zone: persistent side panel on wide screens and drawer on narrow screens.

Rules:

- Grid mode prioritizes preview thumbnails.
- List mode prioritizes dense metadata scanning.
- The toolbar stays stable while search, sort, and mutation states change.
- Cards are for individual slide items only, not nested page sections.

## Primary Actions

The home route exposes a visible primary create action.

Create entry points:

- Blank slide.
- Existing theme/template.
- Prompt-based workflow (creates placeholder slide, hands off to agent chat).

Rules:

- Prompt entry never exposes a raw backend skill command as the primary UI.
- Static builds show create as unavailable with read-only guidance.
- Creation success inserts or refreshes the slide list and offers to open the new slide.

## Slide Item Actions

Every slide item provides visible and keyboard-accessible access to:

- Open.
- Rename.
- Duplicate.
- Move.
- Delete.
- Edit metadata.

Rules:

- Hover menus are allowed but cannot be the only action path.
- Delete always requires confirmation.
- Duplicate allows a new ID/title before or immediately after creation.
- Pending mutation state is shown on the affected item and does not shift item size.

## Search and Sort

Search matches:

- Title.
- Stable slide ID.
- Tags.
- Folder name.
- Deck name.

Sort modes:

- Updated date descending/ascending when available.
- Created date descending/ascending when available.
- Title ascending/descending.
- Manual order when persisted for the selected collection.

Rules:

- Search and sort controls are keyboard accessible.
- No-result state is distinct from no-slides state.
- Missing created/updated dates sort after dated slides for date-desc modes.

## Metadata Inspector

Editable fields and their editability rules:

| Field | Supported source | Unsupported/parse-error/missing | Static mode |
|-------|-----------------|--------------------------------|-------------|
| title | editable | read-only | read-only |
| description | editable | read-only | read-only |
| tags | editable | read-only | read-only |
| theme | editable | read-only | read-only |
| status | editable | read-only | read-only |
| notes | editable | read-only | read-only |
| folder | editable | editable | read-only |
| deck membership | editable | editable | read-only |

Rules:

- Slide-owned fields (title, description, tags, theme, status, notes) require `sourceState: 'supported'` to edit. When read-only, the inspector shows the current value and a warning explaining why.
- Collection-owned fields (folder, deck) are always editable in dev mode regardless of source state.
- Field-level validation is shown inline.
- Long fields can open focused dialogs or use larger editor controls.
- Unknown theme IDs remain visible and editable.
- In static mode, all fields are read-only with guidance to run the dev server.

## Empty and Error States

Required empty states:

- No slides.
- No search results.
- No folder assignment.
- No deck assignment.
- Loading failure.

Required error states:

- File write failure.
- Invalid slide ID.
- Duplicate slide ID.
- Metadata parse/write failure.
- Endpoint/server failure.
- Static read-only mutation attempt.

Rules:

- Error copy must name the failed action and provide recovery guidance where recovery exists.
- A failed mutation leaves the UI consistent with persisted state.
- Loading uses skeletons for grid/list and inline pending affordances for item-level changes.

## Keyboard and Focus

Required keyboard coverage:

- Create action.
- Search input.
- Sort/view controls.
- Grid/list slide navigation.
- Slide action menus.
- Inspector fields.
- Dialogs and drawers.
- Delete confirmation.

Rules:

- Focus is trapped inside dialogs/drawers while open.
- Focus returns to the invoking control after close.
- Visible focus states are required.
- Escape closes transient surfaces without applying unsaved changes.

## Responsive Behavior

Breakpoints to validate:

- 375px: navigation and inspector are drawers; create/search/open/delete remain reachable.
- 768px: toolbar and content remain stable without horizontal scroll.
- 1024px: two-zone layout is available.
- 1440px: three-zone layout can show navigation, content, and inspector at once.

Rules:

- Text must not overflow buttons, cards, rows, drawers, or dialogs.
- View controls and item action controls keep stable dimensions across states.
- Slide previews keep a 16:9 aspect ratio.

## Static Read-Only Mode

Static builds:

- Show slide records, folders, decks, search, sort, grid/list, and open behavior.
- Disable or hide create, rename, duplicate, delete, move, metadata edit, and manual order mutations.
- Explain that editing requires running Awesome Slide in local dev/project mode.

Rules:

- Read-only mode must be clear before a user attempts destructive or write actions.
- Static mode must not render controls that fail only after click unless they are intentionally disabled with explanation.
