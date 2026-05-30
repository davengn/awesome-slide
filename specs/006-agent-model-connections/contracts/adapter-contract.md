# Contract: Connection Adapter

## Scope

Defines the provider-neutral execution boundary that `specs/005-agent-chat-ui` calls after it has selected bundled skill workflows, collected context, and created a run.

## TypeScript Boundary

```ts
type ConnectionCapabilitySet = {
  streaming: boolean;
  cancellation: boolean;
  structuredProposals: boolean;
  toolCalls: boolean;
  localFileContext: boolean;
  writeCapable: boolean;
  maxContextBytes?: number;
  supportedModalities: Array<'text' | 'image' | 'audio' | 'video'>;
};

type StartAgentConnectionRun = (request: {
  runId: string;
  prompt: string;
  context: unknown;
  workflows: Array<{
    id: string;
    contentHash: string;
    instructions: string;
  }>;
  connectionId: string;
  modelId?: string;
  reasoningEffort?: string;
  capabilities: ConnectionCapabilitySet;
  signal: AbortSignal;
}) => AsyncIterable<AgentConnectionEvent>;
```

Rules:

- 005 owns `context` and `workflows`.
- 006 resolves connection settings, quick switcher model/reasoning preferences, credentials, provider/local transport, streaming, cancellation, and error normalization.
- Full credential values are never exposed to 005.
- Adapter output is untrusted until 005 parses, validates, and converts it into chat events/proposals.

## AgentConnectionEvent

Allowed event types:

- `progress`
- `token`
- `tool-call`
- `structured-output`
- `diagnostic`
- `completed`
- `cancelled`
- `failed`

Rules:

- Events must be ordered by the adapter wrapper before delivery.
- Diagnostics must be redacted before browser delivery.
- `structured-output` may contain proposal-like payloads, but 005 must still validate them.
- If the provider cannot stream, the adapter may emit one `progress` event followed by a final output event, and capability flags must reflect non-streaming behavior.

## Cancellation

Rules:

- If `signal` aborts, local processes and provider requests should be cancelled where supported.
- If the underlying provider does not support cancellation, the adapter must stop forwarding output and return a categorized cancellation/degraded event.
- Cancellation must not write files.

## Capability Requirements for 005

005 uses capabilities this way:

- `streaming`: show streamed tokens/progress or fall back to waiting status.
- `cancellation`: enable or degrade cancel controls.
- `structuredProposals`: expect structured edit proposals or request stricter output format.
- `toolCalls`: show tool/status cards when available.
- `localFileContext`: permit richer local context after 005 redaction.
- `writeCapable`: allow write-capable workflows after 005 preview/apply guardrails.

## Error Mapping

Adapter errors must normalize to 006 categories before crossing into 005. 005 may map them into chat categories such as `connection-unavailable`, `authentication-failed`, `model-failed`, or `timeout`.
