import fs from 'node:fs/promises';
import type { ViteDevServer } from 'vite';
import { createAgentChatError, redactDiagnostics } from '../app/lib/agent-chat-errors.ts';
import type {
  AgentChatRun,
  AgentChatSession,
  AgentConnectionRef,
} from '../app/lib/agent-chat-types.ts';
import { patchMetaInSource } from '../editing/meta-source.ts';
import { appendAuditEntry } from '../files/agent-audit.ts';
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
          activeConnection: defaultConnection,
          runtime: {
            mode: defaultConnection.status === 'ready' ? 'interactive' : 'read-only',
            settingsRoute: '/settings/connections',
          },
          suggestedActions: [],
          connectionStatus: defaultConnection.status,
          recoveryRoute: defaultConnection.status !== 'ready' ? '/settings/connections' : undefined,
        });
      }

      // POST /runs
      if (req.method === 'POST' && pathname === '/runs') {
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
          connection: defaultConnection,
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
            addRunEvent(runId, 'progress', 'Analyzing slide layout...');

            setTimeout(() => {
              if (abortController.signal.aborted) return;
              addRunEvent(runId, 'token', 'Here are the suggested edits for your slide:');

              setTimeout(() => {
                if (abortController.signal.aborted) return;
                // For simple non-file-changing prompt simulation: complete
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

        const nextRunId = `run_${Date.now()}`;
        const run: AgentChatRun = {
          id: nextRunId,
          sessionId: oldRun.sessionId,
          prompt: oldRun.prompt,
          actionId: oldRun.actionId,
          context: oldRun.context,
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
            addRunEvent(nextRunId, 'completed', null);
          }, 20);
        }, 10);

        return;
      }

      // POST /proposals/:proposalId/apply
      const applyMatch = pathname.match(/^\/proposals\/([^/]+)\/apply$/);
      if (req.method === 'POST' && applyMatch) {
        const proposalId = applyMatch[1];
        const proposal = findProposal(proposalId);
        if (!proposal) {
          return json(res, 404, { error: 'Proposal not found.' });
        }

        if (proposal.validation.status === 'conflict' || proposal.validation.status === 'invalid') {
          return json(res, 422, { error: 'Cannot apply invalid or conflicting proposal.' });
        }

        const parentRun = getRun(proposal.runId);
        if (parentRun?.state === 'cancelled') {
          return json(res, 422, { error: 'Cannot apply proposal from a cancelled run.' });
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

        const writtenFiles: string[] = [];
        for (const op of opsToApply) {
          if (op.kind === 'patch-slide-source' || op.kind === 'raw-patch') {
            const payload = op.payload as { code?: string } | undefined;
            const code = payload?.code || '';
            const filePath = resolveSlideEntryPath(_ctx, op.target);
            if (!filePath) {
              return json(res, 400, { error: `Invalid slide target: ${op.target}` });
            }
            await fs.writeFile(filePath, code, 'utf8');
            writtenFiles.push(filePath);
          } else if (op.kind === 'patch-slide-metadata') {
            const payload = op.payload as { patch?: Record<string, unknown> } | undefined;
            const patch = payload?.patch || {};
            const filePath = resolveSlideEntryPath(_ctx, op.target);
            if (!filePath) {
              return json(res, 400, { error: `Invalid slide target: ${op.target}` });
            }
            let source = '';
            try {
              source = await fs.readFile(filePath, 'utf8');
            } catch {
              return json(res, 404, { error: 'Slide source not found' });
            }
            const updated = patchMetaInSource(source, patch);
            if (!updated) {
              return json(res, 422, { error: 'Failed to patch metadata in source' });
            }
            await fs.writeFile(filePath, updated, 'utf8');
            writtenFiles.push(filePath);
            server.ws.send({ type: 'full-reload' });
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
                  return json(res, 404, { error: 'Slide source not found' });
                }
                const updated = patchMetaInSource(source, { theme: themeId });
                if (updated) {
                  await fs.writeFile(filePath, updated, 'utf8');
                  writtenFiles.push(filePath);
                  server.ws.send({ type: 'full-reload' });
                }
              }
            }
          } else if (op.kind === 'update-speaker-notes') {
            const payload = op.payload as { notes?: string } | undefined;
            const notes = payload?.notes;
            if (typeof notes === 'string') {
              const filePath = resolveSlideEntryPath(_ctx, op.target);
              if (!filePath) {
                return json(res, 400, { error: `Invalid slide target: ${op.target}` });
              }
              let source = '';
              try {
                source = await fs.readFile(filePath, 'utf8');
              } catch {
                return json(res, 404, { error: 'Slide source not found' });
              }
              const updated = patchMetaInSource(source, { notes });
              if (!updated) {
                return json(res, 422, { error: 'Failed to patch speaker notes in source' });
              }
              await fs.writeFile(filePath, updated, 'utf8');
              writtenFiles.push(filePath);
              server.ws.send({ type: 'full-reload' });
            }
          } else if (op.kind === 'update-deck') {
            const payload = op.payload as { name?: string; description?: string } | undefined;
            const deckId = op.target;
            if (deckId && payload) {
              const deckRes = await fetch(
                `http://localhost/__management/decks/${encodeURIComponent(deckId)}`,
                {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json', 'x-local-agent': '1' },
                  body: JSON.stringify(payload),
                },
              ).catch(() => null);
              if (deckRes?.ok) {
                writtenFiles.push(`decks/${deckId}`);
                server.ws.send({ type: 'full-reload' });
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
              const slideRes = await fetch('http://localhost/__management/slides', {
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
                server.ws.send({ type: 'full-reload' });
              }
            }
          } else if (op.kind === 'reorder-pages') {
            const payload = op.payload as { slideOrder?: string[]; deckId?: string } | undefined;
            const deckId = payload?.deckId || op.target;
            const slideOrder = payload?.slideOrder;
            if (deckId && Array.isArray(slideOrder)) {
              const orderRes = await fetch('http://localhost/__management/collections/order', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-local-agent': '1' },
                body: JSON.stringify({
                  collection: { type: 'deck', deckId },
                  slideIds: slideOrder,
                }),
              }).catch(() => null);
              if (orderRes?.ok) {
                writtenFiles.push(`decks/${deckId}/order`);
                server.ws.send({ type: 'full-reload' });
              }
            }
          }
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
