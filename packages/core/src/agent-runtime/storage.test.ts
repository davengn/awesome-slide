import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createAgentRuntimeStorage, runtimeStorageRootForProject } from './storage.ts';
import { createTestConversation, createTestEvent, createTestRun } from './test-helpers.ts';

describe('agent-runtime storage', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'awesome-slide-agent-runtime-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('uses .awesome-slide/agent-chat under the project root by default', () => {
    expect(runtimeStorageRootForProject(tmpDir)).toBe(
      path.join(tmpDir, '.awesome-slide', 'agent-chat'),
    );
    const storage = createAgentRuntimeStorage({ projectRoot: tmpDir });
    expect(storage.storageRoot).toBe(path.join(tmpDir, '.awesome-slide', 'agent-chat'));
  });

  it('bounds conversation history and event history', async () => {
    const storage = createAgentRuntimeStorage({
      storageRoot: path.join(tmpDir, 'store'),
      maxEvents: 2,
      maxMessages: 2,
    });

    await storage.writeConversation(
      createTestConversation({ messageIds: ['msg_1', 'msg_2', 'msg_3'] }),
    );
    await storage.appendRunEvent('run_test', createTestEvent({ sequence: 1, type: 'queued' }));
    await storage.appendRunEvent('run_test', createTestEvent({ sequence: 2, type: 'progress' }));
    await storage.appendRunEvent('run_test', createTestEvent({ sequence: 3, type: 'completed' }));

    expect((await storage.readConversation('conv_test'))?.messageIds).toEqual(['msg_2', 'msg_3']);
    expect((await storage.listRunEvents('run_test')).map((event) => event.sequence)).toEqual([
      2, 3,
    ]);
  });

  it('redacts persisted runs and events', async () => {
    const storage = createAgentRuntimeStorage({ storageRoot: path.join(tmpDir, 'store') });
    await storage.writeRun(
      createTestRun({
        prompt: 'use token=abcdefghijk and /Users/ducduy/.env',
      }),
    );
    await storage.appendRunEvent(
      'run_test',
      createTestEvent({
        payload: { diagnostics: 'Bearer abcdefghijk from /Users/ducduy/.config' },
      }),
    );

    const runRaw = await fs.readFile(path.join(storage.paths.runs, 'run_test.json'), 'utf8');
    const eventsRaw = await fs.readFile(path.join(storage.paths.events, 'run_test.json'), 'utf8');

    expect(runRaw).not.toContain('abcdefghijk');
    expect(runRaw).not.toContain('/Users/ducduy');
    expect(eventsRaw).not.toContain('abcdefghijk');
    expect(eventsRaw).not.toContain('/Users/ducduy');
  });

  it('returns null for missing records and rejects malformed runtime state', async () => {
    const storage = createAgentRuntimeStorage({ storageRoot: path.join(tmpDir, 'store') });

    expect(await storage.readRun('missing_run')).toBeNull();

    await fs.mkdir(storage.paths.runs, { recursive: true });
    await fs.writeFile(path.join(storage.paths.runs, 'run_bad.json'), '{bad json', 'utf8');

    await expect(storage.readRun('run_bad')).rejects.toThrow();
  });

  it('preserves concurrent event appends for one run', async () => {
    const storage = createAgentRuntimeStorage({ storageRoot: path.join(tmpDir, 'store') });
    const events = Array.from({ length: 12 }, (_, index) =>
      createTestEvent({
        sequence: index + 1,
        type: index === 11 ? 'completed' : 'progress',
        payload: `event-${index + 1}`,
      }),
    );

    await Promise.all(events.map((event) => storage.appendRunEvent('run_test', event)));

    expect((await storage.listRunEvents('run_test')).map((event) => event.sequence)).toEqual(
      events.map((event) => event.sequence),
    );
  });
});
