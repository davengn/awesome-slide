import fs from 'node:fs/promises';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import type { ViteDevServer } from 'vite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createDefaultAgentConnectionSettings,
  type normalizeAgentConnectionSettings,
} from '../app/lib/agent-connection-storage.ts';
import { createConnectionStatus, normalizeCapabilities } from '../app/lib/agent-connections.ts';
import type { ApiContext } from '../vite/routes/context.ts';
import {
  registerAgentConnectionRoutes,
  writeAgentConnectionSettingsForProject,
} from './agent-connections-api.ts';

let tempDir: string;

type MountedHandler = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  next: () => void,
) => void | Promise<void>;

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'awesome-slide-agent-connections-api-'));
});

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

describe('agent connection routes', () => {
  it('GET /bootstrap returns first-run setup metadata without secrets', async () => {
    await withAgentConnectionServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/__agent-connections/bootstrap`);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.activeConnection).toBeNull();
      expect(body.firstRunSetup.shouldShow).toBe(true);
      expect(body.runtime.settingsModalTarget).toBe('execution-model');
      expect(JSON.stringify(body)).not.toContain('credentialRef');
    });
  });

  it('GET /settings returns provider registry and safe persisted connections', async () => {
    await withAgentConnectionServer(
      async (baseUrl, ctx) => {
        const settings = {
          ...createDefaultAgentConnectionSettings('project'),
          connections: [
            {
              id: 'conn_openai',
              displayName: 'OpenAI',
              type: 'api-key-provider',
              provider: 'openai',
              scope: 'session',
              credentialRef: 'cred_ref',
              capabilities: normalizeCapabilities({ streaming: true }),
              status: createConnectionStatus('ready'),
              createdAt: '2026-05-29T00:00:00.000Z',
              updatedAt: '2026-05-29T00:00:00.000Z',
              apiKey: 'sk-secret-value',
            },
          ],
          activeConnectionId: 'conn_openai',
        } as unknown as ReturnType<typeof normalizeAgentConnectionSettings>;
        await writeAgentConnectionSettingsForProject(ctx, settings);

        const res = await fetch(`${baseUrl}/__agent-connections/settings`);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.providers.some((provider: { id: string }) => provider.id === 'codex')).toBe(
          true,
        );
        expect(body.connections[0].credentialRef).toBe('cred_ref');
        expect(JSON.stringify(body)).not.toContain('sk-secret-value');
      },
      { projectName: 'project' },
    );
  });

  it('POST /first-run/dismiss records dismissal and does not enable scan', async () => {
    await withAgentConnectionServer(async (baseUrl) => {
      const dismissRes = await fetch(`${baseUrl}/__agent-connections/first-run/dismiss`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'do-later' }),
      });

      expect(dismissRes.status).toBe(200);

      const settingsRes = await fetch(`${baseUrl}/__agent-connections/settings`);
      const body = await settingsRes.json();
      expect(body.firstRunSetup.hasSeenPrompt).toBe(true);
      expect(body.firstRunSetup.dismissReason).toBe('do-later');
      expect(body.scanPreference.enabled).toBe(false);
    });
  });

  it('POST /first-run/dismiss updates bootstrap visibility without enabling scan', async () => {
    await withAgentConnectionServer(async (baseUrl) => {
      const dismissRes = await fetch(`${baseUrl}/__agent-connections/first-run/dismiss`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(dismissRes.status).toBe(200);

      const bootstrapRes = await fetch(`${baseUrl}/__agent-connections/bootstrap`);
      const bootstrap = await bootstrapRes.json();
      expect(bootstrap.firstRunSetup.shouldShow).toBe(false);
      expect(typeof bootstrap.firstRunSetup.dismissedAt).toBe('string');

      const settingsRes = await fetch(`${baseUrl}/__agent-connections/settings`);
      const settings = await settingsRes.json();
      expect(settings.firstRunSetup.dismissReason).toBe('do-later');
      expect(settings.scanPreference.enabled).toBe(false);
      expect(settings.scanPreference.lastScanAt).toBeUndefined();
    });
  });

  it('POST /first-run/dismiss requires a JSON request body', async () => {
    await withAgentConnectionServer(async (baseUrl) => {
      const dismissRes = await fetch(`${baseUrl}/__agent-connections/first-run/dismiss`, {
        method: 'POST',
      });
      const body = await dismissRes.json();

      expect(dismissRes.status).toBe(415);
      expect(body.error).toBe('content-type must be application/json');
    });
  });
});

async function withAgentConnectionServer(
  run: (baseUrl: string, ctx: ApiContext) => Promise<void>,
  opts: { projectName?: string } = {},
): Promise<void> {
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

  const userCwd = opts.projectName ? path.join(tempDir, opts.projectName) : tempDir;
  await fs.mkdir(userCwd, { recursive: true });
  const ctx: ApiContext = {
    userCwd,
    slidesDir: 'slides',
    slidesRoot: path.join(userCwd, 'slides'),
    themesRoot: path.join(userCwd, 'themes'),
    globalAssetsRoot: path.join(userCwd, 'assets'),
    manifestPath: path.join(userCwd, 'slides', '.folders.json'),
  };

  registerAgentConnectionRoutes(fakeServer, ctx);

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
    await run(`http://127.0.0.1:${address.port}`, ctx);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}
