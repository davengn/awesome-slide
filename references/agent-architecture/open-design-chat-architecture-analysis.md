# Open Design Chat Architecture Analysis

This document captures the source-level architecture of Open Design's chat,
agent, model-provider, prompt, streaming, file-update, and preview flows. It is
intended as groundwork for later Awesome Slide work, without prescribing an
Awesome Slide refactor.

## Architecture Summary

Open Design is split into three main layers
(every reference codes path start with: `/Users/ducduy/Projects/open-design`):

- `apps/web`: React UI for projects, chat, settings, file workspace, previews,
  and local browser config.
- `apps/daemon`: local HTTP daemon for persistence, project files, local agent
  process management, provider proxying, prompt composition, SSE, filesystem
  watching, and static resources.
- `packages/contracts`: shared TypeScript contracts for API DTOs, SSE event
  shapes, prompt helpers, analytics types, project metadata, and protocol
  types.

The normal local-agent path is:

1. Web creates a run via `POST /api/runs`.
2. Daemon creates an in-memory run and a persisted assistant placeholder.
3. Daemon builds the prompt, resolves the agent runtime, and spawns the CLI.
4. Daemon parses stdout/stderr into normalized SSE events.
5. Web consumes run SSE, updates the visible assistant message, persists
   message snapshots, and refreshes project files/previews as needed.

The direct-provider path bypasses local CLI spawning:

1. Web builds the prompt with the shared contracts composer.
2. Web calls `streamMessage`.
3. Anthropic default streams directly in-browser; other protocols use daemon
   proxy endpoints.
4. Provider deltas are normalized into the same web-side assistant update path.

## Source File Map

Core web files:

- `apps/web/src/App.tsx`: global app bootstrap, daemon liveness, config merge,
  agent/skill/design-system/project loading.
- `apps/web/src/state/config.ts`: localStorage config, daemon config sync,
  media provider sync, API protocol defaults.
- `apps/web/src/state/projects.ts`: project, conversation, message, file, and
  tab HTTP helpers.
- `apps/web/src/components/ProjectView.tsx`: main project orchestrator for chat
  sends, retries, cancellation, reattach, project file refresh, live artifacts,
  and file workspace wiring.
- `apps/web/src/components/ChatPane.tsx`: conversation UI, message list,
  pinned TodoWrite slot, queued sends, composer, retry/error affordances.
- `apps/web/src/components/AssistantMessage.tsx`: assistant event rendering,
  prose/thinking/tool grouping, produced files, feedback, interactive tool
  answer routing.
- `apps/web/src/components/ToolCard.tsx`: tool-use cards for TodoWrite, Write,
  Edit, Read, Bash, search/fetch, generic tools, and AskUserQuestion.
- `apps/web/src/components/FileViewer.tsx`: source fetch, URL/srcDoc preview
  selection, cache busting, bridges, deck controls, inspect/edit/draw behavior.
- `apps/web/src/providers/daemon.ts`: daemon run creation, SSE consumption,
  reattach, cancel relay, tool-result submission.
- `apps/web/src/providers/anthropic.ts` and `apps/web/src/providers/api-proxy.ts`:
  direct-provider streaming and daemon proxy consumption.
- `apps/web/src/providers/project-events.ts`: project SSE connection manager
  for file changes, live artifact changes, and conversation-created events.

Core daemon files:

- `apps/daemon/src/server.ts`: canonical route registration, `startChatRun`,
  prompt construction, process spawning, stream handling, close/error handling,
  and persisted message reconciliation.
- `apps/daemon/src/runs.ts`: in-memory run service, SSE fanout, replay,
  cancellation, terminal cleanup.
- `apps/daemon/src/chat-routes.ts`: modular chat/provider/proxy routes.
- `apps/daemon/src/project-routes.ts`: project CRUD, project file routes,
  raw file serving, project events SSE.
- `apps/daemon/src/project-watchers.ts`: refcounted `chokidar` watchers that
  publish `file-changed` events.
- `apps/daemon/src/prompts/system.ts`: daemon prompt composer with design
  systems, skills, craft, plugins, memory, media, deck, and safety layers.
- `apps/daemon/src/runtimes/*`: runtime registry, detection, launch, env, and
  per-agent definitions.
- `apps/daemon/src/claude-stream.ts`, `json-event-stream.ts`,
  `qoder-stream.ts`, `copilot-stream.ts`: CLI stream parsers.

Shared contracts:

- `packages/contracts/src/api/chat.ts`: chat/run/message DTOs.
- `packages/contracts/src/sse/chat.ts`: daemon chat SSE protocol and event
  payload union.
- `packages/contracts/src/prompts/system.ts`: web/API-mode prompt composer.

## Agent CLI Connection Flow

Agent metadata is declared through `RuntimeAgentDef` in
`apps/daemon/src/runtimes/types.ts`. Important fields include:

- `id`, `name`, `bin`, `fallbackBins`
- `fallbackModels`, `listModels`, `fetchModels`
- `buildArgs(prompt, imagePaths, extraAllowedDirs, options, runtimeContext)`
- `streamFormat`, `eventParser`
- `promptViaStdin`, `promptInputFormat`
- `externalMcpInjection`
- model/reasoning/custom-model capability fields

`apps/daemon/src/runtimes/registry.ts` builds `AGENT_DEFS` from built-in
definitions plus local profile definitions. Representative runtime definitions:

- Claude: `apps/daemon/src/runtimes/defs/claude.ts`
  - Runs `claude -p --input-format stream-json --output-format stream-json`.
  - Uses `promptInputFormat: 'stream-json'`.
  - Keeps stdin open so Open Design can later write `tool_result` JSONL lines.
  - Supports `.mcp.json` injection via `externalMcpInjection:
'claude-mcp-json'`.
- Codex: `apps/daemon/src/runtimes/defs/codex.ts`
  - Runs `codex exec --json`.
  - Uses stdin prompt delivery.
  - Sets sandbox and reasoning config through CLI args.
  - Uses `json-event-stream` with `eventParser: 'codex'`.

Detection flow:

1. Web bootstrap fetches `/api/agents`.
2. Daemon calls `detectAgents(config.agentCliEnv ?? {})`.
3. `detectAgents` probes every runtime definition with `safeProbe`.
4. `probe` resolves the launch path, prepares env, probes version/help flags,
   fetches models, probes auth when supported, and returns `DetectedAgent`.
5. Results are cached for model validation and shown in the UI.

Run spawn flow:

1. `ProjectView.handleSend` calls `streamViaDaemon`.
2. `streamViaDaemon` posts `ChatRequest` to `/api/runs`.
3. Daemon creates a run and starts `startChatRun`.
4. `startChatRun` resolves cwd, attachments, skills, design systems, model,
   reasoning, MCP injection, runtime tool prompts, and prompt text.
5. Daemon calls `def.buildArgs(...)`.
6. Daemon builds env with `OD_BIN`, `OD_NODE_BIN`, `OD_DAEMON_URL`,
   `OD_PROJECT_ID`, and `OD_PROJECT_DIR`.
7. Daemon spawns the CLI with `child_process.spawn` in the effective project
   cwd, with stdin piped when the adapter requires it.

## Model API Connection Flow

Execution mode is modeled as `ExecMode = 'daemon' | 'api'` and protocols as
`ApiProtocol = 'anthropic' | 'openai' | 'azure' | 'google' | 'ollama' |
'senseaudio'` in `apps/web/src/types.ts`.

API/BYOK mode flow:

1. `ProjectView.handleSend` enters the `config.mode !== 'daemon'` branch.
2. It extracts memory via `/api/memory/extract` before the turn when possible.
3. It calls `composedSystemPrompt()`, which uses the contracts prompt composer
   with `streamFormat: 'plain'`.
4. It builds API history with attachment/comment context.
5. It calls `streamMessage(config, systemPrompt, apiHistory, ...)`.

Provider dispatch in `apps/web/src/providers/anthropic.ts`:

- `anthropic` with default Anthropic base URL uses the browser Anthropic SDK.
- Anthropic-compatible custom base URLs use daemon proxy.
- `openai`, `azure`, `google`, `ollama`, and `senseaudio` use daemon proxy
  wrappers.

Proxy flow in `apps/web/src/providers/api-proxy.ts`:

- Sends `baseUrl`, `apiKey`, `model`, `systemPrompt`, `messages`, `maxTokens`,
  optional `apiVersion`, and optional project context.
- Parses daemon proxy SSE frames:
  - `delta`: append text
  - `error`: call error handler
  - `end`: complete turn

Daemon proxy routes in `apps/daemon/src/chat-routes.ts`:

- `/api/provider/models`: model discovery for supported provider protocols.
- `/api/test/connection`: provider and agent connection tests.
- `/api/proxy/anthropic/stream`
- `/api/proxy/openai/stream`
- `/api/proxy/azure/stream`
- `/api/proxy/google/stream`
- `/api/proxy/ollama/stream`
- `/api/proxy/senseaudio/stream`

The daemon validates external base URLs before proxying to reduce SSRF risk,
redacts auth tokens from logs, and normalizes upstream stream protocols into
Open Design's `delta`/`error`/`end` proxy SSE shape.

Important credential distinction:

- General chat BYOK keys are local/per-request web config and are not part of
  daemon app-config persistence.
- Daemon-managed media provider credentials use the media config path and are a
  separate subsystem.
- SenseAudio BYOK can seed media config for tool execution in specific cases.

## Prompt-Building Flow

Daemon-mode prompt composition happens in `startChatRun` through
`composeDaemonSystemPrompt`.

`composeDaemonSystemPrompt` gathers:

- project record and project metadata
- persistent project skill and per-turn ad-hoc skills
- plugin-local skill override when a plugin snapshot is active
- memory body from the daemon memory store
- user-level custom instructions from app config
- project-level custom instructions
- active design system `DESIGN.md`
- design-system usage docs, tokens CSS, component manifest, fixture HTML,
  pull-layer index, and import mode
- craft rules requested by skills or design systems
- selected template metadata
- audio voice options for supported audio projects
- critique eligibility and critique prompt inputs
- plugin prompt block and active pipeline stage atom blocks
- connected external MCP metadata
- media execution policy

It then calls `apps/daemon/src/prompts/system.ts::composeSystemPrompt`, which
stacks the prompt roughly as:

1. API/plain override when relevant.
2. skip-discovery override when relevant.
3. UI locale guidance.
4. discovery/workflow/huashu philosophy prompt.
5. official designer/base prompt.
6. personal memory.
7. user-level instructions.
8. project-level instructions.
9. active design system and token/component assets.
10. craft references.
11. active skill(s).
12. active plugin and stage atom blocks.
13. project metadata/template/media guidance.
14. deck framework directive when deck-like.
15. media generation contract when media-like.
16. critique addendum when eligible.
17. external MCP already-authenticated guidance.
18. Claude-only AskUserQuestion guidance.
19. role-marker safety guard.

`startChatRun` then builds the final child prompt:

- `composeChatUserRequestForAgent(message, currentPrompt, ...)` creates the
  user-request block and handles submitted form-answer transitions.
- `composeLiveInstructionPrompt` joins daemon prompt, runtime tool prompt, and
  client-provided system prompt.
- The final text is:
  - `# Instructions (read first)`
  - form-answer override if needed
  - instruction prompt
  - cwd and linked directory hints
  - echo guard
  - `# User request`
  - latest request/transcript
  - attachment/comment hints
  - image path mentions

API mode uses `packages/contracts/src/prompts/system.ts::composeSystemPrompt`
from the web side. It includes a top-anchored plain-stream override that tells
the model no tools are wired through and forbids fake tool-call markup.

## Chat Request Lifecycle

Web send lifecycle in `ProjectView.handleSend`:

1. Create or reuse the user message.
2. Determine selected local agent or API provider label.
3. Snapshot pre-turn project file names.
4. Create a placeholder assistant message.
5. Persist the user message.
6. Initialize artifact parser and buffered text updates.
7. Create abort and cancel controllers.
8. Branch:
   - daemon mode: call `streamViaDaemon`
   - API mode: call `streamMessage`

Daemon mode:

1. `streamViaDaemon` builds a `ChatRequest` with agent, message transcript,
   current prompt, project/conversation/message ids, skills, design system,
   attachments, research, media policy, model/reasoning, locale, and analytics
   hints.
2. It posts to `/api/runs`.
3. Daemon creates an in-memory run through `createChatRunService`.
4. Daemon pins a persisted assistant message placeholder.
5. Daemon starts `startChatRun`.
6. Web stores the returned `runId` on the assistant message.
7. Web consumes `/api/runs/:id/events`.

Run service responsibilities in `apps/daemon/src/runs.ts`:

- `create`: allocate run object and initial status.
- `emit`: append run event, write optional event log, fan out to connected SSE
  clients.
- `stream`: replay missed events by `Last-Event-ID` or `?after=`, then attach
  the current SSE client.
- `cancel`: request cancellation and abort/terminate child.
- `finish`: emit terminal end event, close clients, resolve waiters, cleanup.

## Response Streaming Flow

Daemon emits chat SSE events defined in `packages/contracts/src/sse/chat.ts`:

- `start`
- `agent`
- `stdout`
- `stderr`
- `error`
- `end`

Structured runtime outputs are translated into normalized daemon agent payloads:

- status
- text_delta
- thinking_delta
- thinking_start
- live_artifact
- live_artifact_refresh
- tool_use
- tool_result
- usage
- fabricated_role_marker
- raw

Web consumption in `apps/web/src/providers/daemon.ts`:

1. `consumeDaemonRun` opens `/api/runs/:id/events`.
2. It reconnects up to a bounded count and uses event ids to resume.
3. `stdout` chunks are treated as plain text deltas.
4. `agent` payloads are translated into web `AgentEvent`.
5. `start` updates run status to running.
6. `error` calls the UI error handler.
7. `end` records terminal status, exit code, and signal.
8. If the stream disconnects without terminal status, it falls back to
   `GET /api/runs/:id`.

`ProjectView` handlers apply events:

- `onDelta`: append assistant content through buffered updates.
- `onAgentEvent`: append structured events or text events.
- `onDone`: mark succeeded, refresh files, persist artifacts, compute produced
  files, persist final assistant message.
- `onError`: mark failed, append error event, refresh files.

`AssistantMessage` renders the resulting event list into:

- prose blocks
- thinking blocks
- tool groups
- status pills
- file-operation summaries
- produced file chips
- usage/footer state
- feedback controls

## File Edit And Preview Update Flow

File edits can enter the system through multiple paths:

- Local agent CLI tools write directly in the project cwd.
- Open Design runtime/tool endpoints can write project files.
- Web UI file uploads or inspect/edit saves call project file routes.

Project file routes in `apps/daemon/src/project-routes.ts` include:

- `GET /api/projects/:id/files`: list files with metadata/mtime.
- `GET /api/projects/:id/raw/:path`: serve raw file content for previews.
- `POST /api/projects/:id/files`: upload or write JSON content.
- `POST /api/projects/:id/files/rename`: rename.
- `DELETE /api/projects/:id/files/:name` and raw delete routes.

Preview live reload does not depend on parsing assistant text:

1. `project-watchers.ts` creates a refcounted watcher for the project root.
2. Chokidar emits `add`, `change`, and `unlink` events.
3. `project-routes.ts` streams these through `/api/projects/:id/events` as
   `file-changed` SSE events.
4. `project-events.ts` receives events and calls back into `ProjectView`.
5. `ProjectView` coalesces bursty write events, increments `filesRefresh`, and
   refreshes the file list.
6. `FileWorkspace` receives updated files and `filesRefreshKey`.
7. `FileViewer` fetches source with `cacheBustKey` and builds preview URLs with
   `?v=<mtime>&r=<reloadKey>`.

`ProjectView` also watches tool events for `Write` and `Edit`. It maps tool-use
ids to file paths, then on successful tool result refreshes project files and
auto-opens the destination when the file exists inside the project file list.

`FileViewer` chooses between URL-load and srcDoc preview:

- URL-load uses `/api/projects/:id/raw/:file?v=<mtime>`.
- srcDoc is used when host bridges are needed, sandbox shims are required, or
  modes such as comment/draw/edit/inspect need injection.
- Both paths use refresh keys and source cache busting so previews update after
  file writes.

## Chat UI Component Structure

Top-level flow:

- `App` loads global daemon and config state.
- `ProjectView` owns the active project workspace.
- `ProjectView` renders:
  - `ChatPane` for conversation and send controls.
  - `FileWorkspace` for file/live-artifact tabs and preview.

`ChatPane` responsibilities:

- message list and day separators
- user message rendering
- assistant message rendering
- conversation list/menu
- retry and auth/error affordances
- pinned TodoWrite card above the composer
- queued send strip
- `ChatComposer`

`AssistantMessage` responsibilities:

- converts events to display blocks via `buildBlocks`
- suppresses duplicate AskUserQuestion markdown fallback text
- strips TodoWrite tool groups from per-message rendering because the pinned
  todo slot is canonical
- deduplicates repeated AskUserQuestion/TodoWrite tool snapshots
- renders `ToolGroupCard` and `ToolCard`
- routes live AskUserQuestion answers through `submitChatRunToolResult`

`ToolCard` responsibilities:

- first checks custom renderer extension points
- renders built-in cards for AskUserQuestion, TodoWrite, Write, Edit, Read,
  Bash, Glob, Grep, WebFetch, WebSearch
- falls back to a generic command/output card

## State Management Map

State is mostly React state plus daemon-backed persistence.

Global web state in `App`:

- app config
- daemon liveness
- detected agents
- skills and design templates
- design systems
- projects
- provider model cache
- daemon media providers
- telemetry/onboarding/privacy-backed config

Browser config:

- `state/config.ts` stores `open-design:config` in localStorage.
- `saveConfig` strips daemon-owned keys and secret agent CLI env keys before
  localStorage persistence.
- `syncConfigToDaemon` writes daemon-owned preferences to `/api/app-config`.
- `mergeDaemonConfig` overlays daemon preferences back into local config.

Project state:

- `state/projects.ts` wraps daemon HTTP APIs for projects, conversations,
  messages, files, tabs, plugins, and templates.
- Daemon persists projects/conversations/messages in SQLite.
- Daemon runtime files live under the daemon data root.

Project view state:

- active conversation id
- messages and message-conversation ownership refs
- streaming conversation marker
- abort/cancel controllers
- reattach controllers and text buffers
- queued sends
- project files and file refresh key
- live artifacts
- open tabs
- preview comments and attached comments
- artifact parser output
- design-system review metadata

Run state:

- `runs.ts` owns active in-memory run objects.
- Persisted messages store run ids, run statuses, event snapshots, produced
  files, pre-turn file names, and feedback.
- Reattach logic recovers active runs with `/api/runs` and `/api/runs/:id/events`.

## Error, Cancellation, And Retry Handling

Cancellation:

- Web `handleStop` aborts text buffers, aborts local readers, aborts cancel
  controllers, clears streaming markers, and marks stoppable assistant messages
  as `canceled`.
- `consumeDaemonRun` maps cancel signal abort to `POST /api/runs/:id/cancel`.
- Daemon `runs.cancel` calls ACP/Pi abort when available, otherwise sends
  `SIGTERM`, and finishes canceled if no child exists.

Daemon error handling:

- Missing binaries emit `AGENT_UNAVAILABLE`.
- Spawn failures emit `AGENT_EXECUTION_FAILED`.
- Auth/service failures are classified from stdout/stderr/log tails and can
  emit `AGENT_AUTH_REQUIRED`, `RATE_LIMITED`, or service-specific failures.
- Structured stream parser errors can fail the run.
- Empty-output guards catch successful exits with no visible output.
- Role-marker guards truncate unsafe fabricated conversation markers.
- Close handling classifies terminal run status from cancel state, exit code,
  signal, ACP clean completion, and artifact quiet-shutdown state.

Web error handling:

- SSE `error` events call `handlers.onError`.
- `ProjectView` appends an assistant status/error event, marks run failed,
  persists the message, clears active refs, and refreshes files.
- `ChatPane` exposes retry/auth actions for the latest failed assistant.

Retry:

- `ChatPane` finds the latest failed assistant with `retryableAssistantMessage`.
- `ProjectView.handleRetry` calls `handleSend` with `retryOfAssistantId`.
- Retry reuses the failed assistant id and prior user message context instead
  of creating an unrelated assistant row.

Reattach:

- On mount/conversation load, `ProjectView` finds active persisted run ids or
  active daemon runs.
- It fetches run status, replays missing SSE by event id, and reconstructs
  assistant content/events.
- On completion it refreshes files, recovers/persists artifacts, computes
  produced files, and finalizes the assistant message.

AskUserQuestion:

- Claude runs keep stdin open with `promptInputFormat: 'stream-json'`.
- The daemon tracks pending AskUserQuestion tool ids.
- The web card posts answers to `/api/runs/:id/tool-result`.
- Daemon writes an Anthropic JSONL `tool_result` user message to the still-open
  child stdin.
- If that live path fails, the UI falls back to submitting the answer as a
  normal user message.

## Concepts Useful For Awesome Slide Later

The following source patterns are likely reusable for future Awesome Slide work:

- Use explicit contracts before wiring UI and daemon behavior.
- Treat generation as a run with stable id, status, replayable events,
  cancellation, and reattach.
- Normalize backend/provider/agent streams into a small UI event union.
- Keep prompt composition independent from runtime transport.
- Make API mode explicitly tool-free unless real tool execution is wired.
- Let file changes be filesystem-driven rather than assistant-text-driven.
- Keep preview reload keyed on file metadata and refresh counters.
- Persist pre-turn file snapshots so produced files can be computed after
  completion or reattach.
- Separate visible tool cards from actual tool execution.
- Use host-mediated tool-result submission for interactive mid-turn choices.
- Keep srcDoc/URL-load preview selection explicit and source-driven.
- Keep error classification structured enough for UI retry/auth actions.
