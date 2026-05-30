import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { normalizeCapabilities } from '../app/lib/agent-connections.ts';
import {
  createLocalAgentInvocation,
  IncompatibleLocalAgentError,
  runLocalAgentCli,
} from './local-agents.ts';

describe('local agent runtime definitions', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'awesome-slide-local-agent-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  const request = {
    runId: 'run_test',
    prompt: 'Improve this slide',
    context: { project: { name: 'Demo' } },
    workflows: [{ id: 'current-slide', contentHash: 'hash', instructions: 'Edit.' }],
    connectionId: 'conn_test',
    modelId: 'gpt-5',
    capabilities: normalizeCapabilities({ streaming: true, cancellation: true }),
    signal: new AbortController().signal,
  };

  it('builds Codex CLI non-interactive stdin invocations', () => {
    const invocation = createLocalAgentInvocation('codex', { provider: 'codex' }, request, tmpDir);

    expect(invocation.args).toEqual(
      expect.arrayContaining([
        'exec',
        '--cd',
        tmpDir,
        '--sandbox',
        'workspace-write',
        '--ask-for-approval',
        'never',
        '--color',
        'never',
        '--model',
        'gpt-5',
        '-',
      ]),
    );
    expect(invocation.input).toContain('Improve this slide');
    expect(invocation.input).toContain('<awesome-slide-context>');
  });

  it('builds Claude Code print-mode invocations', () => {
    const invocation = createLocalAgentInvocation(
      'claude',
      { provider: 'claude-code' },
      { ...request, modelId: 'sonnet' },
      tmpDir,
    );

    expect(invocation.args).toEqual(
      expect.arrayContaining([
        '--print',
        '--input-format',
        'text',
        '--output-format',
        'text',
        '--permission-mode',
        'acceptEdits',
        '--model',
        'sonnet',
      ]),
    );
    expect(invocation.input).toContain('Improve this slide');
  });

  it('rejects unknown local agents instead of using a generic fallback', () => {
    expect(() =>
      createLocalAgentInvocation('unknown-agent', { provider: 'unknown' }, request, tmpDir),
    ).toThrow(IncompatibleLocalAgentError);
  });

  it('streams stdout frames and cancellation hooks from a local process', async () => {
    const binPath = path.join(tmpDir, 'fake-codex.mjs');
    await fs.writeFile(
      binPath,
      `#!/usr/bin/env node
process.stdin.resume();
process.stdin.on('end', () => {
  process.stdout.write(JSON.stringify({ type: 'progress', payload: 'starting' }) + '\\n');
  process.stdout.write('hello');
});
`,
      'utf8',
    );
    await fs.chmod(binPath, 0o755);

    const events = [];
    for await (const event of runLocalAgentCli(binPath, { provider: 'codex' }, request, tmpDir)) {
      events.push(event);
    }

    expect(events.map((event) => event.type)).toEqual(['progress', 'text_delta', 'completed']);
  });
});
