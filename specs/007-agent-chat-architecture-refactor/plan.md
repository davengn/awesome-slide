# Implementation Plan: Agent Chat Architecture Refactor

**Branch**: `007-agent-chat-architecture-refactor` | **Date**: 2026-05-30 | **Spec**: [/Users/ducduy/Projects/awesome-slide/specs/007-agent-chat-architecture-refactor/spec.md](/Users/ducduy/Projects/awesome-slide/specs/007-agent-chat-architecture-refactor/spec.md)
**Input**: Feature specification from `/Users/ducduy/Projects/awesome-slide/specs/007-agent-chat-architecture-refactor/spec.md`, plus source-reference review of `/Users/ducduy/Projects/awesome-slide/references/agent-architecture/open-design-chat-architecture-analysis.md`.

## Summary

Refactor the failed 005/006 agent chat and model connection work into a Vite-owned agent runtime for `@awesome-slide/core`. The architecture follows the transferable parts of Open Design's `apps/daemon`, `apps/web`, and `packages/contracts` split: stable run records, replayable server events, runtime-owned cancellation, prompt assembly independent from transport, explicit local-agent definitions, server-side BYOK provider adapters, structured edit proposals, and source-driven preview refresh.

This is not a patch over the broken chat route. Existing 005/006 UI, connection settings, type inventory, proposal controls, and safety requirements may be reused, but obsolete production simulation paths, non-streaming provider calls, generic local CLI fallback behavior, and browser-owned run recovery are removed or guarded behind the deterministic E2E fixture.

## Technical Context

**Language/Version**: TypeScript strict, React, Node APIs available inside the Vite dev server
**Primary Dependencies**: Existing Vite middleware, React UI, Tailwind/shadcn UI, Vitest, Playwright, Node `child_process`, Web Streams/EventSource APIs, existing Awesome Slide file/edit helpers
**Storage**: Local project files under ignored `.awesome-slide/agent-chat/`; existing `.awesome-slide/agent-connections/settings.json` for non-secret connection settings; server-only credential references through existing secret helpers or environment variables
**Testing**: Vitest unit/contract tests, Playwright 008 E2E flow, `pnpm check`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm run test:e2e`
**Target Platform**: `@awesome-slide/core` dev server and browser app, running locally through Vite
**Project Type**: pnpm/Turbo monorepo framework package; implementation is inside `packages/core`
**Performance Goals**: User and assistant placeholder visible within 100ms after accepted prompt; queued/progress/failure event within 500ms after run acceptance; cancellation terminal event within 2s; bounded replay without duplicated assistant text
**Constraints**: No new daemon package in the first slice; avoid new runtime dependencies; no browser exposure of raw credentials; no production prompt-prefix simulations; no generic unknown-agent execution fallback; deterministic fixture only when `AWESOME_SLIDE_E2E=1`; read-only/static mode blocks mutations
**Scale/Scope**: One local project runtime, one active run per conversation, bounded conversation/event persistence, first-class Codex CLI and Claude Code local definitions, existing planned BYOK providers through server-side adapters

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Agent-Native by Design**: Pass. The feature is the agent execution path and loads workflow instructions from shipped skills instead of hardcoded browser-only behavior.
- **Package Discipline**: Pass with required action. Implementation changes `packages/core`, so the final task set must include a patch changeset.
- **Clean Code Baseline**: Pass. The plan requires focused runtime modules, tests, Biome gates, and removal of broken duplicate paths.
- **Monorepo Convention**: Pass. Work stays in `packages/core`; commands use root `pnpm`/package filters.
- **Ship Small, YAGNI**: Pass. The first slice uses the Vite dev server as the execution host, avoids a new daemon package, supports only explicit local-agent definitions, and uses local file storage instead of adding SQLite.

No constitutional violations are accepted for this plan.

## Open Design Source Reference Alignment

The Open Design analysis is source-level input. The 007 implementation must map each reusable source pattern to an Awesome Slide module instead of copying Open Design's app layout.

| Open Design reference | Transferable responsibility | Awesome Slide 007 target | Check result |
|-----------------------|-----------------------------|---------------------------|--------------|
| `apps/daemon/src/server.ts` and `apps/daemon/src/chat-routes.ts` | Route registration, run start, prompt assembly, process/provider dispatch, terminal reconciliation | Keep `packages/core/src/http/agent-chat-api.ts` and `agent-connections-api.ts` as thin route adapters; move runtime behavior to `packages/core/src/agent-runtime/index.ts` and focused modules | Covered, but current route code must be deleted/converted rather than extended |
| `apps/daemon/src/runs.ts` | In-memory active run service, event append, SSE fanout, replay, cancel, finish | `packages/core/src/agent-runtime/runs.ts`, superseding `packages/core/src/http/agent-chat-runs.ts` | Covered; this is the first implementation dependency |
| `packages/contracts/src/api/chat.ts` and `packages/contracts/src/sse/chat.ts` | Shared DTOs and event union | `packages/core/src/agent-runtime/contracts.ts` plus safe browser mirrors in `packages/core/src/app/lib/agent-chat-types.ts` only where needed | Covered; route payload tests must lock compatibility |
| `apps/daemon/src/runtimes/*`, `claude-stream.ts`, `json-event-stream.ts` | Per-agent runtime definitions, launch args, stdin mode, parser, cancellation | `packages/core/src/agent-runtime/local-agents.ts` and `local-stream-parsers.ts` for Codex CLI and Claude Code | Covered; unknown agents are incompatible, not generic fallback |
| `apps/web/src/providers/daemon.ts` | Browser create-run, consume SSE, reattach by event id, cancel relay, tool-result submission | `packages/core/src/app/lib/agent-chat-client.ts` and `AgentChatPanel` integration | Covered; browser client must not own execution or terminal reconciliation |
| `apps/web/src/providers/anthropic.ts` and `api-proxy.ts` | Provider stream normalization and proxying | `packages/core/src/agent-runtime/provider-adapters.ts` using server-side BYOK credential references | Deliberately changed: no browser-direct provider streaming in first slice |
| `apps/daemon/src/prompts/system.ts` and `packages/contracts/src/prompts/system.ts` | Prompt composition independent from transport, API no-tools guard, runtime tool prompt | `packages/core/src/agent-runtime/prompts.ts`, `workflows.ts`, and `context.ts` | Covered; add tests for provider no-tools and workflow hashes |
| `apps/web/src/components/ProjectView.tsx` | Orchestrates send/retry/cancel/reattach/file refresh | Existing `packages/core/src/app/components/agent-chat/AgentChatPanel.tsx` plus client/state reducers | Partially covered; UI must become a renderer/client, not a runtime owner |
| `ChatPane`, `AssistantMessage`, `ToolCard` | Message rendering, structured events, tool cards, retry/auth affordances | `ChatMessageList`, `AgentTurnCard`, `RunStatusCard`, `ProposalPreview`, `FilesFromTurn`, `ProposalControls` | Covered; keep useful UI affordances from 005/006 |
| `apps/daemon/src/project-routes.ts`, `project-watchers.ts`, `apps/web/src/providers/project-events.ts`, `FileViewer` | File metadata as source of truth, file-change events, preview cache busting | Existing `packages/core/src/http/management-api.ts`, `packages/core/src/vite/routes/watchers.ts`, `packages/core/src/files/*`, `packages/core/src/editing/agent-proposals.ts`, plus `agent-runtime/file-refresh.ts` | Needs explicit implementation task: apply must return changed files/source versions and trigger existing Vite refresh paths |
| `apps/web/src/state/config.ts` | Local config, daemon config merge, secret stripping | Existing `agent-connection-storage.ts`, `agent-secrets.ts`, `agent-connections-api.ts`, plus runtime redaction tests | Covered; browser payloads receive display hints only |
| AskUserQuestion live tool-result path | Host-mediated mid-turn input for supported runtimes | `POST /__agent-chat/runs/:runId/tool-result` contract | Contracted but not P1; implement only for runtime definitions that can keep stdin open safely |

## Current 007 Gap Check

- The current 007 `spec.md`, `research.md`, `data-model.md`, and contracts already match the main Open Design lessons: host-owned runs, replayable event protocol, server-side provider adapters, explicit local-agent definitions, prompt/proposal separation, and fixture isolation.
- The plan file had been refreshed to the template by `setup-plan.sh`; this plan restores the concrete implementation direction.
- The missing detail was an explicit mapping from Open Design source references to Awesome Slide source modules. The table above is now the implementation alignment guide.
- The file-refresh portion needs extra emphasis because Open Design preview recovery depends on project file events. Awesome Slide should reuse existing Vite watcher/HMR and management/file helpers instead of inventing assistant-text-driven refresh.
- Browser-direct provider mode from Open Design is intentionally not carried over. Awesome Slide 007 uses server-side adapters first to keep one event protocol and one credential redaction boundary.

## Project Structure

### Documentation (this feature)

```text
/Users/ducduy/Projects/awesome-slide/specs/007-agent-chat-architecture-refactor/
├── plan.md
├── spec.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    ├── connection-execution-contract.md
    ├── migration-contract.md
    ├── prompt-proposal-contract.md
    └── runtime-api-contract.md
```

### Source Code (repository root)

```text
/Users/ducduy/Projects/awesome-slide/packages/core/src/
├── agent-runtime/
│   ├── contracts.ts
│   ├── events.ts
│   ├── runs.ts
│   ├── storage.ts
│   ├── redaction.ts
│   ├── connections.ts
│   ├── prompts.ts
│   ├── workflows.ts
│   ├── context.ts
│   ├── local-agents.ts
│   ├── local-stream-parsers.ts
│   ├── provider-adapters.ts
│   ├── proposal-output.ts
│   ├── file-refresh.ts
│   ├── e2e-fixture.ts
│   └── index.ts
├── http/
│   ├── agent-chat-api.ts
│   ├── agent-connections-api.ts
│   └── request-guard.ts
├── app/
│   ├── lib/agent-chat-client.ts
│   ├── lib/agent-chat-state.ts
│   ├── lib/agent-chat-types.ts
│   └── components/agent-chat/
├── editing/
│   └── agent-proposals.ts
├── files/
│   ├── agent-audit.ts
│   ├── slide-management.ts
│   └── slide-ops.ts
└── vite/
    ├── api-plugin.ts
    └── routes/watchers.ts
```

Tests should be colocated with the modules they cover, following existing `*.test.ts` patterns.

**Structure Decision**: Add `packages/core/src/agent-runtime/` as the runtime boundary. Existing `http/` files register and validate routes, but they delegate to `agent-runtime`. Existing app components remain the UI surface. Existing `editing/`, `files/`, and `vite/routes/watchers.ts` remain the source-of-truth file and preview infrastructure.

## Phase 0: Research

Research is complete in `/Users/ducduy/Projects/awesome-slide/specs/007-agent-chat-architecture-refactor/research.md`.

Resolved decisions:

- Vite dev server is the local execution host.
- `packages/core/src/agent-runtime/` is the runtime boundary.
- Runs are first-class records with replayable events and cancellation.
- All local/provider/fixture output normalizes into one event protocol.
- BYOK providers execute through server-side adapters.
- Codex CLI and Claude Code are the first local-agent definitions.
- Prompt assembly is independent from adapters.
- File writes require structured proposals.
- Preview refresh uses source metadata and existing file helpers.
- Runtime state persists locally with redaction.
- E2E fixture is a guarded runtime adapter.
- Broken 005/006 runtime code is deleted or converted.

No unresolved clarification markers remain.

## Phase 1: Design And Contracts

Design artifacts are complete:

- `/Users/ducduy/Projects/awesome-slide/specs/007-agent-chat-architecture-refactor/data-model.md`
- `/Users/ducduy/Projects/awesome-slide/specs/007-agent-chat-architecture-refactor/contracts/runtime-api-contract.md`
- `/Users/ducduy/Projects/awesome-slide/specs/007-agent-chat-architecture-refactor/contracts/connection-execution-contract.md`
- `/Users/ducduy/Projects/awesome-slide/specs/007-agent-chat-architecture-refactor/contracts/prompt-proposal-contract.md`
- `/Users/ducduy/Projects/awesome-slide/specs/007-agent-chat-architecture-refactor/contracts/migration-contract.md`
- `/Users/ducduy/Projects/awesome-slide/specs/007-agent-chat-architecture-refactor/quickstart.md`

Additional contract emphasis after source-reference review:

- Runtime apply responses must include changed file identifiers and source-version hints so the browser can refresh from file metadata.
- Runtime/provider diagnostics must pass through the same redaction layer before events, persistence, and audit writes.
- UI retry/reattach must use runtime run ids and event cursors, not browser-only pending state.
- Tool-result submission remains a contract, but local runtime definitions must opt in explicitly.

## Post-Design Constitution Check

- **Agent-Native by Design**: Pass. Prompt assembly uses shipped workflow skills and runtime connections.
- **Package Discipline**: Pass with implementation action. Add a patch changeset when `packages/core` code changes.
- **Clean Code Baseline**: Pass. The plan keeps modules focused and avoids comments except hidden constraints.
- **Monorepo Convention**: Pass. No package layout changes outside `packages/core`.
- **Ship Small, YAGNI**: Pass. No new daemon, DB, or broad local-agent registry is introduced.

No complexity exceptions are required.

## Complexity Tracking

No constitution violations require justification.
