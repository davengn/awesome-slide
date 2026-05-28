import type { ViteDevServer } from 'vite';
import type {
  AgentChatRun,
  AgentChatSession,
  AgentConnectionRef,
} from '../app/lib/agent-chat-types.ts';
import type { ApiContext } from '../vite/routes/context.ts';
import { json, readBody } from '../vite/routes/context.ts';
import {
  abortRun,
  addRunEvent,
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
            mode: 'interactive',
            settingsRoute: '/settings/connections',
          },
          suggestedActions: [],
        });
      }

      // POST /runs
      if (req.method === 'POST' && pathname === '/runs') {
        // biome-ignore lint/suspicious/noExplicitAny: request body parsing
        const body = (await readBody(req)) as any;
        const { sessionId, prompt, actionId, contextPreferences: _contextPreferences } = body;

        if (!prompt?.trim()) {
          return json(res, 400, { error: 'Prompt must be non-empty.' });
        }

        const runId = `run_${Date.now()}`;
        const run: AgentChatRun = {
          id: runId,
          sessionId,
          prompt,
          actionId,
          context: {
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
        });

        const unsubscribe = subscribeRunEvents(runId, (event) => {
          res.write(`data: ${JSON.stringify(event)}\n\n`);
        });

        req.on('close', () => {
          if (unsubscribe) {
            unsubscribe();
          }
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
        // Mock success
        return json(res, 200, {
          ok: true,
          transactionId: `apply_${Date.now()}`,
          writtenFiles: [],
          auditEntryId: `audit_${Date.now()}`,
        });
      }

      // POST /proposals/:proposalId/reject
      const rejectMatch = pathname.match(/^\/proposals\/([^/]+)\/reject$/);
      if (req.method === 'POST' && rejectMatch) {
        const _proposalId = rejectMatch[1];
        return json(res, 200, {
          ok: true,
          proposalId: _proposalId,
          state: 'rejected',
        });
      }

      // Handle unmatched routes
      next();
    } catch (err) {
      json(res, 500, { error: (err as Error).message });
    }
  });
}
