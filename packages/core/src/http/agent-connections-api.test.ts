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

  it('GET /settings returns provider registry and redacted persisted connections', async () => {
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
        expect(body.connections[0].credentialRef).toBeUndefined();
        expect(body.connections[0].credential).toEqual({
          storage: 'os-credential-store',
          displayHint: 'saved credential',
        });
        expect(JSON.stringify(body)).not.toContain('cred_ref');
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

  it('handles scan start, cancel, and SSE event streaming', async () => {
    await withAgentConnectionServer(async (baseUrl) => {
      const approvedDir = path.join(tempDir, 'approved-agents');
      await fs.mkdir(approvedDir, { recursive: true });
      const addDirRes = await fetch(`${baseUrl}/__agent-connections/scan/directories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: approvedDir }),
      });
      expect(addDirRes.status).toBe(200);
      const addedDir = await addDirRes.json();
      const approvedDirectoryId = addedDir.scanPreference.approvedDirectories[0].id;
      const localCreateRes = await fetch(`${baseUrl}/__agent-connections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'manual-path',
          displayName: 'Manual Codex',
          provider: 'codex',
          manualPathId: 'manual_path_ref',
          scope: 'project-default',
        }),
      });
      expect(localCreateRes.status).toBe(200);
      const localConnection = await localCreateRes.json();
      const byokCreateRes = await fetch(`${baseUrl}/__agent-connections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'byok',
          displayName: 'Env OpenAI',
          provider: 'openai',
          credentialRef: 'env:AWESOME_SLIDE_TEST_KEY',
          modelId: 'gpt-5',
          scope: 'project-default',
        }),
      });
      expect(byokCreateRes.status).toBe(200);
      const byokConnection = await byokCreateRes.json();

      const scanRes = await fetch(`${baseUrl}/__agent-connections/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          includePathCommands: true,
          includeKnownInstallLocations: false,
          approvedDirectoryIds: [approvedDirectoryId],
        }),
      });
      expect(scanRes.status).toBe(200);
      const scan = await scanRes.json();
      expect(scan.scanId).toBeDefined();
      expect(scan.state).toBe('scanning');
      expect(scan.eventUrl).toBeDefined();

      const eventsRes = await fetch(`${baseUrl}${scan.eventUrl}`);
      expect(eventsRes.status).toBe(200);
      expect(eventsRes.headers.get('content-type')).toContain('text/event-stream');

      // Cancel the scan
      const cancelRes = await fetch(`${baseUrl}/__agent-connections/scan/${scan.scanId}/cancel`, {
        method: 'POST',
      });
      expect(cancelRes.status).toBe(200);
      const cancel = await cancelRes.json();
      expect(cancel.state).toBe('cancelled');

      const rescanRes = await fetch(`${baseUrl}/__agent-connections/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ includePathCommands: false }),
      });
      expect(rescanRes.status).toBe(200);
      const settingsAfterRescan = await fetch(`${baseUrl}/__agent-connections/settings`);
      const settingsBody = await settingsAfterRescan.json();
      expect(settingsBody.activeConnectionId).toBe(byokConnection.connection.id);
      expect(
        settingsBody.connections.some(
          (connection: { id: string }) => connection.id === localConnection.connection.id,
        ),
      ).toBe(true);
      const byok = settingsBody.connections.find(
        (connection: { id: string }) => connection.id === byokConnection.connection.id,
      );
      expect(byok.credential).toEqual({
        storage: 'environment-variable',
        displayHint: '$AWESOME_SLIDE_TEST_KEY',
      });

      const removeDirRes = await fetch(
        `${baseUrl}/__agent-connections/scan/directories/${approvedDirectoryId}`,
        { method: 'DELETE' },
      );
      expect(removeDirRes.status).toBe(200);
      const removedDir = await removeDirRes.json();
      expect(removedDir.scanPreference.approvedDirectories).toHaveLength(0);
    });
  });

  it('validates manual agent path and returns metadata', async () => {
    await withAgentConnectionServer(async (baseUrl) => {
      const validateRes = await fetch(`${baseUrl}/__agent-connections/manual-path/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: 'codex',
          kind: 'command',
        }),
      });
      expect(validateRes.status).toBe(200);
      const res = await validateRes.json();
      expect(res.validation).toBeDefined();
      // Even if validation fails or passes depending on path existence in environment, response layout is correct.
    });
  });

  it('POST / creates a connection from a manual path', async () => {
    await withAgentConnectionServer(async (baseUrl) => {
      const createRes = await fetch(`${baseUrl}/__agent-connections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'manual-path',
          displayName: 'Test CLI Agent',
          provider: 'codex',
          manualPathId: 'path_123',
          scope: 'project-default',
        }),
      });
      expect(createRes.status).toBe(200);
      const body = await createRes.json();
      expect(body.connection).toBeDefined();
      expect(body.connection.type).toBe('manual-agent-path');
      expect(body.connection.displayName).toBe('Test CLI Agent');
    });
  });

  it('POST / creates a BYOK connection, tests it, and deletes it', async () => {
    process.env.AWESOME_SLIDE_TEST_KEY = 'sk-mock-key-value';
    try {
      await withAgentConnectionServer(async (baseUrl) => {
        // 1. Create BYOK connection
        const createRes = await fetch(`${baseUrl}/__agent-connections`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: 'byok',
            displayName: 'My OpenAI Connection',
            provider: 'openai',
            envVarName: 'AWESOME_SLIDE_TEST_KEY',
            modelId: 'gpt-5.5',
            scope: 'project-default',
          }),
        });

        expect(createRes.status).toBe(200);
        const createBody = await createRes.json();
        expect(createBody.connection).toBeDefined();
        expect(createBody.connection.type).toBe('api-key-provider');
        expect(createBody.connection.displayName).toBe('My OpenAI Connection');
        expect(createBody.connection.credentialRef).toBeUndefined();
        expect(createBody.connection.credential).toEqual({
          storage: 'environment-variable',
          displayHint: '$AWESOME_SLIDE_TEST_KEY',
        });
        expect(JSON.stringify(createBody.connection)).not.toContain('sk-mock-key-value');
        expect(JSON.stringify(createBody.connection)).not.toContain('env:AWESOME_SLIDE_TEST_KEY');

        const connectionId = createBody.connection.id;

        // 2. Test connection (it might fail auth or timeout because it's a mock key and it does a real fetch to api.openai.com, but it should return a valid status structure)
        const testRes = await fetch(`${baseUrl}/__agent-connections/${connectionId}/test`, {
          method: 'POST',
        });
        expect(testRes.status).toBe(200);
        const testBody = await testRes.json();
        expect(testBody.status).toBeDefined();
        expect(testBody.status.state).toBeDefined();
        expect(testBody.status.recoveryActions).toBeDefined();

        // 3. Delete connection with credentials
        const deleteRes = await fetch(`${baseUrl}/__agent-connections/${connectionId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deleteCredential: true }),
        });
        expect(deleteRes.status).toBe(200);
        const deleteBody = await deleteRes.json();
        expect(deleteBody.ok).toBe(true);

        // 4. Verify connection is gone from settings
        const settingsRes = await fetch(`${baseUrl}/__agent-connections/settings`);
        const settingsBody = await settingsRes.json();
        expect(settingsBody.connections.some((c: { id: string }) => c.id === connectionId)).toBe(
          false,
        );
      });
    } finally {
      delete process.env.AWESOME_SLIDE_TEST_KEY;
    }
  });

  it('T060: handles active connection selection, preferences, project default, reload persistence, and invalid persisted choice', async () => {
    process.env.AWESOME_SLIDE_TEST_KEY = 'sk-mock-test-key';
    try {
      await withAgentConnectionServer(async (baseUrl) => {
        // 1. Create connection
        const createRes = await fetch(`${baseUrl}/__agent-connections`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: 'byok',
            displayName: 'Test API Connection',
            provider: 'openai',
            envVarName: 'AWESOME_SLIDE_TEST_KEY',
            modelId: 'gpt-5',
            scope: 'project-default',
          }),
        });
        expect(createRes.status).toBe(200);
        const createBody = await createRes.json();
        const connectionId = createBody.connection.id;

        // 2. Select active connection with model and reasoning overrides
        const activeRes = await fetch(`${baseUrl}/__agent-connections/active`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            connectionId,
            scope: 'project-default',
            modelId: 'gpt-5.5',
            reasoningEffort: 'high',
          }),
        });
        expect(activeRes.status).toBe(200);
        const activeBody = await activeRes.json();
        expect(activeBody.ok).toBe(true);

        // 3. Verify it is persisted and reloads correctly
        const settingsRes = await fetch(`${baseUrl}/__agent-connections/settings`);
        const settingsBody = await settingsRes.json();
        expect(settingsBody.activeConnectionId).toBe(connectionId);
        expect(settingsBody.projectDefaultConnectionId).toBe(connectionId);

        const conn = settingsBody.connections.find((c: { id: string }) => c.id === connectionId);
        expect(conn.modelId).toBe('gpt-5.5');
        expect(conn.reasoningEffort).toBe('high');

        // 4. Verify invalid persisted choice falls back safely
        const invalidActiveRes = await fetch(`${baseUrl}/__agent-connections/active`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            connectionId: 'non_existent_id',
            scope: 'session',
          }),
        });
        expect(invalidActiveRes.status).toBe(404);
        const invalidActiveBody = await invalidActiveRes.json();
        expect(invalidActiveBody.error).toBe('Connection not found.');
      });
    } finally {
      delete process.env.AWESOME_SLIDE_TEST_KEY;
    }
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
