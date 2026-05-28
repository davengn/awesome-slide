import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadUserConfig, openSlidePlugin } from './open-slide-plugin.ts';

const tempDirs: string[] = [];

async function tempWorkspace(): Promise<string> {
  const tmpRoot = path.join(process.cwd(), 'node_modules', '.tmp');
  await mkdir(tmpRoot, { recursive: true });
  const dir = await mkdtemp(path.join(tmpRoot, 'awesome-slide-plugin-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('loadUserConfig', () => {
  it('loads awesome-slide.config.ts first', async () => {
    const root = await tempWorkspace();
    await writeFile(path.join(root, 'awesome-slide.config.ts'), 'export default { port: 7001 };\n');

    await expect(loadUserConfig(root)).resolves.toMatchObject({ port: 7001 });
  });

  it('falls back to open-slide.config.ts', async () => {
    const root = await tempWorkspace();
    await writeFile(path.join(root, 'open-slide.config.ts'), 'export default { port: 7002 };\n');

    await expect(loadUserConfig(root)).resolves.toMatchObject({ port: 7002 });
  });

  it('uses the canonical config and warns when both config files exist', async () => {
    const root = await tempWorkspace();
    await writeFile(path.join(root, 'awesome-slide.config.ts'), 'export default { port: 7003 };\n');
    await writeFile(path.join(root, 'open-slide.config.ts'), 'export default { port: 7004 };\n');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(loadUserConfig(root)).resolves.toMatchObject({ port: 7003 });
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Both awesome-slide.config.ts and open-slide.config.ts exist'),
    );
  });
});

describe('openSlidePlugin compatibility', () => {
  it('resolves canonical and legacy virtual module IDs', () => {
    const plugin = openSlidePlugin({ userCwd: process.cwd(), config: {} });
    const resolveId = plugin.resolveId as (id: string) => string | null;

    expect(resolveId('virtual:awesome-slide/slides')).toBe('\0virtual:awesome-slide/slides');
    expect(resolveId('virtual:open-slide/slides')).toBe('\0virtual:open-slide/slides');
    expect(resolveId('virtual:awesome-slide/config')).toBe('\0virtual:awesome-slide/config');
    expect(resolveId('virtual:open-slide/config')).toBe('\0virtual:open-slide/config');
    expect(resolveId('virtual:awesome-slide/folders')).toBe('\0virtual:awesome-slide/folders');
    expect(resolveId('virtual:open-slide/folders')).toBe('\0virtual:open-slide/folders');
  });

  it('generates slide modules that listen to canonical and legacy HMR events', async () => {
    const root = await tempWorkspace();
    await mkdir(path.join(root, 'slides', 'intro'), { recursive: true });
    await writeFile(path.join(root, 'slides', 'intro', 'index.tsx'), 'export default [];\n');

    const plugin = openSlidePlugin({ userCwd: root, config: {} });
    const configure = plugin.config as (config: unknown, env: { command: 'serve' }) => void;
    configure({}, { command: 'serve' });
    const load = plugin.load as (id: string) => Promise<string | null>;

    const source = await load('\0virtual:awesome-slide/slides');

    expect(source).toContain('awesome-slide:slide-changed');
    expect(source).toContain('open-slide:slide-changed');
  });
});
