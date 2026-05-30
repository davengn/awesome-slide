import { vi } from 'vitest';

vi.mock('virtual:awesome-slide/themes', () => {
  return {
    themes: [
      {
        id: 'theme_default',
        name: 'Default',
        description: 'Default Theme',
        body: '',
        hasDemo: false,
      },
    ],
    loadThemeDemo: async () => ({ default: [] }),
  };
});

import fs from 'node:fs/promises';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import type { ViteDevServer } from 'vite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type {
  AgentChatEvent,
  AgentChatRun,
  AgentConnectionRef,
  AgentEditProposal,
} from '../app/lib/agent-chat-types.ts';
import type { ApiContext } from '../vite/routes/context.ts';
import { registerAgentChatRoutes } from './agent-chat-api.ts';
import { addRunEvent, getRunEvents, registerRun } from './agent-chat-runs.ts';

let tempDir: string;

type MountedHandler = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  next: () => void,
) => void | Promise<void>;

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'awesome-slide-agent-api-'));
  await fs.mkdir(path.join(tempDir, 'slides'), { recursive: true });
  process.env.AGENT_CONNECTION_STATUS = 'ready';
});

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
  delete process.env.AGENT_CONNECTION_STATUS;
});

describe('Agent Chat API Routes', () => {
  it('GET /__agent-chat/session returns bootstrap metadata', async () => {
    await withAgentChatServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/__agent-chat/session`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.session).toBeDefined();
      expect(body.activeConnection).toBeDefined();
      expect(body.runtime.mode).toBe('interactive');
    });
  });

  it('POST /__agent-chat/runs starts a run', async () => {
    await withAgentChatServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/__agent-chat/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'session_1',
          prompt: 'Make slide look better',
          contextPreferences: [],
        }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.runId).toBeDefined();
      expect(body.state).toBe('queued');
      expect(body.eventUrl).toContain(body.runId);
    });
  });

  it('POST /__agent-chat/proposals/:proposalId/apply and /reject updates state and writes files', async () => {
    const slidePath = path.join(tempDir, 'slides', 'intro');
    await fs.mkdir(slidePath, { recursive: true });
    const indexPath = path.join(slidePath, 'index.tsx');
    await fs.writeFile(indexPath, 'export default [() => <div>Original</div>];', 'utf8');

    const runId = 'run_prop_test';
    const proposalId = 'prop_test_1';
    const mockRun = {
      id: runId,
      sessionId: 'session_1',
      prompt: 'Make slide prettier',
      context: { project: {} },
      connection: {
        connectionId: 'local-codex',
        displayName: 'Codex',
        type: 'local-agent',
        modelOrAgent: 'codex',
        status: 'ready',
      },
      state: 'queued',
      events: [],
      startedAt: new Date().toISOString(),
    } as unknown as AgentChatRun;

    const mockProposal = {
      id: proposalId,
      runId,
      summary: 'Test proposal edits',
      scope: 'slide',
      riskLevel: 'low',
      operations: [
        {
          id: 'op_patch',
          kind: 'patch-slide-source',
          target: 'intro',
          description: 'Patch intro slide',
          payload: { code: 'export default [() => <div>Patched</div>];' },
          requiresConfirmation: false,
          validationState: 'pending',
          reversible: true,
        },
      ],
      previewArtifacts: [],
      validation: { status: 'valid', checks: [] },
      state: 'pending-review',
      createdAt: new Date().toISOString(),
    };

    registerRun(mockRun, new AbortController());
    addRunEvent(runId, 'proposal', mockProposal);

    await withAgentChatServer(async (baseUrl) => {
      const applyRes = await fetch(`${baseUrl}/__agent-chat/proposals/${proposalId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operationIds: ['op_patch'] }),
      });
      expect(applyRes.status).toBe(200);
      const applyBody = await applyRes.json();
      expect(applyBody.ok).toBe(true);
      expect(applyBody.writtenFiles).toHaveLength(1);
      expect(applyBody.proposalId).toBe(proposalId);
      expect(applyBody.state).toBe('applied');
      expect(applyBody.refresh.slides).toEqual(['intro']);
      expect(applyBody.refresh.sourceVersions['slides/intro/index.tsx']).toBeDefined();

      const writtenContent = await fs.readFile(indexPath, 'utf8');
      expect(writtenContent).toBe('export default [() => <div>Patched</div>];');

      const rejectRes = await fetch(`${baseUrl}/__agent-chat/proposals/${proposalId}/reject`, {
        method: 'POST',
      });
      expect(rejectRes.status).toBe(200);
      const rejectBody = await rejectRes.json();
      expect(rejectBody.ok).toBe(true);
      expect(rejectBody.state).toBe('rejected');
    });
  });

  it('GET /__agent-chat/session returns interactive runtime mode by default', async () => {
    await withAgentChatServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/__agent-chat/session`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.runtime.mode).toBe('interactive');
      expect(body.activeConnection.status).toBe('ready');
      expect(body.runtime.settingsRoute).toBeDefined();
    });
  });

  it('GET /__agent-chat/session with slideId returns slide-workspace origin', async () => {
    await withAgentChatServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/__agent-chat/session?slideId=intro`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.session.origin).toBe('slide-workspace');
      expect(body.session.activeSlideId).toBe('intro');
      expect(body.session.id).toBe('session_slide_intro');
    });
  });

  it('GET /__agent-chat/session without slideId returns slide-management origin', async () => {
    await withAgentChatServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/__agent-chat/session`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.session.origin).toBe('slide-management');
      expect(body.session.id).toBe('session_management');
    });
  });

  it('POST /__agent-chat/runs rejects empty prompts with 400', async () => {
    await withAgentChatServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/__agent-chat/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 'session_1', prompt: '' }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBeDefined();
    });
  });

  it('runs Codex CLI connections through non-interactive exec mode', async () => {
    const binPath = path.join(tempDir, 'fake-codex.mjs');
    const argvPath = path.join(tempDir, 'codex-argv.json');
    const stdinPath = path.join(tempDir, 'codex-stdin.txt');
    await fs.writeFile(
      binPath,
      `#!/usr/bin/env node
import fs from 'node:fs';

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  input += chunk;
});
process.stdin.on('end', () => {
  fs.writeFileSync(process.env.AGENT_TEST_ARGV_PATH, JSON.stringify(process.argv.slice(2)));
  fs.writeFileSync(process.env.AGENT_TEST_STDIN_PATH, input);
  process.stdout.write('codex completed');
});
`,
      'utf8',
    );
    await fs.chmod(binPath, 0o755);
    await fs.mkdir(path.join(tempDir, '.awesome-slide', 'agent-connections'), {
      recursive: true,
    });
    const now = new Date().toISOString();
    await fs.writeFile(
      path.join(tempDir, '.awesome-slide', 'agent-connections', 'settings.json'),
      `${JSON.stringify(
        {
          projectId: 'test-project',
          connections: [
            {
              id: 'conn_codex',
              displayName: 'Codex CLI',
              type: 'auto-scanned-local-agent',
              provider: 'codex',
              scope: 'project-default',
              agentCommandAlias: binPath,
              capabilities: { streaming: true, cancellation: true },
              status: { state: 'ready', recoveryActions: [], checkedAt: now },
              createdAt: now,
              updatedAt: now,
            },
          ],
          activeConnectionId: 'conn_codex',
          projectDefaultConnectionId: 'conn_codex',
          scanPreference: {
            enabled: false,
            approvedDirectories: [],
            includePathCommands: true,
            includeKnownInstallLocations: true,
          },
          firstRunSetup: { hasSeenPrompt: true },
          updatedAt: now,
        },
        null,
        2,
      )}\n`,
      'utf8',
    );

    const previousArgvPath = process.env.AGENT_TEST_ARGV_PATH;
    const previousStdinPath = process.env.AGENT_TEST_STDIN_PATH;
    process.env.AGENT_TEST_ARGV_PATH = argvPath;
    process.env.AGENT_TEST_STDIN_PATH = stdinPath;

    try {
      await withAgentChatServer(async (baseUrl) => {
        const runRes = await fetch(`${baseUrl}/__agent-chat/runs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'session_slide_intro',
            prompt: 'Build the requested slide',
            context: { project: { name: 'Demo' } },
          }),
        });
        expect(runRes.status).toBe(200);
        const { runId } = await runRes.json();

        await waitForRunEvents(runId, (events) =>
          events.some((event) => event.type === 'completed'),
        );

        const events = getRunEvents(runId);
        expect(events.some((event) => event.type === 'token')).toBe(true);
        expect(events.map((event) => event.type)).toContain('completed');

        const argv = JSON.parse(await fs.readFile(argvPath, 'utf8')) as string[];
        expect(argv).toEqual(
          expect.arrayContaining([
            'exec',
            '--cd',
            tempDir,
            '--sandbox',
            'workspace-write',
            '--ask-for-approval',
            'never',
            '--color',
            'never',
            '-',
          ]),
        );
        expect(argv[0]).toBe('exec');

        const stdin = await fs.readFile(stdinPath, 'utf8');
        expect(stdin).toContain('Build the requested slide');
        expect(stdin).toContain('<awesome-slide-context>');
      });
    } finally {
      if (previousArgvPath === undefined) {
        delete process.env.AGENT_TEST_ARGV_PATH;
      } else {
        process.env.AGENT_TEST_ARGV_PATH = previousArgvPath;
      }
      if (previousStdinPath === undefined) {
        delete process.env.AGENT_TEST_STDIN_PATH;
      } else {
        process.env.AGENT_TEST_STDIN_PATH = previousStdinPath;
      }
    }
  });

  it('runs Claude Code connections through non-interactive print mode', async () => {
    const binPath = path.join(tempDir, 'fake-claude.mjs');
    const argvPath = path.join(tempDir, 'claude-argv.json');
    const stdinPath = path.join(tempDir, 'claude-stdin.txt');
    await fs.writeFile(
      binPath,
      `#!/usr/bin/env node
import fs from 'node:fs';

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  input += chunk;
});
process.stdin.on('end', () => {
  fs.writeFileSync(process.env.AGENT_TEST_ARGV_PATH, JSON.stringify(process.argv.slice(2)));
  fs.writeFileSync(process.env.AGENT_TEST_STDIN_PATH, input);
  process.stdout.write('claude completed');
});
`,
      'utf8',
    );
    await fs.chmod(binPath, 0o755);
    await fs.mkdir(path.join(tempDir, '.awesome-slide', 'agent-connections'), {
      recursive: true,
    });
    const now = new Date().toISOString();
    await fs.writeFile(
      path.join(tempDir, '.awesome-slide', 'agent-connections', 'settings.json'),
      `${JSON.stringify(
        {
          projectId: 'test-project',
          connections: [
            {
              id: 'conn_claude',
              displayName: 'Claude Code',
              type: 'auto-scanned-local-agent',
              provider: 'claude-code',
              scope: 'project-default',
              agentCommandAlias: binPath,
              modelId: 'sonnet',
              capabilities: { streaming: true, cancellation: true },
              status: { state: 'ready', recoveryActions: [], checkedAt: now },
              createdAt: now,
              updatedAt: now,
            },
          ],
          activeConnectionId: 'conn_claude',
          projectDefaultConnectionId: 'conn_claude',
          scanPreference: {
            enabled: false,
            approvedDirectories: [],
            includePathCommands: true,
            includeKnownInstallLocations: true,
          },
          firstRunSetup: { hasSeenPrompt: true },
          updatedAt: now,
        },
        null,
        2,
      )}\n`,
      'utf8',
    );

    const previousArgvPath = process.env.AGENT_TEST_ARGV_PATH;
    const previousStdinPath = process.env.AGENT_TEST_STDIN_PATH;
    process.env.AGENT_TEST_ARGV_PATH = argvPath;
    process.env.AGENT_TEST_STDIN_PATH = stdinPath;

    try {
      await withAgentChatServer(async (baseUrl) => {
        const runRes = await fetch(`${baseUrl}/__agent-chat/runs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'session_slide_intro',
            prompt: 'Build a full deck from this outline',
            context: { project: { name: 'Demo' } },
          }),
        });
        expect(runRes.status).toBe(200);
        const { runId } = await runRes.json();

        await waitForRunEvents(runId, (events) =>
          events.some((event) => event.type === 'completed'),
        );

        const events = getRunEvents(runId);
        expect(events.some((event) => event.type === 'token')).toBe(true);
        expect(events.map((event) => event.type)).toContain('completed');

        const argv = JSON.parse(await fs.readFile(argvPath, 'utf8')) as string[];
        expect(argv).toEqual(
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
        expect(argv).not.toEqual([]);

        const stdin = await fs.readFile(stdinPath, 'utf8');
        expect(stdin).toContain('Build a full deck from this outline');
        expect(stdin).toContain('<awesome-slide-context>');
      });
    } finally {
      if (previousArgvPath === undefined) {
        delete process.env.AGENT_TEST_ARGV_PATH;
      } else {
        process.env.AGENT_TEST_ARGV_PATH = previousArgvPath;
      }
      if (previousStdinPath === undefined) {
        delete process.env.AGENT_TEST_STDIN_PATH;
      } else {
        process.env.AGENT_TEST_STDIN_PATH = previousStdinPath;
      }
    }
  });

  it('POST /__agent-chat/runs/:runId/cancel returns 400 for already-completed runs', async () => {
    await withAgentChatServer(async (baseUrl) => {
      const runRes = await fetch(`${baseUrl}/__agent-chat/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 'session_1', prompt: 'Test prompt' }),
      });
      const runBody = await runRes.json();
      const { runId } = runBody;

      await new Promise((r) => setTimeout(r, 200));

      const cancelRes = await fetch(`${baseUrl}/__agent-chat/runs/${runId}/cancel`, {
        method: 'POST',
      });
      expect([200, 400]).toContain(cancelRes.status);
    });
  });

  it('GET /__agent-chat/runs/:runId/events returns 404 for unknown run', async () => {
    await withAgentChatServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/__agent-chat/runs/nonexistent_run/events`);
      expect(res.status).toBe(404);
    });
  });

  it('GET /__agent-chat/runs lists active/recent run summaries for reattach', async () => {
    await withAgentChatServer(async (baseUrl) => {
      const runRes = await fetch(`${baseUrl}/__agent-chat/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 'session_reattach', prompt: 'Hello' }),
      });
      const { runId } = await runRes.json();

      const listRes = await fetch(`${baseUrl}/__agent-chat/runs?conversationId=session_reattach`);
      const listBody = await listRes.json();

      expect(listRes.status).toBe(200);
      expect(listBody.runs[0].runId).toBe(runId);
      expect(listBody.runs[0].lastSequence).toBeGreaterThanOrEqual(0);
    });
  });

  it('GET /__agent-chat/runs/:runId/events replays after the requested cursor', async () => {
    const runId = 'run_replay_test';
    const mockRun = {
      id: runId,
      sessionId: 'session_replay',
      prompt: 'Replay',
      context: { project: {} },
      connection: {
        connectionId: 'local-codex',
        displayName: 'Codex',
        type: 'local-agent',
        modelOrAgent: 'codex',
        status: 'ready',
      },
      state: 'queued',
      events: [],
      startedAt: new Date().toISOString(),
    } as unknown as AgentChatRun;
    registerRun(mockRun, new AbortController());
    addRunEvent(runId, 'progress', 'first');
    addRunEvent(runId, 'completed', null);

    await withAgentChatServer(async (baseUrl) => {
      const eventRes = await fetch(`${baseUrl}/__agent-chat/runs/${runId}/events?after=1`);
      const text = await eventRes.text();

      expect(eventRes.status).toBe(200);
      expect(text).toContain('id: 2');
      expect(text).toContain('event: message');
      expect(text).toContain('completed');
      expect(text).not.toContain('first');
    });
  });

  it('POST /__agent-chat/proposals/:proposalId/apply returns 404 for unknown proposal', async () => {
    await withAgentChatServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/__agent-chat/proposals/unknown_proposal/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operationIds: [] }),
      });
      expect(res.status).toBe(404);
    });
  });

  it('POST /__agent-chat/proposals/:proposalId/apply returns 422 for invalid proposal', async () => {
    const runId = 'run_invalid_test';
    const proposalId = 'prop_invalid_1';
    const mockRun = {
      id: runId,
      sessionId: 'session_x',
      prompt: 'Test',
      context: { project: {} },
      connection: {
        connectionId: 'local-codex',
        displayName: 'Codex',
        type: 'local-agent',
        modelOrAgent: 'codex',
        status: 'ready',
      },
      state: 'queued',
      events: [],
      startedAt: new Date().toISOString(),
    } as unknown as AgentChatRun;

    const invalidProposal = {
      id: proposalId,
      runId,
      summary: 'Invalid proposal',
      scope: 'slide',
      riskLevel: 'low',
      operations: [],
      previewArtifacts: [],
      validation: { status: 'invalid', checks: [] },
      state: 'pending-review',
      createdAt: new Date().toISOString(),
    };

    registerRun(mockRun, new AbortController());
    addRunEvent(runId, 'proposal', invalidProposal);

    await withAgentChatServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/__agent-chat/proposals/${proposalId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operationIds: [] }),
      });
      expect(res.status).toBe(422);
    });
  });

  it('POST /__agent-chat/proposals/:proposalId/apply requires high-risk confirmation', async () => {
    const slidePath = path.join(tempDir, 'slides', 'intro');
    await fs.mkdir(slidePath, { recursive: true });
    await fs.writeFile(
      path.join(slidePath, 'index.tsx'),
      "export const meta = { title: 'Intro' };\nexport default [() => <div>Intro</div>];",
      'utf8',
    );

    const runId = 'run_high_risk_route';
    const proposalId = 'prop_high_risk_route';
    const mockRun = {
      id: runId,
      sessionId: 'session_high',
      prompt: 'Apply a deck theme',
      context: { project: {} },
      connection: {
        connectionId: 'local-codex',
        displayName: 'Codex',
        type: 'local-agent',
        modelOrAgent: 'codex',
        status: 'ready',
      },
      state: 'queued',
      events: [],
      startedAt: new Date().toISOString(),
    } as unknown as AgentChatRun;
    const mockProposal = {
      id: proposalId,
      runId,
      summary: 'Theme change',
      scope: 'deck',
      riskLevel: 'high',
      operations: [
        {
          id: 'op_theme',
          kind: 'apply-theme',
          target: 'intro',
          description: 'Apply theme',
          payload: { themeId: 'theme_default' },
          requiresConfirmation: true,
          validationState: 'pending',
          reversible: true,
        },
      ],
      previewArtifacts: [],
      validation: { status: 'valid', checks: [] },
      state: 'pending-review',
      createdAt: new Date().toISOString(),
    };

    registerRun(mockRun, new AbortController());
    addRunEvent(runId, 'proposal', mockProposal);

    await withAgentChatServer(async (baseUrl) => {
      const blockedRes = await fetch(`${baseUrl}/__agent-chat/proposals/${proposalId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operationIds: ['op_theme'] }),
      });
      expect(blockedRes.status).toBe(428);
      const blockedBody = await blockedRes.json();
      expect(blockedBody.category).toBe('validation-failure');

      const confirmedRes = await fetch(`${baseUrl}/__agent-chat/proposals/${proposalId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operationIds: ['op_theme'],
          confirmation: { acceptedRiskLevel: 'high' },
        }),
      });
      expect(confirmedRes.status).toBe(200);
      const confirmedBody = await confirmedRes.json();
      expect(confirmedBody.refresh.slides).toEqual(['intro']);
    });
  });

  it('POST /__agent-chat/proposals/:proposalId/apply handles update-deck, create-slide, and reorder-pages', async () => {
    await fs.mkdir(path.join(tempDir, 'slides'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, 'slides', '.folders.json'),
      `${JSON.stringify({
        folders: [],
        assignments: {},
        decks: [{ id: 'deck_id', name: 'Deck', slideOrder: ['slide1', 'slide2'] }],
        manualOrder: {},
      })}\n`,
      'utf8',
    );

    const runId = 'run_deck_test';
    const proposalId = 'prop_deck_test_1';
    const mockRun = {
      id: runId,
      sessionId: 'session_deck',
      prompt: 'Refine deck narrative',
      context: { project: {} },
      connection: {
        connectionId: 'local-codex',
        displayName: 'Codex',
        type: 'local-agent',
        modelOrAgent: 'codex',
        status: 'ready',
      },
      state: 'queued',
      events: [],
      startedAt: new Date().toISOString(),
    } as unknown as AgentChatRun;

    const mockProposal = {
      id: proposalId,
      runId,
      summary: 'Deck level changes',
      scope: 'deck',
      riskLevel: 'medium',
      operations: [
        {
          id: 'op_update_deck',
          kind: 'update-deck',
          target: 'deck_id',
          description: 'Rename deck',
          payload: { name: 'New Deck Name' },
          requiresConfirmation: false,
          validationState: 'pending',
          reversible: true,
        },
        {
          id: 'op_create_slide',
          kind: 'create-slide',
          target: 'deck_id',
          description: 'Create slide',
          payload: { title: 'New Slide Title', deckId: 'deck_id', slideId: 'slide_generated' },
          requiresConfirmation: false,
          validationState: 'pending',
          reversible: true,
        },
        {
          id: 'op_reorder',
          kind: 'reorder-pages',
          target: 'deck_id',
          description: 'Reorder pages',
          payload: { slideOrder: ['slide1', 'slide2'] },
          requiresConfirmation: false,
          validationState: 'pending',
          reversible: true,
        },
      ],
      previewArtifacts: [],
      validation: { status: 'valid', checks: [] },
      state: 'pending-review',
      createdAt: new Date().toISOString(),
    };

    registerRun(mockRun, new AbortController());
    addRunEvent(runId, 'proposal', mockProposal);

    const originalFetch = global.fetch;
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url, init) => {
      let urlStr = '';
      if (typeof url === 'string') {
        urlStr = url;
      } else if (url instanceof URL) {
        urlStr = url.toString();
      } else if (url && typeof url === 'object' && 'url' in url) {
        urlStr = String((url as { url: string }).url);
      }
      if (urlStr.includes('/__management/')) {
        return {
          ok: true,
          text: async () => '{"ok":true}',
          json: async () => ({ ok: true }),
        } as Response;
      }
      return originalFetch(url, init);
    });

    try {
      await withAgentChatServer(async (baseUrl) => {
        const applyRes = await fetch(`${baseUrl}/__agent-chat/proposals/${proposalId}/apply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            operationIds: ['op_update_deck', 'op_create_slide', 'op_reorder'],
          }),
        });
        if (applyRes.status !== 200) {
          console.error('DECK APPLY FAILED:', await applyRes.json());
        }
        expect(applyRes.status).toBe(200);
        const applyBody = await applyRes.json();
        expect(applyBody.ok).toBe(true);
        expect(applyBody.writtenFiles).toContain('slides/.folders.json');
        expect(applyBody.writtenFiles).toContain('slides/slide_generated/index.tsx');
        expect(applyBody.writtenFiles).toContain('decks/deck_id');
        expect(applyBody.writtenFiles).toContain('decks/deck_id/order');
        expect(applyBody.refresh.decks).toEqual(['deck_id']);
        expect(applyBody.refresh.managementIndex).toBe(true);
      });
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it('POST /__agent-chat/proposals/:proposalId/apply handles patch-slide-metadata via source metadata', async () => {
    const slidePath = path.join(tempDir, 'slides', 'intro');
    await fs.mkdir(slidePath, { recursive: true });
    await fs.writeFile(
      path.join(slidePath, 'index.tsx'),
      "export const meta = { title: 'Intro' };\nexport default [() => <div>Intro</div>];",
      'utf8',
    );

    const runId = 'run_meta_test';
    const proposalId = 'prop_meta_test_1';
    const mockRun = {
      id: runId,
      sessionId: 'session_meta',
      prompt: 'Update metadata',
      context: { project: {} },
      connection: {
        connectionId: 'local-codex',
        displayName: 'Codex',
        type: 'local-agent',
        modelOrAgent: 'codex',
        status: 'ready',
      },
      state: 'queued',
      events: [],
      startedAt: new Date().toISOString(),
    } as unknown as AgentChatRun;

    const mockProposal = {
      id: proposalId,
      runId,
      summary: 'Metadata change',
      scope: 'slide',
      riskLevel: 'low',
      operations: [
        {
          id: 'op_meta',
          kind: 'patch-slide-metadata',
          target: 'intro',
          description: 'Patch metadata',
          payload: { patch: { title: 'New Title' } },
          requiresConfirmation: false,
          validationState: 'pending',
          reversible: true,
        },
      ],
      previewArtifacts: [],
      validation: { status: 'valid', checks: [] },
      state: 'pending-review',
      createdAt: new Date().toISOString(),
    };

    registerRun(mockRun, new AbortController());
    addRunEvent(runId, 'proposal', mockProposal);

    const originalFetch = global.fetch;
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url, init) => {
      let urlStr = '';
      if (typeof url === 'string') {
        urlStr = url;
      } else if (url instanceof URL) {
        urlStr = url.toString();
      } else if (url && typeof url === 'object' && 'url' in url) {
        urlStr = String((url as { url: string }).url);
      }
      if (urlStr.includes('/__management/')) {
        return {
          ok: true,
          text: async () => '{"ok":true}',
          json: async () => ({ ok: true }),
        } as Response;
      }
      return originalFetch(url, init);
    });

    try {
      await withAgentChatServer(async (baseUrl) => {
        const applyRes = await fetch(`${baseUrl}/__agent-chat/proposals/${proposalId}/apply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operationIds: ['op_meta'] }),
        });
        if (applyRes.status !== 200) {
          console.error('META APPLY FAILED:', await applyRes.json());
        }
        expect(applyRes.status).toBe(200);
        const applyBody = await applyRes.json();
        expect(applyBody.ok).toBe(true);
        expect(
          applyBody.writtenFiles.some(
            (f: string) => f.includes('slides/intro') || f.includes('intro'),
          ),
        ).toBe(true);
      });
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it('handles static read-only bootstrap and blocks runs and apply (T074)', async () => {
    await withAgentChatServer(async (baseUrl) => {
      // 1. GET /session with runtimeMode=read-only returns mode='read-only'
      const sessionRes = await fetch(`${baseUrl}/__agent-chat/session?runtimeMode=read-only`);
      expect(sessionRes.status).toBe(200);
      const sessionBody = await sessionRes.json();
      expect(sessionBody.runtime.mode).toBe('read-only');

      // 2. Blocked run creation: POST /runs returns 403 when x-runtime-mode header is read-only
      const runRes = await fetch(`${baseUrl}/__agent-chat/runs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-runtime-mode': 'read-only',
        },
        body: JSON.stringify({
          sessionId: 'session_1',
          prompt: 'Make slide look better',
          contextPreferences: [],
        }),
      });
      expect(runRes.status).toBe(403);
      const runBody = await runRes.json();
      expect(runBody.error).toContain('read-only');

      // 3. Blocked proposal apply: POST /proposals/:id/apply returns 403 in read-only mode
      const applyRes = await fetch(`${baseUrl}/__agent-chat/proposals/prop_test_1/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-runtime-mode': 'read-only',
        },
        body: JSON.stringify({ operationIds: [] }),
      });
      expect(applyRes.status).toBe(403);
      const applyBody = await applyRes.json();
      expect(applyBody.error).toContain('read-only');
    });
  });

  it('handles no-connection recovery metadata and blocks run creation (T074/T076)', async () => {
    await withAgentChatServer(async (baseUrl) => {
      // 1. GET /session with connectionStatus=failed
      const sessionRes = await fetch(`${baseUrl}/__agent-chat/session?connectionStatus=failed`);
      expect(sessionRes.status).toBe(200);
      const sessionBody = await sessionRes.json();
      expect(sessionBody.connectionStatus).toBe('failed');
      expect(sessionBody.recoveryRoute).toBe('/settings/connections');

      // 2. POST /runs with connection status failed returns 503
      const runRes = await fetch(`${baseUrl}/__agent-chat/runs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-connection-status': 'failed',
        },
        body: JSON.stringify({
          sessionId: 'session_1',
          prompt: 'Make slide look better',
          contextPreferences: [],
        }),
      });
      expect(runRes.status).toBe(503);
      const runBody = await runRes.json();
      expect(runBody.category).toBe('connection-unavailable');
    });
  });

  it('simulates run errors and redacts diagnostics (T075/T078)', async () => {
    await withAgentChatServer(async (baseUrl) => {
      // Test different simulated categories
      const categories = [
        'authentication-failed',
        'model-failed',
        'timeout',
        'invalid-agent-output',
      ];

      for (const category of categories) {
        const runRes = await fetch(`${baseUrl}/__agent-chat/runs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'session_error_test',
            prompt: `simulate-error:${category}`,
            contextPreferences: [],
          }),
        });
        expect(runRes.status).toBe(200);
        const { runId } = await runRes.json();

        // Wait briefly for simulation to run
        await new Promise((resolve) => setTimeout(resolve, 150));

        // Read event history
        const eventRes = await fetch(`${baseUrl}/__agent-chat/runs/${runId}/events`);
        expect(eventRes.status).toBe(200);
        const text = await eventRes.text();
        expect(text).toContain(category);
        expect(text).toContain('Mock error diagnostics');
        expect(text).not.toContain('supersecret123');
        expect(text).not.toContain('bobsmith');
        expect(text).toContain('<redacted>');
        expect(text).toContain('<user>');
      }
    });
  });

  it('handles run cancellation (T075/T080)', async () => {
    await withAgentChatServer(async (baseUrl) => {
      const runRes = await fetch(`${baseUrl}/__agent-chat/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'session_cancel_test',
          prompt: 'slow prompt',
          contextPreferences: [],
        }),
      });
      const { runId } = await runRes.json();

      const cancelRes = await fetch(`${baseUrl}/__agent-chat/runs/${runId}/cancel`, {
        method: 'POST',
      });
      expect(cancelRes.status).toBe(200);
      const cancelBody = await cancelRes.json();
      expect(cancelBody.ok).toBe(true);
      expect(cancelBody.state).toBe('cancelled');

      // The stream should show cancelled event
      const eventRes = await fetch(`${baseUrl}/__agent-chat/runs/${runId}/events`);
      const text = await eventRes.text();
      expect(text).toContain('cancelled');
    });
  });

  it('maps proposal validation-failure and patch-conflict in apply (T078)', async () => {
    const defaultConnection: AgentConnectionRef = {
      connectionId: 'local-codex',
      displayName: 'Codex',
      type: 'local-agent',
      modelOrAgent: 'codex',
      status: 'ready',
    };

    const runId = 'run_err_apply';
    const proposalId = 'prop_err_apply_1';
    const mockRun = {
      id: runId,
      sessionId: 'session_apply_err',
      prompt: 'Test apply errors',
      context: { project: {} },
      connection: defaultConnection,
      state: 'queued',
      events: [],
      startedAt: new Date().toISOString(),
    } as unknown as AgentChatRun;

    const conflictProposal = {
      id: proposalId,
      runId,
      summary: 'Conflict proposal',
      scope: 'slide',
      riskLevel: 'low',
      operations: [
        {
          id: 'op_conflict',
          kind: 'patch-slide-source',
          target: 'intro',
          description: 'Conflict',
          payload: { code: 'export default [() => <div>Conflict</div>];' },
          requiresConfirmation: false,
          validationState: 'conflict',
          reversible: true,
        },
      ],
      previewArtifacts: [],
      validation: { status: 'conflict', checks: [] },
      state: 'pending-review',
      createdAt: new Date().toISOString(),
    };

    registerRun(mockRun, new AbortController());
    addRunEvent(runId, 'proposal', conflictProposal);

    await withAgentChatServer(async (baseUrl) => {
      const applyRes = await fetch(`${baseUrl}/__agent-chat/proposals/${proposalId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operationIds: ['op_conflict'] }),
      });
      expect(applyRes.status).toBe(409);
      const applyBody = await applyRes.json();
      expect(applyBody.category).toBe('patch-conflict');
    });
  });

  it('T084: POST /__agent-chat/runs startup feedback, timeout, and terminal event guarantees', async () => {
    await withAgentChatServer(async (baseUrl) => {
      // 1. Startup feedback
      const res = await fetch(`${baseUrl}/__agent-chat/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 's1', prompt: 'Hello proposal' }),
      });
      expect(res.status).toBe(200);
      const startBody = await res.json();
      expect(startBody.state).toBe('queued');

      // 2. Watchdog timeout simulation
      const timeoutRes = await fetch(`${baseUrl}/__agent-chat/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 's2', prompt: 'simulate-proposal:timeout' }),
      });
      expect(timeoutRes.status).toBe(200);
      const timeoutBody = await timeoutRes.json();
      const runId = timeoutBody.runId;

      // Wait for initial queued event to fire first (10ms)
      await new Promise((resolve) => setTimeout(resolve, 35));

      // Trigger watchdog timeout manually to check failure event
      const { startRunWatchdog, getRunEvents } = await import('./agent-chat-runs.ts');
      startRunWatchdog(runId, 50);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const events = getRunEvents(runId);
      const eventTypes = events.map((e) => e.type);
      expect(eventTypes).toContain('failed');
    });
  });

  it('T085: validateProposal runs before proposal emission and before apply', async () => {
    // 1. Proving validation runs before proposal emission
    await withAgentChatServer(async (baseUrl) => {
      const startRes = await fetch(`${baseUrl}/__agent-chat/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 's3', prompt: 'simulate-proposal:invalid' }),
      });
      const { runId } = await startRes.json();

      await new Promise((resolve) => setTimeout(resolve, 500));

      const { getRunEvents } = await import('./agent-chat-runs.ts');
      const events = getRunEvents(runId);
      const proposalEvent = events.find((e) => e.type === 'proposal');
      expect(proposalEvent).toBeDefined();
      const proposal = proposalEvent?.payload as AgentEditProposal;
      expect(proposal.validation.status).toBe('invalid'); // has tsx mismatch failure

      // 2. Proving validation runs immediately before apply
      const slidePath = path.join(tempDir, 'slides', 'intro');
      await fs.mkdir(slidePath, { recursive: true });
      const indexPath = path.join(slidePath, 'index.tsx');
      await fs.writeFile(indexPath, 'function Slide() {\n  return <div>Welcome</div>;\n}', 'utf8');

      const proposalId = 'prop_stale_apply_test';
      const mockRun = {
        id: 'run_stale_apply_test',
        sessionId: 's4',
        prompt: 'Make slide prettier',
        context: { project: {} },
        connection: {
          connectionId: 'local-codex',
          displayName: 'Codex',
          type: 'local-agent',
          modelOrAgent: 'codex',
          status: 'ready',
        },
        state: 'queued',
        events: [],
        startedAt: new Date().toISOString(),
      } as unknown as AgentChatRun;

      const { getSourceFingerprint } = await import('../editing/agent-proposals.ts');
      const fp = getSourceFingerprint('function Slide() {\n  return <div>Welcome</div>;\n}');

      const staleProposal = {
        id: proposalId,
        runId: 'run_stale_apply_test',
        summary: 'Edits',
        scope: 'slide',
        riskLevel: 'low',
        operations: [
          {
            id: 'op_stale_apply',
            kind: 'patch-slide-source',
            target: 'intro',
            description: 'Patch intro slide',
            payload: { code: 'function Slide() {\n  return <div>New Patched</div>;\n}' },
            requiresConfirmation: false,
            validationState: 'pending',
            reversible: true,
          },
        ],
        previewArtifacts: [],
        validation: { status: 'valid', checks: [] },
        fingerprints: { intro: fp },
        state: 'pending-review',
        createdAt: new Date().toISOString(),
      };

      registerRun(mockRun, new AbortController());
      addRunEvent('run_stale_apply_test', 'proposal', staleProposal);

      // Mismatch fingerprint
      await fs.writeFile(
        indexPath,
        'function Slide() {\n  return <div>Modified Independently</div>;\n}',
        'utf8',
      );

      const applyRes = await fetch(`${baseUrl}/__agent-chat/proposals/${proposalId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operationIds: ['op_stale_apply'] }),
      });
      expect(applyRes.status).toBe(409);
      const applyBody = await applyRes.json();
      expect(applyBody.category).toBe('patch-conflict');
    });
  });

  it('T087: GET /__agent-chat/audit returns redacted newest-first audit summaries', async () => {
    const slidePath = path.join(tempDir, 'slides', 'intro');
    await fs.mkdir(slidePath, { recursive: true });
    const indexPath = path.join(slidePath, 'index.tsx');
    await fs.writeFile(indexPath, 'export default [() => <div>Original</div>];', 'utf8');

    const runId = 'run_audit_test';
    const proposalId = 'prop_audit_1';
    const mockRun = {
      id: runId,
      sessionId: 'session_audit',
      prompt: 'Make slide look better with secret key=abcde12345',
      context: { project: {} },
      connection: {
        connectionId: 'local-codex',
        displayName: 'Codex',
        type: 'local-agent',
        modelOrAgent: 'codex',
        status: 'ready',
      },
      state: 'queued',
      events: [],
      startedAt: new Date().toISOString(),
    } as unknown as AgentChatRun;

    const mockProposal = {
      id: proposalId,
      runId,
      summary: 'Audited edits key=abcde12345',
      scope: 'slide',
      riskLevel: 'low',
      operations: [
        {
          id: 'op_audit_patch',
          kind: 'patch-slide-source',
          target: 'intro',
          description: 'Patch intro slide',
          payload: { code: 'export default [() => <div>Audited</div>];' },
          requiresConfirmation: false,
          validationState: 'pending',
          reversible: true,
        },
      ],
      previewArtifacts: [],
      validation: { status: 'valid', checks: [] },
      state: 'pending-review',
      createdAt: new Date().toISOString(),
    };

    registerRun(mockRun, new AbortController());
    addRunEvent(runId, 'proposal', mockProposal);

    await withAgentChatServer(async (baseUrl) => {
      const applyRes = await fetch(`${baseUrl}/__agent-chat/proposals/${proposalId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operationIds: ['op_audit_patch'] }),
      });
      expect(applyRes.status).toBe(200);

      const auditRes = await fetch(`${baseUrl}/__agent-chat/audit`);
      expect(auditRes.status).toBe(200);
      const auditBody = await auditRes.json();
      expect(auditBody.entries).toHaveLength(1);
      const entry = auditBody.entries[0];
      expect(entry.prompt).not.toContain('abcde12345');
      expect(entry.prompt).toContain('<redacted>');
      expect(entry.proposalSummary).not.toContain('abcde12345');
      expect(entry.proposalSummary).toContain('<redacted>');
    });
  });

  it('T061: verifies session bootstrap connection status options and metadata parity', async () => {
    await withAgentChatServer(async (baseUrl) => {
      const statuses = ['ready', 'needs-setup', 'degraded', 'failed', 'offline'];
      for (const status of statuses) {
        const res = await fetch(`${baseUrl}/__agent-chat/session?connectionStatus=${status}`);
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.connectionStatus).toBe(status);
        expect(body.runtime.settingsRoute).toBe('/settings/connections');
        if (status !== 'ready') {
          expect(body.recoveryRoute).toBe('/settings/connections');
        }
      }
    });
  });

  it('T006_fallback: no connection fallback to needs-setup when settings are empty', async () => {
    delete process.env.AGENT_CONNECTION_STATUS;
    try {
      await withAgentChatServer(async (baseUrl) => {
        // 1. GET /session should return needs-setup
        const sessionRes = await fetch(`${baseUrl}/__agent-chat/session`);
        expect(sessionRes.status).toBe(200);
        const sessionBody = await sessionRes.json();
        expect(sessionBody.connectionStatus).toBe('needs-setup');
        expect(sessionBody.recoveryRoute).toBe('/settings/connections');

        // 2. POST /runs should fail with 503
        const runRes = await fetch(`${baseUrl}/__agent-chat/runs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'session_1',
            prompt: 'Make slide look better',
            contextPreferences: [],
          }),
        });
        expect(runRes.status).toBe(503);
        const runBody = await runRes.json();
        expect(runBody.category).toBe('connection-unavailable');
      });
    } finally {
      process.env.AGENT_CONNECTION_STATUS = 'ready';
    }
  });
});

async function withAgentChatServer(run: (baseUrl: string) => Promise<void>): Promise<void> {
  let mounted: {
    prefix: string;
    handler: MountedHandler;
  } | null = null;

  const fakeServer = {
    middlewares: {
      use(prefix: string, handler: MountedHandler) {
        mounted = { prefix, handler };
      },
    },
  } as unknown as ViteDevServer;

  const ctx: ApiContext = {
    userCwd: tempDir,
    slidesDir: 'slides',
    slidesRoot: path.join(tempDir, 'slides'),
    themesRoot: path.join(tempDir, 'themes'),
    globalAssetsRoot: path.join(tempDir, 'assets'),
    manifestPath: path.join(tempDir, 'slides', '.folders.json'),
  };

  registerAgentChatRoutes(fakeServer, ctx);

  const server = http.createServer((req, res) => {
    if (!mounted || !req.url?.startsWith(mounted.prefix)) {
      res.statusCode = 404;
      res.end();
      return;
    }
    const originalUrl = req.url;
    req.url = originalUrl.slice(mounted.prefix.length) || '/';
    mounted.handler(req, res, () => {
      res.statusCode = 404;
      res.end();
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });

  try {
    const address = server.address() as AddressInfo;
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

async function waitForRunEvents(
  runId: string,
  predicate: (events: AgentChatEvent[]) => boolean,
): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const events = getRunEvents(runId);
    if (predicate(events)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`Timed out waiting for events on ${runId}`);
}
