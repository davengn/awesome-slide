import fs from 'node:fs/promises';
import type { ServerResponse } from 'node:http';
import path from 'node:path';
import type { ViteDevServer } from 'vite';
import {
  createDefaultAgentConnectionSettings,
  dismissFirstRunSetup,
  normalizeAgentConnectionSettings,
} from '../app/lib/agent-connection-storage.ts';
import type {
  AgentConnectionConfig,
  AgentConnectionSettingsConnection,
  AgentConnectionsBootstrapResponse,
  AgentConnectionsSettingsResponse,
  ApiProviderCredential,
  ApiProviderId,
  ConnectionErrorCategory,
  ConnectionStatus,
  CreateAgentConnectionRequest,
  DismissFirstRunRequest,
  LocalAgentCandidate,
  LocalAgentProviderId,
  ManualAgentPath,
  ManualPathValidationRequest,
  SetActiveConnectionRequest,
  StartScanRequest,
} from '../app/lib/agent-connection-types.ts';
import {
  createConnectionStatus,
  createSafeBootstrapSnapshot,
  DEFAULT_CONNECTION_CAPABILITIES,
  getProviderEntry,
  getProviderRegistry,
} from '../app/lib/agent-connections.ts';
import type { ApiContext } from '../vite/routes/context.ts';
import { json, readBody } from '../vite/routes/context.ts';
import type { LocalAgentConfig } from './agent-chat-api.ts';
import { createLocalAgentInvocation } from './agent-chat-api.ts';
import type { StartAgentConnectionRunRequest } from './agent-connection-adapters.ts';
import {
  addApprovedDirectory,
  discoverLocalAgentCandidates,
  removeApprovedDirectory,
  validateManualAgentPath,
} from './agent-discovery.ts';
import {
  createCredentialReference,
  createUserHomeCredentialStorageAdapter,
  deleteCredentialReference,
  redactDiagnostics,
  resolveCredentialSecret,
} from './agent-secrets.ts';
import { validateMutationRequest } from './request-guard.ts';

const CONNECTION_DIR = path.join('.awesome-slide', 'agent-connections');
const SETTINGS_FILE = 'settings.json';
const CANDIDATES_FILE = 'candidates.json';

export function resolveAgentConnectionSettingsPath(ctx: ApiContext): string {
  return path.join(ctx.userCwd, CONNECTION_DIR, SETTINGS_FILE);
}

export function resolveAgentCandidatesPath(ctx: ApiContext): string {
  return path.join(ctx.userCwd, CONNECTION_DIR, CANDIDATES_FILE);
}

export async function readAgentConnectionSettingsForProject(
  ctx: ApiContext,
): Promise<ReturnType<typeof normalizeAgentConnectionSettings>> {
  const projectId = path.basename(ctx.userCwd) || 'project_default';
  try {
    const raw = await fs.readFile(resolveAgentConnectionSettingsPath(ctx), 'utf8');
    return normalizeAgentConnectionSettings(JSON.parse(raw), projectId);
  } catch {
    return createDefaultAgentConnectionSettings(projectId);
  }
}

export async function writeAgentConnectionSettingsForProject(
  ctx: ApiContext,
  settings: ReturnType<typeof normalizeAgentConnectionSettings>,
): Promise<void> {
  const settingsPath = resolveAgentConnectionSettingsPath(ctx);
  await fs.mkdir(path.dirname(settingsPath), { recursive: true });
  const normalized = normalizeAgentConnectionSettings(settings, settings.projectId);
  await fs.writeFile(settingsPath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
}

export async function readAgentCandidatesForProject(
  ctx: ApiContext,
): Promise<LocalAgentCandidate[]> {
  try {
    const raw = await fs.readFile(resolveAgentCandidatesPath(ctx), 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function writeAgentCandidatesForProject(
  ctx: ApiContext,
  candidates: LocalAgentCandidate[],
): Promise<void> {
  const p = resolveAgentCandidatesPath(ctx);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, `${JSON.stringify(candidates, null, 2)}\n`, 'utf8');
}

function runtimeMode(): 'interactive' | 'read-only' {
  return process.env.AGENT_RUNTIME_MODE === 'read-only' ? 'read-only' : 'interactive';
}

function bootstrapResponse(
  settings: Awaited<ReturnType<typeof readAgentConnectionSettingsForProject>>,
): AgentConnectionsBootstrapResponse {
  return {
    ...createSafeBootstrapSnapshot(settings),
    runtime: {
      mode: runtimeMode(),
      settingsRoute: '/settings/connections',
      settingsModalTarget: 'execution-model',
    },
  };
}

function settingsResponse(
  settings: Awaited<ReturnType<typeof readAgentConnectionSettingsForProject>>,
  candidates: LocalAgentCandidate[] = [],
): AgentConnectionsSettingsResponse {
  return {
    connections: settings.connections.map(sanitizeConnectionForClient),
    activeConnectionId: settings.activeConnectionId,
    projectDefaultConnectionId: settings.projectDefaultConnectionId,
    scanPreference: settings.scanPreference,
    firstRunSetup: settings.firstRunSetup,
    candidates,
    providers: getProviderRegistry(),
  };
}

function inferCredentialStorage(ref: string): ApiProviderCredential['storage'] {
  return ref.startsWith('env:') ? 'environment-variable' : 'os-credential-store';
}

function credentialDisplayHint(
  connection: AgentConnectionConfig,
): AgentConnectionSettingsConnection['credential'] {
  if (!connection.credentialRef) return undefined;
  const storage = connection.credentialStorage ?? inferCredentialStorage(connection.credentialRef);
  const envName =
    storage === 'environment-variable' ? connection.credentialRef.replace(/^env:/, '') : undefined;
  return {
    storage,
    displayHint: connection.credentialDisplayHint ?? (envName ? `$${envName}` : 'saved credential'),
  };
}

function sanitizeConnectionForClient(
  connection: AgentConnectionConfig,
): AgentConnectionSettingsConnection {
  const {
    credentialRef: _credentialRef,
    credentialStorage: _credentialStorage,
    credentialDisplayHint: _credentialDisplayHint,
    manualPathRef: _manualPathRef,
    ...safeConnection
  } = connection;
  const credential = credentialDisplayHint(connection);
  return credential ? { ...safeConnection, credential } : safeConnection;
}

interface ScanSession {
  scanId: string;
  opts: StartScanRequest;
  status: 'scanning' | 'completed' | 'cancelled' | 'failed';
  candidates: LocalAgentCandidate[];
  clients: Array<{ res: ServerResponse; write: (data: string) => void }>;
}

const activeScans = new Map<string, ScanSession>();

function sendScanEvent(
  scanId: string,
  type: string,
  data: Record<string, unknown> | LocalAgentCandidate,
) {
  const session = activeScans.get(scanId);
  if (!session) return;
  const payload = `data: ${JSON.stringify({ type, ...data })}\n\n`;
  for (const client of session.clients) {
    client.write(payload);
  }
}

function closeScanStream(scanId: string) {
  const session = activeScans.get(scanId);
  if (!session) return;
  for (const client of session.clients) {
    try {
      client.res.end();
    } catch {}
  }
  session.clients = [];
}

async function testProviderCredentials(
  provider: string,
  apiKey: string,
  modelId?: string,
): Promise<ConnectionStatus> {
  const timeoutSignal = AbortSignal.timeout(15000);
  try {
    let testOk = false;
    let errorMsg = '';
    let errorCategory: ConnectionErrorCategory = 'unknown';
    let responseText = '';

    if (provider === 'openai') {
      const model = modelId || 'gpt-4o-mini';
      const probeRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'Respond with exactly: ok' }],
          max_tokens: 4,
        }),
        signal: timeoutSignal,
      });
      if (probeRes.ok) {
        testOk = true;
        const data = await probeRes.json().catch(() => ({}));
        responseText = data.choices?.[0]?.message?.content || '';
      } else {
        const body = await probeRes.text().catch(() => '');
        errorMsg = `OpenAI API returned status ${probeRes.status}: ${body}`;
        if (probeRes.status === 401) errorCategory = 'authentication-failed';
        else if (probeRes.status === 429) errorCategory = 'quota-rate-limit';
        else if (probeRes.status === 404) errorCategory = 'unsupported-model';
      }
    } else if (provider === 'anthropic') {
      const model = modelId || 'claude-3-5-haiku-latest';
      const probeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'Respond with exactly: ok' }],
          max_tokens: 4,
        }),
        signal: timeoutSignal,
      });
      if (probeRes.ok) {
        testOk = true;
        const data = await probeRes.json().catch(() => ({}));
        responseText = data.content?.[0]?.text || '';
      } else {
        const body = await probeRes.text().catch(() => '');
        errorMsg = `Anthropic API returned status ${probeRes.status}: ${body}`;
        if (probeRes.status === 401) errorCategory = 'authentication-failed';
        else if (probeRes.status === 429) errorCategory = 'quota-rate-limit';
        else if (probeRes.status === 404) errorCategory = 'unsupported-model';
      }
    } else if (provider === 'google') {
      const model = modelId || 'gemini-2.0-flash-lite';
      const probeRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Respond with exactly: ok' }] }],
            generationConfig: { maxOutputTokens: 4 },
          }),
          signal: timeoutSignal,
        },
      );
      if (probeRes.ok) {
        testOk = true;
        const data = await probeRes.json().catch(() => ({}));
        responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      } else {
        const body = await probeRes.text().catch(() => '');
        errorMsg = `Google API returned status ${probeRes.status}: ${body}`;
        if (probeRes.status === 400 || probeRes.status === 403)
          errorCategory = 'authentication-failed';
        else if (probeRes.status === 429) errorCategory = 'quota-rate-limit';
        else if (probeRes.status === 404) errorCategory = 'unsupported-model';
      }
    } else if (provider === 'openrouter') {
      const model = modelId || 'openai/gpt-4o-mini';
      const probeRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'Respond with exactly: ok' }],
          max_tokens: 4,
        }),
        signal: timeoutSignal,
      });
      if (probeRes.ok) {
        testOk = true;
        const data = await probeRes.json().catch(() => ({}));
        responseText = data.choices?.[0]?.message?.content || '';
      } else {
        const body = await probeRes.text().catch(() => '');
        errorMsg = `OpenRouter API returned status ${probeRes.status}: ${body}`;
        if (probeRes.status === 401) errorCategory = 'authentication-failed';
      }
    } else if (provider === 'deepseek') {
      const model = modelId || 'deepseek-chat';
      const probeRes = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'Respond with exactly: ok' }],
          max_tokens: 4,
        }),
        signal: timeoutSignal,
      });
      if (probeRes.ok) {
        testOk = true;
        const data = await probeRes.json().catch(() => ({}));
        responseText = data.choices?.[0]?.message?.content || '';
      } else {
        const body = await probeRes.text().catch(() => '');
        errorMsg = `DeepSeek API returned status ${probeRes.status}: ${body}`;
        if (probeRes.status === 401) errorCategory = 'authentication-failed';
        else if (probeRes.status === 429) errorCategory = 'quota-rate-limit';
      }
    } else {
      testOk = true;
      responseText = 'ok';
    }

    if (testOk) {
      return createConnectionStatus('ready', {
        message: `Prompt: "Respond with exactly: ok"\nResponse: "${responseText.trim()}"`,
        checkedAt: new Date().toISOString(),
      });
    }
    return createConnectionStatus('failed', {
      category: errorCategory,
      message: errorMsg,
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    const isTimeout = err instanceof Error && err.name === 'TimeoutError';
    return createConnectionStatus('failed', {
      category: isTimeout ? 'timeout' : 'provider-offline',
      message: isTimeout ? 'Test request timed out.' : `Network request failed: ${raw}`,
      checkedAt: new Date().toISOString(),
    });
  }
}

async function testLocalAgentCredentials(
  commandOrPath: string,
  connectionConfig: LocalAgentConfig | undefined,
  cwd: string,
): Promise<ConnectionStatus> {
  const timeoutSignal = AbortSignal.timeout(10000);
  try {
    const { spawn } = await import('node:child_process');

    const testReq: StartAgentConnectionRunRequest = {
      runId: 'test_run',
      prompt: 'Respond with exactly: ok',
      context: { project: {} },
      workflows: [],
      connectionId: 'test_connection',
      capabilities: { ...DEFAULT_CONNECTION_CAPABILITIES, streaming: true, cancellation: true },
      signal: timeoutSignal,
    };

    const invocation = createLocalAgentInvocation(commandOrPath, connectionConfig, testReq, cwd);

    return await new Promise<ConnectionStatus>((resolve) => {
      const child = spawn(commandOrPath, invocation.args, {
        cwd,
        shell: false,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (chunk: Buffer) => {
        stdout += chunk.toString();
      });

      child.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      child.once('error', (err) => {
        resolve(
          createConnectionStatus('failed', {
            category: 'provider-offline',
            message: `Failed to spawn local agent process: ${err.message}`,
            checkedAt: new Date().toISOString(),
          }),
        );
      });

      child.once('close', (code) => {
        if (code === 0) {
          const out = stdout.trim() || stderr.trim();
          resolve(
            createConnectionStatus('ready', {
              message: `Prompt: "Respond with exactly: ok"\nResponse: "${out}"`,
              checkedAt: new Date().toISOString(),
            }),
          );
        } else {
          resolve(
            createConnectionStatus('failed', {
              category: 'incompatible-protocol',
              message: `Local agent exited with code ${code}. Output: ${stdout.trim() || stderr.trim()}`,
              checkedAt: new Date().toISOString(),
            }),
          );
        }
      });

      // Write stdin and close
      child.stdin.write(invocation.input);
      child.stdin.end();

      timeoutSignal.addEventListener('abort', () => {
        child.kill();
        resolve(
          createConnectionStatus('failed', {
            category: 'timeout',
            message: 'Local agent connection test timed out (10s).',
            checkedAt: new Date().toISOString(),
          }),
        );
      });
    });
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    const isTimeout = err instanceof Error && err.name === 'TimeoutError';
    return createConnectionStatus('failed', {
      category: isTimeout ? 'timeout' : 'provider-offline',
      message: isTimeout ? 'Test prompt timed out.' : `Execution failed: ${raw}`,
      checkedAt: new Date().toISOString(),
    });
  }
}

export function registerAgentConnectionRoutes(server: ViteDevServer, ctx: ApiContext): void {
  server.middlewares.use('/__agent-connections', async (req, res, next) => {
    const urlObj = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    const pathname = urlObj.pathname;

    try {
      if (runtimeMode() === 'read-only' && req.method !== 'GET') {
        return json(res, 403, { error: 'Mutations are blocked in read-only mode.' });
      }

      if (req.method === 'GET' && pathname === '/bootstrap') {
        const settings = await readAgentConnectionSettingsForProject(ctx);
        return json(res, 200, bootstrapResponse(settings));
      }

      if (req.method === 'GET' && pathname === '/settings') {
        const settings = await readAgentConnectionSettingsForProject(ctx);
        const candidates = await readAgentCandidatesForProject(ctx);
        return json(res, 200, settingsResponse(settings, candidates));
      }

      if (req.method === 'POST' && pathname === '/first-run/dismiss') {
        const guard = validateMutationRequest(req, { requireJsonBody: true });
        if (!guard.ok) return json(res, guard.status, { error: guard.error });

        const body = (await readBody(req)) as DismissFirstRunRequest;
        const settings = await readAgentConnectionSettingsForProject(ctx);
        const nextSettings = dismissFirstRunSetup(settings, body.reason ?? 'do-later');
        await writeAgentConnectionSettingsForProject(ctx, nextSettings);
        return json(res, 200, { ok: true });
      }

      if (req.method === 'POST' && pathname === '/scan/directories') {
        const guard = validateMutationRequest(req, { requireJsonBody: true });
        if (!guard.ok) return json(res, guard.status, { error: guard.error });

        const body = (await readBody(req)) as { path: string };
        const settings = await readAgentConnectionSettingsForProject(ctx);
        const result = addApprovedDirectory(settings.scanPreference, body.path);
        if (!result.ok) {
          return json(res, 400, { error: result.error });
        }
        settings.scanPreference = result.preference;
        await writeAgentConnectionSettingsForProject(ctx, settings);
        return json(res, 200, { ok: true, scanPreference: settings.scanPreference });
      }

      if (req.method === 'DELETE' && pathname.startsWith('/scan/directories/')) {
        const id = pathname.substring('/scan/directories/'.length);
        const settings = await readAgentConnectionSettingsForProject(ctx);
        settings.scanPreference = removeApprovedDirectory(settings.scanPreference, id);
        await writeAgentConnectionSettingsForProject(ctx, settings);
        return json(res, 200, { ok: true, scanPreference: settings.scanPreference });
      }

      if (req.method === 'POST' && pathname === '/scan') {
        const guard = validateMutationRequest(req, { requireJsonBody: true });
        if (!guard.ok) return json(res, guard.status, { error: guard.error });

        const body = (await readBody(req)) as StartScanRequest;
        const settings = await readAgentConnectionSettingsForProject(ctx);
        const scanId = `scan_${Date.now()}`;
        const session: ScanSession = {
          scanId,
          opts: body,
          status: 'scanning',
          candidates: [],
          clients: [],
        };
        activeScans.set(scanId, session);

        // Update settings scan preference if we start a scan
        settings.scanPreference.enabled = true;
        settings.scanPreference.lastScanAt = new Date().toISOString();
        await writeAgentConnectionSettingsForProject(ctx, settings);

        // Run discovery asynchronously
        const approvedDirs = settings.scanPreference.approvedDirectories;
        let filteredApprovedDirs = approvedDirs;
        if (body.approvedDirectoryIds) {
          filteredApprovedDirs = approvedDirs.filter((d) =>
            body.approvedDirectoryIds?.includes(d.id),
          );
        }

        (async () => {
          try {
            sendScanEvent(scanId, 'started', { scanId });

            const candidates = await discoverLocalAgentCandidates({
              includePathCommands: body.includePathCommands !== false,
              includeKnownInstallLocations: body.includeKnownInstallLocations !== false,
              approvedDirectories: filteredApprovedDirs,
            });

            if (session.status === 'scanning') {
              session.candidates = candidates;
              session.status = 'completed';

              const existingCandidates = await readAgentCandidatesForProject(ctx);
              const mergedCandidates = [...candidates];
              for (const ec of existingCandidates) {
                if (!mergedCandidates.some((c) => c.id === ec.id)) {
                  mergedCandidates.push(ec);
                }
              }
              await writeAgentCandidatesForProject(ctx, mergedCandidates);

              for (const c of candidates) {
                sendScanEvent(scanId, 'candidate', c);
              }
              sendScanEvent(scanId, 'completed', { scanId, candidates });
              closeScanStream(scanId);
            }
          } catch (err) {
            if (session.status === 'scanning') {
              session.status = 'failed';
              const raw = err instanceof Error ? err.message : String(err);
              sendScanEvent(scanId, 'failed', {
                error: 'Scan failed',
                diagnostics: redactDiagnostics(raw),
              });
              closeScanStream(scanId);
            }
          }
        })();

        return json(res, 200, {
          scanId,
          state: 'scanning',
          eventUrl: `/__agent-connections/scan/${scanId}/events`,
        });
      }

      if (req.method === 'GET' && pathname.startsWith('/scan/') && pathname.endsWith('/events')) {
        const parts = pathname.split('/');
        const scanId = parts[2];
        const session = activeScans.get(scanId);
        if (!session) {
          return json(res, 404, { error: 'Scan session not found.' });
        }

        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        });

        const client = {
          res,
          write: (data: string) => {
            res.write(data);
          },
        };
        session.clients.push(client);

        req.on('close', () => {
          session.clients = session.clients.filter((c) => c !== client);
        });

        // Write initial data or let it progress
        client.write(`data: ${JSON.stringify({ type: 'started', scanId })}\n\n`);
        return;
      }

      if (req.method === 'POST' && pathname.startsWith('/scan/') && pathname.endsWith('/cancel')) {
        const parts = pathname.split('/');
        const scanId = parts[2];
        const session = activeScans.get(scanId);
        if (!session) {
          return json(res, 404, { error: 'Scan session not found.' });
        }

        if (session.status === 'scanning') {
          session.status = 'cancelled';
          sendScanEvent(scanId, 'cancelled', { scanId });
          closeScanStream(scanId);
        }

        return json(res, 200, { ok: true, scanId, state: 'cancelled' });
      }

      if (req.method === 'POST' && pathname === '/manual-path/validate') {
        const guard = validateMutationRequest(req, { requireJsonBody: true });
        if (!guard.ok) return json(res, guard.status, { error: guard.error });

        const body = (await readBody(req)) as ManualPathValidationRequest;
        const validation = await validateManualAgentPath(body.input, body.kind);

        let manualPath: ManualAgentPath | undefined;
        if (validation.status === 'pass' || validation.status === 'warn') {
          manualPath = {
            id: `manual_${Date.now()}`,
            input: body.input,
            kind: body.kind,
            pathLabel: redactDiagnostics(body.input),
            provider: validation.provider as LocalAgentProviderId,
            validation,
            version: validation.version,
            updatedAt: new Date().toISOString(),
          };
        }

        return json(res, 200, { validation, manualPath });
      }

      if (req.method === 'POST' && pathname === '/test-credentials') {
        const guard = validateMutationRequest(req, { requireJsonBody: true });
        if (!guard.ok) return json(res, guard.status, { error: guard.error });

        const body = (await readBody(req)) as {
          provider: string;
          apiKey?: string;
          envVarName?: string;
          modelId?: string;
        };

        let apiKey = body.apiKey;
        if (body.envVarName) {
          apiKey = process.env[body.envVarName];
        }

        if (!apiKey) {
          return json(res, 200, {
            status: createConnectionStatus('failed', {
              category: 'secure-storage-unavailable',
              message: 'API key is missing.',
            }),
          });
        }

        const status = await testProviderCredentials(body.provider, apiKey, body.modelId);
        return json(res, 200, { status });
      }

      if (req.method === 'POST' && pathname.endsWith('/test')) {
        const parts = pathname.split('/');
        if (parts.length === 3) {
          const connectionId = parts[1];
          const settings = await readAgentConnectionSettingsForProject(ctx);
          const connection = settings.connections.find((c) => c.id === connectionId);
          if (!connection) {
            return json(res, 404, { error: 'Connection not found.' });
          }

          if (connection.type === 'api-key-provider') {
            const adapter = createUserHomeCredentialStorageAdapter();
            let apiKey: string | null = null;
            if (connection.credentialRef) {
              const storage =
                connection.credentialStorage ?? inferCredentialStorage(connection.credentialRef);
              apiKey = await resolveCredentialSecret(
                {
                  ref: connection.credentialRef,
                  provider: connection.provider as ApiProviderId,
                  storage,
                  displayHint: '',
                  createdAt: '',
                },
                adapter,
              );
            }

            if (!apiKey) {
              connection.status = createConnectionStatus('failed', {
                category: 'secure-storage-unavailable',
                message: 'API key is missing or secure storage is unavailable.',
              });
              await writeAgentConnectionSettingsForProject(ctx, settings);
              return json(res, 200, { status: connection.status });
            }

            connection.status = await testProviderCredentials(
              connection.provider,
              apiKey,
              connection.modelId,
            );
            connection.lastTestedAt = new Date().toISOString();
            await writeAgentConnectionSettingsForProject(ctx, settings);
            return json(res, 200, { status: connection.status });
          }

          // Local CLI
          const pathOrCommand =
            connection.type === 'manual-agent-path'
              ? connection.manualPathRef
              : connection.agentCommandAlias;

          if (!pathOrCommand) {
            connection.status = createConnectionStatus('failed', {
              category: 'missing-executable',
              message: 'Connection executable or command is missing.',
              checkedAt: new Date().toISOString(),
            });
          } else {
            let kind: ManualAgentPath['kind'] = 'command';
            if (connection.type === 'manual-agent-path') {
              const hasSeparator = pathOrCommand.includes('/') || pathOrCommand.includes('\\');
              kind = hasSeparator ? 'executable' : 'command';
            }
            const validation = await validateManualAgentPath(pathOrCommand, kind);
            if (validation.status === 'pass' || validation.status === 'warn') {
              connection.status = await testLocalAgentCredentials(
                pathOrCommand,
                connection,
                ctx.userCwd,
              );
            } else {
              connection.status = createConnectionStatus('failed', {
                category: kind === 'executable' ? 'invalid-path' : 'missing-executable',
                message: validation.message || 'Validation failed.',
                diagnostics: validation.diagnostics,
                checkedAt: new Date().toISOString(),
              });
            }
          }
          connection.lastTestedAt = new Date().toISOString();
          await writeAgentConnectionSettingsForProject(ctx, settings);
          return json(res, 200, { status: connection.status });
        }
      }

      if (req.method === 'DELETE' && pathname.split('/').length === 2) {
        const parts = pathname.split('/');
        const connId = parts[1];
        const settings = await readAgentConnectionSettingsForProject(ctx);
        const index = settings.connections.findIndex((c) => c.id === connId);
        if (index === -1) {
          return json(res, 404, { error: 'Connection not found.' });
        }

        const connection = settings.connections[index];
        const guard = validateMutationRequest(req, { requireJsonBody: false });
        if (!guard.ok) return json(res, guard.status, { error: guard.error });

        let deleteCred = false;
        try {
          const body = (await readBody(req)) as { deleteCredential?: boolean };
          deleteCred = body?.deleteCredential === true;
        } catch {}

        if (deleteCred && connection.credentialRef) {
          const adapter = createUserHomeCredentialStorageAdapter();
          const storage =
            connection.credentialStorage ?? inferCredentialStorage(connection.credentialRef);
          await deleteCredentialReference(
            {
              ref: connection.credentialRef,
              provider: connection.provider as ApiProviderId,
              storage,
              displayHint: '',
              createdAt: '',
            },
            adapter,
          );
        }

        settings.connections.splice(index, 1);
        if (settings.activeConnectionId === connId) {
          settings.activeConnectionId = undefined;
        }
        if (settings.projectDefaultConnectionId === connId) {
          settings.projectDefaultConnectionId = undefined;
        }

        await writeAgentConnectionSettingsForProject(ctx, settings);
        return json(res, 200, { ok: true });
      }

      if (req.method === 'POST' && pathname === '/active') {
        const guard = validateMutationRequest(req, { requireJsonBody: true });
        if (!guard.ok) return json(res, guard.status, { error: guard.error });

        const body = (await readBody(req)) as SetActiveConnectionRequest;
        const settings = await readAgentConnectionSettingsForProject(ctx);
        const connection = settings.connections.find((c) => c.id === body.connectionId);
        if (!connection) {
          return json(res, 404, { error: 'Connection not found.' });
        }

        settings.activeConnectionId = body.connectionId;
        if (body.scope === 'project-default') {
          settings.projectDefaultConnectionId = body.connectionId;
        }

        if (body.modelId !== undefined) {
          connection.modelId = body.modelId;
        }
        if (body.reasoningEffort !== undefined) {
          connection.reasoningEffort = body.reasoningEffort;
        }

        connection.updatedAt = new Date().toISOString();
        settings.updatedAt = new Date().toISOString();

        await writeAgentConnectionSettingsForProject(ctx, settings);
        return json(res, 200, { ok: true, activeConnectionId: body.connectionId });
      }

      if (req.method === 'POST' && (pathname === '' || pathname === '/')) {
        const guard = validateMutationRequest(req, { requireJsonBody: true });
        if (!guard.ok) return json(res, guard.status, { error: guard.error });

        const body = (await readBody(req)) as CreateAgentConnectionRequest & {
          apiKey?: string;
          envVarName?: string;
        };
        const settings = await readAgentConnectionSettingsForProject(ctx);

        let config: AgentConnectionConfig;
        const id = `conn_${Date.now()}`;
        const createdAt = new Date().toISOString();

        if (body.source === 'candidate') {
          const candidates = await readAgentCandidatesForProject(ctx);
          const candidate = candidates.find((c) => c.id === body.candidateId);
          if (!candidate) {
            return json(res, 400, { error: 'Candidate not found.' });
          }
          if (
            candidate.status !== 'installed' ||
            candidate.compatibility?.status === 'incompatible'
          ) {
            return json(res, 400, { error: 'Candidate is not installed or is incompatible.' });
          }
          config = {
            id,
            displayName: body.displayName || candidate.displayName,
            type: 'auto-scanned-local-agent',
            provider: candidate.provider,
            scope: body.scope || 'session',
            agentCommandAlias: candidate.command,
            capabilities:
              getProviderEntry(candidate.provider)?.capabilityDefaults ||
              DEFAULT_CONNECTION_CAPABILITIES,
            status: createConnectionStatus('ready'),
            createdAt,
            updatedAt: createdAt,
          };
        } else if (body.source === 'manual-path') {
          config = {
            id,
            displayName: redactDiagnostics(body.displayName || 'Manual Agent'),
            type: 'manual-agent-path',
            provider: body.provider,
            scope: body.scope || 'session',
            manualPathRef: body.manualPathId || body.credentialRef,
            capabilities:
              getProviderEntry(body.provider)?.capabilityDefaults ||
              DEFAULT_CONNECTION_CAPABILITIES,
            status: createConnectionStatus('ready'),
            createdAt,
            updatedAt: createdAt,
          };
        } else if (body.source === 'byok') {
          let credentialRef = body.credentialRef;
          let credentialStorage: ApiProviderCredential['storage'] | undefined;
          let credentialDisplayHint: string | undefined;

          if (body.apiKey || body.envVarName) {
            const adapter = createUserHomeCredentialStorageAdapter();
            const credResult = await createCredentialReference(
              {
                provider: body.provider as ApiProviderId,
                apiKey: body.apiKey,
                envVarName: body.envVarName,
              },
              adapter,
            );

            if (!credResult.ok) {
              return json(res, 400, {
                error: credResult.status.message || 'Failed to store credentials',
                category: credResult.status.category,
                recoveryActions: credResult.status.recoveryActions,
              });
            }
            credentialRef = credResult.credential.ref;
            credentialStorage = credResult.credential.storage;
            credentialDisplayHint = credResult.credential.displayHint;
          } else if (credentialRef) {
            credentialStorage = inferCredentialStorage(credentialRef);
            credentialDisplayHint = credentialRef.startsWith('env:')
              ? `$${credentialRef.replace(/^env:/, '')}`
              : 'saved credential';
          }

          config = {
            id,
            displayName: body.displayName || 'BYOK Provider',
            type: 'api-key-provider',
            provider: body.provider,
            scope: body.scope || 'session',
            credentialRef,
            credentialStorage,
            credentialDisplayHint,
            modelId: body.modelId,
            reasoningEffort: body.reasoningEffort,
            capabilities:
              getProviderEntry(body.provider)?.capabilityDefaults ||
              DEFAULT_CONNECTION_CAPABILITIES,
            status: createConnectionStatus('ready'),
            createdAt,
            updatedAt: createdAt,
          };
        } else {
          return json(res, 400, { error: 'Invalid connection source.' });
        }

        settings.connections.push(config);
        settings.activeConnectionId = config.id;
        if (config.scope === 'project-default') {
          settings.projectDefaultConnectionId = config.id;
        }

        await writeAgentConnectionSettingsForProject(ctx, settings);
        return json(res, 200, { connection: sanitizeConnectionForClient(config) });
      }

      return next();
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      return json(res, 500, {
        error: 'Agent connection settings failed.',
        category: 'unknown',
        recoveryActions: ['open-settings', 'copy-diagnostics'],
        diagnostics: redactDiagnostics(raw),
      });
    }
  });
}
