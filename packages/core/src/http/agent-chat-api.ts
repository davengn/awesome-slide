import fs from 'node:fs/promises';
import type { ViteDevServer } from 'vite';
import type { RuntimeEventInput } from '../agent-runtime/events.ts';
import { deriveRefreshPayload } from '../agent-runtime/file-refresh.ts';
import {
  createLocalAgentInvocation,
  isClaudeCodeCli,
  isCodexCli,
  runLocalAgentCli,
} from '../agent-runtime/local-agents.ts';
import { containsProposalEnvelope, parseProposalOutput } from '../agent-runtime/proposal-output.ts';
import { runProviderAdapter } from '../agent-runtime/provider-adapters.ts';
import { createAgentChatError, redactDiagnostics } from '../app/lib/agent-chat-errors.ts';
import type {
  AgentChatContext,
  AgentChatError,
  AgentChatEvent,
  AgentChatRun,
  AgentChatSession,
  AgentConnectionRef,
  AgentEditProposal,
  AgentOperation,
  RuntimeMode,
} from '../app/lib/agent-chat-types.ts';
import type { AgentConnectionConfig, ApiProviderId } from '../app/lib/agent-connection-types.ts';
import { normalizeCapabilities, resolveActiveConnection } from '../app/lib/agent-connections.ts';
import {
  applyAgentProposalTransaction,
  captureFingerprints,
  validateProposal,
} from '../editing/agent-proposals.ts';
import { appendAuditEntry, readAuditEntries } from '../files/agent-audit.ts';
import type { ApiContext } from '../vite/routes/context.ts';
import { json, readBody, resolveSlideEntryPath } from '../vite/routes/context.ts';
import { notifyAgentRefreshTargets } from '../vite/routes/watchers.ts';
import {
  abortRun,
  addRunEvent,
  findProposal,
  getRun,
  LOCAL_AGENT_RUN_WATCHDOG_TIMEOUT_MS,
  listRunSummaries,
  registerRun,
  subscribeRunEvents,
} from './agent-chat-runs.ts';
import type {
  AgentConnectionRunner,
  RawAgentConnectionEvent,
  StartAgentConnectionRunRequest,
} from './agent-connection-adapters.ts';
import { runAgentConnectionAdapter } from './agent-connection-adapters.ts';
import { readAgentConnectionSettingsForProject } from './agent-connections-api.ts';
import {
  createUserHomeCredentialStorageAdapter,
  resolveCredentialSecret,
} from './agent-secrets.ts';
import { validateRuntimeMutationRequest } from './request-guard.ts';

const SESSION_PROJECT_KEY = 'project_default';

const AGENT_CHAT_EVENT_TYPES = new Set<AgentChatEvent['type']>([
  'queued',
  'token',
  'progress',
  'proposal',
  'diagnostic',
  'completed',
  'cancelled',
  'failed',
]);

const AGENT_CHAT_ERROR_CATEGORIES = new Set<AgentChatError['category']>([
  'connection-unavailable',
  'authentication-failed',
  'model-failed',
  'timeout',
  'invalid-agent-output',
  'patch-conflict',
  'validation-failure',
  'write-failure',
  'cancelled',
]);

function toAgentChatErrorCategory(value: string): AgentChatError['category'] {
  const category = value as AgentChatError['category'];
  return AGENT_CHAT_ERROR_CATEGORIES.has(category) ? category : 'model-failed';
}

function isAgentChatEventType(value: string): value is AgentChatEvent['type'] {
  return AGENT_CHAT_EVENT_TYPES.has(value as AgentChatEvent['type']);
}

async function getFileContentOrEmpty(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch {
    return '';
  }
}

async function collectCurrentContents(
  ctx: ApiContext,
  operations: AgentOperation[],
): Promise<Record<string, string>> {
  const contents: Record<string, string> = {};
  for (const op of operations) {
    if (op.kind === 'patch-slide-source' || op.kind === 'raw-patch') {
      const filePath = resolveSlideEntryPath(ctx, op.target);
      if (filePath) {
        contents[op.target] = await getFileContentOrEmpty(filePath);
      }
    }
  }
  return contents;
}

const defaultConnection: AgentConnectionRef = {
  connectionId: 'none',
  displayName: 'No Connection',
  type: 'local-agent',
  modelOrAgent: 'None',
  status: 'needs-setup',
};

export { createLocalAgentInvocation, isClaudeCodeCli, isCodexCli };

function nextRouteId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function toConnectionAdapterEvent(event: RuntimeEventInput): RawAgentConnectionEvent {
  if (event.type === 'text_delta') {
    const payload = event.payload as { text?: string } | string | undefined;
    return {
      type: 'token',
      payload: typeof payload === 'string' ? payload : (payload?.text ?? ''),
    };
  }
  if (event.type === 'tool_call') {
    return { type: 'tool-call', payload: event.payload };
  }
  if (event.type === 'error') {
    return { type: 'failed', payload: event.payload };
  }
  if (event.type === 'started') {
    return { type: 'progress', payload: 'Agent run started.' };
  }
  if (event.type === 'file_summary' || event.type === 'thinking_delta') {
    return { type: 'diagnostic', payload: event.payload };
  }
  if (
    event.type === 'completed' ||
    event.type === 'cancelled' ||
    event.type === 'failed' ||
    event.type === 'progress' ||
    event.type === 'diagnostic'
  ) {
    return { type: event.type, payload: event.payload };
  }
  if (event.type === 'queued') {
    return { type: 'progress', payload: 'Run queued.' };
  }
  return { type: 'diagnostic', payload: event.payload };
}

async function resolveConnectionApiKey(connectionConfig: AgentConnectionConfig): Promise<string> {
  const adapter = createUserHomeCredentialStorageAdapter();
  let apiKey: string | null = null;
  if (connectionConfig.credentialRef) {
    const storage =
      connectionConfig.credentialStorage ??
      (connectionConfig.credentialRef.startsWith('env:')
        ? 'environment-variable'
        : 'os-credential-store');
    apiKey = await resolveCredentialSecret(
      {
        ref: connectionConfig.credentialRef,
        provider: connectionConfig.provider as ApiProviderId,
        storage,
        displayHint: '',
        createdAt: '',
      },
      adapter,
    );
  }

  if (!apiKey) {
    throw new Error('API key is missing or secure storage is unavailable.');
  }

  return apiKey;
}

async function* runConfiguredConnectionEvents(
  ctx: ApiContext,
  activeConnection: AgentConnectionRef,
  connectionConfig: AgentConnectionConfig | undefined,
  req: StartAgentConnectionRunRequest,
): AsyncIterable<RawAgentConnectionEvent> {
  if (!connectionConfig) {
    if (req.prompt === 'slow prompt' || req.prompt.startsWith('slow-')) {
      yield { type: 'progress', payload: 'Slow operation started...' };
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, 5000);
        req.signal.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new Error('aborted'));
        });
      });
      return;
    }
    yield { type: 'progress', payload: 'Analyzing slide layout...' };
    await new Promise((resolve) => setTimeout(resolve, 50));
    yield { type: 'token', payload: 'Here are the suggested edits for your slide:' };
    await new Promise((resolve) => setTimeout(resolve, 50));
    yield { type: 'completed', payload: null };
    return;
  }

  if (activeConnection.type === 'api-provider') {
    const apiKey = await resolveConnectionApiKey(connectionConfig);
    for await (const event of runProviderAdapter({
      runId: req.runId,
      provider: connectionConfig.provider as ApiProviderId,
      apiKey,
      prompt: req.prompt,
      systemInstructions: req.workflows.map((workflow) => workflow.instructions).join('\n\n'),
      modelId: connectionConfig.modelId,
      signal: req.signal,
    })) {
      yield toConnectionAdapterEvent(event);
    }
    return;
  }

  const commandOrPath =
    connectionConfig.type === 'manual-agent-path'
      ? connectionConfig.manualPathRef
      : connectionConfig.agentCommandAlias;

  if (!commandOrPath) {
    throw new Error('Local CLI command or path is not configured.');
  }

  for await (const event of runLocalAgentCli(commandOrPath, connectionConfig, req, ctx.userCwd)) {
    yield toConnectionAdapterEvent(event);
  }
}

function simulatedProposalEnvelope(type: string): unknown {
  if (type === 'invalid') {
    return {
      kind: 'awesome-slide-proposal',
      summary: 'Simulated invalid proposal edits',
      scope: 'slide',
      operations: [
        {
          id: 'op_invalid',
          kind: 'patch-slide-source',
          target: 'intro',
          description: 'Invalid TSX code',
          payload: { code: 'function Slide() { return <div;\\n}' },
        },
      ],
    };
  }
  if (type === 'conflict') {
    return {
      kind: 'awesome-slide-proposal',
      summary: 'Simulated conflicting proposal edits',
      scope: 'slide',
      operations: [
        {
          id: 'op_conflict',
          kind: 'patch-slide-source',
          target: 'intro',
          description: 'Conflicting edit',
          payload: {
            code: 'function Slide() { return <div>Hello</div>; }',
            originalCode: 'CONFLICT',
          },
        },
      ],
    };
  }
  if (type === 'medium') {
    return {
      kind: 'awesome-slide-proposal',
      summary: 'Simulated slide creation',
      scope: 'deck',
      operations: [
        {
          id: 'op_medium',
          kind: 'create-slide',
          target: 'deck_1',
          description: 'Create a new slide',
          payload: { title: 'New Slide', slideId: 'new-slide' },
        },
      ],
    };
  }
  if (type === 'high') {
    return {
      kind: 'awesome-slide-proposal',
      summary: 'Simulated high-risk theme change',
      scope: 'deck',
      riskLevel: 'high',
      operations: [
        {
          id: 'op_high',
          kind: 'apply-theme',
          target: 'intro',
          description: 'Apply high risk theme',
          payload: { themeId: 'unsupported-theme', scope: 'deck' },
          requiresConfirmation: true,
        },
      ],
    };
  }
  return {
    kind: 'awesome-slide-proposal',
    summary: 'Simulated proposal edits',
    scope: 'slide',
    operations: [
      {
        id: 'op_low',
        kind: 'patch-slide-source',
        target: 'intro',
        description: 'Update slide title',
        payload: {
          code: 'function Slide() {\n  return <div>Welcome to Awesome Slide!</div>;\n}',
        },
      },
    ],
  };
}

async function createValidatedProposalFromOutput(
  ctx: ApiContext,
  runId: string,
  output: unknown,
): Promise<
  | { ok: true; proposal: AgentEditProposal; fileSummary: unknown }
  | { ok: false; error: ReturnType<typeof createAgentChatError> }
> {
  const parsed = parseProposalOutput(output, { runId });
  if (!parsed.ok) {
    const category =
      parsed.error.category === 'parser-error' ? 'invalid-agent-output' : parsed.error.category;
    return {
      ok: false,
      error: createAgentChatError(
        category === 'invalid-agent-output' ? category : 'invalid-agent-output',
        parsed.error.message,
        parsed.error.diagnostics,
      ),
    };
  }

  const currentContents = await collectCurrentContents(ctx, parsed.proposal.operations);
  parsed.proposal.fingerprints = captureFingerprints(parsed.proposal.operations, currentContents);
  parsed.proposal.validation = await validateProposal(parsed.proposal, currentContents);
  for (const op of parsed.proposal.operations) {
    const check = parsed.proposal.validation.checks.find(
      (candidate) => candidate.id === `check_${op.id}` || candidate.id === `conflict_${op.id}`,
    );
    op.validationState =
      check?.status === 'fail'
        ? check.kind === 'source-conflict'
          ? 'conflict'
          : 'invalid'
        : 'valid';
  }

  return {
    ok: true,
    proposal: parsed.proposal,
    fileSummary: parsed.fileSummary,
  };
}

function sessionIdForSlide(activeSlideId?: string): string {
  if (!activeSlideId) {
    return 'session_management';
  }
  return `session_slide_${activeSlideId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
}

function createSession(activeSlideId?: string): AgentChatSession {
  const now = new Date().toISOString();
  const hasSlide = !!activeSlideId;
  return {
    id: sessionIdForSlide(activeSlideId),
    projectKey: SESSION_PROJECT_KEY,
    origin: hasSlide ? 'slide-workspace' : 'slide-management',
    activeSlideId,
    messages: [],
    contextPreferences: [
      {
        id: 'ctx-slide',
        kind: 'current-slide',
        enabled: hasSlide,
        required: hasSlide,
        label: 'Current Slide',
      },
      {
        id: 'ctx-elements',
        kind: 'selected-elements',
        enabled: hasSlide,
        required: false,
        label: 'Selected Elements',
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
}

export function registerAgentChatRoutes(server: ViteDevServer, ctx: ApiContext): void {
  server.middlewares.use('/__agent-chat', async (req, res, next) => {
    const urlObj = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    const pathname = urlObj.pathname;

    try {
      // GET /session
      if (req.method === 'GET' && pathname === '/session') {
        const activeSlideId = urlObj.searchParams.get('slideId') || undefined;

        const settings = await readAgentConnectionSettingsForProject(ctx).catch(() => null);
        let connection: AgentConnectionRef = { ...defaultConnection };

        if (settings) {
          const active = resolveActiveConnection(settings);
          if (active) {
            connection = {
              connectionId: active.id,
              displayName: active.displayName,
              type:
                active.type === 'api-key-provider'
                  ? 'api-provider'
                  : active.type === 'manual-agent-path'
                    ? 'manual-agent'
                    : 'local-agent',
              modelOrAgent: active.modelId || active.agentCommandAlias || active.displayName,
              status: active.status.state as AgentConnectionRef['status'],
              capabilities: active.capabilities,
            };
          } else if (settings.connections.length > 0) {
            connection = {
              connectionId: 'none',
              displayName: 'No Connection',
              type: 'local-agent',
              modelOrAgent: 'None',
              status: 'needs-setup',
            };
          } else {
            connection = { ...defaultConnection };
          }
        }

        const headerStatus = req.headers['x-connection-status'] as string | undefined;
        const queryStatus = urlObj.searchParams.get('connectionStatus') || undefined;
        const envStatus = process.env.AGENT_CONNECTION_STATUS || undefined;
        const resolvedStatus = (headerStatus ||
          queryStatus ||
          envStatus ||
          connection.status) as AgentConnectionRef['status'];

        connection.status = resolvedStatus;

        const headerMode = req.headers['x-runtime-mode'] as string | undefined;
        const queryMode = urlObj.searchParams.get('runtimeMode') || undefined;
        const envMode = process.env.AGENT_RUNTIME_MODE || undefined;
        const resolvedMode = (headerMode ||
          queryMode ||
          envMode ||
          (resolvedStatus === 'ready' || resolvedStatus === 'degraded'
            ? 'interactive'
            : 'interactive')) as RuntimeMode;

        const session = createSession(activeSlideId);
        const activeRun = listRunSummaries(session.id).find(
          (run) => !['completed', 'cancelled', 'failed'].includes(run.state),
        );
        session.currentRunId = activeRun?.runId;

        return json(res, 200, {
          session,
          conversation: {
            conversationId: session.id,
            activeRunId: activeRun?.runId ?? null,
            activeSlideId: session.activeSlideId,
            messages: session.messages,
          },
          activeConnection: connection,
          runtime: {
            mode: resolvedMode,
            settingsRoute: '/settings/connections',
          },
          suggestedActions: [],
          connectionStatus: connection.status,
          recoveryRoute: connection.status !== 'ready' ? '/settings/connections' : undefined,
        });
      }

      // POST /runs
      if (req.method === 'POST' && pathname === '/runs') {
        const headerMode = req.headers['x-runtime-mode'] as string | undefined;
        const envMode = process.env.AGENT_RUNTIME_MODE || undefined;
        const resolvedMode = (headerMode || envMode || 'interactive') as RuntimeMode;

        if (resolvedMode === 'read-only') {
          return json(res, 403, { error: 'Runs are not allowed in read-only mode.' });
        }

        const settings = await readAgentConnectionSettingsForProject(ctx).catch(() => null);
        let activeConnection: AgentConnectionRef = { ...defaultConnection };

        if (settings) {
          const active = resolveActiveConnection(settings);
          if (active) {
            activeConnection = {
              connectionId: active.id,
              displayName: active.displayName,
              type:
                active.type === 'api-key-provider'
                  ? 'api-provider'
                  : active.type === 'manual-agent-path'
                    ? 'manual-agent'
                    : 'local-agent',
              modelOrAgent: active.modelId || active.agentCommandAlias || active.displayName,
              status: active.status.state as AgentConnectionRef['status'],
            };
          } else if (settings.connections.length > 0) {
            activeConnection = {
              connectionId: 'none',
              displayName: 'No Connection',
              type: 'local-agent',
              modelOrAgent: 'None',
              status: 'needs-setup',
            };
          } else {
            activeConnection = { ...defaultConnection };
          }
        }

        const headerStatus = req.headers['x-connection-status'] as string | undefined;
        const envStatus = process.env.AGENT_CONNECTION_STATUS || undefined;
        const resolvedStatus = (headerStatus ||
          envStatus ||
          activeConnection.status) as AgentConnectionRef['status'];

        activeConnection.status = resolvedStatus;

        if (resolvedStatus !== 'ready' && resolvedStatus !== 'degraded') {
          const mappedError = createAgentChatError('connection-unavailable');
          return json(res, 503, {
            error: mappedError.message,
            category: mappedError.category,
            recoveryActions: mappedError.recoveryActions,
          });
        }

        // biome-ignore lint/suspicious/noExplicitAny: request body parsing
        const body = (await readBody(req)) as any;
        const {
          sessionId,
          prompt,
          actionId,
          contextPreferences: _contextPreferences,
          context,
          workflows = [],
        } = body;

        if (!prompt?.trim()) {
          return json(res, 400, { error: 'Prompt must be non-empty.' });
        }

        const runId = nextRouteId('run');
        const run: AgentChatRun = {
          id: runId,
          sessionId,
          prompt,
          actionId,
          context: context || {
            project: { name: 'Awesome Slide Project' },
            limits: { maxBytes: 128 * 1024, generatedAt: new Date().toISOString() },
          },
          connection: activeConnection,
          state: 'queued',
          events: [],
          startedAt: new Date().toISOString(),
        };

        const abortController = new AbortController();
        registerRun(run, abortController, {
          watchdogTimeoutMs:
            activeConnection.type === 'api-provider'
              ? undefined
              : LOCAL_AGENT_RUN_WATCHDOG_TIMEOUT_MS,
        });

        // Respond immediately with the run status
        json(res, 200, {
          runId,
          state: 'queued',
          eventUrl: `/__agent-chat/runs/${runId}/events`,
        });

        // Run prompt session run through the adapter in the background
        (async () => {
          try {
            // First emit queued
            addRunEvent(runId, 'queued', null);

            const connectionConfig = settings?.connections.find(
              (c) => c.id === activeConnection.connectionId,
            );
            const runRequest: StartAgentConnectionRunRequest = {
              runId,
              prompt,
              context: run.context,
              workflows,
              connectionId: activeConnection.connectionId,
              modelId: connectionConfig?.modelId,
              reasoningEffort: connectionConfig?.reasoningEffort,
              capabilities: connectionConfig?.capabilities ?? normalizeCapabilities(),
              signal: abortController.signal,
            };

            const runner: AgentConnectionRunner = async function* (req) {
              if (prompt.startsWith('simulate-error:')) {
                const category = toAgentChatErrorCategory(
                  prompt.replace('simulate-error:', '').trim(),
                );
                if (category === 'cancelled') {
                  yield { type: 'cancelled', payload: null };
                } else {
                  const errorPayload = createAgentChatError(
                    category,
                    undefined,
                    `Mock error diagnostics: key=supersecret123 path=C:\\Users\\bobsmith\\Desktop\\project`,
                  );
                  yield { type: 'failed', payload: errorPayload };
                }
                return;
              }

              if (prompt.startsWith('simulate-proposal:')) {
                const type = prompt.replace('simulate-proposal:', '').trim();
                if (type === 'timeout') {
                  // Wait to trigger watchdog
                  await new Promise((_, reject) => {
                    req.signal.addEventListener('abort', () => reject(new Error('aborted')));
                  });
                  return;
                }

                yield { type: 'progress', payload: 'Generating slide modifications...' };
                await new Promise((r) => setTimeout(r, 50));
                yield { type: 'structured-output', payload: { type } };
                return;
              }

              yield* runConfiguredConnectionEvents(ctx, activeConnection, connectionConfig, req);
            };

            const adapterEvents = runAgentConnectionAdapter(runner, runRequest);
            let assistantText = '';
            let proposalEmitted = false;

            for await (const event of adapterEvents) {
              if (abortController.signal.aborted) break;

              if (event.type === 'structured-output') {
                const payload = event.payload as { type?: string; output?: unknown };
                const output = payload.output ?? simulatedProposalEnvelope(payload.type ?? 'low');
                const parsed = await createValidatedProposalFromOutput(ctx, runId, output);
                if (parsed.ok) {
                  addRunEvent(runId, 'file_summary', parsed.fileSummary);
                  addRunEvent(runId, 'proposal', parsed.proposal);
                  proposalEmitted = true;
                } else {
                  addRunEvent(runId, 'failed', parsed.error);
                }
              } else if (event.type === 'token') {
                const token = typeof event.payload === 'string' ? event.payload : '';
                assistantText += token;
                addRunEvent(runId, event.type, event.payload);
              } else if (event.type === 'completed') {
                if (
                  !proposalEmitted &&
                  assistantText.trim() &&
                  containsProposalEnvelope(assistantText)
                ) {
                  const parsed = await createValidatedProposalFromOutput(ctx, runId, assistantText);
                  if (parsed.ok) {
                    addRunEvent(runId, 'file_summary', parsed.fileSummary);
                    addRunEvent(runId, 'proposal', parsed.proposal);
                    proposalEmitted = true;
                  } else {
                    addRunEvent(runId, 'failed', parsed.error);
                  }
                } else if (!proposalEmitted) {
                  addRunEvent(runId, event.type, event.payload);
                }
              } else if (isAgentChatEventType(event.type)) {
                addRunEvent(runId, event.type, event.payload);
              } else {
                addRunEvent(runId, 'diagnostic', event.payload);
              }
            }
          } catch (err) {
            if (!abortController.signal.aborted) {
              const raw = err instanceof Error ? err.message : String(err);
              const isTimeout = err instanceof Error && err.name === 'TimeoutError';
              const category = isTimeout ? 'timeout' : 'model-failed';
              addRunEvent(runId, 'failed', createAgentChatError(category, undefined, raw));
            }
          }
        })();

        return;
      }

      // GET /runs?conversationId=session
      if (req.method === 'GET' && pathname === '/runs') {
        const conversationId = urlObj.searchParams.get('conversationId') || undefined;
        return json(res, 200, { runs: listRunSummaries(conversationId) });
      }

      // GET /runs/:runId/events
      const eventsMatch = pathname.match(/^\/runs\/([^/]+)\/events$/);
      if (req.method === 'GET' && eventsMatch) {
        const runId = eventsMatch[1];
        const run = getRun(runId);

        if (!run) {
          return json(res, 404, { error: 'Run not found.' });
        }

        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        });

        const rawCursor =
          urlObj.searchParams.get('after') || (req.headers['last-event-id'] as string | undefined);
        const afterSequence = rawCursor ? Number.parseInt(rawCursor, 10) : 0;
        let closed = false;
        let unsubscribe: (() => void) | undefined;
        const closeStream = () => {
          if (closed) {
            return;
          }
          closed = true;
          unsubscribe?.();
          res.end();
        };

        unsubscribe = subscribeRunEvents(
          runId,
          (event) => {
            if (closed) {
              return;
            }
            res.write(`id: ${event.sequence}\nevent: message\ndata: ${JSON.stringify(event)}\n\n`);
            if (['completed', 'cancelled', 'failed'].includes(event.type)) {
              closeStream();
            }
          },
          {
            afterSequence: Number.isFinite(afterSequence) ? afterSequence : 0,
          },
        );

        if (closed) {
          unsubscribe?.();
        }

        req.on('close', () => {
          closeStream();
        });

        return;
      }

      // POST /runs/:runId/cancel
      const cancelMatch = pathname.match(/^\/runs\/([^/]+)\/cancel$/);
      if (req.method === 'POST' && cancelMatch) {
        const runId = cancelMatch[1];
        const cancelled = abortRun(runId);

        if (cancelled) {
          return json(res, 200, { ok: true, runId, state: 'cancelled' });
        }
        return json(res, 400, { error: 'Run already completed or not found.' });
      }

      // POST /runs/:runId/retry
      const retryMatch = pathname.match(/^\/runs\/([^/]+)\/retry$/);
      if (req.method === 'POST' && retryMatch) {
        const runId = retryMatch[1];
        const oldRun = getRun(runId);
        if (!oldRun) {
          return json(res, 404, { error: 'Run not found.' });
        }

        const body = (await readBody(req).catch(() => null)) as {
          context?: AgentChatContext;
          workflows?: Array<{ id: string; contentHash: string; instructions: string }>;
        } | null;
        const freshContext = body?.context || oldRun.context;
        const freshWorkflows = body?.workflows || [];

        const settings = await readAgentConnectionSettingsForProject(ctx).catch(() => null);
        let activeConnection: AgentConnectionRef = { ...defaultConnection };

        if (settings) {
          const active = resolveActiveConnection(settings);
          if (active) {
            activeConnection = {
              connectionId: active.id,
              displayName: active.displayName,
              type:
                active.type === 'api-key-provider'
                  ? 'api-provider'
                  : active.type === 'manual-agent-path'
                    ? 'manual-agent'
                    : 'local-agent',
              modelOrAgent: active.modelId || active.agentCommandAlias || active.displayName,
              status: active.status.state as AgentConnectionRef['status'],
            };
          } else if (settings.connections.length > 0) {
            activeConnection = {
              connectionId: 'none',
              displayName: 'No Connection',
              type: 'local-agent',
              modelOrAgent: 'None',
              status: 'needs-setup',
            };
          } else {
            activeConnection = { ...defaultConnection };
          }
        }

        const headerStatus = req.headers['x-connection-status'] as string | undefined;
        const envStatus = process.env.AGENT_CONNECTION_STATUS || undefined;
        const resolvedStatus = (headerStatus ||
          envStatus ||
          activeConnection.status) as AgentConnectionRef['status'];

        activeConnection.status = resolvedStatus;

        if (resolvedStatus !== 'ready' && resolvedStatus !== 'degraded') {
          const mappedError = createAgentChatError('connection-unavailable');
          return json(res, 503, {
            error: mappedError.message,
            category: mappedError.category,
            recoveryActions: mappedError.recoveryActions,
          });
        }

        const nextRunId = nextRouteId('run');
        const run: AgentChatRun = {
          id: nextRunId,
          sessionId: oldRun.sessionId,
          prompt: oldRun.prompt,
          actionId: oldRun.actionId,
          context: freshContext,
          connection: activeConnection,
          state: 'queued',
          events: [],
          startedAt: new Date().toISOString(),
        };

        const abortController = new AbortController();
        registerRun(run, abortController, {
          watchdogTimeoutMs:
            activeConnection.type === 'api-provider'
              ? undefined
              : LOCAL_AGENT_RUN_WATCHDOG_TIMEOUT_MS,
        });

        json(res, 200, {
          runId: nextRunId,
          state: 'queued',
          eventUrl: `/__agent-chat/runs/${nextRunId}/events`,
        });

        // Run prompt session run through the adapter in the background
        (async () => {
          try {
            // First emit queued
            addRunEvent(nextRunId, 'queued', null);

            const connectionConfig = settings?.connections.find(
              (c) => c.id === activeConnection.connectionId,
            );
            const runRequest: StartAgentConnectionRunRequest = {
              runId: nextRunId,
              prompt: oldRun.prompt,
              context: freshContext,
              workflows: freshWorkflows,
              connectionId: activeConnection.connectionId,
              modelId: connectionConfig?.modelId,
              reasoningEffort: connectionConfig?.reasoningEffort,
              capabilities: connectionConfig?.capabilities ?? normalizeCapabilities(),
              signal: abortController.signal,
            };

            const runner: AgentConnectionRunner = async function* (req) {
              if (oldRun.prompt.startsWith('simulate-error:')) {
                const category = toAgentChatErrorCategory(
                  oldRun.prompt.replace('simulate-error:', '').trim(),
                );
                if (category === 'cancelled') {
                  yield { type: 'cancelled', payload: null };
                } else {
                  const errorPayload = createAgentChatError(
                    category,
                    undefined,
                    `Mock error diagnostics: key=supersecret123 path=C:\\Users\\bobsmith\\Desktop\\project`,
                  );
                  yield { type: 'failed', payload: errorPayload };
                }
                return;
              }

              yield* runConfiguredConnectionEvents(ctx, activeConnection, connectionConfig, req);
            };

            const adapterEvents = runAgentConnectionAdapter(runner, runRequest);

            for await (const event of adapterEvents) {
              if (abortController.signal.aborted) break;
              if (isAgentChatEventType(event.type)) {
                addRunEvent(nextRunId, event.type, event.payload);
              } else {
                addRunEvent(nextRunId, 'diagnostic', event.payload);
              }
            }
          } catch (err) {
            if (!abortController.signal.aborted) {
              const raw = err instanceof Error ? err.message : String(err);
              const isTimeout = err instanceof Error && err.name === 'TimeoutError';
              const category = isTimeout ? 'timeout' : 'model-failed';
              addRunEvent(nextRunId, 'failed', createAgentChatError(category, undefined, raw));
            }
          }
        })();

        return;
      }

      // POST /proposals/:proposalId/apply
      const applyMatch = pathname.match(/^\/proposals\/([^/]+)\/apply$/);
      if (req.method === 'POST' && applyMatch) {
        const headerMode = req.headers['x-runtime-mode'] as string | undefined;
        const envMode = process.env.AGENT_RUNTIME_MODE || undefined;
        const resolvedMode = (headerMode || envMode || 'interactive') as RuntimeMode;

        const guard = validateRuntimeMutationRequest(req, {
          requireJsonBody: true,
          runtimeMode: resolvedMode,
          mutation: 'proposal-apply',
        });
        if (!guard.ok) return json(res, guard.status, { error: guard.error });

        const proposalId = applyMatch[1];
        const proposal = findProposal(proposalId);
        if (!proposal) {
          return json(res, 404, { error: 'Proposal not found.' });
        }

        const currentContents = await collectCurrentContents(ctx, proposal.operations);
        const parentRun = getRun(proposal.runId);
        if (parentRun?.state === 'cancelled') {
          const mapped = createAgentChatError('cancelled');
          return json(res, 422, {
            error: mapped.message,
            category: mapped.category,
            recoveryActions: mapped.recoveryActions,
          });
        }

        if (proposal.state === 'rejected' || proposal.state === 'applied') {
          return json(res, 422, { error: `Proposal is already ${proposal.state}.` });
        }

        const body = (await readBody(req)) as {
          operationIds?: string[];
          confirmedHighRisk?: boolean;
          confirmation?: { acceptedRiskLevel?: string };
        };
        const operationIds = body?.operationIds || [];

        const applyResult = await applyAgentProposalTransaction(ctx, proposal, {
          operationIds,
          currentContents,
          confirmedHighRisk:
            body.confirmedHighRisk || body.confirmation?.acceptedRiskLevel === 'high',
        });

        if (!applyResult.ok) {
          const mapped = createAgentChatError(
            applyResult.category,
            applyResult.message,
            applyResult.diagnostics,
          );
          const errorBody = {
            error: mapped.message,
            category: mapped.category,
            diagnostics: mapped.diagnostics,
            recoveryActions: mapped.recoveryActions,
          };
          if (applyResult.category === 'patch-conflict') {
            return json(res, 409, errorBody);
          }
          if (applyResult.status === 428) {
            return json(res, 428, errorBody);
          }
          if (applyResult.category === 'validation-failure') {
            return json(res, applyResult.status, errorBody);
          }
          return json(res, 500, {
            error: mapped.message,
            category: mapped.category,
            diagnostics: mapped.diagnostics,
            recoveryActions: mapped.recoveryActions,
          });
        }

        const run = getRun(proposal.runId);
        const refresh = await deriveRefreshPayload(ctx, applyResult.writtenFiles);
        notifyAgentRefreshTargets(server, refresh);
        const auditEntry = await appendAuditEntry(ctx.userCwd, {
          prompt: run?.prompt || 'In-app edit',
          contextSummary: proposal.scope,
          proposalSummary: proposal.summary,
          appliedFiles: applyResult.writtenFiles,
          operationKinds: proposal.operations
            .filter((op) => applyResult.selectedOperationIds.includes(op.id))
            .map((op) => op.kind),
          connection: run?.connection || defaultConnection,
          validationSummary: proposal.validation.status,
        });

        if (run && !['completed', 'cancelled', 'failed'].includes(run.state)) {
          addRunEvent(run.id, 'file_summary', {
            files: refresh.targets.map((target) => ({
              path: target.relativePath,
              target: target.slideId ?? target.deckId,
              summary: `${target.refreshKind} refreshed`,
            })),
          });
          addRunEvent(run.id, 'completed', null);
        }

        return json(res, 200, {
          ok: true,
          transactionId: applyResult.transactionId,
          proposalId,
          state: applyResult.state,
          writtenFiles: applyResult.writtenFiles,
          refresh,
          auditEntryId: auditEntry.id,
        });
      }

      // POST /proposals/:proposalId/reject
      const rejectMatch = pathname.match(/^\/proposals\/([^/]+)\/reject$/);
      if (req.method === 'POST' && rejectMatch) {
        const headerMode = req.headers['x-runtime-mode'] as string | undefined;
        const envMode = process.env.AGENT_RUNTIME_MODE || undefined;
        const resolvedMode = (headerMode || envMode || 'interactive') as RuntimeMode;
        const guard = validateRuntimeMutationRequest(req, {
          runtimeMode: resolvedMode,
          mutation: 'proposal-reject',
        });
        if (!guard.ok) return json(res, guard.status, { error: guard.error });

        const proposalId = rejectMatch[1];
        const proposal = findProposal(proposalId);
        if (!proposal) {
          return json(res, 404, { error: 'Proposal not found.' });
        }
        proposal.state = 'rejected';
        const run = getRun(proposal.runId);
        if (run && !['completed', 'cancelled', 'failed'].includes(run.state)) {
          addRunEvent(run.id, 'completed', null);
        }
        return json(res, 200, {
          ok: true,
          proposalId,
          state: 'rejected',
        });
      }

      // GET /audit
      if (req.method === 'GET' && pathname === '/audit') {
        const entries = await readAuditEntries(ctx.userCwd);
        return json(res, 200, { entries });
      }

      // Handle unmatched routes
      next();
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      const mappedError = createAgentChatError('write-failure', undefined, raw);
      json(res, 500, {
        error: mappedError.message,
        diagnostics: mappedError.diagnostics,
        recoveryActions: mappedError.recoveryActions,
      });
    }
  });
}

export function mapRunError(
  err: unknown,
  hint?: 'timeout' | 'validation-failure' | 'model-failed',
): { category: string; message: string; diagnostics?: string } {
  const raw = err instanceof Error ? err.message : String(err);
  const category = hint ?? 'model-failed';
  const mapped = createAgentChatError(category, undefined, raw);
  return {
    category: mapped.category,
    message: mapped.message,
    diagnostics: mapped.diagnostics ? redactDiagnostics(mapped.diagnostics) : undefined,
  };
}
