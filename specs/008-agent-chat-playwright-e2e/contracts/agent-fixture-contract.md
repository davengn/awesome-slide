# Contract: Deterministic Agent Fixture

## Scope

Defines the test-only agent connection used by Playwright E2E tests. The fixture simulates connection states and chat output while exercising the same browser UI, Vite middleware, adapter event, proposal apply, and slide rendering paths as normal app usage.

## Activation

The fixture must be active only when the E2E environment flag is set.

Required guard:

```text
AWESOME_SLIDE_E2E=1
```

Rules:

- Normal `pnpm dev`, package builds, and published runtime behavior must not expose the fixture.
- Fixture setup must not require real local agent executables.
- Fixture setup must not require provider API keys.

## Connection States

The fixture must support these states:

| State | Purpose |
|-------|---------|
| `needs-setup` | Verify first-run setup and blocked write-capable runs. |
| `ready` | Verify successful prompt generation. |
| `degraded` | Verify recoverable warnings while allowing supported runs. |
| `failed` | Verify categorized recovery and redacted diagnostics. |

## Event Behavior

For successful prompt cases, the fixture must emit realistic ordered events:

1. `queued`
2. `progress`
3. Optional `token`
4. `proposal`
5. `completed`

Rules:

- Event ordering must be deterministic.
- Event timing may be short, but must still exercise async UI state transitions.
- Failed cases must emit a categorized failure event with redacted diagnostics.
- Cancellation cases may be added later, but are not required for the initial matrix.

## Proposal Behavior

The fixture must return structured proposals that can pass the same validation and apply path as normal agent output.

Required operation coverage:

- `create-slide` for new prompt-created slide generation.
- `patch-slide-source` for improving or iterating on an existing slide.
- Optional `apply-theme` for future theme-focused E2E expansion.

Rules:

- Generated slides must include deterministic visible text from the prompt case.
- Proposal IDs and operation IDs may be generated, but tests must not depend on timestamp values.
- Applied proposals must write to the isolated fixture project only.

## Redaction Behavior

The fixture must include at least one failure case with secret-like diagnostics so tests can assert redaction.

Example raw diagnostic content before redaction:

```text
key=supersecret123 path=/Users/example/.config/provider
```

Expected UI/artifact behavior:

- Secret-like values are masked.
- Hidden path contents are not displayed.
- Recovery action remains visible and actionable.
