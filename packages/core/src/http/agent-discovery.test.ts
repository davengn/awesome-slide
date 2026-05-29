import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  discoverLocalAgentCandidates,
  isFullDiskPath,
  validateApprovedDirectory,
  validateManualAgentPath,
} from './agent-discovery.ts';

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
    const command = await validateManualAgentPath('codex', 'command');
    expect(command.status).toBe('pass');
    expect(command.provider).toBe('codex');

    const project = await validateManualAgentPath(tempDir, 'project-path');
    expect(project.status).toBe('pass');

    const missing = await validateManualAgentPath(path.join(tempDir, 'missing.exe'), 'executable');
    expect(missing.status).toBe('fail');
  });
});
