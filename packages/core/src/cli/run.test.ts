import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { createRuntimeProgram, parsePort } from './run.ts';

describe('parsePort', () => {
  it('accepts valid integer ports', () => {
    expect(parsePort('0')).toBe(0);
    expect(parsePort('80')).toBe(80);
    expect(parsePort('5173')).toBe(5173);
    expect(parsePort('65535')).toBe(65535);
  });

  it('rejects non-numeric input', () => {
    expect(() => parsePort('abc')).toThrow(/Invalid port/);
    expect(() => parsePort('80x')).toThrow(/Invalid port/);
  });

  it('rejects out-of-range ports', () => {
    expect(() => parsePort('-1')).toThrow(/Invalid port/);
    expect(() => parsePort('65536')).toThrow(/Invalid port/);
    expect(() => parsePort('100000')).toThrow(/Invalid port/);
  });

  it('rejects non-integer numbers', () => {
    expect(() => parsePort('80.5')).toThrow(/Invalid port/);
  });
});

describe('runtime CLI branding', () => {
  it('uses awesome-slide in help output', () => {
    const help = createRuntimeProgram('0.0.0', '/tmp/skills').helpInformation();

    expect(help).toContain('Usage: awesome-slide');
    expect(help).toContain('Sync built-in skills from @awesome-slide/core');
  });

  it('exposes canonical and legacy binaries', async () => {
    const pkg = JSON.parse(
      await readFile(new URL('../../package.json', import.meta.url), 'utf8'),
    ) as { bin: Record<string, string> };

    expect(pkg.bin).toMatchObject({
      'awesome-slide': './bin.js',
      'open-slide': './bin.js',
    });
  });
});
