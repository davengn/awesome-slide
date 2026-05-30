import fs from 'node:fs/promises';
import type { ViteDevServer } from 'vite';
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
import type { ApiProviderId } from '../app/lib/agent-connection-types.ts';
import { normalizeCapabilities, resolveActiveConnection } from '../app/lib/agent-connections.ts';
import {
  captureFingerprints,
  normalizeProposal,
  validateProposal,
} from '../editing/agent-proposals.ts';
import { patchMetaInSource } from '../editing/meta-source.ts';
import { appendAuditEntry, readAuditEntries } from '../files/agent-audit.ts';
import type { ApiContext } from '../vite/routes/context.ts';
import { json, readBody, resolveSlideEntryPath } from '../vite/routes/context.ts';
import {
  abortRun,
  addRunEvent,
  findProposal,
  getRun,
  LOCAL_AGENT_RUN_WATCHDOG_TIMEOUT_MS,
  registerRun,
  subscribeRunEvents,
} from './agent-chat-runs.ts';
import type {
  AgentConnectionRunner,
  StartAgentConnectionRunRequest,
} from './agent-connection-adapters.ts';
import { runAgentConnectionAdapter } from './agent-connection-adapters.ts';
import { readAgentConnectionSettingsForProject } from './agent-connections-api.ts';
import {
  createUserHomeCredentialStorageAdapter,
  resolveCredentialSecret,
} from './agent-secrets.ts';

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

export type LocalAgentConfig = {
  provider?: string;
  type?: string;
  agentCommandAlias?: string;
  manualPathRef?: string;
};

function commandBasename(commandOrPath: string): string | undefined {
  return commandOrPath.toLowerCase().replace(/\\/g, '/').split('/').pop();
}

export function isCodexCli(commandOrPath: string, connectionConfig?: LocalAgentConfig): boolean {
  if (connectionConfig?.provider === 'codex') {
    return true;
  }
  const basename = commandBasename(commandOrPath);
  return basename === 'codex' || basename === 'codex.cmd' || basename === 'codex.exe';
}

export function isClaudeCodeCli(
  commandOrPath: string,
  connectionConfig?: LocalAgentConfig,
): boolean {
  if (connectionConfig?.provider === 'claude-code') {
    return true;
  }
  const basename = commandBasename(commandOrPath);
  return basename === 'claude' || basename === 'claude.cmd' || basename === 'claude.exe';
}

function buildLocalAgentPrompt(req: StartAgentConnectionRunRequest): string {
  return [
    req.prompt,
    '',
    'You are running from Awesome Slide agent chat. Use this context when it is relevant.',
    '<awesome-slide-context>',
    JSON.stringify({ context: req.context, workflows: req.workflows }, null, 2),
    '</awesome-slide-context>',
  ].join('\n');
}

export function createLocalAgentInvocation(
  commandOrPath: string,
  connectionConfig: LocalAgentConfig | undefined,
  req: StartAgentConnectionRunRequest,
  cwd: string,
): { args: string[]; input: string } {
  const input = buildLocalAgentPrompt(req);
  if (isCodexCli(commandOrPath, connectionConfig)) {
    const args = [
      'exec',
      '--cd',
      cwd,
      '--sandbox',
      'workspace-write',
      '--ask-for-approval',
      'never',
      '--color',
      'never',
    ];
    if (req.modelId) {
      args.push('--model', req.modelId);
    }
    args.push('-');
    return { args, input };
  }

  if (isClaudeCodeCli(commandOrPath, connectionConfig)) {
    const args = [
      '--print',
      '--input-format',
      'text',
      '--output-format',
      'text',
      '--permission-mode',
      'acceptEdits',
    ];
    if (req.modelId) {
      args.push('--model', req.modelId);
    }
    return { args, input };
  }

  return {
    args: [],
    input: JSON.stringify({
      prompt: req.prompt,
      context: req.context,
      workflows: req.workflows,
    }),
  };
}

async function* runLocalAgentCli(
  commandOrPath: string,
  connectionConfig: LocalAgentConfig | undefined,
  req: StartAgentConnectionRunRequest,
  cwd: string,
): AsyncIterable<{ type: 'token' | 'diagnostic'; payload: string }> {
  const { spawn } = await import('node:child_process');
  const invocation = createLocalAgentInvocation(commandOrPath, connectionConfig, req, cwd);
  const child = spawn(commandOrPath, invocation.args, {
    cwd,
    shell: false,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  let output = '';
  let stderr = '';
  const closePromise = new Promise<number | null>((resolve, reject) => {
    child.once('error', reject);
    child.once('close', resolve);
  });
  const killChild = () => {
    child.kill();
  };

  req.signal.addEventListener('abort', killChild, { once: true });
  child.stderr.on('data', (chunk: Buffer) => {
    stderr += chunk.toString();
  });

  try {
    child.stdin.end(invocation.input);
    for await (const chunk of child.stdout) {
      if (req.signal.aborted) {
        child.kill();
        break;
      }
      const str = chunk.toString();
      output += str;
      yield { type: 'token', payload: str };
    }

    const exitCode = await closePromise;
    if (stderr.trim()) {
      yield { type: 'diagnostic', payload: stderr };
    }
    if (exitCode !== 0 && !req.signal.aborted) {
      throw new Error(`Local agent CLI exited with code ${exitCode}. Output: ${output || stderr}`);
    }
  } finally {
    req.signal.removeEventListener('abort', killChild);
  }
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

        return json(res, 200, {
          session,
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

        const runId = `run_${Date.now()}`;
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

              // If there is no real config or we are simulating, run simulation
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
                await new Promise((r) => setTimeout(r, 50));
                yield { type: 'token', payload: 'Here are the suggested edits for your slide:' };
                await new Promise((r) => setTimeout(r, 50));
                yield { type: 'completed', payload: null };
                return;
              }

              // Real Connection Execution

              if (activeConnection.type === 'api-provider') {
                const adapter = createUserHomeCredentialStorageAdapter();
                let apiKey: string | null = null;
                if (connectionConfig?.credentialRef) {
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

                const provider = connectionConfig?.provider;
                const modelId =
                  connectionConfig?.modelId ||
                  (provider === 'openai'
                    ? 'gpt-4o'
                    : provider === 'anthropic'
                      ? 'claude-3-5-sonnet-latest'
                      : provider === 'deepseek'
                        ? 'deepseek-chat'
                        : provider === 'openrouter'
                          ? 'openai/gpt-4o'
                          : 'gemini-2.0-flash');

                const fetchSignal = AbortSignal.any([req.signal, AbortSignal.timeout(120_000)]);

                if (provider === 'openai') {
                  const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${apiKey}`,
                    },
                    body: JSON.stringify({
                      model: modelId,
                      messages: [{ role: 'user', content: req.prompt }],
                      stream: false,
                    }),
                    signal: fetchSignal,
                  });
                  if (!response.ok) {
                    throw new Error(
                      `OpenAI API returned status ${response.status}: ${await response.text()}`,
                    );
                  }
                  const data = (await response.json()) as any;
                  const text = data.choices?.[0]?.message?.content || '';
                  yield { type: 'token', payload: text };
                } else if (provider === 'anthropic') {
                  const response = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'x-api-key': apiKey,
                      'anthropic-version': '2023-06-01',
                    },
                    body: JSON.stringify({
                      model: modelId,
                      messages: [{ role: 'user', content: req.prompt }],
                      max_tokens: 4096,
                      stream: false,
                    }),
                    signal: fetchSignal,
                  });
                  if (!response.ok) {
                    throw new Error(
                      `Anthropic API returned status ${response.status}: ${await response.text()}`,
                    );
                  }
                  const data = (await response.json()) as any;
                  const text = data.content?.[0]?.text || '';
                  yield { type: 'token', payload: text };
                } else if (provider === 'google') {
                  const response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
                    {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        contents: [{ parts: [{ text: req.prompt }] }],
                      }),
                      signal: fetchSignal,
                    },
                  );
                  if (!response.ok) {
                    throw new Error(
                      `Google API returned status ${response.status}: ${await response.text()}`,
                    );
                  }
                  const data = (await response.json()) as any;
                  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                  yield { type: 'token', payload: text };
                } else if (provider === 'openrouter') {
                  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${apiKey}`,
                    },
                    body: JSON.stringify({
                      model: modelId,
                      messages: [{ role: 'user', content: req.prompt }],
                    }),
                    signal: fetchSignal,
                  });
                  if (!response.ok) {
                    throw new Error(
                      `OpenRouter API returned status ${response.status}: ${await response.text()}`,
                    );
                  }
                  const data = (await response.json()) as any;
                  const text = data.choices?.[0]?.message?.content || '';
                  yield { type: 'token', payload: text };
                } else if (provider === 'deepseek') {
                  const response = await fetch('https://api.deepseek.com/chat/completions', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${apiKey}`,
                    },
                    body: JSON.stringify({
                      model: modelId,
                      messages: [{ role: 'user', content: req.prompt }],
                    }),
                    signal: fetchSignal,
                  });
                  if (!response.ok) {
                    throw new Error(
                      `DeepSeek API returned status ${response.status}: ${await response.text()}`,
                    );
                  }
                  const data = (await response.json()) as any;
                  const text = data.choices?.[0]?.message?.content || '';
                  yield { type: 'token', payload: text };
                } else {
                  throw new Error(`Unsupported API provider: ${provider}`);
                }
              } else {
                const commandOrPath =
                  connectionConfig?.type === 'manual-agent-path'
                    ? connectionConfig.manualPathRef
                    : connectionConfig?.agentCommandAlias;

                if (!commandOrPath) {
                  throw new Error('Local CLI command or path is not configured.');
                }

                for await (const event of runLocalAgentCli(
                  commandOrPath,
                  connectionConfig,
                  req,
                  ctx.userCwd,
                )) {
                  yield event;
                }
              }

              yield { type: 'completed', payload: null };
            };

            const adapterEvents = runAgentConnectionAdapter(runner, runRequest);

            for await (const event of adapterEvents) {
              if (abortController.signal.aborted) break;

              if (event.type === 'structured-output') {
                const payload = event.payload as { type: string };
                const type = payload.type;
                const operations: AgentOperation[] = [];

                if (type === 'invalid') {
                  operations.push({
                    id: 'op_invalid',
                    kind: 'patch-slide-source',
                    target: 'intro',
                    description: 'Invalid TSX code',
                    payload: { code: 'function Slide() { return <div;\n}' },
                    requiresConfirmation: false,
                    validationState: 'pending',
                    reversible: true,
                  });
                } else if (type === 'conflict') {
                  operations.push({
                    id: 'op_conflict',
                    kind: 'patch-slide-source',
                    target: 'intro',
                    description: 'Conflicting edit',
                    payload: {
                      code: 'function Slide() { return <div>Hello</div>; }',
                      originalCode: 'CONFLICT',
                    },
                    requiresConfirmation: false,
                    validationState: 'pending',
                    reversible: true,
                  });
                } else if (type === 'medium') {
                  operations.push({
                    id: 'op_medium',
                    kind: 'create-slide',
                    target: 'deck_1',
                    description: 'Create a new slide',
                    payload: { title: 'New Slide' },
                    requiresConfirmation: false,
                    validationState: 'pending',
                    reversible: true,
                  });
                } else if (type === 'high') {
                  operations.push({
                    id: 'op_high',
                    kind: 'apply-theme',
                    target: 'intro',
                    description: 'Apply high risk theme',
                    payload: { themeId: 'unsupported-theme', scope: 'deck' },
                    requiresConfirmation: true,
                    validationState: 'pending',
                    reversible: true,
                  });
                } else {
                  operations.push({
                    id: 'op_low',
                    kind: 'patch-slide-source',
                    target: 'intro',
                    description: 'Update slide title',
                    payload: {
                      code: 'function Slide() {\n  return <div>Welcome to Awesome Slide!</div>;\n}',
                    },
                    requiresConfirmation: false,
                    validationState: 'pending',
                    reversible: true,
                  });
                }

                const slidePath = resolveSlideEntryPath(ctx, 'intro');
                const introContent = slidePath
                  ? await getFileContentOrEmpty(slidePath)
                  : 'original content';
                const currentContents: Record<string, string> = { intro: introContent };
                const fingerprints = captureFingerprints(operations, currentContents);

                const rawProposal: Partial<AgentEditProposal> = {
                  id: `prop_${Date.now()}`,
                  runId,
                  summary: 'Simulated proposal edits',
                  scope: 'slide',
                  operations,
                  fingerprints,
                };

                const normalized = normalizeProposal(rawProposal);
                const validation = await validateProposal(normalized, currentContents);
                normalized.validation = validation;

                for (const op of normalized.operations) {
                  const check = validation.checks.find(
                    (c) => c.id === `check_${op.id}` || c.id === `conflict_${op.id}`,
                  );
                  if (check) {
                    op.validationState =
                      check.status === 'fail'
                        ? check.kind === 'source-conflict'
                          ? 'conflict'
                          : 'invalid'
                        : 'valid';
                  } else {
                    op.validationState = 'valid';
                  }
                }

                addRunEvent(runId, 'proposal', normalized);
                // After proposal, complete the run
                addRunEvent(runId, 'completed', null);
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

        unsubscribe = subscribeRunEvents(runId, (event) => {
          if (closed) {
            return;
          }
          res.write(`data: ${JSON.stringify(event)}\n\n`);
          if (['completed', 'cancelled', 'failed'].includes(event.type)) {
            closeStream();
          }
        });

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

        const nextRunId = `run_${Date.now()}`;
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

              // If there is no real config or we are simulating, run simulation
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
                await new Promise((r) => setTimeout(r, 50));
                yield { type: 'token', payload: 'Here are the suggested edits for your slide:' };
                await new Promise((r) => setTimeout(r, 50));
                yield { type: 'completed', payload: null };
                return;
              }

              // Real Connection Execution

              if (activeConnection.type === 'api-provider') {
                const adapter = createUserHomeCredentialStorageAdapter();
                let apiKey: string | null = null;
                if (connectionConfig?.credentialRef) {
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

                const provider = connectionConfig?.provider;
                const modelId =
                  connectionConfig?.modelId ||
                  (provider === 'openai'
                    ? 'gpt-4o'
                    : provider === 'anthropic'
                      ? 'claude-3-5-sonnet-latest'
                      : provider === 'deepseek'
                        ? 'deepseek-chat'
                        : provider === 'openrouter'
                          ? 'openai/gpt-4o'
                          : 'gemini-2.0-flash');

                const fetchSignal = AbortSignal.any([req.signal, AbortSignal.timeout(120_000)]);

                if (provider === 'openai') {
                  const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${apiKey}`,
                    },
                    body: JSON.stringify({
                      model: modelId,
                      messages: [{ role: 'user', content: req.prompt }],
                      stream: false,
                    }),
                    signal: fetchSignal,
                  });
                  if (!response.ok) {
                    throw new Error(
                      `OpenAI API returned status ${response.status}: ${await response.text()}`,
                    );
                  }
                  const data = (await response.json()) as any;
                  const text = data.choices?.[0]?.message?.content || '';
                  yield { type: 'token', payload: text };
                } else if (provider === 'anthropic') {
                  const response = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'x-api-key': apiKey,
                      'anthropic-version': '2023-06-01',
                    },
                    body: JSON.stringify({
                      model: modelId,
                      messages: [{ role: 'user', content: req.prompt }],
                      max_tokens: 4096,
                      stream: false,
                    }),
                    signal: fetchSignal,
                  });
                  if (!response.ok) {
                    throw new Error(
                      `Anthropic API returned status ${response.status}: ${await response.text()}`,
                    );
                  }
                  const data = (await response.json()) as any;
                  const text = data.content?.[0]?.text || '';
                  yield { type: 'token', payload: text };
                } else if (provider === 'google') {
                  const response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
                    {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        contents: [{ parts: [{ text: req.prompt }] }],
                      }),
                      signal: fetchSignal,
                    },
                  );
                  if (!response.ok) {
                    throw new Error(
                      `Google API returned status ${response.status}: ${await response.text()}`,
                    );
                  }
                  const data = (await response.json()) as any;
                  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                  yield { type: 'token', payload: text };
                } else if (provider === 'openrouter') {
                  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${apiKey}`,
                    },
                    body: JSON.stringify({
                      model: modelId,
                      messages: [{ role: 'user', content: req.prompt }],
                    }),
                    signal: fetchSignal,
                  });
                  if (!response.ok) {
                    throw new Error(
                      `OpenRouter API returned status ${response.status}: ${await response.text()}`,
                    );
                  }
                  const data = (await response.json()) as any;
                  const text = data.choices?.[0]?.message?.content || '';
                  yield { type: 'token', payload: text };
                } else if (provider === 'deepseek') {
                  const response = await fetch('https://api.deepseek.com/chat/completions', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${apiKey}`,
                    },
                    body: JSON.stringify({
                      model: modelId,
                      messages: [{ role: 'user', content: req.prompt }],
                    }),
                    signal: fetchSignal,
                  });
                  if (!response.ok) {
                    throw new Error(
                      `DeepSeek API returned status ${response.status}: ${await response.text()}`,
                    );
                  }
                  const data = (await response.json()) as any;
                  const text = data.choices?.[0]?.message?.content || '';
                  yield { type: 'token', payload: text };
                } else {
                  throw new Error(`Unsupported API provider: ${provider}`);
                }
              } else {
                const commandOrPath =
                  connectionConfig?.type === 'manual-agent-path'
                    ? connectionConfig.manualPathRef
                    : connectionConfig?.agentCommandAlias;

                if (!commandOrPath) {
                  throw new Error('Local CLI command or path is not configured.');
                }

                for await (const event of runLocalAgentCli(
                  commandOrPath,
                  connectionConfig,
                  req,
                  ctx.userCwd,
                )) {
                  yield event;
                }
              }

              yield { type: 'completed', payload: null };
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

        if (resolvedMode === 'read-only') {
          return json(res, 403, { error: 'Apply is blocked in read-only mode.' });
        }

        const proposalId = applyMatch[1];
        const proposal = findProposal(proposalId);
        if (!proposal) {
          return json(res, 404, { error: 'Proposal not found.' });
        }

        const currentContents = await collectCurrentContents(ctx, proposal.operations);
        const validation = await validateProposal(proposal, currentContents);

        const mergedChecks = [...(proposal.validation?.checks || [])];
        for (const check of validation.checks) {
          if (!mergedChecks.some((c) => c.id === check.id)) {
            mergedChecks.push(check);
          }
        }

        let resolvedStatus = validation.status;
        if (
          proposal.validation?.status === 'invalid' ||
          proposal.validation?.status === 'conflict'
        ) {
          resolvedStatus = proposal.validation.status;
        }

        proposal.validation = {
          status: resolvedStatus,
          checks: mergedChecks,
          validatedAt: new Date().toISOString(),
        };

        for (const op of proposal.operations) {
          const check = validation.checks.find(
            (c) => c.id === `check_${op.id}` || c.id === `conflict_${op.id}`,
          );
          if (check) {
            op.validationState =
              check.status === 'fail'
                ? check.kind === 'source-conflict'
                  ? 'conflict'
                  : 'invalid'
                : 'valid';
          } else {
            op.validationState = 'valid';
          }
        }

        if (proposal.validation.status === 'conflict') {
          const mapped = createAgentChatError('patch-conflict');
          return json(res, 409, {
            error: mapped.message,
            category: mapped.category,
            recoveryActions: mapped.recoveryActions,
          });
        }

        if (proposal.validation.status === 'invalid') {
          const mapped = createAgentChatError('validation-failure');
          return json(res, 422, {
            error: mapped.message,
            category: mapped.category,
            recoveryActions: mapped.recoveryActions,
          });
        }

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

        const body = (await readBody(req)) as { operationIds?: string[] };
        const operationIds = body?.operationIds || [];
        const opsToApply = proposal.operations.filter(
          (op) => operationIds.length === 0 || operationIds.includes(op.id),
        );

        if (opsToApply.length === 0) {
          return json(res, 400, { error: 'No valid operations selected to apply.' });
        }

        const localBaseUrl = req.headers.host
          ? `http://${req.headers.host}`
          : 'http://localhost:5173';
        const writtenFiles: string[] = [];

        const fileBackups = new Map<string, string>();
        for (const op of opsToApply) {
          if (
            op.kind === 'patch-slide-source' ||
            op.kind === 'raw-patch' ||
            op.kind === 'apply-theme' ||
            op.kind === 'update-speaker-notes'
          ) {
            const filePath = resolveSlideEntryPath(ctx, op.target);
            if (filePath && !fileBackups.has(filePath)) {
              try {
                const content = await fs.readFile(filePath, 'utf8');
                fileBackups.set(filePath, content);
              } catch {
                fileBackups.set(filePath, '');
              }
            }
          }
        }

        try {
          for (const op of opsToApply) {
            if (op.kind === 'patch-slide-source' || op.kind === 'raw-patch') {
              const payload = op.payload as { code?: string } | undefined;
              const code = payload?.code || '';
              const filePath = resolveSlideEntryPath(ctx, op.target);
              if (!filePath) {
                throw new Error(`Invalid slide target: ${op.target}`);
              }
              await fs.writeFile(filePath, code, 'utf8');
              writtenFiles.push(filePath);
            } else if (op.kind === 'patch-slide-metadata') {
              const payload = op.payload as { patch?: Record<string, unknown> } | undefined;
              const patch = payload?.patch || {};
              const slideId = op.target;
              if (slideId && patch) {
                const slideRes = await fetch(
                  `${localBaseUrl}/__management/slides/${encodeURIComponent(slideId)}/metadata`,
                  {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'x-local-agent': '1' },
                    body: JSON.stringify(patch),
                  },
                ).catch(() => null);
                if (slideRes?.ok) {
                  const filePath = resolveSlideEntryPath(ctx, slideId);
                  writtenFiles.push(filePath || `slides/${slideId}`);
                  server.ws?.send({ type: 'full-reload' });
                } else {
                  throw new Error(`Failed to update metadata for slide: ${slideId}`);
                }
              }
            } else if (op.kind === 'apply-theme') {
              const payload = op.payload as { themeId?: string } | undefined;
              const themeId = payload?.themeId;
              if (themeId) {
                const filePath = resolveSlideEntryPath(ctx, op.target);
                if (filePath) {
                  let source = '';
                  try {
                    source = await fs.readFile(filePath, 'utf8');
                  } catch {
                    throw new Error('Slide source not found');
                  }
                  const updated = patchMetaInSource(source, { theme: themeId });
                  if (updated) {
                    await fs.writeFile(filePath, updated, 'utf8');
                    writtenFiles.push(filePath);
                    server.ws?.send({ type: 'full-reload' });
                  } else {
                    throw new Error('Failed to patch theme in slide source');
                  }
                }
              }
            } else if (op.kind === 'update-speaker-notes') {
              const payload = op.payload as { notes?: string } | undefined;
              const notes = payload?.notes;
              if (typeof notes === 'string') {
                const filePath = resolveSlideEntryPath(ctx, op.target);
                if (!filePath) {
                  throw new Error(`Invalid slide target: ${op.target}`);
                }
                let source = '';
                try {
                  source = await fs.readFile(filePath, 'utf8');
                } catch {
                  throw new Error('Slide source not found');
                }
                const updated = patchMetaInSource(source, { notes });
                if (!updated) {
                  throw new Error('Failed to patch speaker notes in source');
                }
                await fs.writeFile(filePath, updated, 'utf8');
                writtenFiles.push(filePath);
                server.ws?.send({ type: 'full-reload' });
              }
            } else if (op.kind === 'update-deck') {
              const payload = op.payload as { name?: string; description?: string } | undefined;
              const deckId = op.target;
              if (deckId && payload) {
                const deckRes = await fetch(
                  `${localBaseUrl}/__management/decks/${encodeURIComponent(deckId)}`,
                  {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'x-local-agent': '1' },
                    body: JSON.stringify(payload),
                  },
                ).catch(() => null);
                if (deckRes?.ok) {
                  writtenFiles.push(`decks/${deckId}`);
                  server.ws?.send({ type: 'full-reload' });
                } else {
                  throw new Error(`Failed to update deck: ${deckId}`);
                }
              }
            } else if (op.kind === 'create-slide') {
              const payload = op.payload as
                | {
                    title?: string;
                    deckId?: string;
                    folderId?: string;
                  }
                | undefined;
              if (payload?.title) {
                const newSlideId = `slide_${Date.now()}`;
                const slideRes = await fetch(`${localBaseUrl}/__management/slides`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'x-local-agent': '1' },
                  body: JSON.stringify({
                    id: newSlideId,
                    title: payload.title,
                    kind: 'blank',
                    deckId: payload.deckId,
                    folderId: payload.folderId,
                  }),
                }).catch(() => null);
                if (slideRes?.ok) {
                  writtenFiles.push(`slides/${newSlideId}`);
                  server.ws?.send({ type: 'full-reload' });
                } else {
                  throw new Error('Failed to create new slide');
                }
              }
            } else if (op.kind === 'reorder-pages') {
              const payload = op.payload as { slideOrder?: string[]; deckId?: string } | undefined;
              const deckId = payload?.deckId || op.target;
              const slideOrder = payload?.slideOrder;
              if (deckId && Array.isArray(slideOrder)) {
                const orderRes = await fetch(`${localBaseUrl}/__management/collections/order`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json', 'x-local-agent': '1' },
                  body: JSON.stringify({
                    collection: { type: 'deck', deckId },
                    slideIds: slideOrder,
                  }),
                }).catch(() => null);
                if (orderRes?.ok) {
                  writtenFiles.push(`decks/${deckId}/order`);
                  server.ws?.send({ type: 'full-reload' });
                } else {
                  throw new Error(`Failed to reorder deck pages: ${deckId}`);
                }
              }
            }
          }
        } catch (err) {
          // Rollback file writes
          for (const [filePath, originalContent] of fileBackups.entries()) {
            try {
              if (originalContent === '') {
                await fs.rm(filePath, { force: true });
              } else {
                await fs.writeFile(filePath, originalContent, 'utf8');
              }
            } catch {
              // Ignore rollback errors
            }
          }
          const raw = err instanceof Error ? err.message : String(err);
          const mapped = createAgentChatError('write-failure', undefined, raw);
          return json(res, 500, {
            error: mapped.message,
            category: mapped.category,
            diagnostics: mapped.diagnostics,
            recoveryActions: mapped.recoveryActions,
          });
        }

        const run = getRun(proposal.runId);
        const auditEntry = await appendAuditEntry(ctx.userCwd, {
          prompt: run?.prompt || 'In-app edit',
          contextSummary: proposal.scope,
          proposalSummary: proposal.summary,
          appliedFiles: writtenFiles,
          operationKinds: opsToApply.map((op) => op.kind),
          connection: run?.connection || defaultConnection,
          validationSummary: proposal.validation.status,
        });

        proposal.state =
          opsToApply.length === proposal.operations.length ? 'applied' : 'partially-applied';

        return json(res, 200, {
          ok: true,
          transactionId: `apply_${Date.now()}`,
          writtenFiles,
          auditEntryId: auditEntry.id,
        });
      }

      // POST /proposals/:proposalId/reject
      const rejectMatch = pathname.match(/^\/proposals\/([^/]+)\/reject$/);
      if (req.method === 'POST' && rejectMatch) {
        const proposalId = rejectMatch[1];
        const proposal = findProposal(proposalId);
        if (!proposal) {
          return json(res, 404, { error: 'Proposal not found.' });
        }
        proposal.state = 'rejected';
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
