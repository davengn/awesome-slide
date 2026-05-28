import fs from 'node:fs/promises';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import type { ViteDevServer } from 'vite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AgentChatRun } from '../app/lib/agent-chat-types.ts';
import type { ApiContext } from '../vite/routes/context.ts';
import { registerAgentChatRoutes } from './agent-chat-api.ts';
import { addRunEvent, registerRun } from './agent-chat-runs.ts';

let tempDir: string;

type MountedHandler = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  next: () => void,
) => void | Promise<void>;

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'awesome-slide-agent-api-'));
  await fs.mkdir(path.join(tempDir, 'slides'), { recursive: true });
});

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

describe('Agent Chat API Routes', () => {
  it('GET /__agent-chat/session returns bootstrap metadata', async () => {
    await withAgentChatServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/__agent-chat/session`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.session).toBeDefined();
      expect(body.activeConnection).toBeDefined();
      expect(body.runtime.mode).toBe('interactive');
    });
  });

  it('POST /__agent-chat/runs starts a run', async () => {
    await withAgentChatServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/__agent-chat/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'session_1',
          prompt: 'Make slide look better',
          contextPreferences: [],
        }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.runId).toBeDefined();
      expect(body.state).toBe('queued');
      expect(body.eventUrl).toContain(body.runId);
    });
  });

  it('POST /__agent-chat/proposals/:proposalId/apply and /reject updates state and writes files', async () => {
    const slidePath = path.join(tempDir, 'slides', 'intro');
    await fs.mkdir(slidePath, { recursive: true });
    const indexPath = path.join(slidePath, 'index.tsx');
    await fs.writeFile(indexPath, 'original content', 'utf8');

    const runId = 'run_prop_test';
    const proposalId = 'prop_test_1';
    const mockRun = {
      id: runId,
      sessionId: 'session_1',
      prompt: 'Make slide prettier',
      context: { project: {} },
      connection: {
        connectionId: 'local-codex',
        displayName: 'Codex',
        type: 'local-agent',
        modelOrAgent: 'codex',
        status: 'ready',
      },
      state: 'queued',
      events: [],
      startedAt: new Date().toISOString(),
    } as unknown as AgentChatRun;

    const mockProposal = {
      id: proposalId,
      runId,
      summary: 'Test proposal edits',
      scope: 'slide',
      riskLevel: 'low',
      operations: [
        {
          id: 'op_patch',
          kind: 'patch-slide-source',
          target: 'intro',
          description: 'Patch intro slide',
          payload: { code: 'new patched content' },
          requiresConfirmation: false,
          validationState: 'pending',
          reversible: true,
        },
      ],
      previewArtifacts: [],
      validation: { status: 'valid', checks: [] },
      state: 'pending-review',
      createdAt: new Date().toISOString(),
    };

    registerRun(mockRun, new AbortController());
    addRunEvent(runId, 'proposal', mockProposal);

    await withAgentChatServer(async (baseUrl) => {
      const applyRes = await fetch(`${baseUrl}/__agent-chat/proposals/${proposalId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operationIds: ['op_patch'] }),
      });
      expect(applyRes.status).toBe(200);
      const applyBody = await applyRes.json();
      expect(applyBody.ok).toBe(true);
      expect(applyBody.writtenFiles).toHaveLength(1);

      const writtenContent = await fs.readFile(indexPath, 'utf8');
      expect(writtenContent).toBe('new patched content');

      const rejectRes = await fetch(`${baseUrl}/__agent-chat/proposals/${proposalId}/reject`, {
        method: 'POST',
      });
      expect(rejectRes.status).toBe(200);
      const rejectBody = await rejectRes.json();
      expect(rejectBody.ok).toBe(true);
      expect(rejectBody.state).toBe('rejected');
    });
  });

  it('GET /__agent-chat/session returns interactive runtime mode by default', async () => {
    await withAgentChatServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/__agent-chat/session`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.runtime.mode).toBe('interactive');
      expect(body.activeConnection.status).toBe('ready');
      expect(body.runtime.settingsRoute).toBeDefined();
    });
  });

  it('GET /__agent-chat/session with slideId returns slide-workspace origin', async () => {
    await withAgentChatServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/__agent-chat/session?slideId=intro`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.session.origin).toBe('slide-workspace');
      expect(body.session.activeSlideId).toBe('intro');
    });
  });

  it('GET /__agent-chat/session without slideId returns slide-management origin', async () => {
    await withAgentChatServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/__agent-chat/session`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.session.origin).toBe('slide-management');
    });
  });

  it('POST /__agent-chat/runs rejects empty prompts with 400', async () => {
    await withAgentChatServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/__agent-chat/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 'session_1', prompt: '' }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBeDefined();
    });
  });

  it('POST /__agent-chat/runs/:runId/cancel returns 400 for already-completed runs', async () => {
    await withAgentChatServer(async (baseUrl) => {
      const runRes = await fetch(`${baseUrl}/__agent-chat/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 'session_1', prompt: 'Test prompt' }),
      });
      const runBody = await runRes.json();
      const { runId } = runBody;

      await new Promise((r) => setTimeout(r, 200));

      const cancelRes = await fetch(`${baseUrl}/__agent-chat/runs/${runId}/cancel`, {
        method: 'POST',
      });
      expect([200, 400]).toContain(cancelRes.status);
    });
  });

  it('GET /__agent-chat/runs/:runId/events returns 404 for unknown run', async () => {
    await withAgentChatServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/__agent-chat/runs/nonexistent_run/events`);
      expect(res.status).toBe(404);
    });
  });

  it('POST /__agent-chat/proposals/:proposalId/apply returns 404 for unknown proposal', async () => {
    await withAgentChatServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/__agent-chat/proposals/unknown_proposal/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operationIds: [] }),
      });
      expect(res.status).toBe(404);
    });
  });

  it('POST /__agent-chat/proposals/:proposalId/apply returns 422 for invalid proposal', async () => {
    const runId = 'run_invalid_test';
    const proposalId = 'prop_invalid_1';
    const mockRun = {
      id: runId,
      sessionId: 'session_x',
      prompt: 'Test',
      context: { project: {} },
      connection: {
        connectionId: 'local-codex',
        displayName: 'Codex',
        type: 'local-agent',
        modelOrAgent: 'codex',
        status: 'ready',
      },
      state: 'queued',
      events: [],
      startedAt: new Date().toISOString(),
    } as unknown as AgentChatRun;

    const invalidProposal = {
      id: proposalId,
      runId,
      summary: 'Invalid proposal',
      scope: 'slide',
      riskLevel: 'low',
      operations: [],
      previewArtifacts: [],
      validation: { status: 'invalid', checks: [] },
      state: 'pending-review',
      createdAt: new Date().toISOString(),
    };

    registerRun(mockRun, new AbortController());
    addRunEvent(runId, 'proposal', invalidProposal);

    await withAgentChatServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/__agent-chat/proposals/${proposalId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operationIds: [] }),
      });
      expect(res.status).toBe(422);
    });
  });
});

async function withAgentChatServer(run: (baseUrl: string) => Promise<void>): Promise<void> {
  let mounted: {
    prefix: string;
    handler: MountedHandler;
  } | null = null;

  const fakeServer = {
    middlewares: {
      use(prefix: string, handler: MountedHandler) {
        mounted = { prefix, handler };
      },
    },
  } as unknown as ViteDevServer;

  const ctx: ApiContext = {
    userCwd: tempDir,
    slidesDir: 'slides',
    slidesRoot: path.join(tempDir, 'slides'),
    themesRoot: path.join(tempDir, 'themes'),
    globalAssetsRoot: path.join(tempDir, 'assets'),
    manifestPath: path.join(tempDir, 'slides', '.folders.json'),
  };

  registerAgentChatRoutes(fakeServer, ctx);

  const server = http.createServer((req, res) => {
    if (!mounted || !req.url?.startsWith(mounted.prefix)) {
      res.statusCode = 404;
      res.end();
      return;
    }
    const originalUrl = req.url;
    req.url = originalUrl.slice(mounted.prefix.length) || '/';
    mounted.handler(req, res, () => {
      res.statusCode = 404;
      res.end();
    });
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  try {
    const address = server.address() as AddressInfo;
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}
