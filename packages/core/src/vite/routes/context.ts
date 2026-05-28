import type { ServerResponse } from 'node:http';
import path from 'node:path';
import type { Connect } from 'vite';
import { SLIDE_ID_RE } from '../../editing/slide-ops.ts';

export type ApiContext = {
  userCwd: string;
  slidesDir: string;
  slidesRoot: string;
  themesRoot: string;
  globalAssetsRoot: string;
  manifestPath: string;
};

export type ApiPluginOptions = {
  userCwd: string;
  slidesDir?: string;
  themesDir?: string;
  assetsDir?: string;
};

export function makeContext(opts: ApiPluginOptions): ApiContext {
  const userCwd = opts.userCwd;
  const slidesDir = opts.slidesDir ?? 'slides';
  const themesDir = opts.themesDir ?? 'themes';
  const assetsDir = opts.assetsDir ?? 'assets';
  const slidesRoot = path.resolve(userCwd, slidesDir);
  const themesRoot = path.resolve(userCwd, themesDir);
  const globalAssetsRoot = path.resolve(userCwd, assetsDir);
  const manifestPath = path.join(slidesRoot, '.folders.json');
  return { userCwd, slidesDir, slidesRoot, themesRoot, globalAssetsRoot, manifestPath };
}

export async function readBody(req: Connect.IncomingMessage): Promise<unknown> {
  return await new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

export function json(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

export function resolveSlideEntryPath(ctx: ApiContext, slideId: string): string | null {
  if (!SLIDE_ID_RE.test(slideId)) return null;
  const full = path.resolve(ctx.slidesRoot, slideId, 'index.tsx');
  if (!full.startsWith(ctx.slidesRoot + path.sep)) return null;
  return full;
}
