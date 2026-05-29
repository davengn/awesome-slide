import fs from 'node:fs/promises';
import type { ViteDevServer } from 'vite';
import { createAgentChatError, redactDiagnostics } from '../app/lib/agent-chat-errors.ts';
import type {
  AgentChatContext,
  AgentChatError,
  AgentChatRun,
  AgentChatSession,
  AgentConnectionRef,
  AgentEditProposal,
  AgentOperation,
  RuntimeMode,
} from '../app/lib/agent-chat-types.ts';
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
  registerRun,
  subscribeRunEvents,
} from './agent-chat-runs.ts';

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
  connectionId: 'local-codex',
  displayName: 'Codex',
  type: 'local-agent',
  modelOrAgent: 'codex',
  status: 'ready',
};

export function registerAgentChatRoutes(server: ViteDevServer, _ctx: ApiContext): void {
  server.middlewares.use('/__agent-chat', async (req, res, next) => {
    const urlObj = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    const pathname = urlObj.pathname;

    try {
      // GET /session
      if (req.method === 'GET' && pathname === '/session') {
        const activeSlideId = urlObj.searchParams.get('slideId') || undefined;

        const headerStatus = req.headers['x-connection-status'] as string | undefined;
        const queryStatus = urlObj.searchParams.get('connectionStatus') || undefined;
        const envStatus = process.env.AGENT_CONNECTION_STATUS || undefined;
        const resolvedStatus = (headerStatus ||
          queryStatus ||
          envStatus ||
          defaultConnection.status) as AgentConnectionRef['status'];

        const connection: AgentConnectionRef = {
          ...defaultConnection,
          status: resolvedStatus,
        };

        const headerMode = req.headers['x-runtime-mode'] as string | undefined;
        const queryMode = urlObj.searchParams.get('runtimeMode') || undefined;
        const envMode = process.env.AGENT_RUNTIME_MODE || undefined;
        const resolvedMode = (headerMode ||
          queryMode ||
          envMode ||
          (resolvedStatus === 'ready' || resolvedStatus === 'degraded'
            ? 'interactive'
            : 'interactive')) as RuntimeMode;

        const session: AgentChatSession = {
          id: 'session_default',
          projectKey: 'project_default',
          origin: activeSlideId ? 'slide-workspace' : 'slide-management',
          activeSlideId,
          messages: [],
          contextPreferences: [
            {
              id: 'ctx-slide',
              kind: 'current-slide',
              enabled: true,
              required: true,
              label: 'Current Slide',
            },
            {
              id: 'ctx-elements',
              kind: 'selected-elements',
              enabled: true,
              required: false,
              label: 'Selected Elements',
            },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

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

        const headerStatus = req.headers['x-connection-status'] as string | undefined;
        const envStatus = process.env.AGENT_CONNECTION_STATUS || undefined;
        const resolvedStatus = (headerStatus ||
          envStatus ||
          defaultConnection.status) as AgentConnectionRef['status'];

        if (
          resolvedStatus === 'failed' ||
          resolvedStatus === 'offline' ||
          resolvedStatus === 'needs-setup'
        ) {
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
          connection: {
            ...defaultConnection,
            status: resolvedStatus,
          },
          state: 'queued',
          events: [],
          startedAt: new Date().toISOString(),
        };

        const abortController = new AbortController();
        registerRun(run, abortController);

        // Respond immediately with the run status
        json(res, 200, {
          runId,
          state: 'queued',
          eventUrl: `/__agent-chat/runs/${runId}/events`,
        });

        // Simulate the run lifecycle in the background
        setTimeout(() => {
          if (abortController.signal.aborted) return;
          addRunEvent(runId, 'queued', null);

          setTimeout(() => {
            if (abortController.signal.aborted) return;

            if (prompt.startsWith('simulate-error:')) {
              const category = prompt
                .replace('simulate-error:', '')
                .trim() as AgentChatError['category'];
              if (category === 'cancelled') {
                addRunEvent(runId, 'cancelled', null);
              } else {
                const errorPayload = createAgentChatError(
                  category,
                  undefined,
                  `Mock error diagnostics: key=supersecret123 path=C:\\Users\\bobsmith\\Desktop\\project`,
                );
                addRunEvent(runId, 'failed', errorPayload);
              }
              return;
            }

            if (prompt.startsWith('simulate-proposal:')) {
              const type = prompt.replace('simulate-proposal:', '').trim();

              if (type === 'timeout') {
                return;
              }

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

              addRunEvent(runId, 'progress', 'Generating slide modifications...');

              setTimeout(async () => {
                if (abortController.signal.aborted) return;

                const slidePath = resolveSlideEntryPath(_ctx, 'intro');
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
              }, 50);
              return;
            }

            addRunEvent(runId, 'progress', 'Analyzing slide layout...');

            setTimeout(() => {
              if (abortController.signal.aborted) return;
              addRunEvent(runId, 'token', 'Here are the suggested edits for your slide:');

              setTimeout(() => {
                if (abortController.signal.aborted) return;
                addRunEvent(runId, 'completed', null);
              }, 50);
            }, 50);
          }, 50);
        }, 10);

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
        } | null;
        const freshContext = body?.context || oldRun.context;

        const nextRunId = `run_${Date.now()}`;
        const run: AgentChatRun = {
          id: nextRunId,
          sessionId: oldRun.sessionId,
          prompt: oldRun.prompt,
          actionId: oldRun.actionId,
          context: freshContext,
          connection: defaultConnection,
          state: 'queued',
          events: [],
          startedAt: new Date().toISOString(),
        };

        const abortController = new AbortController();
        registerRun(run, abortController);

        json(res, 200, {
          runId: nextRunId,
          state: 'queued',
          eventUrl: `/__agent-chat/runs/${nextRunId}/events`,
        });

        setTimeout(() => {
          if (abortController.signal.aborted) return;
          addRunEvent(nextRunId, 'queued', null);
          setTimeout(() => {
            if (abortController.signal.aborted) return;

            if (oldRun.prompt.startsWith('simulate-error:')) {
              const category = oldRun.prompt
                .replace('simulate-error:', '')
                .trim() as AgentChatError['category'];
              if (category === 'cancelled') {
                addRunEvent(nextRunId, 'cancelled', null);
              } else {
                const errorPayload = createAgentChatError(
                  category,
                  undefined,
                  `Mock error diagnostics: key=supersecret123 path=C:\\Users\\bobsmith\\Desktop\\project`,
                );
                addRunEvent(nextRunId, 'failed', errorPayload);
              }
              return;
            }

            addRunEvent(nextRunId, 'completed', null);
          }, 20);
        }, 10);

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

        const currentContents = await collectCurrentContents(_ctx, proposal.operations);
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
            const filePath = resolveSlideEntryPath(_ctx, op.target);
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
              const filePath = resolveSlideEntryPath(_ctx, op.target);
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
                  const filePath = resolveSlideEntryPath(_ctx, slideId);
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
                const filePath = resolveSlideEntryPath(_ctx, op.target);
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
                const filePath = resolveSlideEntryPath(_ctx, op.target);
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
        const auditEntry = await appendAuditEntry(_ctx.userCwd, {
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
        const entries = await readAuditEntries(_ctx.userCwd);
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
