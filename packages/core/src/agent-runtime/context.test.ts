import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { captureRuntimeContext } from './context.ts';

describe('agent-runtime context capture', () => {
  it('truncates source excerpts within the requested budget', () => {
    const snapshot = captureRuntimeContext({
      project: { rootPath: '/project', rootLabel: 'project' },
      maxBytes: 8,
      sourceExcerpts: [{ filePath: '/project/slides/intro.tsx', content: '0123456789' }],
      now: '2026-05-30T00:00:00.000Z',
    });

    expect(snapshot.source?.truncated).toBe(true);
    expect(snapshot.source?.totalBytes).toBe(8);
    expect(snapshot.source?.excerpts[0]?.content).toBe('01234567');
  });

  it('excludes hidden files and credential-like source content', () => {
    const snapshot = captureRuntimeContext({
      project: { rootPath: '/project' },
      sourceExcerpts: [
        { filePath: '/project/.env', content: 'OPENAI_API_KEY=supersecret' },
        { filePath: '/project/slides/intro.tsx', content: 'password=supersecret123' },
      ],
    });

    expect(snapshot.source?.excerpts).toHaveLength(1);
    expect(snapshot.source?.excerpts[0]?.content).not.toContain('supersecret123');
    expect(snapshot.redactionSummary).toEqual(['hidden-file-excluded', 'source-redacted']);
  });

  it('uses browser-safe relative labels instead of absolute paths', () => {
    const rootPath = path.join('/Users', 'ducduy', 'project');
    const snapshot = captureRuntimeContext({
      project: { rootPath },
      sourceExcerpts: [
        { filePath: path.join(rootPath, 'slides', 'intro.tsx'), content: 'export default null' },
        { filePath: '/private/tmp/outside.tsx', content: 'outside' },
      ],
    });

    expect(snapshot.project.rootLabel).toBe('project');
    expect(snapshot.source?.excerpts.map((excerpt) => excerpt.filePath)).toEqual([
      'slides/intro.tsx',
      'outside.tsx',
    ]);
  });
});
