# Quickstart: Agent Chat Architecture Refactor

## 1. Confirm Planning Context

Review:

```bash
sed -n '1,220p' specs/007-agent-chat-architecture-refactor/spec.md
sed -n '1,220p' specs/007-agent-chat-architecture-refactor/plan.md
sed -n '1,180p' specs/007-agent-chat-architecture-refactor/research.md
sed -n '1,220p' references/agent-architecture/open-design-chat-architecture-analysis.md
sed -n '1,220p' references/agent-architecture/open-design-chat-architecture-portable.md
```

Before coding, check the "Open Design Source Reference Alignment" table in
`plan.md`. Each reused Open Design responsibility must map to a concrete
Awesome Slide module, and implementation tasks should preserve that ownership.

## 2. Implement Runtime Layer First

Start with the smallest vertical runtime:

1. Add `packages/core/src/agent-runtime/contracts.ts`.
2. Add `events.ts` with event normalization, sequence ids, terminal detection, and redaction.
3. Add `runs.ts` with create, emit, replay, subscribe, cancel, finish, and active-run discovery.
4. Wire existing `/__agent-chat/runs` and `/events` routes to the run service.
5. Add Vitest coverage before moving provider/local execution.

Focused checks:

```bash
pnpm core test -- agent-runtime
pnpm core typecheck
```

## 3. Add Prompt And Workflow Assembly

Implement:

- `workflows.ts` to load `packages/core/skills/*/SKILL.md`.
- `context.ts` to capture bounded slide/deck/theme context.
- `prompts.ts` to compose local-agent and provider prompt packages.

Checks:

```bash
pnpm core test -- workflows prompts context
```

## 4. Add Real Execution Adapters

Implement:

- `local-agents.ts` for Codex CLI and Claude Code definitions.
- `provider-adapters.ts` for server-side BYOK streaming/normalization.
- Connection snapshot resolution that never returns raw secrets to browser code.

Checks:

```bash
pnpm core test -- local-agents provider-adapters agent-connections
```

## 5. Add Proposal Parsing And Apply Path

Implement:

- `proposal-output.ts` for structured output envelope parsing.
- Runtime proposal creation with fingerprints and preview artifacts.
- Apply route revalidation and transaction semantics using existing edit/file helpers.
- Apply responses with written files, source version hints, and refresh targets.
- Vite watcher/HMR refresh integration through existing source-of-truth file metadata.

Checks:

```bash
pnpm core test -- proposal agent-chat-api edit-ops agent-proposals
```

## 6. Replace Broken 005/006 Paths

Remove or guard:

- Production `simulate-*` prompt handling.
- Non-streaming provider calls embedded in `agent-chat-api.ts`.
- Generic unknown local-agent fallback execution.
- Browser-only active run recovery that conflicts with runtime reattach.

Verify fixture behavior is only available with:

```bash
AWESOME_SLIDE_E2E=1 pnpm test -- agent
```

## 7. Validate Browser Flow

Run the demo app:

```bash
pnpm dev
```

Manual checks:

- Open the slide page.
- Open connection quick switcher.
- Select a deterministic or ready connection.
- Send a prompt.
- Confirm queued/progress/text/proposal/terminal event rendering.
- Reload during a run and verify reattach.
- Apply a proposal and verify the slide preview refreshes.

## 8. Run Final Gates

```bash
pnpm check
pnpm typecheck
pnpm test
pnpm build
pnpm run test:e2e
```

If implementation touches `packages/core`, add a patch changeset:

```bash
pnpm changeset
```
