# Contract: Connection Execution

## Scope

Defines how active connections become executable runtime adapters. The connection UI can keep existing settings concepts, but run execution is owned by `agent-runtime`.

## Connection Snapshot

At run start the runtime resolves an immutable snapshot:

```ts
interface RuntimeConnectionSnapshot {
  connectionId: string;
  displayName: string;
  type: 'local-agent' | 'manual-agent' | 'api-provider' | 'fixture';
  provider: string;
  modelId?: string;
  reasoningEffort?: string;
  capabilities: ConnectionCapabilities;
  status: ConnectionStatus;
}
```

Rules:

- Snapshot is safe for run events and audit.
- Secret references remain server-only.
- If the selected connection is missing, invalid, or not executable, run creation fails before adapter start.

## Runtime Definition

Local agents use explicit definitions:

```ts
interface LocalAgentRuntimeDefinition {
  id: 'codex' | 'claude-code';
  displayName: string;
  commands: string[];
  buildInvocation(request: RuntimePromptRequest): {
    command: string;
    args: string[];
    stdin: string;
    cwd: string;
    env?: Record<string, string>;
  };
  parseEvent(chunk: RuntimeChunk): RuntimeEvent[];
  cancel(process: ChildProcess): void;
  capabilities: ConnectionCapabilities;
}
```

Rules:

- Initial supported local definitions are Codex CLI and Claude Code.
- Unknown local providers are `incompatible-protocol` until a definition exists.
- No generic JSON fallback is allowed in production execution.
- Diagnostics redact absolute home paths, env values, tokens, and secret-like output.

## Provider Adapter

BYOK providers use server-side adapters:

```ts
interface ProviderAdapter {
  provider: 'openai' | 'anthropic' | 'google' | 'openrouter' | 'deepseek';
  buildRequest(request: RuntimePromptRequest, secret: string): RequestInit;
  stream(response: Response): AsyncIterable<RuntimeEvent>;
  classifyError(responseOrError: unknown): RuntimeError;
}
```

Rules:

- Provider adapters stream or normalize provider output into runtime events.
- One-shot non-streaming calls are not used for chat generation.
- The runtime resolves credentials from safe references before adapter start.
- API keys are never serialized into run events, browser payloads, logs, or audits.

## Credential Resolution

Allowed first-slice storage:

- Environment variable references, represented as `env:NAME`.
- Existing safe credential adapter if already available and tested.

Rules:

- If no safe credential path is available, report `secure-storage-unavailable`.
- The browser receives only display hints such as `$OPENAI_API_KEY`.
- Credential tests send cheap prompts without slide source.

## Capability Rules

Capabilities are normalized before each run:

```ts
interface ConnectionCapabilities {
  streaming: boolean;
  cancellation: boolean;
  structuredProposals: boolean;
  toolCalls: boolean;
  localFileContext: boolean;
  writeCapable: boolean;
  maxContextBytes?: number;
  supportedModalities: Array<'text' | 'image' | 'audio' | 'video'>;
}
```

Rules:

- Provider paths default to no direct local tools.
- Local-agent paths may receive local file context only when the runtime definition supports it.
- A connection without `writeCapable` can answer but cannot create proposals that write files.

## Error Categories

Execution errors normalize to:

- `connection-unavailable`
- `authentication-failed`
- `quota-rate-limit`
- `unsupported-model`
- `provider-offline`
- `missing-executable`
- `invalid-path`
- `incompatible-protocol`
- `timeout`
- `parser-error`
- `model-empty-output`
- `cancelled`
- `unknown`

Rules:

- Error events include recovery actions.
- Raw stderr/provider bodies are redacted before returning to UI.
- Provider HTTP status mapping is covered by adapter tests.

## Deterministic Fixture Adapter

The fixture adapter is a runtime definition with `type: 'fixture'`.

Rules:

- It is registered only when `process.env.AWESOME_SLIDE_E2E === '1'`.
- It emits realistic queued/progress/text/proposal/completed or failed events.
- It uses normal proposal validation and apply paths.
- It is not included in production provider lists or settings unless the flag is active.
