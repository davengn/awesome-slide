import { exec } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  discoverLocalAgentCandidates,
  isFullDiskPath,
  validateApprovedDirectory,
  validateManualAgentPath,
} from './agent-discovery.ts';

vi.mock('node:child_process', () => {
  return {
    exec: vi.fn(),
  };
});

let tempDir: string;

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'awesome-slide-agent-discovery-'));
});

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

describe('agent discovery', () => {
  it('discovers known commands through a bounded lookup registry', async () => {
    const candidates = await discoverLocalAgentCandidates({
      commandLookup: {
        lookup: (command) =>
          command === 'codex'
            ? { found: true, version: '0.13.4', pathLabel: 'C:\\Users\\Admin\\bin\\codex.exe' }
            : { found: false },
      },
    });

    const codex = candidates.find((candidate) => candidate.provider === 'codex');
    expect(codex?.status).toBe('installed');
    expect(codex?.version).toBe('0.13.4');
    expect(codex?.pathLabel).toContain('<user>');
  });

  it('rejects full-disk scan roots while allowing approved nested directories', () => {
    expect(isFullDiskPath(path.parse(path.resolve(tempDir)).root)).toBe(true);
    expect(validateApprovedDirectory(path.parse(path.resolve(tempDir)).root).ok).toBe(false);
    expect(validateApprovedDirectory(tempDir).ok).toBe(true);
  });

  it('validates manual commands and existing project paths without broad scans', async () => {
    const project = await validateManualAgentPath(tempDir, 'project-path');
    expect(project.status).toBe('pass');

    const missing = await validateManualAgentPath(path.join(tempDir, 'missing.exe'), 'executable');
    expect(missing.status).toBe('fail');
  });

  it('runs command/executable and handles pass, incompatible protocol, timeout, and redaction', async () => {
    const mockedExec = vi.mocked(exec);

    // Case 1: Pass with version
    mockedExec.mockImplementationOnce((_cmd, opts, callback) => {
      const cb =
        typeof opts === 'function'
          ? (opts as (error: Error | null, stdout: string, stderr: string) => void)
          : (callback as unknown as (error: Error | null, stdout: string, stderr: string) => void);
      cb?.(null, 'codex-cli version v1.2.3\n', '');
      return null as unknown as import('node:child_process').ChildProcess;
    });
    const result = await validateManualAgentPath('codex', 'command');
    expect(result.status).toBe('pass');
    expect(result.version).toBe('1.2.3');

    // Case 2: Incompatible protocol
    mockedExec.mockImplementationOnce((_cmd, opts, callback) => {
      const cb =
        typeof opts === 'function'
          ? (opts as (error: Error | null, stdout: string, stderr: string) => void)
          : (callback as unknown as (error: Error | null, stdout: string, stderr: string) => void);
      cb?.(null, 'unknown protocol format version 0.1\n', '');
      return null as unknown as import('node:child_process').ChildProcess;
    });
    const resultIncompat = await validateManualAgentPath('codex', 'command');
    expect(resultIncompat.status).toBe('fail');
    expect(resultIncompat.message).toContain('Incompatible agent protocol');

    // Case 3: Timeout
    mockedExec.mockImplementationOnce((_cmd, opts, callback) => {
      const cb =
        typeof opts === 'function'
          ? (opts as (error: Error | null, stdout: string, stderr: string) => void)
          : (callback as unknown as (error: Error | null, stdout: string, stderr: string) => void);
      const err = new Error('Execution timed out') as Error & { signal?: string };
      err.signal = 'SIGTERM';
      cb?.(err, '', '');
      return null as unknown as import('node:child_process').ChildProcess;
    });
    const resultTimeout = await validateManualAgentPath('codex', 'command');
    expect(resultTimeout.status).toBe('fail');
    expect(resultTimeout.message).toContain('Validation timed out');

    // Case 4: Redacted output
    mockedExec.mockImplementationOnce((_cmd, opts, callback) => {
      const cb =
        typeof opts === 'function'
          ? (opts as (error: Error | null, stdout: string, stderr: string) => void)
          : (callback as unknown as (error: Error | null, stdout: string, stderr: string) => void);
      cb?.(null, 'Connected to secret key: sk-abc123xyz789\n', '');
      return null as unknown as import('node:child_process').ChildProcess;
    });
    const resultRedact = await validateManualAgentPath('codex', 'command');
    expect(resultRedact.diagnostics).not.toContain('sk-abc123xyz789');
    expect(resultRedact.diagnostics).toContain('key=<redacted>');
  });
});
