import fs from 'node:fs/promises';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import type { ViteDevServer } from 'vite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ApiContext } from '../vite/routes/context.ts';
import { registerAgentChatRoutes } from './agent-chat-api.ts';

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
