# Contract: 005/006 Migration And Deletion

## Scope

Defines how the refactor handles existing `specs/005-agent-chat-ui` and `specs/006-agent-model-connections` implementation code.

## Keep

Keep or adapt these concepts:

- Chat rail/drawer UI anatomy.
- Context chips and suggested actions.
- Connection settings modal and quick switcher UI.
- Safe connection metadata and capability flags.
- Proposal preview/apply controls.
- Existing edit/proposal validators where they pass 007 contracts.
- Existing management/file helpers for slide/deck/theme writes.
- 008 deterministic E2E coverage goals.

## Replace

Replace these runtime responsibilities:

- Browser-owned run lifecycle.
- Route-owned run lifecycle inside `agent-chat-api.ts`.
- Direct provider execution embedded in the chat route.
- Generic local CLI fallback execution.
- Prompt-prefix simulation behavior.
- Session persistence that cannot support reload reattach.
- Error handling that only updates React state after `EventSource` failure.

## Delete Or Guard

Production code must not include:

- `simulate-error:*` or `simulate-proposal:*` prompt-prefix branches.
- One-shot non-streaming provider calls used for chat generation.
- Generic JSON fallback for unknown local agents.
- Test fixture connections unless `AWESOME_SLIDE_E2E=1`.
- Raw credential values in browser payloads or project settings.

## Compatibility Strategy

Routes:

- Keep `/__agent-chat/session`, `/__agent-chat/runs`, `/__agent-chat/runs/:id/events`, `/__agent-chat/runs/:id/cancel`, `/__agent-chat/proposals/:id/apply`, and `/__agent-chat/proposals/:id/reject` when possible.
- Keep `/__agent-connections/bootstrap`, `/__agent-connections/settings`, and active connection management where they are already used by UI.
- Route handlers may move to `agent-runtime-api.ts` if old files re-export/register compatible handlers.

Types:

- Existing app-facing types can remain if they map cleanly to runtime contracts.
- Server-only types move into `agent-runtime/contracts.ts`.

Tests:

- Existing 005/006 tests that assert broken production simulations are rewritten against fixture mode.
- Tests asserting route shapes remain compatible should be preserved.
- New tests must prove fixture behavior is unavailable without `AWESOME_SLIDE_E2E=1`.

Implementation Order:

1. Introduce runtime contracts and run service behind existing routes.
2. Move event streaming/replay/cancellation into runtime.
3. Move prompt assembly and workflow loading into runtime.
4. Move provider and local-agent execution into adapters.
5. Move structured output parsing/proposal creation into runtime.
6. Delete or guard obsolete branches.
7. Update UI clients only where contract shape changes.
8. Run 008 E2E fixture through the same runtime path.
