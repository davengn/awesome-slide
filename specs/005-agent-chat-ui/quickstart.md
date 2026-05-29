# Quickstart: In-App Agent Chat

## Prerequisites

- Node.js >=18
- pnpm 10
- Existing dependencies installed with `pnpm install`
- At least one valid agent/model connection from `specs/006-agent-model-connections`
- Bundled skills available under `packages/core/skills` or the installed `@awesome-slide/core` package

## Development Loop

1. Start the demo runtime:

   ```bash
   pnpm dev:demo
   ```

2. Open the local demo URL printed by Vite.

3. Validate slide workspace entry:

   - Open a slide from the management home route.
   - Open the agent chat panel from the slide workspace toolbar.
   - Confirm the panel uses the Open Design-style rail anatomy: Chat/Comments tabs, compact turns, inline status cards, generated-files tray when applicable, and pinned composer.
   - Confirm the panel shows current slide, page, theme, and optional selected-element context chips.
   - Select an element with the inspector and confirm selected-element context can be included or removed.
   - Send a non-file-changing prompt and confirm loading, streaming, completed, retry, and cancel states.
   - Confirm the submitted prompt and cancellable queued/status turn appear immediately and never leave the composer disabled after terminal, review, or failure state.
   - Ask for a current-slide edit such as "tighten this page" and confirm the status card shows the `Slide authoring` workflow without asking the user to open an external agent skill.

4. Validate slide management entry:

   - Open the agent drawer from the management surface for a slide and for a deck.
   - Confirm suggested actions adapt to slide/deck scope.
   - Create a prompt-seeded slide and confirm the returned handoff opens the chat with the seed prompt.
   - Ask for a related slide and confirm the run uses `Create slide` plus `Slide authoring` workflow metadata.
   - Ask to apply inspector comments when markers exist and confirm the run uses the `Apply comments` workflow.
   - Ask to create or extract a theme and confirm the run uses the `Create theme` workflow and proposes only expected `themes/<id>.md` / `themes/<id>.demo.tsx` writes.

5. Validate preview/apply safety:

   - Prompt for copy edits on the current slide and confirm a proposal appears before any file write.
   - Review operation list and source diff preview.
   - Confirm proposal validation has run before apply controls are enabled.
   - Apply selected operations and confirm only those changes are written.
   - Reject a proposal and confirm no source file changes.
   - Prompt for a broad deck rewrite and confirm the double-confirmation modal appears before apply.
   - Cancel a streaming run and confirm no partial edit is applied.
   - Open the audit/history control and confirm a redacted applied-change record appears after successful apply.

6. Validate errors and recovery:

   - Disable or remove the active connection and confirm no-connection recovery routes are visible.
   - Simulate failed `POST /__agent-chat/runs`, failed SSE startup, and stream disconnect before terminal state; confirm the prompt remains visible, the turn fails inline, and retry/edit-prompt actions are available.
   - Simulate terminal stream closure after `completed`, `cancelled`, and `failed`; confirm no extra stream-disconnect error appears.
   - Simulate invalid agent output and confirm validation failure diagnostics are shown.
   - Temporarily simulate a missing bundled workflow and confirm the chat enters `skill-unavailable` non-writing recovery before contacting the model adapter.
   - Modify a slide after proposal generation and confirm stale proposals report patch conflict.
   - Confirm diagnostics copy omits secrets and hidden-file contents.

7. Validate responsive and accessibility behavior:

   - 375px: chat opens as a drawer, composer and preview controls remain reachable.
   - 768px: drawer/panel content does not introduce horizontal scroll.
   - 1024px and 1440px: desktop rail keeps the slide preview visible by default.
   - Keyboard: open/close panel, move through messages, edit context chips, send prompt, cancel, apply, and reject without pointer input.

## Focused Test Targets

Add and run focused tests while implementing:

```bash
pnpm test -- packages/core/src/app/lib/agent-chat-state.test.ts
pnpm test -- packages/core/src/app/lib/agent-chat-context.test.ts
pnpm test -- packages/core/src/app/lib/agent-chat-skills.test.ts
pnpm test -- packages/core/src/editing/agent-proposals.test.ts
pnpm test -- packages/core/src/http/agent-chat-api.test.ts
pnpm core typecheck
```

Test coverage should include:

- Run state transitions, retry, refine, cancellation, and `needs-review`.
- Stuck-run prevention: failed run creation, SSE startup failure, disconnect before terminal state, terminal cleanup, retry, and composer release.
- Context redaction, size budgets, hidden-file exclusion, and selected-element summaries.
- Bundled workflow loading from `packages/core/skills`, workflow hashing, action-to-workflow routing, and `skill-unavailable` recovery.
- Structured operation validation and raw patch fallback.
- Runtime proposal validation before proposal emission and before apply.
- Source/deck/theme fingerprint conflict detection before apply.
- Proposal preview requirements and selected apply behavior.
- Error categorization and recovery action mapping.
- Audit JSONL redaction and append-only behavior.

## Final Gates

Run before considering implementation complete:

```bash
pnpm check
pnpm typecheck
pnpm test
pnpm build
```

Because implementation touches `packages/core`, add a changeset:

```bash
pnpm changeset
```

Use a short user-facing patch description, for example:

```text
Add in-app agent chat with reviewable slide edit proposals.
```
