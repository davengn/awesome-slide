import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { appendAuditEntry } from './agent-audit.ts';

const TEMP_PROJECT_ROOT = path.join(__dirname, '../../../../.awesome-slide/agent-chat/test-temp');

describe('Agent Audit Logger', () => {
  beforeEach(async () => {
    await fs.rm(TEMP_PROJECT_ROOT, { recursive: true, force: true });
  });

  it('appends redacted audit entries to audit.jsonl', async () => {
    const entry = await appendAuditEntry(TEMP_PROJECT_ROOT, {
      prompt: 'Make slide prettier with apiKey="supersecret"',
      contextSummary: 'Slide intro',
      proposalSummary: 'Redesign layout',
      appliedFiles: ['slides/intro/index.tsx'],
      operationKinds: ['patch-slide-source'],
      connection: {
        connectionId: 'local-codex',
        displayName: 'Codex',
        type: 'local-agent',
        modelOrAgent: 'codex',
        status: 'ready',
      },
      validationSummary: 'All checks passed',
    });

    expect(entry.id).toBeDefined();
    expect(entry.timestamp).toBeDefined();
    expect(entry.prompt).toBe('Make slide prettier with apiKey=<redacted>');

    const auditFilePath = path.join(TEMP_PROJECT_ROOT, '.awesome-slide/agent-chat/audit.jsonl');
    const fileContent = await fs.readFile(auditFilePath, 'utf-8');
    const lines = fileContent.trim().split('\n');
    expect(lines).toHaveLength(1);

    const parsed = JSON.parse(lines[0]);
    expect(parsed.id).toBe(entry.id);
    expect(parsed.prompt).toBe('Make slide prettier with apiKey=<redacted>');
  });
});
