# Implementation Plan: In-App Agent Chat

**Branch**: `005-agent-chat-ui` | **Date**: 2026-05-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-agent-chat-ui/spec.md`

## Summary

Build an in-app agent chat surface in `@awesome-slide/core` so creators can open chat from the slide workspace or slide management UI, send context-aware prompts, stream responses, review file-changing proposals, and explicitly apply or reject changes. The technical approach keeps provider protocols in `specs/006-agent-model-connections`, adds a local runtime boundary in Vite middleware, models runs and proposals as typed state machines, stores only bounded local session summaries, and writes deterministic redacted audit entries for applied changes.

## Technical Context

**Language/Version**: TypeScript 5.9 in strict mode, React 18, Node.js >=18

**Primary Dependencies**: Existing `@awesome-slide/core` runtime dependencies: Vite 5 middleware, React Router, Tailwind CSS, shadcn/ui primitives, lucide-react icons, existing slide management/editing helpers, and the active connection adapter boundary defined by `specs/006-agent-model-connections`. No new runtime dependency is planned for the plan phase.

**Storage**: Browser-local project-scoped session summaries capped to 50 visible messages or 256KB serialized size. Applied-change audits and temporary preview artifacts use ignored local project storage under `.awesome-slide/agent-chat/`.

**Testing**: Vitest for reducer, context, route, proposal, storage, error, and audit behavior; `pnpm core typecheck` for package type safety; final gates use `pnpm check`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.

**Target Platform**: Awesome Slide local browser runtime served by the core Vite plugin, with static/read-only builds showing non-writing chat recovery states.

**Project Type**: pnpm + Turbo monorepo framework package; implementation is concentrated in `packages/core`.

**Performance Goals**: Context collection for a normal single-slide prompt should complete within 200ms on a warm local dev server. Common single-slide proposal validation should complete within 200ms before enabling apply controls. A queued run should emit an initial visible status or streamed event within 500ms after the local runtime accepts it.

**Constraints**: No file-changing response may write before preview and explicit user apply. Agent context must exclude hidden files, `.env*`, credential-like values, stored provider secrets, and unrelated project files by default. The chat UI must be connection-agnostic and call only the active connection adapter boundary. Static/read-only mode must block write-capable runs and proposal apply. Desktop layout must keep the slide preview visible by default; narrow screens use a drawer. Changes to `packages/core` require a patch changeset before implementation completion.

**Scale/Scope**: One runtime feature spanning slide workspace and slide management entry points, P1 current-slide/context/review flows, P2 layout/theme/deck/failure flows, local-only history, and no cloud sync or provider protocol implementation.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Plan Response |
|-----------|--------|---------------|
| I. Agent-Native by Design | PASS | The feature is explicitly an agent-authoring workflow with typed context, proposal, and audit contracts. |
| II. Package Discipline | PASS | Work is scoped to `@awesome-slide/core`; tasks and quickstart require a patch changeset and no casual dependencies. |
| III. Clean Code Baseline | PASS | Plan uses existing patterns, focused tests, and final `pnpm check`; shadcn generated files are not hand-edited. |
| IV. Monorepo Convention | PASS | Commands are run from the repo root with `pnpm core`/Turbo filters, and source changes remain in `packages/core`. |
| V. Ship Small, YAGNI | PASS | Provider protocols, cloud sync, autonomous writes, and new UI testing dependencies are out of scope unless implementation proves they are necessary. |

**Post-Design Recheck**: PASS. Research, data model, contracts, and quickstart keep provider integration bounded, require review-before-write, define local-only retention, and capture changeset/test gates. No constitution violations require complexity tracking.

## Project Structure

### Documentation (this feature)

```text
specs/005-agent-chat-ui/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/
│   └── requirements.md
├── contracts/
│   ├── agent-chat-runtime-contract.md
│   ├── edit-proposal-contract.md
│   └── ui-state-contract.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/core/
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   └── agent-chat/
│   │   │       ├── index.ts
│   │   │       ├── AgentChatPanel.tsx
│   │   │       ├── AgentChatDrawer.tsx
│   │   │       ├── ChatComposer.tsx
│   │   │       ├── ChatMessageList.tsx
│   │   │       ├── ContextChips.tsx
│   │   │       ├── SuggestedActions.tsx
│   │   │       ├── ProposalPreview.tsx
│   │   │       └── ProposalControls.tsx
│   │   ├── lib/
│   │   │   ├── agent-chat-actions.ts
│   │   │   ├── agent-chat-actions.test.ts
│   │   │   ├── agent-chat-client.ts
│   │   │   ├── agent-chat-context.ts
│   │   │   ├── agent-chat-context.test.ts
│   │   │   ├── agent-chat-errors.ts
│   │   │   ├── agent-chat-errors.test.ts
│   │   │   ├── agent-chat-state.ts
│   │   │   ├── agent-chat-state.test.ts
│   │   │   ├── agent-chat-storage.ts
│   │   │   ├── agent-chat-storage.test.ts
│   │   │   └── agent-chat-types.ts
│   │   └── routes/
│   │       ├── home.tsx
│   │       └── slide.tsx
│   ├── editing/
│   │   ├── agent-proposals.ts
│   │   └── agent-proposals.test.ts
│   ├── files/
│   │   ├── agent-audit.ts
│   │   └── agent-audit.test.ts
│   ├── http/
│   │   ├── agent-chat-api.ts
│   │   ├── agent-chat-api.test.ts
│   │   ├── agent-chat-runs.ts
│   │   └── agent-chat-types.ts
│   └── vite/
│       └── api-plugin.ts
├── package.json
└── tsconfig.json

.changeset/
└── <patch-changeset>.md

.gitignore
```

**Structure Decision**: Implement as a `packages/core` runtime capability because the feature needs current slide state, slide management context, existing mutation helpers, Vite middleware routes, and the shipped viewer UI. Documentation and contracts live under `specs/005-agent-chat-ui/`; implementation tasks are dependency-ordered in `tasks.md`.

## Phase 0 Research Output

Research is complete in [research.md](./research.md) with decisions for:

- `@awesome-slide/core` runtime ownership.
- Active connection adapter dependency on `specs/006-agent-model-connections`.
- Explicit bounded `AgentChatContext`.
- Cancellable streamed run state machine.
- Local run routes plus server-sent events.
- Structured edit proposals with raw patch fallback.
- Preview and validation before writes.
- Short local session history and redacted audit JSONL.
- Desktop panel plus narrow-screen drawer.
- Vitest-first domain logic tests and demo runtime validation.

## Phase 1 Design Output

Design artifacts are complete:

- [data-model.md](./data-model.md): sessions, messages, context preferences, bounded context, selected element descriptors, suggested actions, connection refs, runs, events, proposals, operations, preview artifacts, validation, apply transactions, audit entries, and categorized errors.
- [contracts/agent-chat-runtime-contract.md](./contracts/agent-chat-runtime-contract.md): bootstrap, run creation, SSE events, cancel, retry, apply, reject, adapter boundary, runtime modes, and error shape.
- [contracts/edit-proposal-contract.md](./contracts/edit-proposal-contract.md): proposal envelope, structured operation kinds, preview artifact requirements, and apply semantics.
- [contracts/ui-state-contract.md](./contracts/ui-state-contract.md): entry points, responsive layout, run state mapping, context controls, suggested actions, accessibility, error recovery, and refresh expectations.
- [quickstart.md](./quickstart.md): implementation validation loop, focused tests, final gates, and changeset requirement.
- `AGENTS.md`: includes `specs/005-agent-chat-ui/plan.md` in the Spec Kit reference block.

## Resolved Planning Assumptions

- The connection layer owns credential lookup, connection setup, model/provider protocols, and settings UI; this feature consumes only safe active-connection metadata and a provider-neutral streaming adapter.
- The default context budget is 128KB serialized, with visible truncation for oversized source, notes, snapshots, and metadata.
- If no inspector element is selected, selected-element context is unavailable and not sent.
- One chat session can have only one active queued, loading, streaming, or needs-review run.
- Static/read-only builds can display chat entry points and recovery UI but cannot create write-capable runs or apply proposals.
- Stale proposals caused by independent source, deck, theme, or metadata changes expire or conflict before apply.
- Partial selected apply is successful only when every selected operation writes successfully.

## Complexity Tracking

No constitution violations are present.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
