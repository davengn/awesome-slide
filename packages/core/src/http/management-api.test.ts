import fs from 'node:fs/promises';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import type { ViteDevServer } from 'vite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { registerManagementRoutes } from './management-api.ts';

let tempDir: string;

type MountedHandler = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  next: () => void,
) => void | Promise<void>;

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'awesome-slide-management-api-'));
  await fs.mkdir(path.join(tempDir, 'slides'), { recursive: true });
  await fs.mkdir(path.join(tempDir, 'themes'), { recursive: true });
});

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

describe('management API routes', () => {
  it('validates folder create requests and rejects duplicate names', async () => {
    await withManagementServer(async (baseUrl) => {
      const invalid = await postJson(`${baseUrl}/__management/folders`, { name: 'Story' });
      expect(invalid.status).toBe(400);
      await expect(invalid.json()).resolves.toMatchObject({ error: 'invalid icon' });

      const first = await postJson(`${baseUrl}/__management/folders`, {
        name: 'Story',
        icon: { type: 'color', value: '#123456' },
      });
      expect(first.status).toBe(200);

      const duplicate = await postJson(`${baseUrl}/__management/folders`, {
        name: 'story',
        icon: { type: 'color', value: '#abcdef' },
      });
      expect(duplicate.status).toBe(409);
      await expect(duplicate.json()).resolves.toMatchObject({
        error: 'folder name already exists',
      });
    });
  });

  it('blocks slide-owned metadata writes for readable unsupported source', async () => {
    await writeSlide(
      'intro',
      `const base = { title: 'Intro' };
export const meta = { ...base };
export default [];
`,
    );

    await withManagementServer(async (baseUrl) => {
      const response = await patchJson(`${baseUrl}/__management/slides/intro/metadata`, {
        title: 'New title',
      });

      expect(response.status).toBe(422);
      await expect(response.json()).resolves.toMatchObject({
        error: 'unsupported source shape for metadata write',
        code: 'UNSUPPORTED_SOURCE',
      });
    });
  });

  it('rejects invalid manual order permutations', async () => {
    await writeSlide('intro', "export const meta = { title: 'Intro' };\nexport default [];\n");
    await writeSlide('summary', "export const meta = { title: 'Summary' };\nexport default [];\n");
    await fs.writeFile(
      path.join(tempDir, 'slides', '.folders.json'),
      JSON.stringify(
        {
          folders: [{ id: 'f-11111111', name: 'Story', icon: { type: 'color', value: '#123456' } }],
          assignments: { intro: 'f-11111111', summary: 'f-11111111' },
          decks: [],
          manualOrder: {},
        },
        null,
        2,
      ),
      'utf8',
    );

    await withManagementServer(async (baseUrl) => {
      const response = await putJson(`${baseUrl}/__management/collections/order`, {
        collection: { type: 'folder', folderId: 'f-11111111' },
        slideIds: ['intro'],
      });

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({ error: 'invalid order' });
    });
  });
});

async function withManagementServer(run: (baseUrl: string) => Promise<void>): Promise<void> {
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

  registerManagementRoutes(fakeServer, {
    userCwd: tempDir,
    slidesDir: 'slides',
    slidesRoot: path.join(tempDir, 'slides'),
    themesRoot: path.join(tempDir, 'themes'),
    globalAssetsRoot: path.join(tempDir, 'assets'),
    manifestPath: path.join(tempDir, 'slides', '.folders.json'),
  });

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

async function writeSlide(slideId: string, source: string): Promise<void> {
  const dir = path.join(tempDir, 'slides', slideId);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'index.tsx'), source, 'utf8');
}

function postJson(url: string, body: unknown): Promise<Response> {
  return jsonRequest(url, 'POST', body);
}

function patchJson(url: string, body: unknown): Promise<Response> {
  return jsonRequest(url, 'PATCH', body);
}

function putJson(url: string, body: unknown): Promise<Response> {
  return jsonRequest(url, 'PUT', body);
}

function jsonRequest(url: string, method: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}
