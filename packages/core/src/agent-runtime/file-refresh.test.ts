import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { makeContext } from '../vite/routes/context.ts';
import { deriveRefreshPayload, deriveRefreshTargets } from './file-refresh.ts';

let tempDir: string;

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'awesome-slide-refresh-'));
  await fs.mkdir(path.join(tempDir, 'slides', 'intro', 'assets'), { recursive: true });
  await fs.mkdir(path.join(tempDir, 'themes'), { recursive: true });
  await fs.mkdir(path.join(tempDir, 'assets'), { recursive: true });
  await fs.writeFile(path.join(tempDir, 'slides', 'intro', 'index.tsx'), 'slide', 'utf8');
  await fs.writeFile(path.join(tempDir, 'slides', 'intro', 'assets', 'chart.png'), 'asset', 'utf8');
  await fs.writeFile(path.join(tempDir, 'slides', '.folders.json'), '{"decks":[]}', 'utf8');
  await fs.writeFile(path.join(tempDir, 'themes', 'launch.ts'), 'theme', 'utf8');
  await fs.writeFile(path.join(tempDir, 'assets', 'logo.png'), 'global', 'utf8');
});

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

describe('file refresh target derivation', () => {
  it('returns slide refresh targets with source version hints', async () => {
    const ctx = makeContext({ userCwd: tempDir });
    const targets = await deriveRefreshTargets(ctx, [
      path.join(tempDir, 'slides', 'intro', 'index.tsx'),
    ]);

    expect(targets).toEqual([
      expect.objectContaining({
        relativePath: 'slides/intro/index.tsx',
        refreshKind: 'slide',
        slideId: 'intro',
      }),
    ]);
    expect(targets[0]?.sourceVersion).toMatch(/^\d+-\d+$/);
  });

  it('classifies deck, theme, asset, and management-index changes', async () => {
    const ctx = makeContext({ userCwd: tempDir });
    const payload = await deriveRefreshPayload(ctx, [
      'decks/d-12345678',
      'themes/launch.ts',
      'assets/logo.png',
      'slides/intro/assets/chart.png',
      path.join(tempDir, 'slides', '.folders.json'),
    ]);

    expect(payload.decks).toEqual(['d-12345678']);
    expect(payload.themes).toEqual(['launch.ts']);
    expect(payload.assets).toEqual(['assets/logo.png', 'slides/intro/assets/chart.png']);
    expect(payload.slides).toEqual(['intro']);
    expect(payload.managementIndex).toBe(true);
    expect(payload.targets.map((target) => target.refreshKind)).toEqual([
      'deck',
      'theme',
      'asset',
      'asset',
      'management-index',
    ]);
  });
});
