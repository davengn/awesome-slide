import { describe, expect, it } from 'vitest';
import { normalizeCapabilities } from '../app/lib/agent-connections.ts';
import {
  createAdapterCapabilities,
  normalizeAgentConnectionEvents,
  type RawAgentConnectionEvent,
  runAgentConnectionAdapter,
} from './agent-connection-adapters.ts';

async function* events(items: RawAgentConnectionEvent[]) {
  for (const item of items) {
    yield item;
  }
}

describe('agent connection adapters', () => {
  it('normalizes capabilities to safe defaults', () => {
    const capabilities = createAdapterCapabilities({ streaming: true });
    expect(capabilities.streaming).toBe(true);
    expect(capabilities.toolCalls).toBe(false);
    expect(capabilities.supportedModalities).toEqual(['text']);
  });

  it('orders events and redacts diagnostic payloads', async () => {
    const normalized = [];
    for await (const event of normalizeAgentConnectionEvents(
      events([
        { type: 'progress', payload: 'Starting' },
        { type: 'diagnostic', payload: 'key=supersecret123 C:\\Users\\Admin\\project' },
        { type: 'completed', payload: null },
      ]),
    )) {
      normalized.push(event);
    }

    expect(normalized.map((event) => event.sequence)).toEqual([1, 2, 3]);
    expect(String(normalized[1].payload)).not.toContain('supersecret123');
    expect(String(normalized[1].payload)).toContain('<user>');
  });

  it('maps aborted requests to a cancellation event', async () => {
    const controller = new AbortController();
    controller.abort();

    const normalized = [];
    for await (const event of runAgentConnectionAdapter(
      async function* () {
        yield { type: 'progress', payload: 'never emitted' };
      },
      {
        runId: 'run_1',
        prompt: 'Test',
        context: {},
        workflows: [],
        connectionId: 'conn_1',
        capabilities: normalizeCapabilities(),
        signal: controller.signal,
      },
    )) {
      normalized.push(event);
    }

    expect(normalized).toHaveLength(1);
    expect(normalized[0].type).toBe('cancelled');
  });

  it('maps adapter throws to redacted failed events', async () => {
    const throwingEvents: AsyncIterable<RawAgentConnectionEvent> = {
      async *[Symbol.asyncIterator]() {
        yield { type: 'progress', payload: 'Starting' };
        throw new Error('token=abcdef123456 C:\\Users\\Admin\\project');
      },
    };
    const normalized = [];
    for await (const event of normalizeAgentConnectionEvents(throwingEvents)) {
      normalized.push(event);
    }

    expect(normalized[0].type).toBe('progress');
    expect(normalized[1].type).toBe('failed');
    expect(JSON.stringify(normalized[1].payload)).not.toContain('abcdef123456');
    expect(JSON.stringify(normalized[1].payload)).toContain('<user>');
  });

  it('T062: proves 005 supplies context and workflows while 006 resolves capabilities', async () => {
    const controller = new AbortController();
    const runRequest = {
      runId: 'run_test_t062',
      prompt: 'Hello',
      context: { project: { name: 'My Test Project' } },
      workflows: [{ id: 'wf1', contentHash: 'hash_wf1', instructions: 'step1' }],
      connectionId: 'conn_test_062',
      modelId: 'gpt-model',
      reasoningEffort: 'low',
      capabilities: normalizeCapabilities({ streaming: true, cancellation: true }),
      signal: controller.signal,
    };

    let receivedRequest: any = null;
    const runner = async function* (req: any) {
      receivedRequest = req;
      yield { type: 'progress' as const, payload: 'processing' };
    };

    const normalized = [];
    for await (const event of runAgentConnectionAdapter(runner, runRequest)) {
      normalized.push(event);
    }

    expect(normalized[0].type).toBe('progress');
    expect(receivedRequest).toBeDefined();
    expect(receivedRequest.prompt).toBe('Hello');
    expect(receivedRequest.context.project.name).toBe('My Test Project');
    expect(receivedRequest.workflows).toEqual([
      { id: 'wf1', contentHash: 'hash_wf1', instructions: 'step1' },
    ]);
    expect(receivedRequest.modelId).toBe('gpt-model');
    expect(receivedRequest.reasoningEffort).toBe('low');
    expect(receivedRequest.capabilities.streaming).toBe(true);
    expect(receivedRequest.capabilities.cancellation).toBe(true);
  });
});
