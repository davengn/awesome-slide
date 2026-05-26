import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { currentPlugin } from './current-plugin.ts';

const tempDirs: string[] = [];

async function tempWorkspace(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'awesome-slide-current-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('currentPlugin', () => {
  it('listens on canonical and legacy current events and writes both state paths', async () => {
    const root = await tempWorkspace();
    const handlers = new Map<string, (payload: unknown) => Promise<void>>();
    const plugin = currentPlugin({ userCwd: root });
    const configureServer = plugin.configureServer as (server: unknown) => void;

    configureServer({
      ws: {
        on(event: string, handler: (payload: unknown) => Promise<void>) {
          handlers.set(event, handler);
        },
      },
    });

    expect(handlers.has('awesome-slide:current')).toBe(true);
    expect(handlers.has('open-slide:current')).toBe(true);

    await handlers.get('awesome-slide:current')?.({
      slideId: 'intro',
      pageIndex: 1,
      totalPages: 3,
      slideTitle: 'Intro',
      view: 'slides',
    });

    const canonical = JSON.parse(
      await readFile(path.join(root, 'node_modules', '.awesome-slide', 'current.json'), 'utf8'),
    ) as { slideId: string; pageNumber: number };
    const legacy = JSON.parse(
      await readFile(path.join(root, 'node_modules', '.open-slide', 'current.json'), 'utf8'),
    ) as { slideId: string; pageNumber: number };

    expect(canonical).toMatchObject({ slideId: 'intro', pageNumber: 2 });
    expect(legacy).toMatchObject({ slideId: 'intro', pageNumber: 2 });
  });
});
