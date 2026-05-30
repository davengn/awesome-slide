# Research: Agent Chat Architecture Refactor

## Decision: Use the Vite dev server as the local execution host

**Rationale**: Open Design succeeds by making the daemon own runs, process handles, streaming, persistence, prompt assembly, provider proxying, and file watching. Awesome Slide already has a local Vite middleware layer in `packages/core/src/vite/api-plugin.ts` and route modules under `packages/core/src/http/`, so the smallest equivalent is a focused runtime inside `@awesome-slide/core` rather than a new daemon package.

**Alternatives considered**:

- Keep execution mostly in React/browser state. Rejected because the current implementation can leave prompts pending and cannot reliably own child processes, replay, or provider credential handling.
- Add a separate daemon package now. Rejected because it increases install/runtime complexity before the local Vite host proves the architecture.

## Decision: Introduce `packages/core/src/agent-runtime/`

**Rationale**: Current code spreads chat types, connection types, route handlers, adapters, proposal handling, storage, and UI state across large files. `agent-chat-api.ts` mixes route parsing, simulation, provider calls, local CLI spawning, proposal fabrication, SSE, and apply logic. A dedicated runtime module boundary lets route files become adapters and makes obsolete code safe to delete.

**Alternatives considered**:

- Keep adding helpers beside existing route files. Rejected because `agent-chat-api.ts` is already too large and contains production simulation behavior.
- Move everything into app/lib. Rejected because browser and server/runtime responsibilities need a clear boundary.

## Decision: Treat chat runs as first-class runtime records

**Rationale**: Open Design's run service owns stable ids, status, event fanout, replay, cancellation, terminal cleanup, and reattach. Awesome Slide already has `agent-chat-runs.ts`, but it is in-memory only and not the center of route/UI behavior. 007 makes run lifecycle the main contract.

**Alternatives considered**:

- Continue relying on `EventSource` callbacks in `AgentChatPanel`. Rejected because UI callbacks cannot recover child process/provider state after reload.
- Store only final assistant messages. Rejected because reattach, tool cards, diagnostics, and generated-file summaries require event history.

## Decision: Normalize all execution output into one event protocol

**Rationale**: Open Design normalizes Claude, Codex, plain stdout, tool events, and provider streams before rendering. Awesome Slide needs the same pattern so chat UI does not care whether output came from a local CLI, provider adapter, proposal parser, fixture, or runtime status.

**Alternatives considered**:

- Keep provider-specific response shapes in UI. Rejected because it makes retry, error handling, proposals, and E2E assertions inconsistent.
- Treat local CLI stdout as plain assistant text only. Rejected because file proposals, tool/status cards, and generated-file summaries require structured events.

## Decision: Proxy BYOK providers through the runtime

**Rationale**: The portable Open Design architecture allows some browser-direct provider streaming, but Awesome Slide should start simpler and safer: server-side provider adapters resolve credential references, normalize stream frames, redact diagnostics, and emit the same event protocol as local agents.

**Alternatives considered**:

- Browser-direct Anthropic/OpenAI calls. Rejected for the first refactor because it exposes more credential-handling surface and duplicates stream parsing.
- Non-streaming provider calls in `agent-chat-api.ts`. Rejected because it fails the chat UX and cannot support cancellation or progress.

## Decision: Support Codex CLI and Claude Code first for local agents

**Rationale**: The Open Design analysis documents concrete Codex and Claude invocation patterns. Awesome Slide's registry lists many local agents, but executing unknown CLIs through a generic JSON fallback is not reliable. First-class runtime definitions can define command, args, stdin mode, parser, cancellation, model support, and capability flags.

**Alternatives considered**:

- Execute every discovered command with the same prompt JSON. Rejected because provider protocols differ and generic fallback can appear ready while producing unusable output.
- Disable all local agents until provider mode works. Rejected because local-agent workflows are a core product goal.

## Decision: Keep prompt assembly independent from adapters

**Rationale**: Open Design separates prompt composition from transport. Awesome Slide needs to combine bounded slide/deck/theme context, selected workflow instructions from `packages/core/skills`, capability rules, transcript, file hints, and no-tools/provider rules before sending the final prompt to any adapter.

**Alternatives considered**:

- Let each adapter build its own prompt. Rejected because skill/workflow behavior would diverge per provider.
- Keep prompt assembly in React. Rejected because the runtime has safer access to project files, skills, and credential-safe connection capabilities.

## Decision: Require structured proposals for file writes

**Rationale**: 005's preview/apply safety model remains correct. The broken part is execution plumbing, not the requirement that file-changing work be parsed, validated, previewed, and explicitly applied. Text-only model output can be shown as assistant content but cannot write files.

**Alternatives considered**:

- Parse assistant prose heuristically for code blocks. Rejected because it is brittle and unsafe.
- Let local agents write files directly without proposal review. Rejected because the product requirement is explicit preview/apply.

## Decision: Use file metadata and existing management helpers as source of truth

**Rationale**: Open Design refreshes previews from filesystem metadata and file lists, not assistant text. Awesome Slide already has slide management routes, slide source helpers, edit/proposal validators, and Vite watchers. The runtime should use these and refresh based on source changes.

**Alternatives considered**:

- Store generated slide source inside chat state. Rejected because source files must remain canonical.
- Refresh only by React state mutation. Rejected because external edits, local agent writes, and management API writes need one source-of-truth path.

## Decision: Persist bounded redacted runtime state locally

**Rationale**: Browser local storage alone cannot support reload reattach or durable audit. A local ignored store under `.awesome-slide/agent-chat/` can persist conversations, message snapshots, run summaries, proposals, and audit entries without publishing user data.

**Alternatives considered**:

- Add SQLite. Rejected as too heavy for the first `@awesome-slide/core` refactor.
- Keep all state in memory. Rejected because reattach and audit are requirements.

## Decision: Make the deterministic fixture a guarded runtime adapter

**Rationale**: 008 E2E needs deterministic, no-network chat generation. The fixture should exercise the same runtime contracts as real connections, while remaining impossible to reach in normal dev or published runtime behavior.

**Alternatives considered**:

- Keep prompt-prefix simulations in production chat route. Rejected because it is one of the broken paths to eliminate.
- Mock browser components only in Playwright. Rejected because it would not validate middleware, event streaming, proposals, apply, or rendering.

## Decision: Delete or convert obsolete 005/006 runtime code

**Rationale**: The user's request explicitly allows eliminating broken parts. Current 005/006 work has useful UI and type inventory, but production simulation, non-streaming provider calls, generic local fallback execution, and route-owned lifecycle should not survive the refactor.

**Alternatives considered**:

- Preserve all existing code and add a new layer beside it. Rejected because duplicated runtime ownership would keep failures ambiguous.

## Decision: Treat Open Design source references as a mapping guide, not a layout to copy

**Rationale**: The Open Design analysis names concrete source files across `apps/web`, `apps/daemon`, and `packages/contracts`. Awesome Slide has a different framework layout, so 007 must translate responsibilities to existing `packages/core` files and the new `agent-runtime` boundary. This prevents vague "daemon-like" implementation while still avoiding an unnecessary daemon package.

**Source-reference mapping**:

| Open Design source reference | 007 Awesome Slide responsibility |
|------------------------------|----------------------------------|
| `apps/daemon/src/server.ts`, `apps/daemon/src/chat-routes.ts` | Keep Awesome Slide HTTP route files thin; delegate chat/connection execution to `packages/core/src/agent-runtime/`. |
| `apps/daemon/src/runs.ts` | Implement `packages/core/src/agent-runtime/runs.ts` as the owner of run ids, event history, replay, cancellation, and terminal cleanup. |
| `apps/daemon/src/runtimes/*`, `claude-stream.ts`, `json-event-stream.ts` | Implement explicit Codex CLI and Claude Code runtime definitions and parsers; report all other local agents as incompatible until defined. |
| `packages/contracts/src/api/chat.ts`, `packages/contracts/src/sse/chat.ts` | Define runtime contracts in `agent-runtime/contracts.ts` and expose only safe browser mirrors where needed. |
| `apps/daemon/src/prompts/system.ts`, `packages/contracts/src/prompts/system.ts` | Implement prompt assembly in `prompts.ts`, `workflows.ts`, and `context.ts`; provider paths receive explicit no-tools instructions. |
| `apps/web/src/providers/daemon.ts` | Keep `agent-chat-client.ts` responsible only for create/stream/cancel/retry/tool-result calls. |
| `apps/web/src/providers/anthropic.ts`, `api-proxy.ts` | Use server-side provider adapters instead of browser-direct streaming for the first Awesome Slide slice. |
| `apps/web/src/components/ProjectView.tsx`, `ChatPane`, `AssistantMessage`, `ToolCard` | Reuse existing Awesome Slide chat components as renderers of runtime state, not owners of execution. |
| `apps/daemon/src/project-routes.ts`, `project-watchers.ts`, `project-events.ts`, `FileViewer` | Use Awesome Slide management/file helpers and Vite watcher/HMR paths as the source-of-truth refresh mechanism after proposal apply. |

**Alternatives considered**:

- Copy Open Design's daemon/web/contracts split directly. Rejected because Awesome Slide already ships a Vite-powered framework runtime and should not add a second local process in this slice.
- Keep the mapping implicit in prose. Rejected because the failed 005/006 work shows that unclear ownership boundaries lead to route/UI/runtime responsibilities blending again.
