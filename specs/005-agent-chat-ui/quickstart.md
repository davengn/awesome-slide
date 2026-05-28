# Quickstart: In-App Agent Chat

## Prerequisites

- Node.js >=18
- pnpm 10
- Existing dependencies installed with `pnpm install`
- At least one valid agent/model connection from `specs/006-agent-model-connections`

## Development Loop

1. Start the demo runtime:

   ```bash
   pnpm dev:demo
   ```

2. Open the local demo URL printed by Vite.

3. Validate slide workspace entry:

   - Open a slide from the management home route.
   - Open the agent chat panel from the slide workspace toolbar.
   - Confirm the panel shows current slide, page, theme, and optional selected-element context chips.
   - Select an element with the inspector and confirm selected-element context can be included or removed.
   - Send a non-file-changing prompt and confirm loading, streaming, completed, retry, and cancel states.

4. Validate slide management entry:

   - Open the agent drawer from the management surface for a slide and for a deck.
   - Confirm suggested actions adapt to slide/deck scope.
   - Create a prompt-seeded slide and confirm the returned handoff opens the chat with the seed prompt.

5. Validate preview/apply safety:

   - Prompt for copy edits on the current slide and confirm a proposal appears before any file write.
   - Review operation list and source diff preview.
   - Apply selected operations and confirm only those changes are written.
   - Reject a proposal and confirm no source file changes.
   - Prompt for a broad deck rewrite and confirm stronger confirmation appears before apply.
   - Cancel a streaming run and confirm no partial edit is applied.

6. Validate errors and recovery:

   - Disable or remove the active connection and confirm no-connection recovery routes are visible.
   - Simulate invalid agent output and confirm validation failure diagnostics are shown.
   - Modify a slide after proposal generation and confirm stale proposals report patch conflict.
   - Confirm diagnostics copy omits secrets and hidden-file contents.

7. Validate responsive and accessibility behavior:

   - 375px: chat opens as a drawer, composer and preview controls remain reachable.
   - 768px: drawer/panel content does not introduce horizontal scroll.
   - 1024px and 1440px: right panel keeps the slide preview visible by default.
   - Keyboard: open/close panel, move through messages, edit context chips, send prompt, cancel, apply, and reject without pointer input.

## Focused Test Targets

Add and run focused tests while implementing:

```bash
pnpm test -- packages/core/src/app/lib/agent-chat-state.test.ts
pnpm test -- packages/core/src/app/lib/agent-chat-context.test.ts
pnpm test -- packages/core/src/editing/agent-proposals.test.ts
pnpm test -- packages/core/src/http/agent-chat-api.test.ts
pnpm core typecheck
```

Test coverage should include:

- Run state transitions, retry, refine, cancellation, and `needs-review`.
- Context redaction, size budgets, hidden-file exclusion, and selected-element summaries.
- Structured operation validation and raw patch fallback.
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
