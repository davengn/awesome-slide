import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { init, sanitizeDirName } from './init.ts';

const tempDirs: string[] = [];

async function makeTempDir() {
  const dir = await mkdtemp(join(tmpdir(), 'awesome-slide-init-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('sanitizeDirName', () => {
  it('leaves safe names untouched', () => {
    expect(sanitizeDirName('my-slides')).toBe('my-slides');
    expect(sanitizeDirName('decks/2026-q2')).toBe('decks/2026-q2');
    expect(sanitizeDirName('Open_Slide.workspace')).toBe('Open_Slide.workspace');
  });

  it('preserves "." and ".."', () => {
    expect(sanitizeDirName('.')).toBe('.');
    expect(sanitizeDirName('..')).toBe('..');
  });

  it('replaces spaces with hyphens', () => {
    expect(sanitizeDirName('future of open slide and how can i help')).toBe(
      'future-of-open-slide-and-how-can-i-help',
    );
  });

  it('collapses runs of whitespace into a single hyphen', () => {
    expect(sanitizeDirName('foo   bar\tbaz')).toBe('foo-bar-baz');
  });

  it('replaces shell-unfriendly characters', () => {
    expect(sanitizeDirName("my deck's notes")).toBe('my-deck-s-notes');
    expect(sanitizeDirName('cool$deck')).toBe('cool-deck');
    expect(sanitizeDirName('a&b|c;d')).toBe('a-b-c-d');
  });

  it('trims leading and trailing hyphens', () => {
    expect(sanitizeDirName('  hello  ')).toBe('hello');
    expect(sanitizeDirName('!!!hi!!!')).toBe('hi');
  });

  it('falls back to "my-slides" when nothing usable remains', () => {
    expect(sanitizeDirName('!!!')).toBe('my-slides');
    expect(sanitizeDirName('   ')).toBe('my-slides');
  });

  it('keeps path separators intact', () => {
    expect(sanitizeDirName('decks/my new deck')).toBe('decks/my-new-deck');
  });

  it('is idempotent', () => {
    const cases = [
      'future of open slide and how can i help',
      "my deck's notes",
      'decks/my new deck',
      '!!!hi!!!',
      '!!!',
      '.',
      '..',
    ];
    for (const input of cases) {
      const once = sanitizeDirName(input);
      const twice = sanitizeDirName(once);
      expect(twice).toBe(once);
    }
  });

  it('preserves a trailing path separator', () => {
    expect(sanitizeDirName('foo bar/')).toBe('foo-bar/');
  });

  it('collapses hyphens on both sides of a path separator', () => {
    expect(sanitizeDirName('a-/-b')).toBe('a/b');
    expect(sanitizeDirName('decks---/---my deck')).toBe('decks/my-deck');
  });

  it('preserves non-ASCII letters and digits', () => {
    expect(sanitizeDirName('投影片')).toBe('投影片');
    expect(sanitizeDirName('スライド')).toBe('スライド');
    expect(sanitizeDirName('café')).toBe('café');
    expect(sanitizeDirName('我的 投影片')).toBe('我的-投影片');
  });

  it('preserves Windows backslash separators', () => {
    expect(sanitizeDirName('slides\\q2')).toBe('slides\\q2');
    expect(sanitizeDirName('decks\\my new deck')).toBe('decks\\my-new-deck');
    expect(sanitizeDirName('a-\\-b')).toBe('a\\b');
  });

  it('falls back when sanitization would produce a root-like path', () => {
    expect(sanitizeDirName('!!!/!!!')).toBe('my-slides');
    expect(sanitizeDirName('!!!\\!!!')).toBe('my-slides');
    expect(sanitizeDirName('//')).toBe('my-slides');
  });
});

describe('init', () => {
  it('scaffolds the canonical Awesome Slide starter', async () => {
    const target = await makeTempDir();
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await init({
      dir: target,
      force: true,
      name: 'launch-deck',
      packageManager: 'pnpm',
      install: false,
      git: false,
      locale: 'en',
    });

    const pkg = JSON.parse(await readFile(join(target, 'package.json'), 'utf8')) as {
      name: string;
      scripts: Record<string, string>;
      dependencies: Record<string, string>;
    };
    expect(pkg.name).toBe('launch-deck');
    expect(pkg.scripts).toMatchObject({
      dev: 'awesome-slide dev',
      build: 'awesome-slide build',
      preview: 'awesome-slide preview',
      'sync:skills': 'awesome-slide sync:skills',
    });
    expect(pkg.dependencies['@awesome-slide/core']).toBe('^0.0.0');
    expect(pkg.dependencies).not.toHaveProperty('@open-slide/core');

    const tsconfig = JSON.parse(await readFile(join(target, 'tsconfig.json'), 'utf8')) as {
      compilerOptions: { types: string[] };
      include: string[];
    };
    expect(tsconfig.compilerOptions.types).toEqual(['@awesome-slide/core/env']);
    expect(tsconfig.include).toEqual(['slides/**/*', 'awesome-slide.config.ts']);

    expect(existsSync(join(target, 'awesome-slide.config.ts'))).toBe(true);
    expect(existsSync(join(target, 'open-slide.config.ts'))).toBe(false);

    const config = await readFile(join(target, 'awesome-slide.config.ts'), 'utf8');
    expect(config).toContain("import type { AwesomeSlideConfig } from '@awesome-slide/core';");
    expect(config).toContain('const awesomeSlideConfig: AwesomeSlideConfig = {};');

    const readme = await readFile(join(target, 'README.md'), 'utf8');
    expect(readme).toContain('# Awesome Slide workspace');
    expect(readme).toContain('@awesome-slide/core');
    expect(readme).toContain('awesome-slide.config.ts');
    expect(readme).not.toContain('open-slide workspace');

    const welcomeSlide = await readFile(join(target, 'slides/getting-started/index.tsx'), 'utf8');
    expect(welcomeSlide).toContain('Created Awesome Slide workspace');
    expect(welcomeSlide).toContain('npx @awesome-slide/cli init my-slide');
  });
});
