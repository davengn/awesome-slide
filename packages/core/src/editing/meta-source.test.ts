import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { detectSourceState, patchMetaInSource, writeMetaPatch } from './meta-source.ts';

let tempDir: string;

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'awesome-slide-meta-'));
});

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

describe('detectSourceState', () => {
  it('reads supported object-literal metadata with TypeScript wrappers', () => {
    const result = detectSourceState(`
      export const meta = {
        title: 'Launch',
        description: \`Roadmap\`,
        tags: ['strategy', 'launch'],
        status: 'ready',
      } satisfies SlideMeta;

      export default [];
    `);

    expect(result).toEqual({
      state: 'supported',
      meta: {
        title: 'Launch',
        description: 'Roadmap',
        tags: ['strategy', 'launch'],
        status: 'ready',
      },
    });
  });

  it('distinguishes parse errors, missing meta, and unsupported shapes', () => {
    expect(detectSourceState('export const meta = { title: ;').state).toBe('parse-error');
    expect(detectSourceState('export default [];').state).toBe('missing');
    expect(
      detectSourceState(`
        const base = { title: 'Launch' };
        export const meta = { ...base };
        export default [];
      `),
    ).toMatchObject({
      state: 'readable-unsupported',
      meta: {},
    });
  });
});

describe('patchMetaInSource', () => {
  it('updates, inserts, and removes individual fields while preserving the module body', () => {
    const source = `import type { SlideMeta } from '@awesome-slide/core';

export const meta: SlideMeta = {
  title: 'Old',
  description: 'Remove me',
};

export const notes = ['Speaker note'];
export default [];
`;

    const updated = patchMetaInSource(source, {
      title: 'New',
      description: null,
      tags: ['strategy', 'launch'],
    });

    expect(updated).toContain("title: 'New'");
    expect(updated).not.toContain('description');
    expect(updated).toContain('tags: ["strategy","launch"]');
    expect(updated).toContain("export const notes = ['Speaker note'];");
  });

  it('inserts a missing meta export before export default', () => {
    const updated = patchMetaInSource('const helper = 1;\n\nexport default [];\n', {
      title: 'New slide',
      status: 'draft',
    });

    expect(updated).toBe(`const helper = 1;

export const meta = {
  title: 'New slide',
  status: 'draft'
};

export default [];
`);
  });

  it('returns null when a safe insertion point is unavailable', () => {
    expect(patchMetaInSource('const helper = 1;\n', { title: 'New slide' })).toBeNull();
  });
});

describe('writeMetaPatch', () => {
  it('writes metadata patches to disk', async () => {
    const file = path.join(tempDir, 'index.tsx');
    await fs.writeFile(
      file,
      `export const meta = {
  title: 'Old',
};

export default [];
`,
      'utf8',
    );

    await expect(writeMetaPatch(file, { title: 'Saved' })).resolves.toEqual({ ok: true });
    await expect(fs.readFile(file, 'utf8')).resolves.toContain("title: 'Saved'");
  });
});
